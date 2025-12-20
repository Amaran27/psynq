import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Call, CallState, CallStateMachine, CallDirection } from '@psynq/core';
import { CreateCallDto, CallResponseDto } from '../dtos/call.dto';
import { CallGateway } from '../call.gateway';
import { CallEntity } from '../entities/call.entity';
import { ConfigService } from '@nestjs/config';
import { CallParticipant, SupervisorControlOptions } from '../interfaces/call-participant.interface';
import { CallParticipantService } from './call-participant.service';
import { StorageService } from '../modules/storage/storage.service';
import { createStandardParticipantId, getProviderParticipantId } from '../utils/participant-id.util';
import { StandardWebhookEvent } from '../interfaces/webhook.interface';
import { TelephonyPort } from '../ports/telephony.port';
import { PsynqException, CallStateTransitionError } from '../common/exceptions/psynq.exception';

@Injectable()
export class CallService {
  private readonly logger = new Logger(CallService.name);
  private stateMachine = new CallStateMachine();

  constructor(
    @InjectRepository(CallEntity) private readonly callRepository: Repository<CallEntity>,
    @Inject(forwardRef(() => CallGateway)) private readonly callGateway: CallGateway,
    @Inject('TELEPHONY_PROVIDER') private readonly telephonyProvider: TelephonyPort,
    private readonly configService: ConfigService,
    private readonly callParticipantService: CallParticipantService,
    private readonly storageService: StorageService,
  ) {
    if (this.telephonyProvider.onCallReceived) {
      this.telephonyProvider.onCallReceived((call) => this.handleCallReceived(call));
    }
    if (this.telephonyProvider.onCallEnded) {
      this.telephonyProvider.onCallEnded((callId) => this.handleCallEndedInternal(callId));
    }
    if (this.telephonyProvider.onParticipantJoined) {
      this.telephonyProvider.onParticipantJoined((participant) => this.handleParticipantJoined(participant));
    }
  }

  private async handleParticipantJoined(participant: CallParticipant) {
      this.logger.log(`Participant joined: ${participant.participantId} (Call: ${participant.callId})`);
      try {
        await this.callParticipantService.addParticipant(participant);
      } catch (e) {
        this.logger.error(`Failed to persist participant: ${e.message}`);
      }
      const call = await this.callRepository.findOneBy({ id: participant.callId });
      if (call) {
        this.callGateway.emitCallUpdate(this.mapToResponseDto(this.entityToDomain(call)));
      }
  }

  private async handleCallReceived(call: Call) {
    const callEntity = await this.callRepository.findOneBy({ id: call.id });
    if (callEntity) {
      callEntity.externalId = call.externalId;
      callEntity.state = CallState.RINGING;
      await this.callRepository.save(callEntity);
      this.callGateway.emitCallUpdate(this.mapToResponseDto(call));
    } else {
      await this.callRepository.save(this.domainToEntity(call));
      this.callGateway.emitNewCall(call);
    }
  }

  private async handleCallEndedInternal(callId: string) {
    const callEntity = await this.callRepository.findOneBy({ externalId: callId });
    if (callEntity) {
      const call = this.entityToDomain(callEntity);
      try {
        this.stateMachine.endCall(call);
        await this.callRepository.save(this.domainToEntity(call));
        this.callGateway.emitCallUpdate(this.mapToResponseDto(call));
      } catch (e) {
        this.logger.warn(`Failed to end call via state machine: ${e.message}`);
      }
    }
  }

  async createCall(createCallDto: CreateCallDto): Promise<CallResponseDto> {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const call = new Call(callId, createCallDto.from, createCallDto.to, CallDirection.OUTBOUND);
    if (createCallDto.agentId) call.agentId = createCallDto.agentId;
    if (createCallDto.organizationId) (call as any).organizationId = createCallDto.organizationId;

    try {
      this.stateMachine.startCall(call);
    } catch (e) {
      throw new CallStateTransitionError('IDLE', 'RINGING');
    }
    
    await this.callRepository.save(this.domainToEntity(call));
    this.callGateway.emitNewCall(call);

    const externalId = await this.telephonyProvider.createCall(call);
    if (externalId) {
       call.externalId = externalId;
       await this.callRepository.update(call.id, { externalId });
    }

    return this.mapToResponseDto(call);
  }

  async findCallForAgent(agentId: string): Promise<void> {
    if (!this.telephonyProvider.findQueueByName || !this.telephonyProvider.getFirstCallFromQueue || !this.telephonyProvider.redirectCall) {
        return;
    }

    const queue = await this.telephonyProvider.findQueueByName('support');
    if (!queue) return;

    const firstCallInQueue = await this.telephonyProvider.getFirstCallFromQueue(queue.sid);
    if (!firstCallInQueue) return;

    const callSid = firstCallInQueue.callSid;
    const callEntity = await this.callRepository.findOneBy({ externalId: callSid });
    
    let call: Call;
    if (callEntity) {
      callEntity.agentId = agentId;
      await this.callRepository.save(callEntity);
      call = this.entityToDomain(callEntity);
    } else {
        call = new Call(callSid, "unknown", "unknown");
        call.externalId = callSid;
    }

    const twiml = `<Response><Dial><Client>${agentId}</Client></Dial></Response>`;
    await this.telephonyProvider.redirectCall(call, twiml);
  }

  async getCall(callId: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    return this.mapToResponseDto(this.entityToDomain(callEntity));
  }

  async answerCall(callId: string, agentId?: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);

    try {
      this.stateMachine.answerCall(call);
      if (agentId) call.agentId = agentId;
      await this.callRepository.save(this.domainToEntity(call));
      
      if (agentId) await this.telephonyProvider.bridgeParticipants(call, agentId);
      
      this.callGateway.emitCallUpdate(this.mapToResponseDto(call));
      return this.mapToResponseDto(call);
    } catch (error) {
      if (error instanceof PsynqException) throw error;
      throw new BadRequestException(error.message);
    }
  }

  async injectSupervisor(callId: string, supervisorId: string, options?: SupervisorControlOptions): Promise<CallParticipant> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);

    const capabilities = this.telephonyProvider.getCapabilities();
    if (!capabilities.supportsSupervisorInjection) {
      throw new BadRequestException('Supervisor injection is not supported for this provider');
    }

    const participant = await this.telephonyProvider.injectSupervisor(call, supervisorId, options);

    if (participant) {
      await this.callParticipantService.addParticipant(participant);
      
      call.providerMetadata = { 
        ...call.providerMetadata, 
        supervisorParticipantSid: participant.providerCallSid,
        standardParticipantId: participant.id
      };
      await this.callRepository.save(this.domainToEntity(call));
      this.callGateway.emitCallUpdate(this.mapToResponseDto(call));
      
      return participant;
    }

    throw new BadRequestException('Failed to inject supervisor');
  }

  async supervisorUnmute(callId: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);

    if (!this.telephonyProvider.getCapabilities().supportsParticipantMute) {
      throw new BadRequestException('Mute/unmute not supported');
    }

    const supervisors = await this.callParticipantService.getSupervisorsByCallId(callId);
    if (supervisors.length === 0) throw new BadRequestException('No supervisor injected');

    const supervisor = supervisors[0];
    const participantId = getProviderParticipantId(supervisor);
    const orgId = (call as any).organizationId || null;

    await this.telephonyProvider.setParticipantMuted(orgId, participantId, false);
    await this.callParticipantService.updateParticipantMuteState(supervisor.id, false);

    this.callGateway.emitCallUpdate(this.mapToResponseDto(call));
    return this.mapToResponseDto(call);
  }

  async supervisorMute(callId: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);

    if (!this.telephonyProvider.getCapabilities().supportsParticipantMute) {
      throw new BadRequestException('Mute/unmute not supported');
    }

    const supervisors = await this.callParticipantService.getSupervisorsByCallId(callId);
    if (supervisors.length === 0) throw new BadRequestException('No supervisor injected');

    const supervisor = supervisors[0];
    const participantId = getProviderParticipantId(supervisor);
    const orgId = (call as any).organizationId || null;

    await this.telephonyProvider.setParticipantMuted(orgId, participantId, true);
    await this.callParticipantService.updateParticipantMuteState(supervisor.id, true);

    this.callGateway.emitCallUpdate(this.mapToResponseDto(call));
    return this.mapToResponseDto(call);
  }

  async holdCall(callId: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);
    try {
      this.stateMachine.holdCall(call);
      await this.callRepository.save(this.domainToEntity(call));
      this.callGateway.emitCallUpdate(this.mapToResponseDto(call));
      return this.mapToResponseDto(call);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async resumeCall(callId: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);
    try {
      this.stateMachine.resumeCall(call);
      await this.callRepository.save(this.domainToEntity(call));
      this.callGateway.emitCallUpdate(this.mapToResponseDto(call));
      return this.mapToResponseDto(call);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async endCall(callId: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);
    try {
      this.stateMachine.endCall(call);
      await this.callRepository.save(this.domainToEntity(call));
      await this.telephonyProvider.endCall(call);
      this.callGateway.emitCallUpdate(this.mapToResponseDto(call));
      await this.cleanupRelatedActiveCalls(call);
      return this.mapToResponseDto(call);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getActiveCalls(): Promise<CallResponseDto[]> {
    const activeEntities = await this.callRepository.find({ where: { state: Not(CallState.ENDED) } });
    return activeEntities.map(entity => this.mapToResponseDto(this.entityToDomain(entity)));
  }

  async handleStandardWebhookEvent(event: StandardWebhookEvent): Promise<void> {
    switch (event.eventType) {
      case 'call_started':
      case 'call_ringing':
        await this.handleCallRingingWebhook(event);
        break;
      case 'call_answered':
        await this.handleCallAnsweredWebhook(event);
        break;
      case 'call_ended':
        await this.handleCallEndedWebhook(event);
        break;
    }
  }

  private async handleCallRingingWebhook(event: StandardWebhookEvent): Promise<void> {
    let callEntity = await this.callRepository.findOneBy({ externalId: event.externalId });
    if (!callEntity && event.eventType === 'call_started') {
      const call = new Call(event.callId, event.data.from, event.data.to, CallDirection.INBOUND);
      call.externalId = event.externalId;
      this.stateMachine.startCall(call);
      callEntity = await this.callRepository.save(this.domainToEntity(call));
      this.callGateway.emitNewCall(call);
    }
    if (callEntity) {
      const call = this.entityToDomain(callEntity);
      try { this.stateMachine.startCall(call); } catch (e) {}
      await this.callRepository.save(this.domainToEntity(call));
      this.callGateway.emitCallUpdate(this.mapToResponseDto(call));
    }
  }

  private async handleCallAnsweredWebhook(event: StandardWebhookEvent): Promise<void> {
    const callEntity = await this.callRepository.findOneBy({ externalId: event.externalId });
    if (callEntity) {
      const call = this.entityToDomain(callEntity);
      try { this.stateMachine.answerCall(call); } catch (e) {}
      await this.callRepository.save(this.domainToEntity(call));
      this.callGateway.emitCallUpdate(this.mapToResponseDto(call));
    }
  }

  private async handleCallEndedWebhook(event: StandardWebhookEvent): Promise<void> {
    const callEntity = await this.callRepository.findOneBy({ externalId: event.externalId });
    if (callEntity) {
      const call = this.entityToDomain(callEntity);
      try { this.stateMachine.endCall(call); } catch (e) {}
      await this.callRepository.save(this.domainToEntity(call));
      this.callGateway.emitCallUpdate(this.mapToResponseDto(call));
    }
  }

  async handleTwilioStatusCallback(twilioPayload: any) {
    const callSid = twilioPayload.CallSid;
    const status = (twilioPayload.CallStatus || '').toLowerCase();
    const parentCallSid = twilioPayload.ParentCallSid;

    if (parentCallSid) {
      const parentEntity = await this.callRepository.findOneBy({ externalId: parentCallSid });
      if (parentEntity) {
        const parentCall = this.entityToDomain(parentEntity);
        if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(status)) {
          try { this.stateMachine.endCall(parentCall); } catch (e) {}
          await this.callRepository.save(this.domainToEntity(parentCall));
          this.callGateway.emitCallUpdate(this.mapToResponseDto(parentCall));
          await this.cleanupRelatedActiveCalls(parentCall);
        }
        return;
      }
    }

    let callEntity = await this.callRepository.findOneBy({ externalId: callSid });
    if (!callEntity) callEntity = await this.callRepository.findOneBy({ id: callSid });

    if (!callEntity && status === 'ringing') {
      const call = new Call(callSid, twilioPayload.From, twilioPayload.To, CallDirection.INBOUND);
      call.externalId = callSid;
      try { this.stateMachine.startCall(call); } catch (e) {}
      await this.callRepository.save(this.domainToEntity(call));
      this.callGateway.emitNewCall(call);
      return;
    }

    if (!callEntity) return;

    const call = this.entityToDomain(callEntity);
    if (!call.externalId) call.externalId = callSid;

    if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(status)) {
      try { this.stateMachine.endCall(call); } catch (e) {}
    } else if (status === 'in-progress' || status === 'answered') {
      try { this.stateMachine.answerCall(call); } catch (e) {}
    }

    await this.callRepository.save(this.domainToEntity(call));
    this.callGateway.emitCallUpdate(this.mapToResponseDto(call));

    if (call.state === CallState.ENDED) {
      await this.cleanupRelatedActiveCalls(call);
      try {
        const recording = await this.telephonyProvider.getRecording(call.externalId || callSid);
        if (recording) {
          await this.storageService.uploadRecording(call.id, recording, 'audio/wav', (call as any).organizationId);
        }
      } catch (e) {}
    }
  }
  
  private async findCallEntityOrFail(callId: string): Promise<CallEntity> {
    const callEntity = await this.callRepository.findOneBy({ id: callId });
    if (!callEntity) throw new NotFoundException(`Call ${callId} not found`);
    return callEntity;
  }

  private entityToDomain(entity: CallEntity): Call {
    const call = new Call(entity.id, entity.from, entity.to, entity.direction);
    call.state = entity.state;
    call.agentId = entity.agentId;
    (call as any).organizationId = entity.organizationId;
    call.startedAt = entity.startedAt;
    call.answeredAt = entity.answeredAt;
    call.endedAt = entity.endedAt;
    call.externalId = entity.externalId;
    call.parentCallSid = entity.parentCallSid;
    call.providerMetadata = entity.providerMetadata;
    return call;
  }
  
  private domainToEntity(call: Call): CallEntity {
    const entity = new CallEntity();
    entity.id = call.id;
    entity.from = call.from;
    entity.to = call.to;
    entity.direction = call.direction;
    entity.state = call.state;
    entity.agentId = call.agentId;
    entity.organizationId = (call as any).organizationId;
    entity.startedAt = call.startedAt ?? new Date();
    entity.answeredAt = call.answeredAt;
    entity.endedAt = call.endedAt;
    entity.externalId = call.externalId;
    entity.parentCallSid = call.parentCallSid;
    entity.providerMetadata = call.providerMetadata;
    return entity;
  }

  private async cleanupRelatedActiveCalls(call: Call) {
    const relatedEntities = await this.callRepository.find({
      where: [
        { to: call.to, from: call.from, state: Not(CallState.ENDED) },
        { parentCallSid: call.externalId, state: Not(CallState.ENDED) }
      ]
    });

    for (const entity of relatedEntities) {
      if (entity.id === call.id) continue;
      const relatedCall = this.entityToDomain(entity);
      try {
        this.stateMachine.endCall(relatedCall);
        await this.callRepository.save(this.domainToEntity(relatedCall));
        this.callGateway.emitCallUpdate(this.mapToResponseDto(relatedCall));
      } catch (err) {}
    }
  }

  private mapToResponseDto(call: Call): CallResponseDto {
    return {
      id: call.id,
      state: call.state,
      direction: call.direction,
      from: call.from,
      to: call.to,
      agentId: call.agentId,
      organizationId: (call as any).organizationId,
      startedAt: call.startedAt,
      answeredAt: call.answeredAt,
      endedAt: call.endedAt,
      supervisorParticipantSid: call.providerMetadata?.supervisorParticipantSid,
    };
  }
}
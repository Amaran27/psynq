import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Call, CallState, CallStateMachine, CallDirection } from '@psynq/core';
import { CreateCallDto, CallResponseDto } from '../dtos/call.dto';
import { CallEntity } from '../entities/call.entity';
import { ConfigService } from '@nestjs/config';
import {
  CallParticipant,
  SupervisorControlOptions,
} from '../interfaces/call-participant.interface';
import { CallParticipantService } from './call-participant.service';
import { StorageService } from '../modules/storage/storage.service';
import { getProviderParticipantId } from '../utils/participant-id.util';
import { StandardWebhookEvent } from '../interfaces/webhook.interface';
import { TelephonyPort } from '../ports/telephony.port';
import { EventBusPort, PsynqEvent } from '../ports/event-bus.port';
import { AgentStateService } from './agent-state.service';
import { BillingService } from './billing.service';
import {
  PsynqException,
  CallStateTransitionError,
  TelephonyProviderError,
} from '../common/exceptions/psynq.exception';
import { instanceToPlain, plainToInstance } from 'class-transformer';

@Injectable()
export class CallService implements OnModuleInit {
  private readonly logger = new Logger(CallService.name);
  private stateMachine = new CallStateMachine();

  constructor(
    @InjectRepository(CallEntity)
    private readonly callRepository: Repository<CallEntity>,
    @Inject('EVENT_BUS') private readonly eventBus: EventBusPort,
    @Inject('TELEPHONY_PROVIDER')
    private readonly telephonyProvider: TelephonyPort,
    private readonly configService: ConfigService,
    private readonly callParticipantService: CallParticipantService,
    private readonly storageService: StorageService,
    private readonly agentStateService: AgentStateService,
    private readonly billingService: BillingService,
  ) {}

  async onModuleInit() {
    await this.eventBus.subscribe('telephony.call_received', (event) =>
      this.handleCallReceivedEvent(event),
    );
    await this.eventBus.subscribe('telephony.call_ended', (event) =>
      this.handleCallEndedEvent(event),
    );
    await this.eventBus.subscribe('telephony.participant_joined', (event) =>
      this.handleParticipantJoinedEvent(event),
    );
  }

  private async handleParticipantJoinedEvent(event: PsynqEvent) {
    await this.handleParticipantJoined(event.payload);
  }

  private async handleCallReceivedEvent(event: PsynqEvent) {
    await this.handleCallReceived(event.payload);
  }

  private async handleCallEndedEvent(event: PsynqEvent) {
    await this.handleCallEndedInternal(event.payload.callId);
  }

  private async handleParticipantJoined(participant: CallParticipant) {
    this.logger.log(
      `Participant joined: ${participant.participantId} (Call: ${participant.callId})`,
    );
    try {
      await this.callParticipantService.addParticipant(participant);
    } catch (e) {
      this.logger.error(`Failed to persist participant: ${e.message}`);
    }
    const call = await this.callRepository.findOneBy({
      id: participant.callId,
    });
    if (call) {
      await this.publishCallUpdate(
        this.mapToResponseDto(this.entityToDomain(call)),
      );
    }
  }

  private async publishCallUpdate(call: any) {
    await this.eventBus.publish({
      type: 'call.updated',
      organizationId: call.organizationId,
      payload: call,
      timestamp: new Date(),
    });
  }

  private async handleCallReceived(call: Call) {
    const callEntity = await this.callRepository.findOneBy({ id: call.id });
    const orgId = (call as any).organizationId;
    if (callEntity) {
      callEntity.externalId = call.externalId;
      callEntity.state = CallState.RINGING;
      await this.callRepository.save(callEntity);
      await this.publishCallUpdate(this.mapToResponseDto(call));
    } else {
      await this.callRepository.save(this.domainToEntity(call));
      await this.eventBus.publish({
        type: 'call.new',
        organizationId: orgId,
        payload: call,
        timestamp: new Date(),
      });
    }
  }

  private async handleCallEndedInternal(callId: string) {
    const callEntity = await this.callRepository.findOneBy({
      externalId: callId,
    });
    if (!callEntity) return;

    const call = this.entityToDomain(callEntity);
    try {
      this.stateMachine.endCall(call);
      await this.callRepository.save(this.domainToEntity(call));
      await this.publishCallUpdate(this.mapToResponseDto(call));
    } catch (e) {
      this.logger.warn(`Failed to end call via state machine: ${e.message}`);
    }
  }

  async createCall(
    createCallDto: CreateCallDto,
    agentId?: string,
  ): Promise<CallResponseDto> {
    const orgId = createCallDto.organizationId || '';

    if (orgId) {
      await this.billingService.checkBalance(orgId, createCallDto.to);
    }

    if (createCallDto.agentId || agentId) {
      const id = createCallDto.agentId || agentId;
      const isAvailable = await this.agentStateService.isAvailable(id!);
      if (!isAvailable) {
        throw new BadRequestException(
          `Agent ${id} is not available for a call.`,
        );
      }
    }

    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const call = new Call(
      callId,
      createCallDto.from,
      createCallDto.to,
      CallDirection.OUTBOUND,
    );
    if (createCallDto.agentId || agentId)
      call.agentId = createCallDto.agentId || agentId;
    if (createCallDto.organizationId)
      (call as any).organizationId = createCallDto.organizationId;

    try {
      this.stateMachine.startCall(call);
    } catch (e) {
      throw new CallStateTransitionError('IDLE', 'RINGING');
    }

    await this.callRepository.save(this.domainToEntity(call));

    await this.eventBus.publish({
      type: 'call.new',
      organizationId: createCallDto.organizationId || '',
      payload: call,
      timestamp: new Date(),
    });

    const externalId = await this.telephonyProvider.createCall(call);
    if (externalId) {
      call.externalId = externalId;
      await this.callRepository.update(call.id, { externalId });
    }

    return this.mapToResponseDto(call);
  }

  async getCall(callId: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    return this.mapToResponseDto(this.entityToDomain(callEntity));
  }

  async answerCall(callId: string, agentId?: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);
    const originalState = call.state;

    try {
      this.stateMachine.answerCall(call);
      if (agentId) call.agentId = agentId;
      await this.callRepository.save(this.domainToEntity(call));

      if (agentId) {
        try {
          await this.telephonyProvider.bridgeParticipants(call, agentId);
        } catch (bridgeError) {
          this.logger.error(
            `Failed to bridge call ${callId} to agent ${agentId}, rolling back state`,
            bridgeError.stack,
          );
          call.state = originalState;
          await this.callRepository.save(this.domainToEntity(call));
          throw new TelephonyProviderError(
            `Bridge failed: ${bridgeError.message}`,
            'provider',
            bridgeError,
          );
        }
      }

      await this.publishCallUpdate(this.mapToResponseDto(call));
      return this.mapToResponseDto(call);
    } catch (error) {
      if (error instanceof PsynqException) throw error;
      throw new BadRequestException(error.message);
    }
  }

  async injectSupervisor(
    callId: string,
    supervisorId: string,
    options?: SupervisorControlOptions,
  ): Promise<CallParticipant> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);

    const capabilities = this.telephonyProvider.getCapabilities();
    if (!capabilities.supportsSupervisorInjection) {
      throw new BadRequestException(
        'Supervisor injection is not supported for this provider',
      );
    }

    const participant = await this.telephonyProvider.injectSupervisor(
      call,
      supervisorId,
      options,
    );

    if (participant) {
      await this.callParticipantService.addParticipant(participant);

      call.providerMetadata = {
        ...call.providerMetadata,
        supervisorParticipantSid: participant.providerCallSid,
        standardParticipantId: participant.id,
      };
      await this.callRepository.save(this.domainToEntity(call));
      await this.publishCallUpdate(this.mapToResponseDto(call));

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

    const supervisors =
      await this.callParticipantService.getSupervisorsByCallId(callId);
    if (supervisors.length === 0)
      throw new BadRequestException('No supervisor injected');

    const supervisor = supervisors[0];
    const participantId = getProviderParticipantId(supervisor);
    const orgId = (call as any).organizationId || null;

    await this.telephonyProvider.setParticipantMuted(
      orgId,
      participantId,
      false,
    );
    await this.callParticipantService.updateParticipantMuteState(
      supervisor.id,
      false,
    );

    await this.publishCallUpdate(this.mapToResponseDto(call));
    return this.mapToResponseDto(call);
  }

  async supervisorMute(callId: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);

    if (!this.telephonyProvider.getCapabilities().supportsParticipantMute) {
      throw new BadRequestException('Mute/unmute not supported');
    }

    const supervisors =
      await this.callParticipantService.getSupervisorsByCallId(callId);
    if (supervisors.length === 0)
      throw new BadRequestException('No supervisor injected');

    const supervisor = supervisors[0];
    const participantId = getProviderParticipantId(supervisor);
    const orgId = (call as any).organizationId || null;

    await this.telephonyProvider.setParticipantMuted(
      orgId,
      participantId,
      true,
    );
    await this.callParticipantService.updateParticipantMuteState(
      supervisor.id,
      true,
    );

    await this.publishCallUpdate(this.mapToResponseDto(call));
    return this.mapToResponseDto(call);
  }

  async holdCall(callId: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);
    try {
      this.stateMachine.holdCall(call);
      await this.callRepository.save(this.domainToEntity(call));
      await this.publishCallUpdate(this.mapToResponseDto(call));
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
      await this.publishCallUpdate(this.mapToResponseDto(call));
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
      await this.publishCallUpdate(this.mapToResponseDto(call));
      await this.cleanupRelatedActiveCalls(call);
      return this.mapToResponseDto(call);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getActiveCalls(): Promise<CallResponseDto[]> {
    const activeEntities = await this.callRepository.find({
      where: { state: Not(CallState.ENDED) },
    });
    return activeEntities.map((entity) =>
      this.mapToResponseDto(this.entityToDomain(entity)),
    );
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

  private async handleCallRingingWebhook(
    event: StandardWebhookEvent,
  ): Promise<void> {
    let callEntity = await this.callRepository.findOneBy({
      externalId: event.externalId,
    });
    if (!callEntity && event.eventType === 'call_started') {
      const call = new Call(
        event.callId,
        event.data.from,
        event.data.to,
        CallDirection.INBOUND,
      );
      call.externalId = event.externalId;
      this.stateMachine.startCall(call);
      callEntity = await this.callRepository.save(this.domainToEntity(call));

      await this.eventBus.publish({
        type: 'call.new',
        organizationId: event.organizationId,
        payload: call,
        timestamp: new Date(),
      });
    }
    if (callEntity) {
      const call = this.entityToDomain(callEntity);
      try {
        this.stateMachine.startCall(call);
      } catch (e) {}
      await this.callRepository.save(this.domainToEntity(call));
      await this.publishCallUpdate(this.mapToResponseDto(call));
    }
  }

  private async handleCallAnsweredWebhook(
    event: StandardWebhookEvent,
  ): Promise<void> {
    const callEntity = await this.callRepository.findOneBy({
      externalId: event.externalId,
    });
    if (callEntity) {
      const call = this.entityToDomain(callEntity);
      try {
        this.stateMachine.answerCall(call);
      } catch (e) {}
      await this.callRepository.save(this.domainToEntity(call));
      await this.publishCallUpdate(this.mapToResponseDto(call));
    }
  }

  private async handleCallEndedWebhook(
    event: StandardWebhookEvent,
  ): Promise<void> {
    const callEntity = await this.callRepository.findOneBy({
      externalId: event.externalId,
    });
    if (callEntity) {
      const call = this.entityToDomain(callEntity);
      try {
        this.stateMachine.endCall(call);
        await this.callRepository.save(this.domainToEntity(call));
        await this.publishCallUpdate(this.mapToResponseDto(call));

        await this.cleanupRelatedActiveCalls(call);

        if (call.answeredAt && call.endedAt && (call as any).organizationId) {
          const duration = Math.ceil(
            (call.endedAt.getTime() - call.answeredAt.getTime()) / 1000,
          );
          if (duration > 0) {
            const rate = await this.billingService.getRate(call.to);
            await this.billingService.chargeForCall(
              (call as any).organizationId,
              duration,
              rate,
            );
          }
        }

        try {
          const recording = await this.telephonyProvider.getRecording(
            call.externalId || call.id,
          );
          if (recording) {
            await this.storageService.uploadRecording(
              call.id,
              recording,
              'audio/wav',
              (call as any).organizationId,
            );
          }
        } catch (e) {
          this.logger.error(
            `Failed to handle recording for ended call ${call.id}: ${e.message}`,
          );
        }
      } catch (e) {
        this.logger.warn(
          `Failed to process call_ended for ${event.externalId}: ${e.message}`,
        );
      }
    }
  }

  private async findCallEntityOrFail(callId: string): Promise<CallEntity> {
    const callEntity = await this.callRepository.findOneBy({ id: callId });
    if (!callEntity) throw new NotFoundException(`Call ${callId} not found`);
    return callEntity;
  }

  private entityToDomain(entity: CallEntity): Call {
    return plainToInstance(Call, instanceToPlain(entity), {
      excludeExtraneousValues: true,
    });
  }

  private domainToEntity(call: Call): CallEntity {
    return plainToInstance(CallEntity, instanceToPlain(call));
  }

  private async cleanupRelatedActiveCalls(call: Call) {
    const relatedEntities = await this.callRepository.find({
      where: [
        { to: call.to, from: call.from, state: Not(CallState.ENDED) },
        { externalParentId: call.externalId, state: Not(CallState.ENDED) },
      ],
    });

    for (const entity of relatedEntities) {
      if (entity.id === call.id) continue;
      const relatedCall = this.entityToDomain(entity);
      try {
        this.stateMachine.endCall(relatedCall);
        await this.callRepository.save(this.domainToEntity(relatedCall));
        await this.publishCallUpdate(this.mapToResponseDto(relatedCall));
      } catch (err) {}
    }
  }

  private mapToResponseDto(call: Call): CallResponseDto {
    return plainToInstance(CallResponseDto, instanceToPlain(call), {
      excludeExtraneousValues: true,
    });
  }
}

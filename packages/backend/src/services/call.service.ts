import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Call, CallState, CallStateMachine, CallStateTransitionError, CallDirection } from '@psynq/core';
import { CreateCallDto, CallResponseDto } from '../dtos/call.dto';
import { CallGateway } from '../call.gateway';
import { TwilioAdapter } from '../adapters/twilio.adapter';
import { InfobipAdapter } from '../telephony/infobip.adapter';
import { CallEntity } from '../entities/call.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CallService {
  private readonly logger = new Logger(CallService.name);
  private stateMachine = new CallStateMachine();

  constructor(
    @InjectRepository(CallEntity) private readonly callRepository: Repository<CallEntity>,
    @Inject(forwardRef(() => CallGateway)) private readonly callGateway: CallGateway,
    private readonly twilioAdapter: TwilioAdapter,
    private readonly infobipAdapter: InfobipAdapter,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Creates a new outbound call, persists it, and initiates via the selected provider.
   */
  async createCall(createCallDto: CreateCallDto): Promise<CallResponseDto> {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const call = new Call(callId, createCallDto.from, createCallDto.to, CallDirection.OUTBOUND);
    if (createCallDto.agentId) {
      call.agentId = createCallDto.agentId;
    }

    this.stateMachine.startCall(call);
    
    let callEntity = this.domainToEntity(call);
    await this.callRepository.save(callEntity);

    this.callGateway.emitNewCall(call);

    const provider = this.selectProvider(createCallDto.to);
    if (provider === 'infobip') {
      await this.infobipAdapter.makeCall({ from: call.from, to: call.to, callId: call.id, agentId: call.agentId });
    } else {
      // TwilioAdapter may return the external Twilio call SID so we can map and operate on it later
      const twilioSid = await this.twilioAdapter.createCall(call);
      if (twilioSid) {
        call.twilioSid = twilioSid;
      }
    }

    // Keep call in RINGING state; webhook will update to ANSWERED/ENDED
    callEntity = this.domainToEntity(call);
    await this.callRepository.save(callEntity);

    return this.mapToResponseDto(call);
  }

  /**
   * Finds a waiting call and assigns it to the newly available agent.
   * @param agentId The ID of the agent who became available.
   */
  async findCallForAgent(agentId: string): Promise<void> {
    console.log(`Agent ${agentId} is available. Looking for a call...`);
    const queue = await this.twilioAdapter.findQueueByName('support');
    if (!queue) {
      console.log("No 'support' queue found.");
      return;
    }

    const firstCallInQueue = await this.twilioAdapter.getFirstCallFromQueue(queue.sid);
    if (!firstCallInQueue) {
      console.log('Queue is empty. No call to assign.');
      return;
    }

    const callSid = firstCallInQueue.callSid;
    console.log(`Found call ${callSid} in queue. Assigning to agent ${agentId}.`);

    // Assign agent to the call in our DB
    const callEntity = await this.callRepository.findOneBy({ twilioSid: callSid });
    if (callEntity) {
      callEntity.agentId = agentId;
      await this.callRepository.save(callEntity);
    }

    // Redirect the call from the queue to the agent
    const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
    const twiml = `<Response><Dial><Client>${agentId}</Client></Dial></Response>`;
    
    // Dequeue using a different TwiML method
    const dequeueTwiml = new (require('twilio').twiml.VoiceResponse)();
    const dial = dequeueTwiml.dial();
    dial.queue('support');
    
    //This is a more direct way of dequeueing
    await this.twilioAdapter.redirectCall(callSid, twiml);
  }

  /**
   * Selects the best telephony provider based on destination and configuration.
   */
  private selectProvider(to: string): 'infobip' | 'twilio' {
    const configuredProvider = process.env.TELEPHONY_PROVIDER as 'infobip' | 'twilio';
    if (configuredProvider && ['infobip', 'twilio'].includes(configuredProvider)) {
      return configuredProvider;
    }
    if (to.startsWith('+91')) {
      return 'infobip';
    }
    return 'twilio';
  }

  /**
   * Gets a call by ID from the database.
   */
  async getCall(callId: string): Promise<CallResponseDto> {
    const callEntity = await this.callRepository.findOneBy({ id: callId });
    if (!callEntity) {
      throw new NotFoundException(`Call with ID ${callId} not found`);
    }
    return this.mapToResponseDto(this.entityToDomain(callEntity));
  }

  /**
   * Answers a ringing call.
   */
  async answerCall(callId: string, agentId?: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);

    try {
      this.stateMachine.answerCall(call);
      if (agentId) call.agentId = agentId;
      
      await this.callRepository.save(this.domainToEntity(call));
      
      if (agentId) await this.twilioAdapter.bridgeCall(call.twilioSid || call.id, agentId);
      
      this.callGateway.emitCallUpdate(call);
      return this.mapToResponseDto(call);
    } catch (error) {
      if (error instanceof CallStateTransitionError) {
        throw new BadRequestException(`Cannot answer call: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Injects a supervisor into an active call (whisper/barge-in support).
   * Persists the external participant identifier returned by the provider.
   */
  async injectSupervisor(callId: string, supervisorId: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);

    // Use provider-specific implementation to inject the supervisor and obtain a participant SID
    const provider = this.selectProvider(call.to);
    let participantSid: string | undefined;
    if (provider === 'infobip') {
      // Infobip adapter does not yet implement supervisor injection; log and throw
      this.logger?.warn?.('Infobip supervisor injection not implemented');
      throw new BadRequestException('Supervisor injection is not supported for Infobip at this time');
    } else {
      const externalId = call.twilioSid || callId;
      participantSid = await this.twilioAdapter.injectSupervisor(externalId, supervisorId) as string | undefined;
    }

    if (participantSid) {
      call.supervisorParticipantSid = participantSid;
      await this.callRepository.save(this.domainToEntity(call));
      this.callGateway.emitCallUpdate(call);
    }

    return this.mapToResponseDto(call);
  }

  /**
   * Unmute (barge) the supervisor so they can speak
   */
  async supervisorUnmute(callId: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);

    if (!call.supervisorParticipantSid) {
      throw new BadRequestException('No supervisor is injected for this call');
    }

    const provider = this.selectProvider(call.to);
    if (provider === 'infobip') {
      this.logger?.warn?.('Infobip supervisor mute/unmute not implemented');
      throw new BadRequestException('Supervisor mute/unmute not supported for Infobip at this time');
    } else {
      const externalId = call.twilioSid || callId;
      await this.twilioAdapter.setParticipantMuted(externalId, call.supervisorParticipantSid, false);
    }

    this.callGateway.emitCallUpdate(call);
    return this.mapToResponseDto(call);
  }

  /**
   * Mute the supervisor so they are in whisper mode
   */
  async supervisorMute(callId: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);

    if (!call.supervisorParticipantSid) {
      throw new BadRequestException('No supervisor is injected for this call');
    }

    const provider = this.selectProvider(call.to);
    if (provider === 'infobip') {
      this.logger?.warn?.('Infobip supervisor mute/unmute not implemented');
      throw new BadRequestException('Supervisor mute/unmute not supported for Infobip at this time');
    } else {
      const externalId = call.twilioSid || callId;
      await this.twilioAdapter.setParticipantMuted(externalId, call.supervisorParticipantSid, true);
    }

    this.callGateway.emitCallUpdate(call);
    return this.mapToResponseDto(call);
  }

  /**
   * Puts a call on hold.
   */
  async holdCall(callId: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);
    
    try {
      this.stateMachine.holdCall(call);
      await this.callRepository.save(this.domainToEntity(call));
      this.callGateway.emitCallUpdate(call);
      return this.mapToResponseDto(call);
    } catch (error) {
      if (error instanceof CallStateTransitionError) throw new BadRequestException(`Cannot hold call: ${error.message}`);
      throw error;
    }
  }

  /**
   * Resumes a call from hold.
   */
  async resumeCall(callId: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);

    try {
      this.stateMachine.resumeCall(call);
      await this.callRepository.save(this.domainToEntity(call));
      this.callGateway.emitCallUpdate(call);
      return this.mapToResponseDto(call);
    } catch (error) {
      if (error instanceof CallStateTransitionError) throw new BadRequestException(`Cannot resume call: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ends a call.
   */
  async endCall(callId: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);

    try {
      this.stateMachine.endCall(call);
      await this.callRepository.save(this.domainToEntity(call));
      
      const provider = this.selectProvider(call.to);
      if (provider === 'infobip') {
        await this.infobipAdapter.endCall(callId);
      } else {
        // Use stored Twilio SID for provider operations when available
        const externalId = call.twilioSid || callId;
        await this.twilioAdapter.endCall(externalId);
      }
      
      this.callGateway.emitCallUpdate(call);
      return this.mapToResponseDto(call);
    } catch (error) {
      if (error instanceof CallStateTransitionError) throw new BadRequestException(`Cannot end call: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gets all calls that are not in the ENDED state.
   */
  async getActiveCalls(): Promise<CallResponseDto[]> {
    const activeEntities = await this.callRepository.find({ where: { state: Not(CallState.ENDED) } });
    return activeEntities.map(entity => this.mapToResponseDto(this.entityToDomain(entity)));
  }

  /**
   * Legacy: Handles an incoming call webhook from Twilio.
   * Replaced by `handleTwilioStatusCallback` which handles all status callbacks
   * and is idempotent. Kept for compatibility but delegates to the unified handler.
   */
  async handleIncomingCall(twilioPayload: any) {
    // Deprecated path kept for compatibility — delegate to unified handler.
    console.warn('handleIncomingCall is deprecated. Use handleTwilioStatusCallback instead.');
    await this.handleTwilioStatusCallback(twilioPayload);
  }

  /**
   * Legacy: Handles a call ended webhook from Twilio.
   * Replaced by `handleTwilioStatusCallback`. Kept but delegates.
   */
  async handleCallEnded(callId: string) {
    console.warn('handleCallEnded is deprecated. Use handleTwilioStatusCallback instead.');
    await this.handleTwilioStatusCallback({ CallSid: callId, CallStatus: 'completed' });
  }

  /**
   * Unified handler for Twilio status callbacks and inbound voice requests.
   * - Finds or creates the corresponding Call entity (by `twilioSid` or `id`).
   * - Applies idempotent, state-machine-driven transitions for statuses:
   *   queued, ringing -> RINGING
   *   in-progress/answered -> ANSWERED
   *   completed/failed/busy/no-answer/canceled -> ENDED
   */
  async handleTwilioStatusCallback(twilioPayload: any) {
    const callSid = twilioPayload.CallSid;
    const status = (twilioPayload.CallStatus || '').toLowerCase();
    const isInbound = twilioPayload.Direction === 'inbound' || false;

    // Try to find by twilioSid first (outbound calls from us), then by id (inbound where id==CallSid)
    let callEntity = await this.callRepository.findOneBy({ twilioSid: callSid } as any);
    if (!callEntity) {
      callEntity = await this.callRepository.findOneBy({ id: callSid } as any);
    }

    // If call does not exist and Twilio reports a new inbound ringing call, create it.
    if (!callEntity && status === 'ringing' && (isInbound || twilioPayload.To?.includes(this.configService.get<string>('TWILIO_PHONE_NUMBER') || ''))) {
      const call = new Call(callSid, twilioPayload.From, twilioPayload.To, CallDirection.INBOUND);
      // Ensure both id and twilioSid are set for mapping
      call.twilioSid = callSid;
      try {
        this.stateMachine.startCall(call);
      } catch (err) {
        console.warn('Cannot start call state machine for inbound call', err?.message || err);
      }
      await this.callRepository.save(this.domainToEntity(call));
      this.callGateway.emitNewCall(call);
      this.callGateway.emitCallUpdate(call);
      this.logger?.log?.(`Created inbound call ${call.id} from ${twilioPayload.From}`);
      return;
    }

    if (!callEntity) {
      // Nothing to do if we can't map this callback to a call record.
      this.logger?.warn?.(`Received Twilio callback for unknown call SID ${callSid} with status ${status}`);
      return;
    }

    // Map entity -> domain
    const call = this.entityToDomain(callEntity);
    // Persist missing twilioSid when possible
    if (!call.twilioSid) {
      call.twilioSid = callSid;
    }

    // Decide transition based on status
    try {
      if (status === 'queued' || status === 'ringing') {
        if (this.stateMachine.canTransition(call, CallState.RINGING)) {
          this.stateMachine.startCall(call);
        }
      } else if (status === 'in-progress' || status === 'answered') {
        if (this.stateMachine.canTransition(call, CallState.ANSWERED)) {
          this.stateMachine.answerCall(call);
        }
      } else if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(status)) {
        if (this.stateMachine.canTransition(call, CallState.ENDED)) {
          this.stateMachine.endCall(call);
        }
      } else {
        // Unknown or unhandled status - log and exit
        this.logger?.debug?.(`Unhandled Twilio status: ${status} for call ${callSid}`);
      }

      // Persist changes and emit update
      const updatedEntity = this.domainToEntity(call);
      await this.callRepository.save(updatedEntity);
      this.callGateway.emitCallUpdate(call);
    } catch (err) {
      if (err instanceof CallStateTransitionError) {
        // Idempotency: if transition not allowed, just log and ignore
        this.logger?.warn?.(`State transition failed for call ${callSid}: ${err.message}`);
      } else {
        this.logger?.error?.('Error handling Twilio callback', err?.stack || err?.message || err);
        throw err;
      }
    }
  }
  
  private async findCallEntityOrFail(callId: string): Promise<CallEntity> {
    const callEntity = await this.callRepository.findOneBy({ id: callId });
    if (!callEntity) {
      throw new NotFoundException(`Call with ID ${callId} not found`);
    }
    return callEntity;
  }

  private entityToDomain(entity: CallEntity): Call {
    const call = new Call(entity.id, entity.from, entity.to, entity.direction);
    call.state = entity.state;
    call.agentId = entity.agentId;
    call.startedAt = entity.startedAt;
    call.answeredAt = entity.answeredAt;
    call.endedAt = entity.endedAt;
    // Map external provider ID
    if ((entity as any).twilioSid) {
      call.twilioSid = (entity as any).twilioSid;
    }
    if ((entity as any).supervisorParticipantSid) {
      call.supervisorParticipantSid = (entity as any).supervisorParticipantSid;
    }
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
    entity.startedAt = call.startedAt ?? new Date();
    entity.answeredAt = call.answeredAt;
    entity.endedAt = call.endedAt;
    // Persist external provider ID
    if ((call as any).twilioSid) {
      (entity as any).twilioSid = (call as any).twilioSid;
    }
    if ((call as any).supervisorParticipantSid) {
      (entity as any).supervisorParticipantSid = (call as any).supervisorParticipantSid;
    }
    return entity;
  }

  private mapToResponseDto(call: Call): CallResponseDto {
    return {
      id: call.id,
      state: call.state,
      direction: call.direction,
      from: call.from,
      to: call.to,
      agentId: call.agentId,
      startedAt: call.startedAt,
      answeredAt: call.answeredAt,
      endedAt: call.endedAt,
      supervisorParticipantSid: call.supervisorParticipantSid,
    };
  }
}
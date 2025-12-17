import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Call, CallState, CallStateMachine, CallStateTransitionError, CallDirection } from '@psynq/core';
import { CreateCallDto, CallResponseDto } from '../dtos/call.dto';
import { CallGateway } from '../call.gateway';
import { TwilioAdapter } from '../adapters/twilio.adapter';
import { InfobipAdapter } from '../adapters/infobip.adapter';
import { CallEntity } from '../entities/call.entity';
import { ConfigService } from '@nestjs/config';
import { CallParticipant, SupervisorControlOptions } from '../interfaces/call-participant.interface';
import { CallParticipantService } from './call-participant.service';
import { StorageService } from '../modules/storage/storage.service';

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
    private readonly callParticipantService: CallParticipantService,
    private readonly storageService: StorageService,
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
      const externalId = await this.twilioAdapter.createCall(call);
      if (externalId) {
        call.externalId = externalId;
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
    const callEntity = await this.callRepository.findOneBy({ externalId: callSid });
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
   * Helper to generate provider-specific participant ID string or object depending on adapter.
   */
  private getProviderParticipantId(adapter: any, supervisor: any): string {
    // If provider-specific data already contains conference+participant SID (Twilio), prefer that
    if (supervisor?.providerSpecificData?.conferenceName && supervisor?.providerSpecificData?.twilioParticipantSid) {
      return `${supervisor.providerSpecificData.conferenceName}:${supervisor.providerSpecificData.twilioParticipantSid}`;
    }

    // Fallback to providerCallSid if available
    if (supervisor?.providerCallSid) return supervisor.providerCallSid;

    // As a final fallback, use participant id
    return supervisor.id;
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
      
      if (agentId) await this.twilioAdapter.bridgeCall(call.externalId || call.id, agentId);
      
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
   * Uses the new participant management approach.
   */
  async injectSupervisor(callId: string, supervisorId: string, options?: SupervisorControlOptions): Promise<CallParticipant> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);

    // Choose adapter based on provider
    const provider = this.selectProvider(call.to);
    const adapter = (provider as string) === 'infobip' ? this.infobipAdapter : this.twilioAdapter;

    const capabilities = adapter.getCapabilities?.();
    if (!capabilities || !capabilities.supportsSupervisorInjection) {
      this.logger?.warn?.('Selected provider does not support supervisor injection');
      throw new BadRequestException('Supervisor injection is not supported for Infobip at this time');
    }

    const externalId = call.externalId || callId;
    const participant = await adapter.injectSupervisor(externalId, supervisorId, options);

    if (participant) {
      // Store the participant information
      await this.callParticipantService.addParticipant({
        callId,
        participantId: supervisorId,
        participantType: 'supervisor',
        providerCallSid: participant.providerCallSid,
        providerSpecificData: participant.providerSpecificData,
        isMuted: participant.isMuted,
        isOnHold: participant.isOnHold
      });
      
      // For backward compatibility, also store the supervisorParticipantSid
      call.providerMetadata = { ...call.providerMetadata, supervisorParticipantSid: participant.providerCallSid };
      await this.callRepository.save(this.domainToEntity(call));
      
      this.callGateway.emitCallUpdate(call);
      
      return participant;
    }

    throw new BadRequestException('Failed to inject supervisor');
  }

  /**
   * Unmute (barge) the supervisor so they can speak
   */
  async supervisorUnmute(callId: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);

    const provider = this.selectProvider(call.to);
    // Infobip-specific: not supported
    if (provider === 'infobip') {
      this.logger?.warn?.('Infobip supervisor mute/unmute not implemented');
      throw new BadRequestException('Supervisor injection is not supported for Infobip at this time');
    }

    // Choose adapter based on selected provider
    const adapter = (provider as string) === 'infobip' ? this.infobipAdapter : this.twilioAdapter;

    const capabilities = adapter.getCapabilities();
    if (!capabilities.supportsParticipantMute) {
      this.logger?.warn?.('Selected provider does not support participant mute/unmute');
      throw new BadRequestException('Supervisor mute/unmute not supported for this provider at this time');
    }

    // Find the supervisor participant
    const supervisors = await this.callParticipantService.getSupervisorsByCallId(callId);
    if (supervisors.length === 0) {
      throw new BadRequestException('No supervisor is injected for this call');
    }

    const supervisor = supervisors[0]; // Get the first supervisor

    // Prefer explicit Twilio conference-based id when present
    let participantId: string;
    if (supervisor?.providerSpecificData?.conferenceName && supervisor?.providerSpecificData?.twilioParticipantSid) {
      participantId = `${supervisor.providerSpecificData.conferenceName}:${supervisor.providerSpecificData.twilioParticipantSid}`;
    } else {
      participantId = this.getProviderParticipantId(adapter, supervisor);
    }

    await adapter.setParticipantMuted(participantId, false);
    
    // Update the participant in our database
    await this.callParticipantService.updateParticipantMuteState(supervisor.id, false);

    this.callGateway.emitCallUpdate(call);
    return this.mapToResponseDto(call);
  }

  /**
   * Mute the supervisor so they are in whisper mode
   */
  async supervisorMute(callId: string): Promise<CallResponseDto> {
    const callEntity = await this.findCallEntityOrFail(callId);
    const call = this.entityToDomain(callEntity);

    const provider = this.selectProvider(call.to);
    const adapter = (provider as string) === 'infobip' ? this.infobipAdapter : this.twilioAdapter;

    if (provider === 'infobip') {
      this.logger?.warn?.('Infobip supervisor mute/unmute not implemented');
      throw new BadRequestException('Supervisor injection is not supported for Infobip at this time');
    }

    const capabilities = adapter.getCapabilities?.();
    if (!capabilities || !capabilities.supportsParticipantMute) {
      this.logger?.warn?.('Selected provider does not support participant mute/unmute');
      throw new BadRequestException('Supervisor mute/unmute not supported for this provider at this time');
    }

    // Find the supervisor participant
    const supervisors = await this.callParticipantService.getSupervisorsByCallId(callId);
    if (!supervisors || supervisors.length === 0) {
      throw new BadRequestException('No supervisor is injected for this call');
    }

    const supervisor = supervisors[0]; // Get the first supervisor

    // Prefer explicit Twilio conference-based id when present
    let participantId: string;
    if (supervisor?.providerSpecificData?.conferenceName && supervisor?.providerSpecificData?.twilioParticipantSid) {
      participantId = `${supervisor.providerSpecificData.conferenceName}:${supervisor.providerSpecificData.twilioParticipantSid}`;
    } else {
      participantId = this.getProviderParticipantId(adapter, supervisor);
    }

    await adapter.setParticipantMuted(participantId, true);
    
    // Update the participant in our database
    await this.callParticipantService.updateParticipantMuteState(supervisor.id, true);

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
        const externalId = call.externalId || callId;
        await this.twilioAdapter.endCall(externalId);
      }
      
      this.callGateway.emitCallUpdate(call);

      // When a call is ended via API, also reconcile any related active calls so the UI
      // doesn't show duplicates (e.g. child/inbound leg still in RINGING).
      try {
        await this.cleanupRelatedActiveCalls(call);
      } catch (cleanupErr) {
        this.logger?.warn?.(`Cleanup of related calls failed for call ${call.id}: ${cleanupErr?.message || cleanupErr}`);
      }

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
   * - For child call legs (with ParentCallSid), updates the parent call instead of creating separate entries.
   */
  async handleTwilioStatusCallback(twilioPayload: any) {
    this.logger?.debug?.(`Twilio callback payload: ${JSON.stringify(twilioPayload)}`);
    const callSid = twilioPayload.CallSid;
    const status = (twilioPayload.CallStatus || '').toLowerCase();
    const isInbound = twilioPayload.Direction === 'inbound' || false;
    const parentCallSid = twilioPayload.ParentCallSid;

    // If this is a child leg, find and update the parent call instead
    if (parentCallSid) {
      const parentEntity = await this.callRepository.findOneBy({ externalId: parentCallSid });
      if (parentEntity) {
        const parentCall = this.entityToDomain(parentEntity);
        // Update parent call state based on child status
        try {
          if (status === 'queued' || status === 'ringing') {
            if (this.stateMachine.canTransition(parentCall, CallState.RINGING)) {
              this.stateMachine.startCall(parentCall);
            }
          } else if (status === 'in-progress' || status === 'answered') {
            if (this.stateMachine.canTransition(parentCall, CallState.ANSWERED)) {
              this.stateMachine.answerCall(parentCall);
            }
          } else if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(status)) {
            if (this.stateMachine.canTransition(parentCall, CallState.ENDED)) {
              this.stateMachine.endCall(parentCall);
            }
          }
          // Persist and emit update for parent
          const updatedEntity = this.domainToEntity(parentCall);
          await this.callRepository.save(updatedEntity);
          this.callGateway.emitCallUpdate(parentCall);
          this.logger?.log?.(`Updated parent call ${parentCall.id} via child leg ${callSid} status ${status}`);

          // If child reported an end state, ensure related active calls are reconciled (ended)
          if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(status)) {
            try {
              await this.cleanupRelatedActiveCalls(parentCall);
            } catch (cleanupErr) {
              this.logger?.warn?.(`Cleanup of related calls failed for parent ${parentCall.id}: ${cleanupErr?.message || cleanupErr}`);
            }
          }
        } catch (err) {
          if (err instanceof CallStateTransitionError) {
            this.logger?.warn?.(`State transition failed for parent call ${parentCall.id}: ${err.message}`);
          } else {
            this.logger?.error?.('Error updating parent call', err?.stack || err?.message || err);
            throw err;
          }
        }
        return; // Don't process child as separate call
      } else {
        this.logger?.warn?.(`Parent call ${parentCallSid} not found for child leg ${callSid}`);
        return;
      }
    }

    // Try to find by twilioSid first (outbound calls from us), then by id (inbound where id==CallSid)
    let callEntity = await this.callRepository.findOneBy({ externalId: callSid } as any);
    if (!callEntity) {
      callEntity = await this.callRepository.findOneBy({ id: callSid } as any);
    }

    // If call does not exist and Twilio reports a new inbound ringing call, create it.
    // But first, check if this might be a child leg for an existing outbound call to the same number
    if (!callEntity && status === 'ringing' && (isInbound || twilioPayload.To?.includes(this.configService.get<string>('TWILIO_PHONE_NUMBER') || ''))) {
      const existingOutbound = await this.callRepository.findOne({
        where: {
          direction: CallDirection.OUTBOUND,
          to: twilioPayload.To,
          state: Not(CallState.ENDED)
        }
      });
      if (existingOutbound) {
        // Update the existing outbound call instead of creating new inbound
        const call = this.entityToDomain(existingOutbound);
        // Already ringing, but perhaps transition if needed
        await this.callRepository.save(this.domainToEntity(call));
        this.callGateway.emitCallUpdate(call);
        this.logger?.log?.(`Updated existing outbound call ${call.id} for potential child leg ringing`);
        return;
      }

      const call = new Call(callSid, twilioPayload.From, twilioPayload.To, CallDirection.INBOUND);
      // Ensure both id and twilioSid are set for mapping
      call.externalId = callSid;
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
    if (!call.externalId) {
      call.externalId = callSid;
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

      // If this call ended, try to reconcile and end any related active calls
      if (call.state === CallState.ENDED) {
        try {
          await this.cleanupRelatedActiveCalls(call);
        } catch (cleanupErr) {
          this.logger?.warn?.(`Cleanup of related calls failed for call ${call.id}: ${cleanupErr?.message || cleanupErr}`);
        }

        // Try to upload recording if available
        try {
          const recording = await this.twilioAdapter.getRecording(call.externalId || callSid);
          if (recording) {
            await this.storageService.uploadRecording(call.id, recording, 'audio/wav');
            this.logger?.log?.(`Uploaded recording for call ${call.id}`);
          }
        } catch (uploadErr) {
          this.logger?.warn?.(`Failed to upload recording for call ${call.id}: ${uploadErr?.message || uploadErr}`);
        }
      }
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
    if (entity.externalId) {
      call.externalId = entity.externalId;
    }
    if (entity.parentCallSid) {
      call.parentCallSid = entity.parentCallSid;
    }
    if (entity.providerMetadata) {
      call.providerMetadata = entity.providerMetadata;
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
    if (call.externalId) {
      entity.externalId = call.externalId;
    }
    if (call.parentCallSid) {
      entity.parentCallSid = call.parentCallSid;
    }
    if (call.providerMetadata) {
      entity.providerMetadata = call.providerMetadata;
    }
    return entity;
  }

  private async cleanupRelatedActiveCalls(call: Call) {
    // Find other active calls with the same endpoints or explicit parent linkage
    const relatedEntities = await this.callRepository.find({
      where: [
        { to: call.to, from: call.from, state: Not(CallState.ENDED) },
        { to: call.from, from: call.to, state: Not(CallState.ENDED) },
        { parentCallSid: call.externalId, state: Not(CallState.ENDED) },
        { parentCallSid: call.id, state: Not(CallState.ENDED) }
      ]
    });

    for (const entity of relatedEntities) {
      if (entity.id === call.id) continue;
      const relatedCall = this.entityToDomain(entity);
      try {
        if (this.stateMachine.canTransition(relatedCall, CallState.ENDED)) {
          this.stateMachine.endCall(relatedCall);
        } else {
          // Force end if state machine cannot transition (last resort)
          relatedCall.state = CallState.ENDED;
          relatedCall.endedAt = new Date();
        }
        await this.callRepository.save(this.domainToEntity(relatedCall));
        this.callGateway.emitCallUpdate(relatedCall);
        this.logger?.log?.(`Ended related call ${relatedCall.id} because ${call.id} transitioned to ENDED`);
      } catch (err) {
        this.logger?.warn?.(`Failed to end related call ${relatedCall.id}: ${err?.message || err}`);
      }
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
      startedAt: call.startedAt,
      answeredAt: call.answeredAt,
      endedAt: call.endedAt,
      supervisorParticipantSid: call.providerMetadata?.supervisorParticipantSid,
    };
  }
}
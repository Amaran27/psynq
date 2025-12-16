import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { Call, CallState, CallStateMachine, CallStateTransitionError, CallDirection } from '@psynq/core';
import { CreateCallDto, CallResponseDto } from '../dtos/call.dto';
import { CallGateway } from '../call.gateway';
import { TwilioAdapter } from '../adapters/twilio.adapter';
import { InfobipAdapter } from '../telephony/infobip.adapter';

@Injectable()
export class CallService {
  private calls = new Map<string, Call>();
  private stateMachine = new CallStateMachine();

  constructor(
    @Inject(forwardRef(() => CallGateway)) private readonly callGateway: CallGateway,
    private readonly twilioAdapter: TwilioAdapter,
    private readonly infobipAdapter: InfobipAdapter
  ) {
    // Set up Twilio event handlers (placeholder for webhooks)
    // this.twilioAdapter.setCallReceivedCallback((call) => this.handleIncomingCall(call));
    // this.twilioAdapter.setCallEndedCallback((callId) => this.handleCallEnded(callId));
  }

  /**
   * Creates a new outbound call via selected provider
   */
  async createCall(createCallDto: CreateCallDto): Promise<CallResponseDto> {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const call = new Call(callId, createCallDto.from, createCallDto.to, CallDirection.OUTBOUND);

    if (createCallDto.agentId) {
      call.agentId = createCallDto.agentId;
    }

    // Start the call (transition to RINGING)
    this.stateMachine.startCall(call);

    this.calls.set(callId, call);
    this.callGateway.emitNewCall(call);

    // Select provider based on destination or environment variable
    const provider = this.selectProvider(createCallDto.to);
    
    // Initiate outbound call via selected provider
    if (provider === 'infobip') {
      console.log('Using Infobip for outbound call');
      await this.infobipAdapter.makeCall({
        from: createCallDto.from,
        to: createCallDto.to,
        callId: call.id,
        agentId: call.agentId,
      });
    } else {
      console.log('Using Twilio for outbound call');
      await this.twilioAdapter.createCall(call);
    }

    // For outbound calls, mark as answered since agent initiated it
    call.state = CallState.ANSWERED;
    call.answeredAt = new Date();

    return this.mapToResponseDto(call);
  }

  /**
   * Selects the best telephony provider based on destination and configuration
   */
  private selectProvider(to: string): 'infobip' | 'twilio' {
    const configuredProvider = process.env.TELEPHONY_PROVIDER as 'infobip' | 'twilio';
    
    // If explicitly configured, use that
    if (configuredProvider && ['infobip', 'twilio'].includes(configuredProvider)) {
      return configuredProvider;
    }
    
    // Auto-select based on destination: Infobip for Indian numbers, Twilio for others
    if (to.startsWith('+91')) {
      return 'infobip'; // Infobip for Indian numbers
    }
    
    return 'twilio'; // Default to Twilio for international
  }

  /**
   * Gets a call by ID
   */
  getCall(callId: string): CallResponseDto {
    const call = this.calls.get(callId);
    if (!call) {
      throw new NotFoundException(`Call with ID ${callId} not found`);
    }
    return this.mapToResponseDto(call);
  }

  /**
   * Answers a ringing call
   */
  async answerCall(callId: string, agentId?: string): Promise<CallResponseDto> {
    const call = this.calls.get(callId);
    if (!call) {
      throw new NotFoundException(`Call with ID ${callId} not found`);
    }

    try {
      this.stateMachine.answerCall(call);
      if (agentId) {
        call.agentId = agentId;
        // Bridge the call to the agent via Twilio
        await this.twilioAdapter.bridgeCall(call.id, agentId);
      }
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
   * Puts a call on hold
   */
  holdCall(callId: string): CallResponseDto {
    const call = this.calls.get(callId);
    if (!call) {
      throw new NotFoundException(`Call with ID ${callId} not found`);
    }

    try {
      this.stateMachine.holdCall(call);
      this.callGateway.emitCallUpdate(call);
      return this.mapToResponseDto(call);
    } catch (error) {
      if (error instanceof CallStateTransitionError) {
        throw new BadRequestException(`Cannot hold call: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Resumes a call from hold
   */
  resumeCall(callId: string): CallResponseDto {
    const call = this.calls.get(callId);
    if (!call) {
      throw new NotFoundException(`Call with ID ${callId} not found`);
    }

    try {
      this.stateMachine.resumeCall(call);
      this.callGateway.emitCallUpdate(call);
      return this.mapToResponseDto(call);
    } catch (error) {
      if (error instanceof CallStateTransitionError) {
        throw new BadRequestException(`Cannot resume call: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Ends a call
   */
  async endCall(callId: string): Promise<CallResponseDto> {
    const call = this.calls.get(callId);
    if (!call) {
      throw new NotFoundException(`Call with ID ${callId} not found`);
    }

    try {
      this.stateMachine.endCall(call);
      
      // End call via selected provider based on destination
      const provider = this.selectProvider(call.to);
      if (provider === 'infobip') {
        await this.infobipAdapter.endCall(callId);
      } else {
        await this.twilioAdapter.endCall(callId);
      }
      
      this.callGateway.emitCallUpdate(call);
      return this.mapToResponseDto(call);
    } catch (error) {
      if (error instanceof CallStateTransitionError) {
        throw new BadRequestException(`Cannot end call: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Gets all active calls
   */
  getActiveCalls(): CallResponseDto[] {
    return Array.from(this.calls.values())
      .filter(call => call.state !== CallState.ENDED)
      .map(call => this.mapToResponseDto(call));
  }

  private handleIncomingCall(call: Call) {
    this.calls.set(call.id, call);
    this.callGateway.emitNewCall(call);
  }

  private handleCallEnded(callId: string) {
    const call = this.calls.get(callId);
    if (call) {
      call.state = CallState.ENDED;
      call.endedAt = new Date();
      this.callGateway.emitCallUpdate(call);
      // Optionally remove from active calls after a delay
      setTimeout(() => {
        this.calls.delete(callId);
      }, 5000);
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
    };
  }
}
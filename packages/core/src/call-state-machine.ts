import { Call, CallState } from './call.js';

export class CallStateTransitionError extends Error {
  constructor(currentState: CallState, attemptedState: CallState) {
    super(`Cannot transition call from ${currentState} to ${attemptedState}`);
    this.name = 'CallStateTransitionError';
  }
}

export class CallStateMachine {
  /**
   * Validates if a state transition is allowed
   */
  canTransition(call: Call, newState: CallState): boolean {
    const currentState = call.state;

    switch (newState) {
      case CallState.RINGING:
        return currentState === CallState.IDLE;

      case CallState.ANSWERED:
        return currentState === CallState.RINGING || currentState === CallState.ON_HOLD;

      case CallState.ON_HOLD:
        return currentState === CallState.ANSWERED;

      case CallState.ENDED:
        return currentState !== CallState.ENDED; // Can end from any active state

      default:
        return false;
    }
  }

  /**
   * Transitions call to RINGING state (inbound call arrives)
   */
  startCall(call: Call): void {
    if (!this.canTransition(call, CallState.RINGING)) {
      throw new CallStateTransitionError(call.state, CallState.RINGING);
    }

    call.state = CallState.RINGING;
    // Note: startedAt would be set when call is created
  }

  /**
   * Transitions call to ANSWERED state (agent answers)
   */
  answerCall(call: Call): void {
    if (!this.canTransition(call, CallState.ANSWERED)) {
      throw new CallStateTransitionError(call.state, CallState.ANSWERED);
    }

    call.state = CallState.ANSWERED;
    call.answeredAt = new Date();
  }

  /**
   * Transitions call to ON_HOLD state
   */
  holdCall(call: Call): void {
    if (!this.canTransition(call, CallState.ON_HOLD)) {
      throw new CallStateTransitionError(call.state, CallState.ON_HOLD);
    }

    call.state = CallState.ON_HOLD;
  }

  /**
   * Transitions call from ON_HOLD back to ANSWERED
   */
  resumeCall(call: Call): void {
    if (!this.canTransition(call, CallState.ANSWERED)) {
      throw new CallStateTransitionError(call.state, CallState.ANSWERED);
    }

    call.state = CallState.ANSWERED;
  }

  /**
   * Transitions call to ENDED state (call terminates)
   */
  endCall(call: Call): void {
    if (!this.canTransition(call, CallState.ENDED)) {
      throw new CallStateTransitionError(call.state, CallState.ENDED);
    }

    call.state = CallState.ENDED;
    call.endedAt = new Date();
  }

  /**
   * Gets all valid transitions from current state
   */
  getValidTransitions(call: Call): CallState[] {
    return Object.values(CallState).filter(state =>
      state !== call.state && this.canTransition(call, state)
    );
  }
}
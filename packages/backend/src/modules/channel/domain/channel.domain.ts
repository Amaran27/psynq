/**
 * Channel Domain Entity
 * 
 * Pure TypeScript domain model following Hexagonal Architecture principles.
 * Contains all business logic for channel management - no framework dependencies.
 * 
 * Channel represents a single call leg (a communication channel).
 * Manages call state transitions, hold/unhold operations, and media operations.
 */

/**
 * Channel state follows Asterisk ARI channel states
 */
export enum ChannelState {
  DOWN = 'Down',           // Channel is down and available
  RESERVED = 'Rsrvd',      // Channel is reserved
  OFF_HOOK = 'OffHook',    // Channel is off hook
  DIALING = 'Dialing',     // Channel is dialing
  RING = 'Ring',           // Channel is ringing (local)
  RINGING = 'Ringing',     // Channel is ringing (remote)
  UP = 'Up',               // Channel is up (active call)
  BUSY = 'Busy',           // Channel is busy
  DIALING_OFFHOOK = 'DialingOffHook',
  PRE_RING = 'PreRing',
  UNKNOWN = 'Unknown',
}

/**
 * Channel direction
 */
export enum ChannelDirection {
  INBOUND = 'inbound',     // Incoming call
  OUTBOUND = 'outbound',   // Outgoing call
}

/**
 * Domain-specific exceptions for business rule validation
 */
export class ChannelBusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChannelBusinessError';
  }
}

export class ChannelEndedError extends ChannelBusinessError {
  constructor(channelId: string) {
    super(`Channel ${channelId} has ended and cannot be modified`);
    this.name = 'ChannelEndedError';
  }
}

export class InvalidChannelStateError extends ChannelBusinessError {
  constructor(currentState: ChannelState, expectedStates: ChannelState[]) {
    super(
      `Invalid channel state: ${currentState}. Expected one of: ${expectedStates.join(', ')}`,
    );
    this.name = 'InvalidChannelStateError';
  }
}

export class ChannelAlreadyAnsweredError extends ChannelBusinessError {
  constructor(channelId: string) {
    super(`Channel ${channelId} is already answered`);
    this.name = 'ChannelAlreadyAnsweredError';
  }
}

/**
 * Channel Domain Entity
 * 
 * Rich domain model with encapsulated business logic.
 * All state changes happen through methods that enforce business rules.
 */
export class Channel {
  private _answeredAt: Date | null = null;
  private _endedAt: Date | null = null;

  private constructor(
    public readonly id: string,
    public organizationId: string | undefined,
    public callId: string | undefined,
    public bridgeId: string | undefined,
    public state: ChannelState,
    public direction: ChannelDirection,
    public callerName: string,
    public callerNumber: string,
    public connectedName: string | undefined,
    public connectedNumber: string | undefined,
    public dialedNumber: string | undefined,
    public language: string | undefined,
    public accountCode: string | undefined,
    public channelvars: Record<string, string> | undefined,
    public providerMetadata: Record<string, any> | undefined,
    public createdAt: Date,
    answeredAt: Date | null,
    endedAt: Date | null,
  ) {
    this._answeredAt = answeredAt;
    this._endedAt = endedAt;
  }

  /**
   * Factory method to create a new channel
   */
  static create(params: {
    id: string;
    organizationId?: string;
    callId?: string;
    endpoint: string;
    direction?: ChannelDirection;
    callerId?: string;
    channelvars?: Record<string, string>;
  }): Channel {
    const now = new Date();
    return new Channel(
      params.id,
      params.organizationId,
      params.callId,
      undefined, // bridgeId
      ChannelState.DOWN, // Initial state
      params.direction ?? ChannelDirection.OUTBOUND,
      params.callerId || 'Unknown',
      params.callerId || 'Unknown',
      undefined, // connectedName
      undefined, // connectedNumber
      params.endpoint, // dialedNumber
      undefined, // language
      undefined, // accountCode
      params.channelvars,
      undefined, // providerMetadata
      now,
      null, // answeredAt
      null, // endedAt
    );
  }

  /**
   * Factory method to reconstruct channel from persistence
   */
  static fromPersistence(data: {
    id: string;
    organizationId: string | null;
    callId: string | null;
    bridgeId: string | null;
    state: ChannelState;
    direction: ChannelDirection;
    callerName: string;
    callerNumber: string;
    connectedName: string | null;
    connectedNumber: string | null;
    dialedNumber: string | null;
    language: string | null;
    accountCode: string | null;
    channelvars: Record<string, any> | null;
    providerMetadata: Record<string, any> | null;
    createdAt: Date;
    answeredAt: Date | null;
    endedAt: Date | null;
  }): Channel {
    return new Channel(
      data.id,
      data.organizationId ?? undefined,
      data.callId ?? undefined,
      data.bridgeId ?? undefined,
      data.state,
      data.direction,
      data.callerName,
      data.callerNumber,
      data.connectedName ?? undefined,
      data.connectedNumber ?? undefined,
      data.dialedNumber ?? undefined,
      data.language ?? undefined,
      data.accountCode ?? undefined,
      data.channelvars ?? undefined,
      data.providerMetadata ?? undefined,
      data.createdAt,
      data.answeredAt,
      data.endedAt,
    );
  }

  /**
   * Convert to persistence format (for TypeORM entity)
   */
  toPersistence(): {
    id: string;
    organizationId: string | null;
    callId: string | null;
    bridgeId: string | null;
    state: ChannelState;
    direction: ChannelDirection;
    callerName: string;
    callerNumber: string;
    connectedName: string | null;
    connectedNumber: string | null;
    dialedNumber: string | null;
    language: string | null;
    accountCode: string | null;
    channelvars: Record<string, any> | null;
    providerMetadata: Record<string, any> | null;
    createdAt: Date;
    answeredAt: Date | null;
    endedAt: Date | null;
  } {
    return {
      id: this.id,
      organizationId: this.organizationId ?? null,
      callId: this.callId ?? null,
      bridgeId: this.bridgeId ?? null,
      state: this.state,
      direction: this.direction,
      callerName: this.callerName,
      callerNumber: this.callerNumber,
      connectedName: this.connectedName ?? null,
      connectedNumber: this.connectedNumber ?? null,
      dialedNumber: this.dialedNumber ?? null,
      language: this.language ?? null,
      accountCode: this.accountCode ?? null,
      channelvars: this.channelvars ?? null,
      providerMetadata: this.providerMetadata ?? null,
      createdAt: this.createdAt,
      answeredAt: this._answeredAt,
      endedAt: this._endedAt,
    };
  }

  // ========== Business Logic Methods ==========

  /**
   * Answer the channel
   * @throws ChannelEndedError if channel has ended
   * @throws InvalidChannelStateError if not in RING or RINGING state
   * @throws ChannelAlreadyAnsweredError if already answered
   */
  answer(): void {
    this.ensureNotEnded();

    if (this._answeredAt) {
      throw new ChannelAlreadyAnsweredError(this.id);
    }

    const validStates = [ChannelState.RING, ChannelState.RINGING];
    if (!validStates.includes(this.state)) {
      throw new InvalidChannelStateError(this.state, validStates);
    }

    this.state = ChannelState.UP;
    this._answeredAt = new Date();
  }

  /**
   * Hang up the channel
   * Idempotent - safe to call multiple times
   */
  hangup(reason?: string): void {
    if (this._endedAt) {
      return; // Already ended
    }

    this.state = ChannelState.DOWN;
    this._endedAt = new Date();
    // Could store reason in providerMetadata if needed
  }

  /**
   * Update state from external event (Asterisk ARI webhook)
   * This allows the domain to stay in sync with telephony provider state
   */
  updateState(newState: ChannelState): void {
    // Auto-set answeredAt if transitioning to UP
    if (newState === ChannelState.UP && !this._answeredAt) {
      this._answeredAt = new Date();
    }

    this.state = newState;
  }

  /**
   * Update connected party information
   */
  updateConnectedParty(name: string | undefined, number: string | undefined): void {
    this.connectedName = name;
    this.connectedNumber = number;
  }

  /**
   * Update provider metadata
   */
  updateProviderMetadata(metadata: Record<string, any>): void {
    this.providerMetadata = {
      ...this.providerMetadata,
      ...metadata,
    };
  }

  // ========== Query Methods ==========

  /**
   * Check if channel is active (not ended)
   */
  isActive(): boolean {
    return this._endedAt === null;
  }

  /**
   * Check if channel is answered
   */
  isAnswered(): boolean {
    return this._answeredAt !== null;
  }

  /**
   * Check if channel is in a specific state
   */
  isInState(...states: ChannelState[]): boolean {
    return states.includes(this.state);
  }

  /**
   * Check if channel can play media (must be UP and active)
   */
  canPlayMedia(): boolean {
    return this.isActive() && this.state === ChannelState.UP;
  }

  /**
   * Get answered timestamp
   */
  get answeredAt(): Date | null {
    return this._answeredAt;
  }

  /**
   * Get ended timestamp
   */
  get endedAt(): Date | null {
    return this._endedAt;
  }

  /**
   * Get call duration in seconds (null if not answered)
   */
  getCallDuration(): number | null {
    if (!this._answeredAt) {
      return null;
    }

    const endTime = this._endedAt || new Date();
    return Math.floor((endTime.getTime() - this._answeredAt.getTime()) / 1000);
  }

  // ========== Private Helper Methods ==========

  /**
   * Ensure channel is not ended
   * @throws ChannelEndedError if channel is ended
   */
  private ensureNotEnded(): void {
    if (this._endedAt) {
      throw new ChannelEndedError(this.id);
    }
  }
}

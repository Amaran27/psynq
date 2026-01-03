/**
 * Bridge Domain Entity
 * 
 * Pure TypeScript domain model following Hexagonal Architecture principles.
 * Contains all business logic for bridge management - no framework dependencies.
 * 
 * Bridge represents a conference/mixing point that connects multiple channels
 * for call conferencing, queuing, or media mixing operations.
 */

/**
 * Bridge type determines mixing behavior
 */
export enum BridgeType {
  MIXING = 'mixing',       // All participants mixed together (conference)
  HOLDING = 'holding',     // One-to-many (music on hold, announcements)
  PROXY = 'proxy',         // Pass-through without mixing
}

/**
 * Bridge technology implementation
 */
export enum BridgeTechnology {
  SOFTMIX = 'softmix',     // Software-based mixing
  NATIVE = 'native',       // Native/hardware mixing
}

/**
 * Domain-specific exceptions for business rule validation
 */
export class BridgeBusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BridgeBusinessError';
  }
}

export class BridgeDestroyedError extends BridgeBusinessError {
  constructor(bridgeId: string) {
    super(`Bridge ${bridgeId} has been destroyed and cannot be modified`);
    this.name = 'BridgeDestroyedError';
  }
}

export class ChannelAlreadyInBridgeError extends BridgeBusinessError {
  constructor(channelId: string, bridgeId: string) {
    super(`Channel ${channelId} is already in bridge ${bridgeId}`);
    this.name = 'ChannelAlreadyInBridgeError';
  }
}

export class ChannelNotInBridgeError extends BridgeBusinessError {
  constructor(channelId: string, bridgeId: string) {
    super(`Channel ${channelId} is not in bridge ${bridgeId}`);
    this.name = 'ChannelNotInBridgeError';
  }
}

export class RecordingAlreadyStartedError extends BridgeBusinessError {
  constructor(bridgeId: string) {
    super(`Bridge ${bridgeId} is already recording`);
    this.name = 'RecordingAlreadyStartedError';
  }
}

export class RecordingNotActiveError extends BridgeBusinessError {
  constructor(bridgeId: string) {
    super(`Bridge ${bridgeId} does not have an active recording`);
    this.name = 'RecordingNotActiveError';
  }
}

/**
 * Bridge Domain Entity
 * 
 * Rich domain model with encapsulated business logic.
 * All state changes happen through methods that enforce business rules.
 */
export class Bridge {
  private _destroyedAt: Date | null = null;

  private constructor(
    public readonly id: string,
    public name: string,
    public bridgeType: BridgeType,
    public technology: BridgeTechnology,
    public organizationId: string | undefined,
    public channelIds: string[],
    public isRecording: boolean,
    public recordingName: string | undefined,
    public createdAt: Date,
    destroyedAt: Date | null,
  ) {
    this._destroyedAt = destroyedAt;
  }

  /**
   * Factory method to create a new bridge
   */
  static create(params: {
    id: string;
    name: string;
    bridgeType?: BridgeType;
    technology?: BridgeTechnology;
    organizationId?: string;
  }): Bridge {
    const now = new Date();
    return new Bridge(
      params.id,
      params.name,
      params.bridgeType ?? BridgeType.MIXING,
      params.technology ?? BridgeTechnology.SOFTMIX,
      params.organizationId,
      [], // Start with no channels
      false, // Not recording
      undefined,
      now,
      null,
    );
  }

  /**
   * Factory method to reconstruct bridge from persistence
   */
  static fromPersistence(data: {
    id: string;
    name: string;
    bridgeType: BridgeType;
    technology: BridgeTechnology;
    organizationId: string | null;
    channelIds: string[];
    isRecording: boolean;
    recordingName: string | null;
    createdAt: Date;
    destroyedAt: Date | null;
  }): Bridge {
    return new Bridge(
      data.id,
      data.name,
      data.bridgeType,
      data.technology,
      data.organizationId ?? undefined,
      data.channelIds ?? [],
      data.isRecording,
      data.recordingName ?? undefined,
      data.createdAt,
      data.destroyedAt,
    );
  }

  /**
   * Convert to persistence format (for TypeORM entity)
   */
  toPersistence(): {
    id: string;
    name: string;
    bridgeType: BridgeType;
    technology: BridgeTechnology;
    organizationId: string | null;
    channelIds: string[];
    isRecording: boolean;
    recordingName: string | null;
    createdAt: Date;
    destroyedAt: Date | null;
  } {
    return {
      id: this.id,
      name: this.name,
      bridgeType: this.bridgeType,
      technology: this.technology,
      organizationId: this.organizationId ?? null,
      channelIds: this.channelIds,
      isRecording: this.isRecording,
      recordingName: this.recordingName ?? null,
      createdAt: this.createdAt,
      destroyedAt: this._destroyedAt,
    };
  }

  // ========== Business Logic Methods ==========

  /**
   * Add a channel to the bridge
   * @throws BridgeDestroyedError if bridge is destroyed
   * @throws ChannelAlreadyInBridgeError if channel already present
   */
  addChannel(channelId: string): void {
    this.ensureNotDestroyed();

    if (this.channelIds.includes(channelId)) {
      throw new ChannelAlreadyInBridgeError(channelId, this.id);
    }

    this.channelIds = [...this.channelIds, channelId];
  }

  /**
   * Remove a channel from the bridge
   * @throws BridgeDestroyedError if bridge is destroyed
   * @throws ChannelNotInBridgeError if channel not present
   */
  removeChannel(channelId: string): void {
    this.ensureNotDestroyed();

    if (!this.channelIds.includes(channelId)) {
      throw new ChannelNotInBridgeError(channelId, this.id);
    }

    this.channelIds = this.channelIds.filter(id => id !== channelId);
  }

  /**
   * Start recording the bridge
   * @throws BridgeDestroyedError if bridge is destroyed
   * @throws RecordingAlreadyStartedError if already recording
   */
  startRecording(recordingName: string): void {
    this.ensureNotDestroyed();

    if (this.isRecording) {
      throw new RecordingAlreadyStartedError(this.id);
    }

    this.isRecording = true;
    this.recordingName = recordingName;
  }

  /**
   * Stop recording the bridge
   * @throws BridgeDestroyedError if bridge is destroyed
   * @throws RecordingNotActiveError if not recording
   */
  stopRecording(): void {
    this.ensureNotDestroyed();

    if (!this.isRecording) {
      throw new RecordingNotActiveError(this.id);
    }

    this.isRecording = false;
    // Keep recordingName for historical reference
  }

  /**
   * Destroy the bridge (marks as destroyed, clears channels)
   * Idempotent - safe to call multiple times
   */
  destroy(): void {
    if (this._destroyedAt) {
      return; // Already destroyed
    }

    this._destroyedAt = new Date();
    this.channelIds = [];
    this.isRecording = false;
  }

  // ========== Query Methods ==========

  /**
   * Check if bridge is active (not destroyed)
   */
  isActive(): boolean {
    return this._destroyedAt === null;
  }

  /**
   * Check if bridge has a specific channel
   */
  hasChannel(channelId: string): boolean {
    return this.channelIds.includes(channelId);
  }

  /**
   * Get number of channels in bridge
   */
  getChannelCount(): number {
    return this.channelIds.length;
  }

  /**
   * Get destroyed timestamp (or null if active)
   */
  get destroyedAt(): Date | null {
    return this._destroyedAt;
  }

  // ========== Private Helper Methods ==========

  /**
   * Ensure bridge is not destroyed
   * @throws BridgeDestroyedError if bridge is destroyed
   */
  private ensureNotDestroyed(): void {
    if (this._destroyedAt) {
      throw new BridgeDestroyedError(this.id);
    }
  }
}

export class TranscriptionSegment {
  constructor(
    public readonly id: string,
    public readonly transcriptionId: string,
    public readonly segmentIndex: number,
    public readonly startTime: number,
    public readonly endTime: number,
    public readonly text: string,
    public readonly confidence: number,
    public speaker?: string,
    public metadata?: Record<string, any>,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {
    this.validate();
  }

  validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('Segment ID is required');
    }
    if (!this.transcriptionId || this.transcriptionId.trim() === '') {
      throw new Error('Transcription ID is required');
    }
    if (this.segmentIndex < 0) {
      throw new Error('Segment index must be non-negative');
    }
    if (this.startTime < 0) {
      throw new Error('Start time must be non-negative');
    }
    if (this.endTime <= this.startTime) {
      throw new Error('End time must be greater than start time');
    }
    if (!this.text || this.text.trim() === '') {
      throw new Error('Segment text is required');
    }
    if (this.confidence < 0 || this.confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }
  }

  getDuration(): number {
    return this.endTime - this.startTime;
  }

  setSpeaker(speaker: string): void {
    this.speaker = speaker;
  }

  updateMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  containsTime(time: number): boolean {
    return time >= this.startTime && time <= this.endTime;
  }

  overlaps(other: TranscriptionSegment): boolean {
    return (
      (this.startTime >= other.startTime && this.startTime < other.endTime) ||
      (other.startTime >= this.startTime && other.startTime < this.endTime)
    );
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      transcriptionId: this.transcriptionId,
      segmentIndex: this.segmentIndex,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.getDuration(),
      text: this.text,
      confidence: this.confidence,
      speaker: this.speaker,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

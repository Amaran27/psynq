/**
 * CDR (Call Detail Record) Domain Entity
 */

export enum CDRDisposition {
  ANSWERED = 'ANSWERED',
  NO_ANSWER = 'NO ANSWER',
  BUSY = 'BUSY',
  FAILED = 'FAILED',
  CONGESTION = 'CONGESTION',
}

export class CDR {
  accountcode: string;
  src: string;
  dst: string;
  dcontext: string;
  clid: string;
  channel: string;
  dstchannel: string;
  lastapp: string;
  lastdata: string;
  start: Date;
  answer?: Date;
  end: Date;
  duration: number;
  billsec: number;
  disposition: string;
  amaflags: number;
  userfield: string;
  uniqueid: string;
  linkedid: string;
  sequence: number;
  peeraccount: string;
  recordingPath?: string;

  constructor(data: Partial<CDR>) {
    Object.assign(this, data);
  }

  /**
   * Check if call was answered
   */
  isAnswered(): boolean {
    return this.disposition === CDRDisposition.ANSWERED && this.billsec > 0;
  }

  /**
   * Get call duration in minutes
   */
  getDurationMinutes(): number {
    return Math.ceil(this.duration / 60);
  }

  /**
   * Get billable duration in minutes
   */
  getBillableMinutes(): number {
    return Math.ceil(this.billsec / 60);
  }

  /**
   * Check if recording exists
   */
  hasRecording(): boolean {
    return !!this.recordingPath;
  }
}

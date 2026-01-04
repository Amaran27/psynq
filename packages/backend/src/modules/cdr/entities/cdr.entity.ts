/**
 * CDR TypeORM Entity (Maps to existing cdr table)
 */

import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';
import { CDR as CDRDomain } from '../domain/cdr.entity';

@Entity('cdr')
@Index('idx_cdr_calldate', ['start'])
@Index('idx_cdr_uniqueid', ['uniqueid'])
@Index('idx_cdr_disposition', ['disposition'])
@Index('idx_cdr_src', ['src'])
@Index('idx_cdr_dst', ['dst'])
export class CDREntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  acctid: string;

  @Column({ type: 'varchar', length: 20, default: '' })
  accountcode: string;

  @Column({ type: 'varchar', length: 80, default: '' })
  src: string;

  @Column({ type: 'varchar', length: 80, default: '' })
  dst: string;

  @Column({ type: 'varchar', length: 80, default: '' })
  dcontext: string;

  @Column({ type: 'varchar', length: 80, default: '' })
  clid: string;

  @Column({ type: 'varchar', length: 80, default: '' })
  channel: string;

  @Column({ type: 'varchar', length: 80, default: '' })
  dstchannel: string;

  @Column({ type: 'varchar', length: 20, default: '' })
  lastapp: string;

  @Column({ type: 'varchar', length: 80, default: '' })
  lastdata: string;

  @Column({ type: 'timestamp', name: 'calldate' })
  start: Date;

  @Column({ type: 'int', default: 0 })
  duration: number;

  @Column({ type: 'int', default: 0 })
  billsec: number;

  @Column({ type: 'varchar', length: 45, default: '' })
  disposition: string;

  @Column({ type: 'int', default: 0 })
  amaflags: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  userfield: string;

  @Column({ type: 'varchar', length: 150 })
  uniqueid: string;

  @Column({ type: 'varchar', length: 150, default: '' })
  linkedid: string;

  @Column({ type: 'int', default: 0 })
  sequence: number;

  @Column({ type: 'varchar', length: 20, default: '' })
  peeraccount: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'recording_path' })
  recordingPath?: string;

  // Computed properties for domain mapping
  get end(): Date {
    return new Date(this.start.getTime() + this.duration * 1000);
  }

  get answer(): Date | undefined {
    if (this.billsec === 0) return undefined;
    // Answer time is roughly end time - billsec
    // Or start + (duration - billsec)
    return new Date(this.start.getTime() + (this.duration - this.billsec) * 1000);
  }

  /**
   * Convert TypeORM entity to domain entity
   */
  toDomain(): CDRDomain {
    return new CDRDomain({
      accountcode: this.accountcode,
      src: this.src,
      dst: this.dst,
      dcontext: this.dcontext,
      clid: this.clid,
      channel: this.channel,
      dstchannel: this.dstchannel,
      lastapp: this.lastapp,
      lastdata: this.lastdata,
      start: this.start,
      answer: this.answer,
      end: this.end,
      duration: this.duration,
      billsec: this.billsec,
      disposition: this.disposition,
      amaflags: this.amaflags,
      userfield: this.userfield,
      uniqueid: this.uniqueid,
      linkedid: this.linkedid,
      sequence: this.sequence,
      peeraccount: this.peeraccount,
      recordingPath: this.recordingPath,
    });
  }
}

import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { CallDirection, CallState } from '@psynq/core';

@Entity('calls')
export class CallEntity {
  @PrimaryColumn()
  id: string;

  @Column({
    type: 'enum',
    enum: CallState,
    default: CallState.IDLE,
  })
  state: CallState;

  @Column({
    type: 'enum',
    enum: CallDirection,
    default: CallDirection.INBOUND,
  })
  direction: CallDirection;

  @Column()
  from: string;

  @Column()
  to: string;

  @Column({ nullable: true })
  agentId?: string;

  @Column({ nullable: true })
  twilioSid?: string;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  answeredAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt?: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

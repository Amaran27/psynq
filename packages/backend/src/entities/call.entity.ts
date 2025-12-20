import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { CallDirection, CallState } from '@psynq/core';
import { CallParticipantEntity } from './call-participant.entity';
import { OrganizationEntity } from './organization.entity';

@Entity('calls')
export class CallEntity {
  @PrimaryColumn()
  id: string;

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, (org) => org.calls)
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

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
  externalId?: string;

  @Column({ nullable: true })
  parentCallSid?: string;

  @Column({ type: 'jsonb', nullable: true })
  providerMetadata?: Record<string, any>;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  answeredAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt?: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => CallParticipantEntity, participant => participant.call)
  participants: CallParticipantEntity[];
}
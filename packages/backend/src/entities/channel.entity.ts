import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CallEntity } from './call.entity';
import { OrganizationEntity } from './organization.entity';

export enum ChannelState {
  DOWN = 'Down',
  RESERVED = 'Rsrvd',
  OFF_HOOK = 'OffHook',
  DIALING = 'Dialing',
  RING = 'Ring',
  RINGING = 'Ringing',
  UP = 'Up',
  BUSY = 'Busy',
  DIALING_OFFHOOK = 'DialingOffHook',
  PRE_RING = 'PreRing',
  UNKNOWN = 'Unknown',
}

export enum ChannelDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

@Entity('channels')
export class ChannelEntity {
  @PrimaryColumn()
  id: string; // ARI channel ID (e.g., PJSIP/trunk-00000001)

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

  @Column({ nullable: true })
  callId?: string; // Associated Call ID (if part of a tracked call)

  @ManyToOne(() => CallEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'callId' })
  call?: CallEntity;

  @Column({ nullable: true })
  bridgeId?: string; // Bridge ID if channel is currently bridged

  @Column({
    type: 'enum',
    enum: ChannelState,
    default: ChannelState.DOWN,
  })
  state: ChannelState;

  @Column({
    type: 'enum',
    enum: ChannelDirection,
    default: ChannelDirection.INBOUND,
  })
  direction: ChannelDirection;

  @Column()
  callerName: string; // Caller ID name

  @Column()
  callerNumber: string; // Caller ID number

  @Column({ nullable: true })
  connectedName?: string; // Connected party name

  @Column({ nullable: true })
  connectedNumber?: string; // Connected party number

  @Column({ nullable: true })
  dialedNumber?: string; // Original dialed number (DNID)

  @Column({ nullable: true })
  language?: string; // Channel language (e.g., 'en')

  @Column({ nullable: true })
  accountCode?: string; // Billing account code

  @Column({ type: 'jsonb', nullable: true })
  channelvars?: Record<string, any>; // Asterisk channel variables

  @Column({ type: 'jsonb', nullable: true })
  providerMetadata?: Record<string, any>; // Provider-specific data

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  answeredAt?: Date; // When channel was answered

  @Column({ type: 'timestamp', nullable: true })
  endedAt?: Date; // When channel was hung up

  @UpdateDateColumn()
  updatedAt: Date;
}

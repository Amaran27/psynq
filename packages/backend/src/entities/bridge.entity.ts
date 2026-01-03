import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';

export enum BridgeType {
  MIXING = 'mixing',        // Standard conference bridge
  HOLDING = 'holding',      // Music on hold bridge
  DTMF_EVENTS = 'dtmf_events', // DTMF event bridge
}

export enum BridgeTechnology {
  SIMPLE_BRIDGE = 'simple_bridge',
  NATIVE_RTP = 'native_rtp',
  SOFTMIX = 'softmix',
}

/**
 * Bridge Entity - Represents an Asterisk ARI bridge (conference/mixing)
 * 
 * Bridges connect multiple channels together for conferencing, holding, or DTMF.
 * In Asterisk ARI architecture:
 * - Bridge = mixing/conference room
 * - Channels join bridges to communicate
 * - One bridge can contain 2+ channels
 */
@Entity('bridges')
export class BridgeEntity {
  @PrimaryColumn()
  id: string; // ARI bridge ID (e.g., bridge-12345678)

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

  @Column({ nullable: true })
  name: string; // Optional bridge name

  @Column({
    type: 'enum',
    enum: BridgeType,
    default: BridgeType.MIXING,
  })
  bridgeType: BridgeType;

  @Column({
    type: 'enum',
    enum: BridgeTechnology,
    default: BridgeTechnology.SOFTMIX,
  })
  technology: BridgeTechnology;

  @Column({ type: 'simple-array', nullable: true })
  channelIds: string[]; // Array of channel IDs in this bridge

  @Column({ type: 'varchar', nullable: true })
  creatorChannelId: string; // Channel that created the bridge

  @Column({ type: 'jsonb', nullable: true })
  bridgeVars: Record<string, any>; // Custom bridge variables

  @Column({ default: false })
  isRecording: boolean;

  @Column({ nullable: true })
  recordingName: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  destroyedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

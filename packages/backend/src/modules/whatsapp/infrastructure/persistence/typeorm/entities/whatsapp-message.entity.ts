import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationEntity } from '../../../../../../entities/organization.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACTS = 'contacts',
  TEMPLATE = 'template',
  INTERACTIVE = 'interactive',
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

@Entity('whatsapp_messages')
@Index('IDX_WHATSAPP_MESSAGES_ORG_PHONE', ['organizationId', 'phoneNumber'])
@Index('IDX_WHATSAPP_MESSAGES_STATUS', ['status'])
@Index('IDX_WHATSAPP_MESSAGES_DIRECTION', ['direction'])
@Index('IDX_WHATSAPP_MESSAGES_CONVERSATION', ['conversationId'])
@Index('IDX_WHATSAPP_MESSAGES_CONTACT', ['contactId'])
@Index('IDX_WHATSAPP_MESSAGES_EXTERNAL', ['externalMessageId'])
@Index('IDX_WHATSAPP_MESSAGES_CREATED', ['createdAt'])
export class WhatsAppMessageEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @Column('varchar', { length: 20 })
  phoneNumber: string;

  @Column({ type: 'enum', enum: MessageType })
  type: MessageType;

  @Column({ type: 'enum', enum: MessageDirection })
  direction: MessageDirection;

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.PENDING })
  status: MessageStatus;

  @Column('jsonb')
  content: Record<string, any>;

  @Column('uuid', { nullable: true })
  conversationId: string | null;

  @Column('uuid', { nullable: true })
  contactId: string | null;

  @Column('uuid', { nullable: true })
  campaignId: string | null;

  @Column('uuid', { nullable: true })
  agentId: string | null;

  @Column('uuid', { nullable: true })
  templateId: string | null;

  @Column('varchar', { length: 500, nullable: true })
  mediaUrl: string | null;

  @Column('varchar', { length: 50, nullable: true })
  mediaType: string | null;

  @Column('bigint', { nullable: true })
  mediaSizeBytes: number | null;

  @Column('varchar', { length: 100, nullable: true })
  externalMessageId: string | null;

  @Column('timestamp', { nullable: true })
  externalTimestamp: Date | null;

  @Column('timestamp', { nullable: true })
  deliveredAt: Date | null;

  @Column('timestamp', { nullable: true })
  readAt: Date | null;

  @Column('text', { nullable: true })
  failedReason: string | null;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;
}

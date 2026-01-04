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

export enum ContactStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  OPTED_OUT = 'opted_out',
}

@Entity('whatsapp_contacts')
@Index('IDX_WHATSAPP_CONTACTS_ORG_PHONE', ['organizationId', 'phoneNumber'], { unique: true })
@Index('IDX_WHATSAPP_CONTACTS_STATUS', ['status'])
@Index('IDX_WHATSAPP_CONTACTS_LAST_MESSAGE', ['lastMessageAt'])
export class WhatsAppContactEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @Column('varchar', { length: 20 })
  phoneNumber: string;

  @Column({ type: 'enum', enum: ContactStatus, default: ContactStatus.ACTIVE })
  status: ContactStatus;

  @Column('varchar', { length: 200, nullable: true })
  name: string | null;

  @Column('varchar', { length: 500, nullable: true })
  profilePictureUrl: string | null;

  @Column('timestamp', { nullable: true })
  lastMessageAt: Date | null;

  @Column('varchar', { length: 10, nullable: true })
  lastMessageDirection: string | null;

  @Column('int', { default: 0 })
  messageCount: number;

  @Column('timestamp', { nullable: true })
  optedOutAt: Date | null;

  @Column('timestamp', { nullable: true })
  blockedAt: Date | null;

  @Column('text', { nullable: true })
  blockReason: string | null;

  @Column('jsonb', { default: '[]' })
  tags: string[];

  @Column('jsonb', { nullable: true })
  customFields: Record<string, any> | null;

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

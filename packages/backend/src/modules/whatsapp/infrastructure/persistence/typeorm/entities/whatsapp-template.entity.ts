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

export enum TemplateCategory {
  MARKETING = 'marketing',
  UTILITY = 'utility',
  AUTHENTICATION = 'authentication',
}

export enum TemplateStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum TemplateLanguage {
  EN = 'en',
  EN_US = 'en_US',
  ES = 'es',
  ES_ES = 'es_ES',
  PT_BR = 'pt_BR',
  FR = 'fr',
  DE = 'de',
  IT = 'it',
  AR = 'ar',
  HI = 'hi',
  ZH_CN = 'zh_CN',
}

@Entity('whatsapp_templates')
@Index('IDX_WHATSAPP_TEMPLATES_ORG_NAME', ['organizationId', 'name'])
@Index('IDX_WHATSAPP_TEMPLATES_STATUS', ['status'])
@Index('IDX_WHATSAPP_TEMPLATES_CATEGORY', ['category'])
@Index('IDX_WHATSAPP_TEMPLATES_EXTERNAL', ['externalTemplateId'])
export class WhatsAppTemplateEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column({ type: 'enum', enum: TemplateCategory })
  category: TemplateCategory;

  @Column({ type: 'enum', enum: TemplateLanguage })
  language: TemplateLanguage;

  @Column({ type: 'enum', enum: TemplateStatus, default: TemplateStatus.DRAFT })
  status: TemplateStatus;

  @Column('jsonb')
  components: Array<any>;

  @Column('varchar', { length: 100, nullable: true })
  externalTemplateId: string | null;

  @Column('varchar', { length: 100, nullable: true })
  externalTemplateName: string | null;

  @Column('text', { nullable: true })
  rejectionReason: string | null;

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

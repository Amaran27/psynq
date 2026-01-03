import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OrganizationEntity } from '../organization.entity';

export enum DNCSource {
  MANUAL = 'manual',
  FEDERAL_REGISTRY = 'federal_registry',
  STATE_REGISTRY = 'state_registry',
  INTERNAL = 'internal',
  CUSTOMER_REQUEST = 'customer_request',
}

export enum DNCStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REMOVED = 'removed',
}

@Entity('dnc_list')
@Index(['phoneNumber', 'organizationId'], { unique: true })
@Index(['status', 'expiresAt'])
export class DNCEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  phoneNumber: string;

  @Column({
    type: 'enum',
    enum: DNCSource,
    default: DNCSource.MANUAL,
  })
  source: DNCSource;

  @Column({
    type: 'enum',
    enum: DNCStatus,
    default: DNCStatus.ACTIVE,
  })
  status: DNCStatus;

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

  // Metadata
  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  addedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  requestDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  expirationDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

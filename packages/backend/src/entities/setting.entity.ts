import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';

@Entity('settings')
@Index(['organizationId', 'key'], { unique: true })
export class SettingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  organizationId: string; // Nullable for system defaults

  @ManyToOne(() => OrganizationEntity, (org) => org.settings)
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

  @Column()
  key: string;

  @Column({ type: 'jsonb' })
  value: any;

  @Column({ default: false })
  isSecret: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

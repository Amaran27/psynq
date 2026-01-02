import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CallEntity } from './call.entity';
import { OrganizationEntity } from './organization.entity';

@Entity('recordings')
export class RecordingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

  @Column()
  callId: string;

  @Column()
  url: string;

  @Column({ nullable: true })
  duration?: number; // in seconds

  @Column({ nullable: true })
  size?: number; // in bytes

  @Column({ default: 'audio/wav' })
  contentType: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => CallEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'callId' })
  call: CallEntity;
}

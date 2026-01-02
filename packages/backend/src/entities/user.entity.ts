import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AgentStatus } from '@psynq/core';
import { OrganizationEntity } from './organization.entity';

export enum UserRole {
  AGENT = 'agent',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin',
  SYSTEM_ADMIN = 'system_admin',
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true, nullable: true })
  email?: string;

  @Column()
  password?: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, (org) => org.users)
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

  @Column({
    type: 'simple-array',
    default: [UserRole.AGENT],
  })
  roles: UserRole[];

  @Column({
    type: 'enum',
    enum: UserRole,
    nullable: true,
  })
  primaryRole?: UserRole;

  @Column({
    type: 'enum',
    enum: AgentStatus,
    default: AgentStatus.OFFLINE,
  })
  status: AgentStatus;

  @Column({ type: 'simple-array', nullable: true })
  skills: string[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastStatusChangedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

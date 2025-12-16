import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AgentStatus } from '@psynq/core';

export enum UserRole {
  AGENT = 'agent',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin',
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password?: string; // The '?' denotes it's optional, useful for when returning user objects without the password

  @Column({
    type: 'simple-array',
    default: [UserRole.AGENT],
  })
  roles: UserRole[];

  @Column({
    type: 'enum',
    enum: AgentStatus,
    default: AgentStatus.AWAY,
  })
  status: AgentStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

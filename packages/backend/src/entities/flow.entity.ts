import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { OrganizationEntity } from './organization.entity';

export enum FlowNodeType {
  PLAY = 'play',
  GATHER = 'gather',
  DIAL_QUEUE = 'dial_queue',
  SAY = 'say',
  HANGUP = 'hangup',
  BRANCH = 'branch'
}

export interface FlowStep {
  id: string;
  type: FlowNodeType;
  params: Record<string, any>;
  next?: string;
}

@Entity('flows')
export class FlowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb' })
  definition: {
    startNode: string;
    nodes: FlowStep[];
  };

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

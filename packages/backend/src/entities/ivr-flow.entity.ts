/**
 * IVR Flow Entity (TypeORM - Database Layer)
 */

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { IVRFlowStatus, IVRNode } from '../modules/ivr/domain/ivr-flow.domain';

@Entity('ivr_flows')
@Index(['organizationId', 'status'])
@Index(['organizationId', 'name'], { unique: true })
export class IVRFlowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: IVRFlowStatus,
    default: IVRFlowStatus.DRAFT,
  })
  status: IVRFlowStatus;

  @Column({ name: 'entry_node_id' })
  entryNodeId: string;

  @Column({ type: 'jsonb' })
  nodes: IVRNode[];

  @Column({ type: 'jsonb', default: {} })
  variables: Record<string, string>;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

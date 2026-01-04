/**
 * IVR Flow TypeORM Entity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('ivr_flows')
@Index(['organizationId'])
@Index(['status'])
@Index(['organizationId', 'status'])
@Index(['name'])
export class IVRFlowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'jsonb' })
  nodes: any;

  @Column({ type: 'jsonb' })
  connections: any;

  @Column({ type: 'jsonb', nullable: true })
  variables: any;

  @Column({ type: 'uuid', name: 'start_node_id' })
  startNodeId: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'published_at' })
  publishedAt: Date | null;
}

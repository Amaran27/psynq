/**
 * IVR Execution TypeORM Entity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('ivr_executions')
@Index(['organizationId'])
@Index(['flowId'])
@Index(['callId'])
@Index(['status'])
@Index(['organizationId', 'flowId'])
@Index(['startedAt'])
export class IVRExecutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'flow_id' })
  flowId: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'call_id' })
  callId: string;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'uuid', name: 'current_node_id' })
  currentNodeId: string;

  @Column({ type: 'jsonb' })
  context: any;

  @Column({ type: 'jsonb' })
  steps: any;

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;
}

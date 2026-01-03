/**
 * IVR Execution Log Entity (TypeORM - Database Layer)
 */

import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm';
import { IVRExecutionStatus, IVRExecutionStep } from '../modules/ivr/domain/ivr-execution-log.domain';

@Entity('ivr_execution_logs')
@Index(['callId'], { unique: true })
@Index(['flowId', 'startedAt'])
@Index(['organizationId', 'status'])
export class IVRExecutionLogEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'flow_id' })
  flowId: string;

  @Column({ name: 'flow_name' })
  flowName: string;

  @Column({ name: 'call_id' })
  callId: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({
    type: 'enum',
    enum: IVRExecutionStatus,
    default: IVRExecutionStatus.IN_PROGRESS,
  })
  status: IVRExecutionStatus;

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'jsonb', default: [] })
  steps: IVRExecutionStep[];

  @Column({ type: 'jsonb', default: {} })
  variables: Record<string, string>;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'exit_reason', nullable: true })
  exitReason?: string;
}

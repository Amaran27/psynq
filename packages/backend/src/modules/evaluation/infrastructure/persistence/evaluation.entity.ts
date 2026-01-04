/**
 * Evaluation TypeORM Entity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('evaluations')
@Index(['organizationId'])
@Index(['scorecardId'])
@Index(['agentId'])
@Index(['evaluatorId'])
@Index(['callId'])
@Index(['status'])
@Index(['organizationId', 'agentId'])
@Index(['organizationId', 'evaluatorId'])
@Index(['createdAt'])
export class EvaluationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'scorecard_id' })
  scorecardId: string;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @Column({ type: 'uuid', name: 'evaluator_id' })
  evaluatorId: string;

  @Column({ type: 'uuid', name: 'call_id', nullable: true })
  callId: string | null;

  @Column({ type: 'uuid', name: 'recording_id', nullable: true })
  recordingId: string | null;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'jsonb' })
  scores: any;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'total_score' })
  totalScore: number;

  @Column({ type: 'boolean' })
  passed: boolean;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @Column({ type: 'jsonb', nullable: true })
  strengths: any;

  @Column({ type: 'jsonb', nullable: true, name: 'areas_for_improvement' })
  areasForImprovement: any;

  @Column({ type: 'jsonb', nullable: true, name: 'action_items' })
  actionItems: any;

  @Column({ type: 'text', nullable: true, name: 'calibration_notes' })
  calibrationNotes: string | null;

  @Column({ type: 'text', nullable: true, name: 'dispute_reason' })
  disputeReason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date | null;
}

/**
 * Scorecard TypeORM Entity
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('scorecards')
@Index(['organizationId'])
@Index(['status'])
@Index(['organizationId', 'status'])
export class ScorecardEntity {
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
  criteria: any;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'passing_score' })
  passingScore: number;

  @Column({ type: 'boolean', name: 'use_weighted_scoring', default: false })
  useWeightedScoring: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

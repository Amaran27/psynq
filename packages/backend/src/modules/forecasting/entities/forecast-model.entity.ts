import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  ModelType,
  ModelStatus,
  TrainingData,
  ModelPerformance,
} from '../domain/forecast-model.domain';
import { OrganizationEntity } from '../../../entities/organization.entity';

@Entity('forecast_models')
@Index(['organizationId', 'status'])
@Index(['organizationId', 'type'])
@Index(['status', 'trainedAt'])
export class ForecastModelEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ModelType,
  })
  type: ModelType;

  @Column({
    type: 'enum',
    enum: ModelStatus,
    default: ModelStatus.TRAINING,
  })
  status: ModelStatus;

  @Column({ name: 'training_data', type: 'jsonb' })
  trainingData: TrainingData;

  @Column({ type: 'jsonb', nullable: true })
  performance?: ModelPerformance;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'jsonb' })
  hyperparameters: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'trained_at', type: 'timestamp', nullable: true })
  trainedAt?: Date;
}

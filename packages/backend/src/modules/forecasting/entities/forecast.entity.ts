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
import { ForecastInterval, ForecastType, ForecastDataPoint, AccuracyMetrics } from '../domain/forecast.domain';
import { OrganizationEntity } from '../../../entities/organization.entity';
import { ForecastModelEntity } from './forecast-model.entity';

@Entity('forecasts')
@Index(['organizationId', 'createdAt'])
@Index(['organizationId', 'type', 'interval'])
@Index(['startDate', 'endDate'])
export class ForecastEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;

  @Column({ name: 'model_id', type: 'uuid' })
  @Index()
  modelId: string;

  @ManyToOne(() => ForecastModelEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'model_id' })
  model: ForecastModelEntity;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: ForecastType,
  })
  type: ForecastType;

  @Column({
    type: 'enum',
    enum: ForecastInterval,
  })
  interval: ForecastInterval;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({ name: 'data_points', type: 'jsonb' })
  dataPoints: ForecastDataPoint[];

  @Column({ type: 'jsonb', nullable: true })
  accuracy?: AccuracyMetrics;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

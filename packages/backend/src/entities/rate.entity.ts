import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('rates')
export class RateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  prefix: string; // e.g., '+91', '+1'

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  costPerSecond: number;

  @Column({ default: 'USD' })
  currency: string;

  @CreateDateColumn()
  createdAt: Date;
}

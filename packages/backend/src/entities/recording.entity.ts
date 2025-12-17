import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CallEntity } from './call.entity';

@Entity('recordings')
export class RecordingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  callId: string;

  @Column()
  url: string;

  @Column({ nullable: true })
  duration?: number; // in seconds

  @Column({ nullable: true })
  size?: number; // in bytes

  @Column({ default: 'audio/wav' })
  contentType: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => CallEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'callId' })
  call: CallEntity;
}
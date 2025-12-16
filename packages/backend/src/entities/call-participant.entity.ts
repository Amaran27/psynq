import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { CallEntity } from './call.entity';

@Entity('call_participants')
export class CallParticipantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'call_id' })
  callId: string;

  @Column({ name: 'participant_id' })
  participantId: string;

  @Column({
    type: 'enum',
    enum: ['agent', 'customer', 'supervisor'],
    name: 'participant_type'
  })
  participantType: 'agent' | 'customer' | 'supervisor';

  @Column({ name: 'provider_call_sid', nullable: true })
  providerCallSid: string;

  @Column({ type: 'json', nullable: true })
  providerSpecificData: Record<string, any>;

  @Column({ name: 'is_muted', default: false })
  isMuted: boolean;

  @Column({ name: 'is_on_hold', default: false })
  isOnHold: boolean;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @Column({ name: 'left_at', nullable: true })
  leftAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => CallEntity, call => call.participants)
  call: CallEntity;
}
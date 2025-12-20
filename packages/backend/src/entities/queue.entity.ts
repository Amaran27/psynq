import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { OrganizationEntity } from './organization.entity';

@Entity('queues')
export class QueueEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g., 'Sales', 'Support'

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity;

  @Column({ type: 'simple-array', nullable: true })
  requiredSkills: string[];

  @Column({ default: 30 })
  timeoutSeconds: number; // How long to ring an agent before trying next

  @Column({ default: 'round-robin' })
  strategy: 'round-robin' | 'longest-idle' | 'proficiency';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

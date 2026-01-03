import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('failed_logins')
@Index(['ipAddress'])
@Index(['username'])
@Index(['attemptedAt'])
export class FailedLoginEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  username?: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string;

  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @CreateDateColumn({ name: 'attempted_at' })
  attemptedAt: Date;
}

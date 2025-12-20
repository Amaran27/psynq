import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserEntity } from './user.entity';
import { CallEntity } from './call.entity';
import { SettingEntity } from './setting.entity';

@Entity('organizations')
export class OrganizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string; // Used for subdomains or clean URLs

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => UserEntity, (user) => user.organization)
  users: UserEntity[];

  @OneToMany(() => CallEntity, (call) => call.organization)
  calls: CallEntity[];

  @OneToMany(() => SettingEntity, (setting) => setting.organization)
  settings: SettingEntity[];
}
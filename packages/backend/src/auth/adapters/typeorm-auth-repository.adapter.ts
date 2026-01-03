/**
 * TypeORM Auth Repository Adapter
 *
 * This is an ADAPTER in hexagonal architecture.
 * Implements IAuthRepository using TypeORM.
 *
 * Framework-specific code lives HERE, not in domain/application.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserEntity,
  UserRole as EntityUserRole,
} from '../../entities/user.entity';
import { IAuthRepository } from '../ports/auth-repository.port';
import {
  AuthUser,
  AuthCredentials,
  UserRole,
} from '../domain/authentication.entity';

@Injectable()
export class TypeOrmAuthRepository implements IAuthRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async findByUsername(
    username: string,
  ): Promise<(AuthUser & { password: string }) | null> {
    const entity = await this.repository.findOne({ where: { username } });
    return entity ? this.toDomainWithPassword(entity) : null;
  }

  async findById(id: string): Promise<AuthUser | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async create(
    credentials: AuthCredentials,
    hashedPassword: string,
    role: UserRole = 'agent',
  ): Promise<AuthUser> {
    const entity = this.repository.create({
      username: credentials.username,
      password: hashedPassword,
      roles: [role as EntityUserRole],
    });

    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async updateStatus(
    userId: string,
    status: string,
    timestamp: Date,
  ): Promise<void> {
    await this.repository.update(
      { id: userId },
      {
        status: status as any,
        lastStatusChangedAt: timestamp,
      },
    );
  }

  async usernameExists(username: string): Promise<boolean> {
    const count = await this.repository.count({ where: { username } });
    return count > 0;
  }

  /**
   * Convert UserEntity to AuthUser domain model
   */
  private toDomain(entity: UserEntity): AuthUser {
    return {
      id: entity.id,
      username: entity.username,
      roles: entity.roles as UserRole[],
      organizationId: entity.organizationId,
      status: entity.status,
    };
  }

  /**
   * Convert UserEntity to AuthUser domain model with password
   */
  private toDomainWithPassword(
    entity: UserEntity,
  ): AuthUser & { password: string } {
    return {
      id: entity.id,
      username: entity.username,
      roles: entity.roles as UserRole[],
      organizationId: entity.organizationId,
      status: entity.status,
      password: entity.password!, // Non-null assertion - password is required for auth
    };
  }
}

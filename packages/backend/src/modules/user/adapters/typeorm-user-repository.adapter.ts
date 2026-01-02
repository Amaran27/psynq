import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserEntity } from '../../../entities/user.entity';
import { User, CreateUserData } from '../domain/user.domain';
import {
  IUserRepository,
  UserFilters,
  PaginatedUsers,
} from '../ports/user-repository.port';
import { AgentStatus } from '@psynq/core';

/**
 * TypeORM User Repository Adapter
 *
 * This is an ADAPTER in hexagonal architecture.
 * It implements the IUserRepository port using TypeORM.
 *
 * Framework-specific code lives HERE, not in domain.
 */
@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async create(data: CreateUserData, hashedPassword: string): Promise<User> {
    const entity = this.repository.create({
      ...data,
      password: hashedPassword,
    });
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { username } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { email } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(filters: UserFilters): Promise<PaginatedUsers> {
    const {
      search,
      roles,
      status,
      organizationId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    const query = this.repository.createQueryBuilder('user');

    // Apply search filter
    if (search) {
      query.andWhere(
        '(user.username ILIKE :search OR user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply role filter
    if (roles && roles.length > 0) {
      query.andWhere('user.roles && :roles', { roles });
    }

    // Apply status filter
    if (status) {
      query.andWhere('user.status = :status', { status });
    }

    // Apply organization filter
    if (organizationId) {
      query.andWhere('user.organizationId = :organizationId', {
        organizationId,
      });
    }

    // Apply sorting
    query.orderBy(`user.${sortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [entities, total] = await query.getManyAndCount();

    return {
      data: entities.map((e) => this.toDomain(e)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByRole(role: string): Promise<User[]> {
    const entities = await this.repository
      .createQueryBuilder('user')
      .where(':role = ANY(user.roles)', { role })
      .getMany();

    return entities.map((e) => this.toDomain(e));
  }

  async findByStatus(status: AgentStatus): Promise<User[]> {
    const entities = await this.repository.find({ where: { status } });
    return entities.map((e) => this.toDomain(e));
  }

  async save(user: User): Promise<User> {
    const entity = await this.repository.findOne({
      where: { id: user.id },
    });

    if (!entity) {
      throw new Error(`User ${user.id} not found`);
    }

    // Update entity with domain values
    Object.assign(entity, {
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      roles: user.roles,
      primaryRole: user.primaryRole,
      status: user.status,
      skills: user.skills,
      organizationId: user.organizationId,
      lastStatusChangedAt: user.lastStatusChangedAt,
      // Don't update password here - handled by separate change password use case
    });

    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async existsByUsername(username: string): Promise<boolean> {
    const count = await this.repository.count({ where: { username } });
    return count > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.repository.count({ where: { email } });
    return count > 0;
  }

  /**
   * Convert TypeORM entity to Domain model
   * Private helper - keeps domain pure
   */
  private toDomain(entity: UserEntity): User {
    return new User(
      entity.id,
      entity.username,
      entity.email || '',
      entity.password || '',
      entity.firstName || '',
      entity.lastName || '',
      entity.phone || null,
      entity.organizationId || null,
      entity.roles as any, // Cast to domain UserRole
      entity.primaryRole as any,
      entity.status,
      entity.skills || [],
      entity.lastStatusChangedAt,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}

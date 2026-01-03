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
import { Repository, MoreThan } from 'typeorm';
import {
  UserEntity,
  UserRole as EntityUserRole,
} from '../../entities/user.entity';
import { PasswordResetTokenEntity } from '../../entities/password-reset-token.entity';
import { EmailVerificationTokenEntity } from '../../entities/email-verification-token.entity';
import { SessionEntity } from '../../entities/session.entity';
import { FailedLoginEntity } from '../../entities/failed-login.entity';
import { PasswordResetToken } from '../domain/password-reset-token.domain';
import { EmailVerificationToken } from '../domain/email-verification-token.domain';
import { Session } from '../domain/session.domain';
import { FailedLoginAttempt, FailureReason } from '../domain/failed-login-attempt.domain';
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
    @InjectRepository(PasswordResetTokenEntity)
    private readonly passwordResetRepository: Repository<PasswordResetTokenEntity>,
    @InjectRepository(EmailVerificationTokenEntity)
    private readonly emailVerificationRepository: Repository<EmailVerificationTokenEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @InjectRepository(FailedLoginEntity)
    private readonly failedLoginRepository: Repository<FailedLoginEntity>,
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

  async emailExists(email: string): Promise<boolean> {
    const count = await this.repository.count({ where: { email } });
    return count > 0;
  }

  async findByEmail(email: string): Promise<(AuthUser & { password: string }) | null> {
    const entity = await this.repository.findOne({ where: { email } });
    return entity ? this.toDomainWithPassword(entity) : null;
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    await this.repository.update({ id: userId }, { password: newPassword });
  }

  async markEmailAsVerified(userId: string): Promise<void> {
    await this.repository.update({ id: userId }, { emailVerified: true });
  }

  async savePasswordResetToken(domainToken: PasswordResetToken): Promise<void> {
    const entity = await this.passwordResetRepository.findOne({
      where: { id: domainToken.id },
    });

    if (entity) {
      // Update existing
      entity.usedAt = domainToken.usedAt ?? undefined;
      await this.passwordResetRepository.save(entity);
    } else {
      // Create new
      const newEntity = this.passwordResetRepository.create({
        userId: domainToken.userId,
        token: domainToken.token,
        expiresAt: domainToken.expiresAt,
        createdAt: domainToken.createdAt,
        usedAt: domainToken.usedAt ?? undefined,
      });
      await this.passwordResetRepository.save(newEntity);
    }
  }

  async findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    const entity = await this.passwordResetRepository.findOne({
      where: { token },
    });

    if (!entity) return null;

    return PasswordResetToken.fromPersistence({
      id: entity.id,
      userId: entity.userId,
      token: entity.token,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      usedAt: entity.usedAt ?? null,
    });
  }

  async findPasswordResetTokensByUserId(userId: string): Promise<PasswordResetToken[]> {
    const entities = await this.passwordResetRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return entities.map(entity =>
      PasswordResetToken.fromPersistence({
        id: entity.id,
        userId: entity.userId,
        token: entity.token,
        expiresAt: entity.expiresAt,
        createdAt: entity.createdAt,
        usedAt: entity.usedAt ?? null,
      })
    );
  }

  async saveEmailVerificationToken(domainToken: EmailVerificationToken): Promise<void> {
    const entity = await this.emailVerificationRepository.findOne({
      where: { id: domainToken.id },
    });

    if (entity) {
      // Update existing
      entity.verifiedAt = domainToken.verifiedAt ?? undefined;
      await this.emailVerificationRepository.save(entity);
    } else {
      // Create new
      const newEntity = this.emailVerificationRepository.create({
        userId: domainToken.userId,
        token: domainToken.token,
        expiresAt: domainToken.expiresAt,
        createdAt: domainToken.createdAt,
        verifiedAt: domainToken.verifiedAt ?? undefined,
      });
      await this.emailVerificationRepository.save(newEntity);
    }
  }

  async findEmailVerificationToken(token: string): Promise<EmailVerificationToken | null> {
    const entity = await this.emailVerificationRepository.findOne({
      where: { token },
    });

    if (!entity) return null;

    return EmailVerificationToken.fromPersistence({
      id: entity.id,
      userId: entity.userId,
      token: entity.token,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      verifiedAt: entity.verifiedAt ?? null,
    });
  }

  async findEmailVerificationTokensByUserId(userId: string): Promise<EmailVerificationToken[]> {
    const entities = await this.emailVerificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return entities.map(entity =>
      EmailVerificationToken.fromPersistence({
        id: entity.id,
        userId: entity.userId,
        token: entity.token,
        expiresAt: entity.expiresAt,
        createdAt: entity.createdAt,
        verifiedAt: entity.verifiedAt ?? null,
      })
    );
  }

  async findActiveSessionsByUser(userId: string): Promise<Session[]> {
    const entities = await this.sessionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return entities
      .filter(e => e.revokedAt === null) // Filter out revoked sessions
      .map(entity =>
        Session.fromPersistence({
          id: entity.id,
          userId: entity.userId,
          refreshToken: entity.refreshToken,
          expiresAt: entity.expiresAt,
          createdAt: entity.createdAt,
          userAgent: entity.userAgent ?? null,
          ipAddress: entity.ipAddress ?? null,
          revokedAt: entity.revokedAt ?? null,
        })
      );
  }

  async findSessionById(sessionId: string): Promise<Session | null> {
    const entity = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!entity) return null;

    return Session.fromPersistence({
      id: entity.id,
      userId: entity.userId,
      refreshToken: entity.refreshToken,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      userAgent: entity.userAgent ?? null,
      ipAddress: entity.ipAddress ?? null,
      revokedAt: entity.revokedAt ?? null,
    });
  }

  async saveSession(domainSession: Session): Promise<void> {
    const entity = await this.sessionRepository.findOne({
      where: { id: domainSession.id },
    });

    if (entity) {
      // Update existing
      entity.revokedAt = domainSession.revokedAt ?? undefined;
      await this.sessionRepository.save(entity);
    } else {
      // Create new
      const newEntity = this.sessionRepository.create({
        id: domainSession.id,
        userId: domainSession.userId,
        refreshToken: domainSession.refreshToken,
        expiresAt: domainSession.expiresAt,
        createdAt: domainSession.createdAt,
        userAgent: domainSession.userAgent ?? undefined,
        ipAddress: domainSession.ipAddress ?? undefined,
        revokedAt: domainSession.revokedAt ?? undefined,
      });
      await this.sessionRepository.save(newEntity);
    }
  }

  async findRecentFailedLoginAttempts(
    username: string,
    ipAddress: string,
    since: Date,
  ): Promise<FailedLoginAttempt[]> {
    const entities = await this.failedLoginRepository.find({
      where: {
        username,
        attemptedAt: MoreThan(since) as any,
      },
      order: {
        attemptedAt: 'DESC',
      },
    });

    return entities.map(entity =>
      FailedLoginAttempt.fromPersistence({
        id: entity.id,
        userId: null, // Entity doesn't have userId
        username: entity.username ?? '',
        ipAddress: entity.ipAddress ?? null,
        userAgent: entity.userAgent ?? null,
        reason: (entity.failureReason as FailureReason) || FailureReason.INVALID_CREDENTIALS,
        timestamp: entity.attemptedAt,
      })
    );
  }

  async saveFailedLoginAttempt(domainAttempt: FailedLoginAttempt): Promise<void> {
    const entity = this.failedLoginRepository.create({
      // id is auto-generated
      username: domainAttempt.username,
      ipAddress: domainAttempt.ipAddress ?? undefined,
      userAgent: domainAttempt.userAgent ?? undefined,
      failureReason: domainAttempt.reason,
      // attemptedAt is set by CreateDateColumn
    });
    await this.failedLoginRepository.save(entity);
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
      emailVerified: entity.emailVerified,
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
      emailVerified: entity.emailVerified,
      password: entity.password!, // Non-null assertion - password is required for auth
    };
  }
}

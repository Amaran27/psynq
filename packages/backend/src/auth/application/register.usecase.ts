/**
 * Register Use Case (Application Layer)
 *
 * This is the APPLICATION layer in hexagonal architecture.
 * Orchestrates business logic using domain entities and ports.
 */

import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  IAuthRepository,
  IPasswordService,
} from '../ports/auth-repository.port';
import { Authentication, AuthUser } from '../domain/authentication.entity';

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly passwordService: IPasswordService,
  ) {}

  async execute(username: string, password: string, email: string): Promise<AuthUser> {
    // Domain validation
    if (!Authentication.isValidUsername(username)) {
      throw new BadRequestException('Username must be 3-50 characters');
    }

    if (!Authentication.isValidPassword(password)) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Check if user exists
    const exists = await this.authRepository.usernameExists(username);
    if (exists) {
      throw new ConflictException('Username already exists');
    }

    // Check if email exists
    if (email) {
      const emailExists = await this.authRepository.emailExists(email);
      if (emailExists) {
        throw new ConflictException('Email already exists');
      }
    }

    // Hash password
    const hashedPassword = await this.passwordService.hash(password);

    // Create user with default role
    const user = await this.authRepository.create(
      { username, password, email },
      hashedPassword,
      Authentication.DEFAULT_ROLE,
    );

    return user;
  }
}

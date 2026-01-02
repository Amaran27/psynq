/**
 * Login Use Case (Application Layer)
 *
 * This is the APPLICATION layer in hexagonal architecture.
 * Handles user authentication and token generation.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  IAuthRepository,
  IPasswordService,
  ITokenService,
} from '../ports/auth-repository.port';
import {
  Authentication,
  AuthTokens,
  AuthUser,
} from '../domain/authentication.entity';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly passwordService: IPasswordService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(username: string, password: string): Promise<AuthTokens> {
    // Find user with password
    const userWithPassword = await this.authRepository.findByUsername(username);

    if (!userWithPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isValid = await this.passwordService.compare(
      password,
      userWithPassword.password,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Remove password from user object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...user } = userWithPassword;

    // Generate tokens
    return this.generateTokens(user);
  }

  async validateAndReturnUser(
    username: string,
    password: string,
  ): Promise<AuthUser | null> {
    const userWithPassword = await this.authRepository.findByUsername(username);

    if (!userWithPassword) {
      return null;
    }

    const isValid = await this.passwordService.compare(
      password,
      userWithPassword.password,
    );

    if (!isValid) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...user } = userWithPassword;
    return user;
  }

  async generateTokensForUser(user: AuthUser): Promise<AuthTokens> {
    return this.generateTokens(user);
  }

  private generateTokens(user: AuthUser): AuthTokens {
    const payload = Authentication.createPayload(user);

    const accessToken = this.tokenService.sign(payload);
    const refreshToken = this.tokenService.sign(payload, {
      expiresIn: Authentication.REFRESH_TOKEN_EXPIRY,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: Authentication.ACCESS_TOKEN_EXPIRY,
      tokenType: 'Bearer',
    };
  }
}

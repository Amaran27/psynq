/**
 * Refresh Token Use Case (Application Layer)
 *
 * This is the APPLICATION layer in hexagonal architecture.
 * Handles token refresh logic.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IAuthRepository, ITokenService } from '../ports/auth-repository.port';
import {
  Authentication,
  AuthTokens,
  JwtPayload,
} from '../domain/authentication.entity';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify token
      const payload = this.tokenService.verify<JwtPayload>(refreshToken);

      // Find user
      const user = await this.authRepository.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const newPayload = Authentication.createPayload(user);

      const accessToken = this.tokenService.sign(newPayload);
      const newRefreshToken = this.tokenService.sign(newPayload, {
        expiresIn: Authentication.REFRESH_TOKEN_EXPIRY,
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: Authentication.ACCESS_TOKEN_EXPIRY,
        tokenType: 'Bearer',
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}

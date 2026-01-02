/**
 * JWT Token Service Adapter
 *
 * This is an ADAPTER in hexagonal architecture.
 * Implements ITokenService using @nestjs/jwt.
 *
 * Framework-specific code lives HERE, not in domain/application.
 */

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ITokenService } from '../ports/auth-repository.port';

@Injectable()
export class JwtTokenService implements ITokenService {
  constructor(private readonly jwtService: JwtService) {}

  sign(
    payload: Record<string, unknown>,
    options?: { expiresIn?: string },
  ): string {
    // Type assertion needed because JwtService has strict typing

    return this.jwtService.sign(payload, options as any);
  }

  verify<T = unknown>(token: string): T {
    return this.jwtService.verify(token) as T;
  }
}

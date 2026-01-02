/**
 * Update Status Use Case (Application Layer)
 *
 * This is the APPLICATION layer in hexagonal architecture.
 * Handles user status updates.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { IAuthRepository } from '../ports/auth-repository.port';
import { AuthUser } from '../domain/authentication.entity';

@Injectable()
export class UpdateStatusUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(userId: string, status: string): Promise<AuthUser> {
    // Update status
    await this.authRepository.updateStatus(userId, status, new Date());

    // Retrieve updated user
    const user = await this.authRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found after status update');
    }

    return user;
  }

  async getUserStatus(userId: string): Promise<string> {
    const user = await this.authRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.status;
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { AgentStatus } from '@psynq/core';
import { User, UserRole } from '../domain/user.domain';
import { IUserRepository } from '../ports/user-repository.port';

/**
 * Update User Status Use Case
 */
@Injectable()
export class UpdateUserStatusUseCase {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string, newStatus: AgentStatus): Promise<User> {
    // Get user
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if agent role
    if (!user.hasRole(UserRole.AGENT)) {
      throw new BadRequestException('Only agents can have status updates');
    }

    // Update status (domain validates transition)
    const updated = user.updateStatus(newStatus);
    if (!updated) {
      throw new BadRequestException(
        `Cannot transition from ${user.status} to ${newStatus}`,
      );
    }

    // Save updated user
    return this.userRepository.save(user);
  }
}

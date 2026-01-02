import { Injectable, Inject } from '@nestjs/common';
import { User, UserRole } from '../domain/user.domain';
import {
  IUserRepository,
  UserFilters,
  PaginatedUsers,
} from '../ports/user-repository.port';

/**
 * List Users Use Case
 */
@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
  ) {}

  async execute(filters: UserFilters): Promise<PaginatedUsers> {
    return this.userRepository.findAll(filters);
  }

  async findByRole(role: UserRole): Promise<User[]> {
    return this.userRepository.findByRole(role);
  }

  async findAvailableAgents(): Promise<User[]> {
    const agents = await this.userRepository.findByRole(UserRole.AGENT);
    return agents.filter((agent) => agent.isAvailable());
  }
}

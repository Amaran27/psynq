import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { UserRole } from '../domain/user.domain';
import { User } from '../domain/user.domain';
import { IUserRepository } from '../ports/user-repository.port';

/**
 * Assign Roles Use Case
 */
@Injectable()
export class AssignRolesUseCase {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    id: string,
    roles: UserRole[],
    primaryRole?: UserRole,
  ): Promise<User> {
    // Get user
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Assign roles (domain validates)
    user.assignRoles(roles, primaryRole);

    // Save updated user
    return this.userRepository.save(user);
  }
}

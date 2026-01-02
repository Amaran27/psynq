import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { UserUpdateData, User } from '../domain/user.domain';
import { IUserRepository } from '../ports/user-repository.port';

/**
 * Update User Use Case
 */
@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string, data: UserUpdateData): Promise<User> {
    // Get user
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check email conflict if changing email
    if (data.email && data.email !== user.email) {
      const existingEmail = await this.userRepository.existsByEmail(data.email);
      if (existingEmail) {
        throw new BadRequestException('Email already in use');
      }
    }

    // Update user (domain method handles validation)
    user.update(data);

    // Save updated user
    return this.userRepository.save(user);
  }
}

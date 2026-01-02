import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IUserRepository } from '../ports/user-repository.port';

/**
 * Delete User Use Case
 */
@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string): Promise<void> {
    // Check user exists
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Delete user
    await this.userRepository.delete(id);
  }
}

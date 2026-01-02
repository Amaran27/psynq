import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { User } from '../domain/user.domain';
import { IUserRepository } from '../ports/user-repository.port';

/**
 * Get User Use Case
 */
@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findByUsername(username);
  }
}

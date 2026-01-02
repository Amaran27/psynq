import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { CreateUserData, User } from '../domain/user.domain';
import {
  IUserRepository,
  IPasswordService,
} from '../ports/user-repository.port';

/**
 * Create User Use Case
 *
 * This is APPLICATION layer in hexagonal architecture.
 * It orchestrates domain logic and adapters to fulfill a business use case.
 *
 * Uses ports (interfaces), not concrete implementations.
 */
@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    @Inject('IPasswordService')
    private readonly passwordService: IPasswordService,
  ) {}

  async execute(data: CreateUserData): Promise<User> {
    // Check if username already exists
    const existingUsername = await this.userRepository.existsByUsername(
      data.username,
    );
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    // Check if email already exists
    const existingEmail = await this.userRepository.existsByEmail(data.email);
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await this.passwordService.hash(data.password);

    // Create user using repository
    const user = await this.userRepository.create(data, hashedPassword);

    return user;
  }
}

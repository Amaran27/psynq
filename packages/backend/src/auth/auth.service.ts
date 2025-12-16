import { Injectable, ConflictException, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity, UserRole } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { AgentStatus } from '@psynq/core';
import { CallService } from '../services/call.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => CallService))
    private readonly callService: CallService,
  ) {}

  /**
   * Registers a new user.
   * @param createUserDto - The user data for registration.
   * @returns The newly created user entity (without password).
   */
  async register(createUserDto: CreateUserDto): Promise<Omit<UserEntity, 'password'>> {
    const { username, password } = createUserDto;

    const existingUser = await this.userRepository.findOneBy({ username });
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = this.userRepository.create({
      username,
      password: hashedPassword,
      roles: [UserRole.AGENT], // Default role
    });

    const savedUser = await this.userRepository.save(newUser);
    const { password: _, ...result } = savedUser;
    return result;
  }

  /**
   * Validates a user's credentials.
   * @param username - The user's username.
   * @param pass - The user's plaintext password.
   * @returns The user entity if validation is successful, otherwise null.
   */
  async validateUser(username: string, pass: string): Promise<Omit<UserEntity, 'password'> | null> {
    const user = await this.userRepository.findOneBy({ username });
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Logs in a user and returns a JWT.
   * @param user - The user object (typically from validateUser).
   * @returns An object containing the access token.
   */
  async login(user: Omit<UserEntity, 'password'>) {
    const payload = { username: user.username, sub: user.id, roles: user.roles };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * Updates a user's status and attempts to find a call for them if they become available.
   * @param userId - The ID of the user to update.
   * @param status - The new status to set.
   */
  async updateStatus(userId: string, status: AgentStatus): Promise<UserEntity> {
    await this.userRepository.update(userId, { status });
    const updatedUser = await this.userRepository.findOneBy({ id: userId });

    if (status === AgentStatus.AVAILABLE) {
      await this.callService.findCallForAgent(userId);
    }

    if (!updatedUser) {
      throw new Error('User not found after update');
    }

    return updatedUser;
  }

  /**
   * Gets a user's status.
   * @param userId - The ID of the user to get the status for.
   * @returns The user's status.
   */
  async getUserStatus(userId: string): Promise<AgentStatus> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user.status;
  }
}

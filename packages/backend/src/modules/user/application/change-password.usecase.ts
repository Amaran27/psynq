import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { User } from '../domain/user.domain';
import {
  IUserRepository,
  IPasswordService,
} from '../ports/user-repository.port';

/**
 * Change Password Use Case
 */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    @Inject('IPasswordService')
    private readonly passwordService: IPasswordService,
  ) {}

  async execute(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    // Get user
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Verify current password
    const isValid = await this.passwordService.compare(
      currentPassword,
      user.password,
    );
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await this.passwordService.hash(newPassword);

    // Update user password
    user.password = hashedPassword;

    // Save
    await this.userRepository.save(user);
  }
}

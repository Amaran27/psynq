import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IAuthRepository } from '../ports/auth-repository.port';
import { PasswordResetToken } from '../domain/password-reset-token.domain';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
  ) {}

  async execute(token: string, newPassword: string): Promise<{ message: string }> {
    const resetToken = await this.authRepository.findPasswordResetToken(token);

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Use domain logic for validation
    if (!resetToken.isValid()) {
      if (resetToken.isExpired()) {
        throw new BadRequestException('Reset token has expired');
      }
      if (resetToken.isUsed()) {
        throw new BadRequestException('Reset token has already been used');
      }
    }

    // Mark token as used using domain logic
    const marked = resetToken.markAsUsed();
    if (!marked) {
      throw new BadRequestException('Unable to use reset token');
    }

    // Save updated token state
    await this.authRepository.savePasswordResetToken(resetToken);

    // Update user password
    await this.authRepository.updateUserPassword(resetToken.userId, newPassword);

    return {
      message: 'Password has been reset successfully',
    };
  }
}

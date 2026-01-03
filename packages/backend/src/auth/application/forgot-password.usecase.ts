import { Injectable, Inject } from '@nestjs/common';
import { IAuthRepository } from '../ports/auth-repository.port';
import { PasswordResetToken } from '../domain/password-reset-token.domain';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
  ) {}

  async execute(email: string): Promise<{ message: string; expiresAt: Date }> {
    const user = await this.authRepository.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        message: 'If the email exists, a password reset link has been sent',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      };
    }

    // Use domain model to create reset token
    const resetToken = PasswordResetToken.create(user.id, crypto.randomUUID());

    // Save via repository (domain → adapter → entity)
    await this.authRepository.savePasswordResetToken(resetToken);

    // TODO: Send email with reset link
    // For now, we'll log the token in development mode only
    if (process.env.NODE_ENV === 'development') {
      console.log(`Password reset token for ${email}: ${resetToken.token}`);
    }

    return {
      message: 'If the email exists, a password reset link has been sent',
      expiresAt: resetToken.expiresAt,
    };
  }
}

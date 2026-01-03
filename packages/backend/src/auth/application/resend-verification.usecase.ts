import { Injectable, Inject } from '@nestjs/common';
import { IAuthRepository } from '../ports/auth-repository.port';
import { EmailVerificationToken } from '../domain/email-verification-token.domain';

@Injectable()
export class ResendVerificationUseCase {
  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
  ) {}

  async execute(email: string): Promise<{ message: string; expiresAt: Date }> {
    const user = await this.authRepository.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        message: 'If the email exists and is not verified, a verification link has been sent',
        expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
      };
    }

    if (user.emailVerified) {
      return {
        message: 'Email is already verified',
        expiresAt: new Date(),
      };
    }

    // Use domain model to create verification token
    const verificationToken = EmailVerificationToken.create(user.id, crypto.randomUUID());

    // Save via repository (domain → adapter → entity)
    await this.authRepository.saveEmailVerificationToken(verificationToken);

    // TODO: Send email with verification link
    // For now, we'll log the token in development mode only
    if (process.env.NODE_ENV === 'development') {
      console.log(`Email verification token for ${email}: ${verificationToken.token}`);
    }

    return {
      message: 'If the email exists and is not verified, a verification link has been sent',
      expiresAt: verificationToken.expiresAt,
    };
  }
}

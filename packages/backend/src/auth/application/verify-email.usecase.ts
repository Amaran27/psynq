import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IAuthRepository } from '../ports/auth-repository.port';
import { EmailVerificationToken } from '../domain/email-verification-token.domain';

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
  ) {}

  async execute(token: string): Promise<{ message: string }> {
    const verificationToken = await this.authRepository.findEmailVerificationToken(token);

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Use domain logic for validation
    if (!verificationToken.isValid()) {
      if (verificationToken.isExpired()) {
        throw new BadRequestException('Verification token has expired');
      }
      if (verificationToken.isVerified()) {
        throw new BadRequestException('Email has already been verified');
      }
    }

    // Mark token as verified using domain logic
    const marked = verificationToken.markAsVerified();
    if (!marked) {
      throw new BadRequestException('Unable to verify email');
    }

    // Save updated token state
    await this.authRepository.saveEmailVerificationToken(verificationToken);

    // Mark user email as verified
    await this.authRepository.markEmailAsVerified(verificationToken.userId);

    return {
      message: 'Email verified successfully',
    };
  }
}

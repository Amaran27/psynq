import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { IAuthRepository } from '../ports/auth-repository.port';

@Injectable()
export class RevokeSessionUseCase {
  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
  ) {}

  async execute(userId: string, sessionId: string): Promise<{ message: string }> {
    const session = await this.authRepository.findSessionById(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new BadRequestException('You do not have permission to revoke this session');
    }

    if (session.isRevoked()) {
      throw new BadRequestException('Session is already revoked');
    }

    session.revoke();
    await this.authRepository.saveSession(session);

    return {
      message: 'Session revoked successfully',
    };
  }
}

import { Injectable, Inject } from '@nestjs/common';
import { IAuthRepository } from '../ports/auth-repository.port';

@Injectable()
export class RevokeAllSessionsUseCase {
  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
  ) {}

  async execute(userId: string, excludeCurrentSessionId?: string): Promise<{ message: string; revokedCount: number }> {
    const sessions = await this.authRepository.findActiveSessionsByUser(userId);

    const sessionsToRevoke = excludeCurrentSessionId
      ? sessions.filter(s => s.id !== excludeCurrentSessionId)
      : sessions;

    // Revoke each session using domain logic
    for (const session of sessionsToRevoke) {
      session.revoke();
      await this.authRepository.saveSession(session);
    }

    return {
      message: 'All sessions revoked successfully',
      revokedCount: sessionsToRevoke.length,
    };
  }
}

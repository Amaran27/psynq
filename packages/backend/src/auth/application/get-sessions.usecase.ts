import { Injectable, Inject } from '@nestjs/common';
import { IAuthRepository } from '../ports/auth-repository.port';
import { Session } from '../domain/session.domain';

@Injectable()
export class GetSessionsUseCase {
  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
  ) {}

  async execute(userId: string): Promise<Session[]> {
    return this.authRepository.findActiveSessionsByUser(userId);
  }
}

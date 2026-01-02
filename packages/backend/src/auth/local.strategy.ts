import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginUseCase } from './application/login.usecase';
import { AuthUser } from './domain/authentication.entity';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly loginUseCase: LoginUseCase) {
    super({ usernameField: 'username' });
  }

  async validate(username: string, password: string): Promise<AuthUser> {
    const user = await this.loginUseCase.validateAndReturnUser(
      username,
      password,
    );
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}

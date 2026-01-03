import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserEntity } from '../entities/user.entity';
import { PasswordResetTokenEntity } from '../entities/password-reset-token.entity';
import { EmailVerificationTokenEntity } from '../entities/email-verification-token.entity';
import { SessionEntity } from '../entities/session.entity';
import { FailedLoginEntity } from '../entities/failed-login.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';
// NOTE: Auth should not depend on CallModule. CallModule may depend on AuthModule,
// but keeping this one-way avoids circular dependencies and makes isolated auth tests possible.

// Hexagonal Architecture Imports
import { RegisterUseCase } from './application/register.usecase';
import { LoginUseCase } from './application/login.usecase';
import { RefreshTokenUseCase } from './application/refresh-token.usecase';
import { UpdateStatusUseCase } from './application/update-status.usecase';
import { ForgotPasswordUseCase } from './application/forgot-password.usecase';
import { ResetPasswordUseCase } from './application/reset-password.usecase';
import { VerifyEmailUseCase } from './application/verify-email.usecase';
import { ResendVerificationUseCase } from './application/resend-verification.usecase';
import { GetSessionsUseCase } from './application/get-sessions.usecase';
import { RevokeSessionUseCase } from './application/revoke-session.usecase';
import { RevokeAllSessionsUseCase } from './application/revoke-all-sessions.usecase';
import { TypeOrmAuthRepository } from './adapters/typeorm-auth-repository.adapter';
import { JwtTokenService } from './adapters/jwt-token.adapter';
import { BcryptPasswordService } from '../modules/user/adapters/bcrypt-password.adapter';
import {
  IAuthRepository,
  IPasswordService,
  ITokenService,
} from './ports/auth-repository.port';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      PasswordResetTokenEntity,
      EmailVerificationTokenEntity,
      SessionEntity,
      FailedLoginEntity,
    ]),
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret)
          throw new Error('JWT_SECRET environment variable is missing');
        return {
          secret,
          signOptions: {
            expiresIn: '1d',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    // Adapters (implement ports)
    {
      provide: 'IAuthRepository',
      useClass: TypeOrmAuthRepository,
    },
    {
      provide: 'IPasswordService',
      useClass: BcryptPasswordService,
    },
    {
      provide: 'ITokenService',
      useClass: JwtTokenService,
    },

    // Application layer (use cases)
    {
      provide: RegisterUseCase,
      useFactory: (
        authRepo: IAuthRepository,
        passwordService: IPasswordService,
      ) => {
        return new RegisterUseCase(authRepo, passwordService);
      },
      inject: ['IAuthRepository', 'IPasswordService'],
    },
    {
      provide: LoginUseCase,
      useFactory: (
        authRepo: IAuthRepository,
        passwordService: IPasswordService,
        tokenService: ITokenService,
      ) => {
        return new LoginUseCase(authRepo, passwordService, tokenService);
      },
      inject: ['IAuthRepository', 'IPasswordService', 'ITokenService'],
    },
    {
      provide: RefreshTokenUseCase,
      useFactory: (authRepo: IAuthRepository, tokenService: ITokenService) => {
        return new RefreshTokenUseCase(authRepo, tokenService);
      },
      inject: ['IAuthRepository', 'ITokenService'],
    },
    {
      provide: UpdateStatusUseCase,
      useFactory: (authRepo: IAuthRepository) => {
        return new UpdateStatusUseCase(authRepo);
      },
      inject: ['IAuthRepository'],
    },
    {
      provide: ForgotPasswordUseCase,
      useFactory: (authRepo: IAuthRepository) => {
        return new ForgotPasswordUseCase(authRepo);
      },
      inject: ['IAuthRepository'],
    },
    {
      provide: ResetPasswordUseCase,
      useFactory: (authRepo: IAuthRepository) => {
        return new ResetPasswordUseCase(authRepo);
      },
      inject: ['IAuthRepository'],
    },
    {
      provide: VerifyEmailUseCase,
      useFactory: (authRepo: IAuthRepository) => {
        return new VerifyEmailUseCase(authRepo);
      },
      inject: ['IAuthRepository'],
    },
    {
      provide: ResendVerificationUseCase,
      useFactory: (authRepo: IAuthRepository) => {
        return new ResendVerificationUseCase(authRepo);
      },
      inject: ['IAuthRepository'],
    },
    {
      provide: GetSessionsUseCase,
      useFactory: (authRepo: IAuthRepository) => {
        return new GetSessionsUseCase(authRepo);
      },
      inject: ['IAuthRepository'],
    },
    {
      provide: RevokeSessionUseCase,
      useFactory: (authRepo: IAuthRepository) => {
        return new RevokeSessionUseCase(authRepo);
      },
      inject: ['IAuthRepository'],
    },
    {
      provide: RevokeAllSessionsUseCase,
      useFactory: (authRepo: IAuthRepository) => {
        return new RevokeAllSessionsUseCase(authRepo);
      },
      inject: ['IAuthRepository'],
    },

    // Strategies
    LocalStrategy,
    JwtStrategy,

    // Legacy - keep for backward compatibility
    AuthService,
  ],
  exports: [AuthService, PassportModule, JwtModule],
})
export class AuthModule {}

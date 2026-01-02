import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserEntity } from '../entities/user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';
import { forwardRef } from '@nestjs/common';
import { CallModule } from '../call/call.module';

// Hexagonal Architecture Imports
import { RegisterUseCase } from './application/register.usecase';
import { LoginUseCase } from './application/login.usecase';
import { RefreshTokenUseCase } from './application/refresh-token.usecase';
import { UpdateStatusUseCase } from './application/update-status.usecase';
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
    TypeOrmModule.forFeature([UserEntity]),
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
    forwardRef(() => CallModule), // Resolve circular dependency with CallModule
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

    // Strategies
    LocalStrategy,
    JwtStrategy,

    // Legacy - keep for backward compatibility
    AuthService,
  ],
  exports: [AuthService, PassportModule, JwtModule],
})
export class AuthModule {}

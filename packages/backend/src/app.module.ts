import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TwilioModule } from './twilio/twilio.module';
import { WebhookController } from './webhooks/webhook.controller';
import { CallEntity } from './entities/call.entity';
import { UserEntity } from './entities/user.entity';
import { AuthModule } from './auth/auth.module';
import { CallModule } from './call/call.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'psynq_user',
      password: process.env.DB_PASSWORD || 'mysecretpassword',
      database: process.env.DB_NAME || 'psynq_db',
      entities: [CallEntity, UserEntity],
      // In development we keep synchronize for convenience; in production it must be disabled.
      synchronize: process.env.NODE_ENV !== 'production',
      migrations: [__dirname + '/migrations/*.{ts,js}'],
      // Control whether to auto-run migrations on startup via explicit env var. Default: do NOT auto-run in production.
      migrationsRun: process.env.RUN_MIGRATIONS_ON_START === 'true',
    }),
    TypeOrmModule.forFeature([UserEntity]), // CallEntity is in CallModule
    TwilioModule,
    AuthModule,
    CallModule, // Import the new CallModule
  ],
  controllers: [AppController, WebhookController], // CallController moved to CallModule
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}

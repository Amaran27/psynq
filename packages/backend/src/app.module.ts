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
      host: 'localhost',
      port: 5432,
      username: 'psynq_user',
      password: 'mysecretpassword',
      database: 'psynq_db',
      entities: [CallEntity, UserEntity],
      synchronize: true,
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

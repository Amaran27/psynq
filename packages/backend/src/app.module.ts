import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigService } from './config/app.config.service';
import { WebhookModule } from './webhooks/webhook.module';
import { CallEntity } from './entities/call.entity';
import { UserEntity } from './entities/user.entity';
import { CallParticipantEntity } from './entities/call-participant.entity';
import { RecordingEntity } from './entities/recording.entity';
import { SettingEntity } from './entities/setting.entity';
import { AuthModule } from './auth/auth.module';
import { CallModule } from './modules/call/call.module';
import { StorageModule } from './modules/storage/storage.module';
import { AsteriskModule } from './modules/asterisk/asterisk.module';
import { EventBusModule } from './modules/event-bus/event-bus.module';
import { TranscriptionModule } from './modules/transcription/transcription.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { TenantInterceptor } from './auth/tenant.interceptor';
import { SettingsController } from './settings.controller';
import { SystemSettingsController } from './system-settings.controller';
import { SettingsModule } from './modules/settings.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { UserModule } from './modules/user/user.module';
import { OrganizationEntity } from './entities/organization.entity';
import { QueueEntity } from './entities/queue.entity';
import { FlowEntity } from './entities/flow.entity';
import { WalletEntity } from './entities/wallet.entity';
import { RateEntity } from './entities/rate.entity';
import { ConfigModule as AppConfigModule } from './config/config.module';
// import { RecordingsModule } from './recordings/recordings.module'; // Temporarily disabled - missing minio module

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        '.env',
        '.env.development',
        '.env.production',
        '../../.env',
      ],
      isGlobal: true,
    }),
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST') || 'localhost',
        port: parseInt(configService.get<string>('DB_PORT') || '5432', 10),
        username: configService.get<string>('DB_USERNAME') || 'psynq_user',
        password:
          configService.get<string>('DB_PASSWORD') || 'mysecretpassword',
        database: configService.get<string>('DB_DATABASE') || 'psynq',
        entities: [
          CallEntity,
          UserEntity,
          CallParticipantEntity,
          RecordingEntity,
          SettingEntity,
          OrganizationEntity,
          QueueEntity,
          FlowEntity,
          WalletEntity,
          RateEntity,
        ],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        migrations: [__dirname + '/migrations/*.{ts,js}'],
        migrationsRun:
          configService.get<string>('RUN_MIGRATIONS_ON_START') === 'true',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([UserEntity]),
    AuthModule,
    CallModule,
    StorageModule,
    AsteriskModule,
    EventBusModule,
    TranscriptionModule,
    MonitoringModule,
    WebhookModule,
    SettingsModule,
    OrganizationModule,
    UserModule,
    // RecordingsModule, // Temporarily disabled - missing minio module
  ],
  controllers: [AppController, SettingsController, SystemSettingsController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule {}

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
import { ChannelEntity } from './entities/channel.entity';
import { BridgeEntity } from './entities/bridge.entity';
import { CampaignEntity } from './entities/campaign.entity';
import { LeadEntity } from './entities/lead.entity';
import { SettingEntity } from './entities/setting.entity';
import { AuthModule } from './auth/auth.module';
import { CallModule } from './modules/call/call.module';
import { ChannelModule } from './modules/channel/channel.module';
import { BridgeModule } from './modules/bridge/bridge.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { DialerModule } from './modules/dialer/dialer.module';
import { LeadModule } from './modules/lead/lead.module';
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
import { PasswordResetTokenEntity } from './entities/password-reset-token.entity';
import { EmailVerificationTokenEntity } from './entities/email-verification-token.entity';
import { SessionEntity } from './entities/session.entity';
import { FailedLoginEntity } from './entities/failed-login.entity';
import { LeadEntity as DialerLeadEntity } from './entities/dialer/lead.entity';
import { DialingSessionEntity } from './entities/dialer/dialing-session.entity';
import { DNCEntryEntity } from './entities/dialer/dnc-entry.entity';
import { IVRFlowEntity } from './entities/ivr-flow.entity';
import { IVRExecutionLogEntity } from './entities/ivr-execution-log.entity';
import { RecordingEntity as RecordingDBEntity } from './modules/recording/entities/recording.entity';
import { CDREntity as CDRDBEntity } from './modules/cdr/entities/cdr.entity';
import { IVRModule } from './modules/ivr/ivr.module';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { RecordingModule } from './modules/recording/recording.module';
import { CDRModule } from './modules/cdr/cdr.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReportTemplateEntity } from './entities/reports/report-template.entity';
import { ReportExecutionEntity } from './entities/reports/report-execution.entity';
import { CrmModule } from './modules/crm/crm.module';
import { CrmIntegrationEntity } from './modules/crm/infrastructure/persistence/crm-integration.entity';
import { SalesforceConnectionEntity } from './modules/crm/infrastructure/persistence/salesforce-connection.entity';

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
          ChannelEntity,
          BridgeEntity,
          CampaignEntity,
          LeadEntity,
          UserEntity,
          CallParticipantEntity,
          SettingEntity,
          OrganizationEntity,
          QueueEntity,
          FlowEntity,
          WalletEntity,
          RateEntity,
          PasswordResetTokenEntity,
          EmailVerificationTokenEntity,
          SessionEntity,
          FailedLoginEntity,
          DialerLeadEntity,
          DialingSessionEntity,
          DNCEntryEntity,
          IVRFlowEntity,
          IVRExecutionLogEntity,
          RecordingDBEntity,
          CDRDBEntity,
          ReportTemplateEntity,
          ReportExecutionEntity,
          CrmIntegrationEntity,
          SalesforceConnectionEntity,
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
    ChannelModule,
    BridgeModule,
    CampaignModule,
    DialerModule,
    IVRModule,
    RecordingModule,
    CDRModule,
    LeadModule,
    StorageModule,
    AsteriskModule,
    EventBusModule,
    TranscriptionModule,
    MonitoringModule,
    WebhookModule,
    SettingsModule,
    OrganizationModule,
    UserModule,
    ReportsModule,
    CrmModule,
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

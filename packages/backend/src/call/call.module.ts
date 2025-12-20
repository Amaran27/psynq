import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallEntity } from '../entities/call.entity';
import { CallParticipantEntity } from '../entities/call-participant.entity';
import { ConfigModule } from '@nestjs/config';
import { CallService } from '../services/call.service';
import { CallParticipantService } from '../services/call-participant.service';
import { CallController } from '../call.controller';
import { CallGateway } from '../call.gateway';
import { TwilioAdapter } from '../adapters/twilio.adapter';
import { InfobipAdapter } from '../adapters/infobip.adapter';
import { TelephonyRouterAdapter } from '../adapters/telephony-router.adapter';
import { AsteriskModule } from '../modules/asterisk/asterisk.module';
import { AuthModule } from '../auth/auth.module';
import { TwilioModule } from '../twilio/twilio.module';
import { StorageModule } from '../modules/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallEntity, CallParticipantEntity]),
    ConfigModule,
    forwardRef(() => AuthModule),
    TwilioModule,
    StorageModule,
    AsteriskModule,
  ],
  controllers: [CallController],
  providers: [
    CallService, 
    CallParticipantService, 
    CallGateway, 
    TwilioAdapter, 
    InfobipAdapter,
    TelephonyRouterAdapter, // Ensure it's available for DI resolution
    {
      provide: 'TELEPHONY_PROVIDER',
      useClass: TelephonyRouterAdapter,
    }
  ],
  exports: [CallService],
})
export class CallModule {}

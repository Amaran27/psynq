import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallEntity } from '../entities/call.entity';
import { ConfigModule } from '@nestjs/config';
import { CallService } from '../services/call.service';
import { CallController } from '../call.controller';
import { CallGateway } from '../call.gateway';
import { TwilioAdapter } from '../adapters/twilio.adapter';
import { InfobipAdapter } from '../telephony/infobip.adapter';
import { AuthModule } from '../auth/auth.module';
import { TwilioModule } from '../twilio/twilio.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallEntity]),
    ConfigModule,
    forwardRef(() => AuthModule),
    TwilioModule,
  ],
  controllers: [CallController],
  providers: [CallService, CallGateway, TwilioAdapter, InfobipAdapter],
  exports: [CallService],
})
export class CallModule {}

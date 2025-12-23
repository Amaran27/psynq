import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallEntity } from '../entities/call.entity';
import { CallParticipantEntity } from '../entities/call-participant.entity';
import { UserEntity } from '../entities/user.entity';
import { QueueEntity } from '../entities/queue.entity';
import { FlowEntity } from '../entities/flow.entity';
import { WalletEntity } from '../entities/wallet.entity';
import { RateEntity } from '../entities/rate.entity';
import { ConfigModule } from '@nestjs/config';
import { CallService } from '../services/call.service';
import { CallParticipantService } from '../services/call-participant.service';
import { AgentStateService } from '../services/agent-state.service';
import { CallOrchestratorService } from '../services/call-orchestrator.service';
import { QueueService } from '../services/queue.service';
import { FlowService } from '../services/flow.service';
import { FlowExecutorService } from '../services/flow-executor.service';
import { BillingService } from '../services/billing.service';
import { IntelligenceService } from '../services/intelligence.service';
import { CallController } from '../call.controller';
import { HealthController } from '../health.controller';
import { TelephonyController } from './telephony.controller';
import { CallGateway } from '../call.gateway';
import { AsteriskAdapter } from '../adapters/asterisk.adapter';
import { AsteriskModule } from '../modules/asterisk/asterisk.module';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { StorageModule } from '../modules/storage/storage.module';
import { EventBusModule } from '../modules/event-bus/event-bus.module';
import { ConfigModule as AppConfigModule } from '../config/config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CallEntity,
      CallParticipantEntity,
      QueueEntity,
      FlowEntity,
      WalletEntity,
      RateEntity,
      UserEntity,
    ]),
    ConfigModule,
    AppConfigModule,
    forwardRef(() => AuthModule),
    JwtModule,
    StorageModule,
    AsteriskModule,
    EventBusModule,
  ],
  controllers: [CallController, HealthController, TelephonyController],
  providers: [
    CallService, 
    CallParticipantService,
    AgentStateService,
    CallOrchestratorService,
    QueueService,
    FlowService,
    FlowExecutorService,
    BillingService,
    IntelligenceService,
    CallGateway, 
    {
      provide: 'TELEPHONY_PROVIDER',
      useClass: AsteriskAdapter,
    }
  ],
  exports: [CallService, AgentStateService, QueueService, FlowService, FlowExecutorService, BillingService, IntelligenceService],
})
export class CallModule {}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DialerController } from './dialer.controller';
import { LeadEntity } from '../../entities/dialer/lead.entity';
import { DialingSessionEntity } from '../../entities/dialer/dialing-session.entity';
import { DNCEntryEntity } from '../../entities/dialer/dnc-entry.entity';
import { CampaignEntity } from '../../entities/campaign.entity';
import { EventBusModule } from '../event-bus/event-bus.module';

// Ports
import { LEAD_REPOSITORY_PORT } from './ports/lead-repository.port';
import { DIALING_SESSION_REPOSITORY_PORT } from './ports/dialing-session-repository.port';
import { DNC_REPOSITORY_PORT } from './ports/dnc-repository.port';
import { CAMPAIGN_REPOSITORY_PORT } from '../campaign/ports/campaign-repository.port';

// Adapters
import { TypeOrmLeadRepositoryAdapter } from './adapters/typeorm-lead-repository.adapter';
import { TypeOrmDialingSessionRepositoryAdapter } from './adapters/typeorm-dialing-session-repository.adapter';
import { TypeOrmDNCRepositoryAdapter } from './adapters/typeorm-dnc-repository.adapter';
import { TypeOrmCampaignRepositoryAdapter } from '../campaign/adapters/typeorm-campaign-repository.adapter';

// Use Cases
import { StartProgressiveDialingUseCase } from './application/start-progressive-dialing.usecase';
import { AssignLeadToAgentUseCase } from './application/assign-lead-to-agent.usecase';
import { RecordDialAttemptUseCase } from './application/record-dial-attempt.usecase';
import { GetLeadPreviewUseCase } from './application/get-lead-preview.usecase';
import { ImportLeadsUseCase } from './application/import-leads.usecase';
import { CheckDNCUseCase } from './application/check-dnc.usecase';
import { AddToDNCListUseCase } from './application/add-to-dnc-list.usecase';

/**
 * Dialer Module (Hexagonal Architecture)
 * 
 * Wires together:
 * - Domain (pure TypeScript entities with business logic)
 * - Ports (interfaces)
 * - Adapters (TypeORM implementations)
 * - Application (use cases)
 * - Controller (HTTP layer)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeadEntity,
      DialingSessionEntity,
      DNCEntryEntity,
      CampaignEntity,
    ]),
    EventBusModule,
  ],
  controllers: [DialerController],
  providers: [
    // Bind ports to adapters
    {
      provide: LEAD_REPOSITORY_PORT,
      useClass: TypeOrmLeadRepositoryAdapter,
    },
    {
      provide: DIALING_SESSION_REPOSITORY_PORT,
      useClass: TypeOrmDialingSessionRepositoryAdapter,
    },
    {
      provide: DNC_REPOSITORY_PORT,
      useClass: TypeOrmDNCRepositoryAdapter,
    },
    {
      provide: CAMPAIGN_REPOSITORY_PORT,
      useClass: TypeOrmCampaignRepositoryAdapter,
    },
    // Register use cases
    StartProgressiveDialingUseCase,
    AssignLeadToAgentUseCase,
    RecordDialAttemptUseCase,
    GetLeadPreviewUseCase,
    ImportLeadsUseCase,
    CheckDNCUseCase,
    AddToDNCListUseCase,
  ],
  exports: [
    // Export use cases for other modules
    StartProgressiveDialingUseCase,
    AssignLeadToAgentUseCase,
    RecordDialAttemptUseCase,
    GetLeadPreviewUseCase,
    ImportLeadsUseCase,
    CheckDNCUseCase,
    AddToDNCListUseCase,
  ],
})
export class DialerModule {}

/**
 * IVR Module
 * 
 * Dependency injection configuration for IVR & Call Flows
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IVRFlowEntity } from '../../entities/ivr-flow.entity';
import { IVRExecutionLogEntity } from '../../entities/ivr-execution-log.entity';
import { TypeOrmIVRFlowRepositoryAdapter } from './adapters/typeorm-ivr-flow-repository.adapter';
import { TypeOrmIVRExecutionLogRepositoryAdapter } from './adapters/typeorm-ivr-execution-log-repository.adapter';
import { CreateFlowUseCase } from './application/create-flow.usecase';
import { GetFlowUseCase } from './application/get-flow.usecase';
import { ListFlowsUseCase } from './application/list-flows.usecase';
import { UpdateFlowUseCase } from './application/update-flow.usecase';
import { DeleteFlowUseCase } from './application/delete-flow.usecase';
import { ActivateFlowUseCase } from './application/activate-flow.usecase';
import { GetExecutionLogUseCase } from './application/get-execution-log.usecase';
import { GetFlowAnalyticsUseCase } from './application/get-flow-analytics.usecase';
import { ExecuteIVRFlowUseCase } from './application/execute-ivr-flow.usecase';
import { IVRController } from './ivr.controller';
import { IVROrchestratorService } from './services/ivr-orchestrator.service';
import { IVRDtmfBridgeService } from './services/ivr-dtmf-bridge.service';
import { EventBusModule } from '../event-bus/event-bus.module';
import { AsteriskModule } from '../asterisk/asterisk.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IVRFlowEntity,
      IVRExecutionLogEntity,
    ]),
    EventBusModule,
    AsteriskModule,
  ],
  controllers: [IVRController],
  providers: [
    // Adapters
    TypeOrmIVRFlowRepositoryAdapter,
    TypeOrmIVRExecutionLogRepositoryAdapter,

    // Port bindings (dependency inversion)
    {
      provide: 'IVR_FLOW_REPOSITORY',
      useExisting: TypeOrmIVRFlowRepositoryAdapter,
    },
    {
      provide: 'IVR_EXECUTION_LOG_REPOSITORY',
      useExisting: TypeOrmIVRExecutionLogRepositoryAdapter,
    },

    // Use cases
    CreateFlowUseCase,
    GetFlowUseCase,
    ListFlowsUseCase,
    UpdateFlowUseCase,
    DeleteFlowUseCase,
    ActivateFlowUseCase,
    GetExecutionLogUseCase,
    GetFlowAnalyticsUseCase,
    ExecuteIVRFlowUseCase,

    // Services
    IVROrchestratorService,
    IVRDtmfBridgeService,
  ],
  exports: [
    'IVR_FLOW_REPOSITORY',
    'IVR_EXECUTION_LOG_REPOSITORY',
    CreateFlowUseCase,
    GetFlowUseCase,
  ],
})
export class IVRModule {}

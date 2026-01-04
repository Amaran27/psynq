/**
 * IVR Builder Module
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IVRFlowEntity } from './infrastructure/persistence/ivr-flow.entity';
import { IVRExecutionEntity } from './infrastructure/persistence/ivr-execution.entity';
import { IVRFlowRepositoryAdapter } from './infrastructure/persistence/ivr-flow.repository.adapter';
import { IVRExecutionRepositoryAdapter } from './infrastructure/persistence/ivr-execution.repository.adapter';
import { IVR_FLOW_REPOSITORY } from './domain/ports/ivr-flow.repository';
import { IVR_EXECUTION_REPOSITORY } from './domain/ports/ivr-execution.repository';
import { FlowBuilderService } from './application/flow-builder.service';
import { FlowExecutionService } from './application/flow-execution.service';
import { FlowBuilderController } from './presentation/flow-builder.controller';
import { FlowExecutionController } from './presentation/flow-execution.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IVRFlowEntity,
      IVRExecutionEntity,
    ]),
  ],
  controllers: [
    FlowBuilderController,
    FlowExecutionController,
  ],
  providers: [
    {
      provide: IVR_FLOW_REPOSITORY,
      useClass: IVRFlowRepositoryAdapter,
    },
    {
      provide: IVR_EXECUTION_REPOSITORY,
      useClass: IVRExecutionRepositoryAdapter,
    },
    FlowBuilderService,
    FlowExecutionService,
  ],
  exports: [
    FlowBuilderService,
    FlowExecutionService,
  ],
})
export class IVRBuilderModule {}

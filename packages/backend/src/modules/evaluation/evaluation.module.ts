/**
 * Evaluation Module
 * 
 * Wires together all evaluation system components
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScorecardEntity } from './infrastructure/persistence/scorecard.entity';
import { EvaluationEntity } from './infrastructure/persistence/evaluation.entity';
import { ScorecardRepositoryAdapter } from './infrastructure/persistence/scorecard.repository.adapter';
import { EvaluationRepositoryAdapter } from './infrastructure/persistence/evaluation.repository.adapter';
import { SCORECARD_REPOSITORY } from './domain/ports/scorecard.repository';
import { EVALUATION_REPOSITORY } from './domain/ports/evaluation.repository';
import { ScorecardService } from './application/scorecard.service';
import { EvaluationService } from './application/evaluation.service';
import { ScorecardController } from './presentation/scorecard.controller';
import { EvaluationController } from './presentation/evaluation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScorecardEntity,
      EvaluationEntity,
    ]),
  ],
  controllers: [
    ScorecardController,
    EvaluationController,
  ],
  providers: [
    {
      provide: SCORECARD_REPOSITORY,
      useClass: ScorecardRepositoryAdapter,
    },
    {
      provide: EVALUATION_REPOSITORY,
      useClass: EvaluationRepositoryAdapter,
    },
    ScorecardService,
    EvaluationService,
  ],
  exports: [
    ScorecardService,
    EvaluationService,
  ],
})
export class EvaluationModule {}

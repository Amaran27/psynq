import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForecastEntity } from './entities/forecast.entity';
import { ForecastModelEntity } from './entities/forecast-model.entity';
import { ForecastController } from './controllers/forecast.controller';
import { ModelController } from './controllers/model.controller';
import { ForecastService } from './services/forecast.service';
import { ModelTrainingService } from './services/model-training.service';
import { ForecastingEngineService } from './services/forecasting-engine.service';
import { ForecastRepositoryAdapter } from './adapters/forecast.repository.adapter';
import { ForecastModelRepositoryAdapter } from './adapters/forecast-model.repository.adapter';
import {
  FORECAST_REPOSITORY,
} from './ports/forecast.repository.port';
import {
  FORECAST_MODEL_REPOSITORY,
} from './ports/forecast-model.repository.port';

@Module({
  imports: [
    TypeOrmModule.forFeature([ForecastEntity, ForecastModelEntity]),
  ],
  controllers: [ForecastController, ModelController],
  providers: [
    // Services
    ForecastService,
    ModelTrainingService,
    ForecastingEngineService,
    // Repository adapters
    {
      provide: FORECAST_REPOSITORY,
      useClass: ForecastRepositoryAdapter,
    },
    {
      provide: FORECAST_MODEL_REPOSITORY,
      useClass: ForecastModelRepositoryAdapter,
    },
  ],
  exports: [ForecastService, ModelTrainingService],
})
export class ForecastingModule {}

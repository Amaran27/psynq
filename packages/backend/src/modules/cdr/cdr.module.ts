/**
 * CDR Module
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CDREntity } from './entities/cdr.entity';
import { TypeOrmCDRRepository } from './adapters/typeorm-cdr.repository';
import { ListCDRUseCase } from './application/list-cdr.usecase';
import { GetCDRAnalyticsUseCase } from './application/get-cdr-analytics.usecase';
import { ExportCDRUseCase } from './application/export-cdr.usecase';
import { CDRController } from './cdr.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CDREntity])],
  controllers: [CDRController],
  providers: [
    {
      provide: 'CDR_REPOSITORY',
      useClass: TypeOrmCDRRepository,
    },
    ListCDRUseCase,
    GetCDRAnalyticsUseCase,
    ExportCDRUseCase,
  ],
  exports: ['CDR_REPOSITORY', ListCDRUseCase],
})
export class CDRModule {}

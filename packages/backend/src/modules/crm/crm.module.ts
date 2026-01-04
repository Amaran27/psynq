import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmIntegrationEntity } from './infrastructure/persistence/crm-integration.entity';
import { SalesforceConnectionEntity } from './infrastructure/persistence/salesforce-connection.entity';
import { SalesforceAdapterController } from './presentation/salesforce-adapter.controller';
import { SalesforceAdapterService } from './application/salesforce-adapter.service';
import { TypeOrmCrmRepositoryAdapter } from './infrastructure/adapters/typeorm-crm-repository.adapter';
import { TypeOrmSalesforceConnectionRepositoryAdapter } from './infrastructure/adapters/typeorm-salesforce-connection-repository.adapter';
import { JSForceSalesforceApiAdapter } from './infrastructure/adapters/jsforce-salesforce-api.adapter';
import { CRM_REPOSITORY_PORT } from './domain/ports/crm-repository.port';
import { SALESFORCE_CONNECTION_REPOSITORY_PORT } from './domain/ports/salesforce-connection-repository.port';
import { SALESFORCE_API_PORT } from './domain/ports/salesforce-api.port';

@Module({
  imports: [TypeOrmModule.forFeature([CrmIntegrationEntity, SalesforceConnectionEntity])],
  controllers: [SalesforceAdapterController],
  providers: [
    SalesforceAdapterService,
    {
      provide: CRM_REPOSITORY_PORT,
      useClass: TypeOrmCrmRepositoryAdapter,
    },
    {
      provide: SALESFORCE_CONNECTION_REPOSITORY_PORT,
      useClass: TypeOrmSalesforceConnectionRepositoryAdapter,
    },
    {
      provide: SALESFORCE_API_PORT,
      useClass: JSForceSalesforceApiAdapter,
    },
  ],
  exports: [SalesforceAdapterService],
})
export class CrmModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationEntity } from '../../entities/organization.entity';
import { OrganizationController } from './organization.controller';
import { ORGANIZATION_REPOSITORY_PORT } from './ports/organization-repository.port';
import { TypeOrmOrganizationRepositoryAdapter } from './adapters/typeorm-organization-repository.adapter';
import { CreateOrganizationUseCase } from './application/create-organization.usecase';
import { GetOrganizationUseCase } from './application/get-organization.usecase';
import { GetOrganizationBySlugUseCase } from './application/get-organization-by-slug.usecase';
import { ListOrganizationsUseCase } from './application/list-organizations.usecase';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationEntity])],
  providers: [
    {
      provide: ORGANIZATION_REPOSITORY_PORT,
      useClass: TypeOrmOrganizationRepositoryAdapter,
    },
    CreateOrganizationUseCase,
    GetOrganizationUseCase,
    GetOrganizationBySlugUseCase,
    ListOrganizationsUseCase,
  ],
  controllers: [OrganizationController],
  exports: [
    ORGANIZATION_REPOSITORY_PORT,
    CreateOrganizationUseCase,
    GetOrganizationUseCase,
    GetOrganizationBySlugUseCase,
    ListOrganizationsUseCase,
  ],
})
export class OrganizationModule {}

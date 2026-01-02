import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CreateOrganizationUseCase } from './application/create-organization.usecase';
import { GetOrganizationUseCase } from './application/get-organization.usecase';
import { ListOrganizationsUseCase } from './application/list-organizations.usecase';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(
    private readonly createOrgUseCase: CreateOrganizationUseCase,
    private readonly getOrgUseCase: GetOrganizationUseCase,
    private readonly listOrgsUseCase: ListOrganizationsUseCase,
  ) {}

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN)
  async createTenant(@Body() body: { name: string; slug: string }) {
    return this.createOrgUseCase.execute(body.name, body.slug);
  }

  @Get()
  @Roles(UserRole.SYSTEM_ADMIN)
  async listTenants() {
    return this.listOrgsUseCase.execute();
  }

  @Get(':id')
  @Roles(UserRole.SYSTEM_ADMIN)
  async getTenant(@Param('id') id: string) {
    return this.getOrgUseCase.execute(id);
  }
}

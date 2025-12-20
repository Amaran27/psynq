import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN)
  async createTenant(@Body() body: { name: string; slug: string }) {
    return this.orgService.create(body.name, body.slug);
  }

  @Get()
  @Roles(UserRole.SYSTEM_ADMIN)
  async listTenants() {
    return this.orgService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SYSTEM_ADMIN)
  async getTenant(@Param('id') id: string) {
    return this.orgService.findOne(id);
  }
}

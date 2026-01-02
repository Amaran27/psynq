import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CreateOrganizationUseCase } from './application/create-organization.usecase';
import { GetOrganizationUseCase } from './application/get-organization.usecase';
import { ListOrganizationsUseCase } from './application/list-organizations.usecase';

@ApiTags('Organization Management')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Create new organization (tenant)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Organization name',
          example: 'Acme Corporation',
        },
        slug: {
          type: 'string',
          description: 'URL-friendly organization identifier',
          example: 'acme-corp',
        },
      },
      required: ['name', 'slug'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        slug: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive'] },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires SYSTEM_ADMIN role',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Organization name or slug already exists',
  })
  async createTenant(@Body() body: { name: string; slug: string }) {
    return this.createOrgUseCase.execute(body.name, body.slug);
  }

  @Get()
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'List all organizations (tenants)' })
  @ApiResponse({
    status: 200,
    description: 'List of all organizations',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          slug: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires SYSTEM_ADMIN role',
  })
  async listTenants() {
    return this.listOrgsUseCase.execute();
  }

  @Get(':id')
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Get organization (tenant) by ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        slug: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive'] },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires SYSTEM_ADMIN role',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Organization with specified ID does not exist',
  })
  async getTenant(@Param('id') id: string) {
    return this.getOrgUseCase.execute(id);
  }
}

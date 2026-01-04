import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { ConfigurationService } from '../application/configuration.service';
import { CreateWhatsAppConfigurationDto, UpdateWhatsAppConfigurationDto } from '../dto';

@ApiTags('whatsapp-configuration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('whatsapp/configuration')
export class WhatsAppConfigurationController {
  constructor(private readonly configurationService: ConfigurationService) {}

  @Post()
  @ApiOperation({ summary: 'Create WhatsApp configuration for organization (UI: Settings Page)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Configuration created' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Configuration already exists' })
  async create(@Request() req, @Body() dto: CreateWhatsAppConfigurationDto) {
    dto.organizationId = req.user.organizationId;
    return this.configurationService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get WhatsApp configuration for current organization (UI: Load Settings)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Configuration found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No configuration found' })
  async getForOrganization(@Request() req) {
    const config = await this.configurationService.findByOrganization(req.user.organizationId);
    if (!config) {
      return { message: 'No WhatsApp configuration found. Please create one.' };
    }
    return config.toJSON(); // Redacts sensitive fields
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get configuration by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Configuration found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Configuration not found' })
  async findById(@Param('id') id: string) {
    const config = await this.configurationService.findById(id);
    return config.toJSON();
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update WhatsApp configuration (UI: Save Settings)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Configuration updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Configuration not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateWhatsAppConfigurationDto) {
    const config = await this.configurationService.update(id, dto);
    return config.toJSON();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete WhatsApp configuration' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async delete(@Param('id') id: string) {
    await this.configurationService.delete(id);
  }

  @Post('test-connection')
  @ApiOperation({ summary: 'Test WhatsApp API connection (UI: Test Button)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Connection test result' })
  async testConnection(@Request() req) {
    return this.configurationService.testConnection(req.user.organizationId);
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { TemplateService } from '../application/template.service';
import { CreateTemplateDto, UpdateTemplateDto } from '../dto';

@ApiTags('whatsapp/templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('whatsapp/templates')
export class WhatsAppTemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @ApiOperation({ summary: 'Create a WhatsApp message template' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Template created' })
  async create(@Request() req, @Body() dto: CreateTemplateDto) {
    dto.organizationId = req.user.organizationId;
    return this.templateService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List templates with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'language', required: false })
  async findAll(@Request() req, @Query() query: any) {
    const filter = {
      organizationId: req.user.organizationId,
      ...query,
    };
    return this.templateService.findAll(filter);
  }

  @Get('approved')
  @ApiOperation({ summary: 'Get approved templates (ready to use)' })
  async findApproved(@Request() req) {
    return this.templateService.findApproved(req.user.organizationId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get template statistics' })
  async getStatistics(@Request() req) {
    return this.templateService.getTemplateStats(req.user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Template found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Template not found' })
  async findById(@Param('id') id: string) {
    return this.templateService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update template (draft only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templateService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async delete(@Param('id') id: string) {
    await this.templateService.delete(id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit template for WhatsApp approval' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Template submitted for approval' })
  async submitForApproval(@Param('id') id: string) {
    return this.templateService.submitForApproval(id);
  }

  @Post(':id/sync-status')
  @ApiOperation({ summary: 'Sync template status from WhatsApp' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Template status synced' })
  async syncStatus(@Param('id') id: string) {
    return this.templateService.syncTemplateStatus(id);
  }
}

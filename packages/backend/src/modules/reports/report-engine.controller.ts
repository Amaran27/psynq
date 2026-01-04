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
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ReportEngineService } from './application/report-engine.service';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { UpdateReportTemplateDto } from './dto/update-report-template.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportStatus, ReportType } from '../../entities/reports/report-template.entity';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/reports')
export class ReportEngineController {
  constructor(private readonly service: ReportEngineService) {}

  @Post('templates')
  @ApiOperation({ summary: 'Create a new report template' })
  @ApiResponse({
    status: 201,
    description: 'Report template created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() dto: CreateReportTemplateDto) {
    const template = await this.service.create(dto);
    return template.toJSON();
  }

  @Get('templates')
  @ApiOperation({ summary: 'List all report templates' })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ReportStatus })
  @ApiQuery({ name: 'type', required: false, enum: ReportType })
  @ApiResponse({ status: 200, description: 'List of report templates' })
  async findAll(
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: ReportStatus,
    @Query('type') type?: ReportType,
  ) {
    const templates = await this.service.findAll({
      organizationId,
      status,
      type,
    });
    return templates.map((t) => t.toJSON());
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get a report template by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Report template found' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findOne(@Param('id') id: string) {
    const template = await this.service.findOne(id);
    return template.toJSON();
  }

  @Get('templates/organization/:organizationId')
  @ApiOperation({ summary: 'Get all templates for an organization' })
  @ApiParam({ name: 'organizationId', type: String })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async findByOrganization(@Param('organizationId') organizationId: string) {
    const templates = await this.service.findByOrganization(organizationId);
    return templates.map((t) => t.toJSON());
  }

  @Get('templates/organization/:organizationId/active')
  @ApiOperation({ summary: 'Get active templates for an organization' })
  @ApiParam({ name: 'organizationId', type: String })
  @ApiResponse({ status: 200, description: 'List of active templates' })
  async findActiveByOrganization(
    @Param('organizationId') organizationId: string,
  ) {
    const templates =
      await this.service.findActiveByOrganization(organizationId);
    return templates.map((t) => t.toJSON());
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update a report template' })
  @ApiParam({ name: 'id', type: String, description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateReportTemplateDto) {
    const template = await this.service.update(id, dto);
    return template.toJSON();
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a report template' })
  @ApiParam({ name: 'id', type: String, description: 'Template ID' })
  @ApiResponse({ status: 204, description: 'Template deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete scheduled report' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
  }

  @Post('templates/:id/activate')
  @ApiOperation({ summary: 'Activate a report template' })
  @ApiParam({ name: 'id', type: String, description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template activated' })
  async activate(@Param('id') id: string) {
    const template = await this.service.activate(id);
    return template.toJSON();
  }

  @Post('templates/:id/archive')
  @ApiOperation({ summary: 'Archive a report template' })
  @ApiParam({ name: 'id', type: String, description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template archived' })
  @ApiResponse({
    status: 400,
    description: 'Cannot archive scheduled report',
  })
  async archive(@Param('id') id: string) {
    const template = await this.service.archive(id);
    return template.toJSON();
  }

  @Post('templates/:id/draft')
  @ApiOperation({ summary: 'Set template to draft status' })
  @ApiParam({ name: 'id', type: String, description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template set to draft' })
  async draft(@Param('id') id: string) {
    const template = await this.service.draft(id);
    return template.toJSON();
  }

  @Post('templates/:id/schedule')
  @ApiOperation({ summary: 'Enable scheduling for a template' })
  @ApiParam({ name: 'id', type: String, description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Scheduling enabled' })
  @ApiResponse({ status: 400, description: 'Invalid cron expression' })
  async enableScheduling(
    @Param('id') id: string,
    @Body()
    body: {
      cronExpression: string;
      recipients?: string[];
    },
  ) {
    const template = await this.service.enableScheduling(
      id,
      body.cronExpression,
      body.recipients,
    );
    return template.toJSON();
  }

  @Delete('templates/:id/schedule')
  @ApiOperation({ summary: 'Disable scheduling for a template' })
  @ApiParam({ name: 'id', type: String, description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Scheduling disabled' })
  async disableScheduling(@Param('id') id: string) {
    const template = await this.service.disableScheduling(id);
    return template.toJSON();
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate and export a report' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request or template' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async generate(@Body() dto: GenerateReportDto, @Res() res: Response) {
    const result = await this.service.generateReport(dto);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`,
    );
    res.setHeader('Content-Length', result.sizeBytes);

    res.send(result.buffer);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get report statistics' })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Report statistics' })
  async getStatistics(@Query('organizationId') organizationId?: string) {
    return await this.service.getStatistics({ organizationId });
  }
}

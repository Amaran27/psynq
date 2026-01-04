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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { SalesforceAdapterService } from '../application/salesforce-adapter.service';
import { CreateCrmIntegrationDto } from '../application/dto/create-crm-integration.dto';
import { UpdateCrmIntegrationDto } from '../application/dto/update-crm-integration.dto';
import { ConnectSalesforceDto } from '../application/dto/connect-salesforce.dto';
import { LogCallDto } from '../application/dto/log-call.dto';
import { SyncContactsDto, SyncLeadsDto } from '../application/dto/sync-records.dto';
import { CrmProvider, ConnectionStatus } from '../infrastructure/persistence/crm-integration.entity';

@ApiTags('CRM Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/crm')
export class SalesforceAdapterController {
  constructor(private readonly salesforceAdapterService: SalesforceAdapterService) {}

  @Post('integrations')
  @ApiOperation({ summary: 'Create a new CRM integration' })
  @ApiResponse({ status: 201, description: 'Integration created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() dto: CreateCrmIntegrationDto) {
    const integration = await this.salesforceAdapterService.create(dto);
    return integration.toJSON();
  }

  @Get('integrations')
  @ApiOperation({ summary: 'List all CRM integrations with optional filters' })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  @ApiQuery({ name: 'provider', required: false, enum: CrmProvider })
  @ApiQuery({ name: 'status', required: false, enum: ConnectionStatus })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Integrations retrieved successfully' })
  async findAll(
    @Query('organizationId') organizationId?: string,
    @Query('provider') provider?: CrmProvider,
    @Query('status') status?: ConnectionStatus,
    @Query('isActive') isActive?: boolean,
  ) {
    const integrations = await this.salesforceAdapterService.findAll({
      organizationId,
      provider,
      status,
      isActive: isActive !== undefined ? isActive === true : undefined,
    });
    return integrations.map((i) => i.toJSON());
  }

  @Get('integrations/:id')
  @ApiOperation({ summary: 'Get CRM integration by ID' })
  @ApiResponse({ status: 200, description: 'Integration retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const integration = await this.salesforceAdapterService.findOne(id);
    return integration.toJSON();
  }

  @Get('integrations/organization/:organizationId')
  @ApiOperation({ summary: 'Get all integrations for an organization' })
  @ApiResponse({ status: 200, description: 'Integrations retrieved successfully' })
  async findByOrganization(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    const integrations = await this.salesforceAdapterService.findByOrganization(organizationId);
    return integrations.map((i) => i.toJSON());
  }

  @Get('integrations/organization/:organizationId/active')
  @ApiOperation({ summary: 'Get active integrations for an organization' })
  @ApiResponse({ status: 200, description: 'Active integrations retrieved successfully' })
  async findActive(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    const integrations = await this.salesforceAdapterService.findActive(organizationId);
    return integrations.map((i) => i.toJSON());
  }

  @Put('integrations/:id')
  @ApiOperation({ summary: 'Update CRM integration' })
  @ApiResponse({ status: 200, description: 'Integration updated successfully' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCrmIntegrationDto) {
    const integration = await this.salesforceAdapterService.update(id, dto);
    return integration.toJSON();
  }

  @Delete('integrations/:id')
  @ApiOperation({ summary: 'Delete CRM integration' })
  @ApiResponse({ status: 200, description: 'Integration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.salesforceAdapterService.remove(id);
    return { message: 'Integration deleted successfully' };
  }

  @Get('salesforce/auth-url')
  @ApiOperation({ summary: 'Get Salesforce OAuth authorization URL' })
  @ApiQuery({ name: 'integrationId', type: String })
  @ApiQuery({ name: 'redirectUri', type: String })
  @ApiQuery({ name: 'state', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Authorization URL generated' })
  getAuthorizationUrl(
    @Query('integrationId') integrationId: string,
    @Query('redirectUri') redirectUri: string,
    @Query('state') state?: string,
  ) {
    const url = this.salesforceAdapterService.getAuthorizationUrl(integrationId, redirectUri, state);
    return { authorizationUrl: url };
  }

  @Post('salesforce/:integrationId/connect')
  @ApiOperation({ summary: 'Connect to Salesforce using OAuth code' })
  @ApiResponse({ status: 200, description: 'Connected to Salesforce successfully' })
  @ApiResponse({ status: 400, description: 'Connection failed' })
  async connect(
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @Body() dto: ConnectSalesforceDto,
  ) {
    const integration = await this.salesforceAdapterService.connectSalesforce(integrationId, dto);
    return integration.toJSON();
  }

  @Post('salesforce/:integrationId/disconnect')
  @ApiOperation({ summary: 'Disconnect from Salesforce' })
  @ApiResponse({ status: 200, description: 'Disconnected successfully' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async disconnect(@Param('integrationId', ParseUUIDPipe) integrationId: string) {
    const integration = await this.salesforceAdapterService.disconnectSalesforce(integrationId);
    return integration.toJSON();
  }

  @Post('salesforce/:integrationId/refresh-token')
  @ApiOperation({ summary: 'Refresh Salesforce access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 400, description: 'Token refresh failed' })
  async refreshToken(@Param('integrationId', ParseUUIDPipe) integrationId: string) {
    const integration = await this.salesforceAdapterService.refreshSalesforceToken(integrationId);
    return integration.toJSON();
  }

  @Post('salesforce/:integrationId/test-connection')
  @ApiOperation({ summary: 'Test Salesforce connection' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testConnection(@Param('integrationId', ParseUUIDPipe) integrationId: string) {
    const isHealthy = await this.salesforceAdapterService.testConnection(integrationId);
    return { isHealthy, message: isHealthy ? 'Connection is healthy' : 'Connection failed' };
  }

  @Post('salesforce/sync/contacts')
  @ApiOperation({ summary: 'Sync contacts from Salesforce' })
  @ApiResponse({ status: 200, description: 'Contacts synced successfully' })
  @ApiResponse({ status: 400, description: 'Sync failed' })
  async syncContacts(@Body() dto: SyncContactsDto) {
    const contacts = await this.salesforceAdapterService.syncContacts(dto);
    return { totalRecords: contacts.length, contacts };
  }

  @Post('salesforce/sync/leads')
  @ApiOperation({ summary: 'Sync leads from Salesforce' })
  @ApiResponse({ status: 200, description: 'Leads synced successfully' })
  @ApiResponse({ status: 400, description: 'Sync failed' })
  async syncLeads(@Body() dto: SyncLeadsDto) {
    const leads = await this.salesforceAdapterService.syncLeads(dto);
    return { totalRecords: leads.length, leads };
  }

  @Post('salesforce/:integrationId/log-call')
  @ApiOperation({ summary: 'Log call to Salesforce as a Task' })
  @ApiResponse({ status: 201, description: 'Call logged successfully' })
  @ApiResponse({ status: 400, description: 'Call logging failed' })
  async logCall(@Param('integrationId', ParseUUIDPipe) integrationId: string, @Body() dto: LogCallDto) {
    const taskId = await this.salesforceAdapterService.logCall(integrationId, dto);
    return { taskId, message: 'Call logged successfully' };
  }

  @Get('salesforce/:integrationId/connection')
  @ApiOperation({ summary: 'Get Salesforce connection details' })
  @ApiResponse({ status: 200, description: 'Connection details retrieved' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  async getConnection(@Param('integrationId', ParseUUIDPipe) integrationId: string) {
    const connection = await this.salesforceAdapterService.getSalesforceConnection(integrationId);
    return connection ? connection.toJSON() : null;
  }

  @Get('statistics/organization/:organizationId')
  @ApiOperation({ summary: 'Get CRM integration statistics for organization' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.salesforceAdapterService.getStatistics(organizationId);
  }
}

import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CrmIntegration } from '../domain/crm-integration.domain';
import { SalesforceConnection } from '../domain/salesforce-connection.domain';
import {
  CRM_REPOSITORY_PORT,
  FindCrmIntegrationsFilter,
} from '../domain/ports/crm-repository.port';
import { SALESFORCE_CONNECTION_REPOSITORY_PORT } from '../domain/ports/salesforce-connection-repository.port';
import {
  SALESFORCE_API_PORT,
  SalesforceContact,
  SalesforceLead,
} from '../domain/ports/salesforce-api.port';
import { CreateCrmIntegrationDto } from './dto/create-crm-integration.dto';
import { UpdateCrmIntegrationDto } from './dto/update-crm-integration.dto';
import { ConnectSalesforceDto } from './dto/connect-salesforce.dto';
import { LogCallDto } from './dto/log-call.dto';
import { SyncContactsDto, SyncLeadsDto } from './dto/sync-records.dto';
import {
  ConnectionStatus,
  CrmProvider,
} from '../infrastructure/persistence/crm-integration.entity';
import { SalesforceApiVersion } from '../infrastructure/persistence/salesforce-connection.entity';

@Injectable()
export class SalesforceAdapterService {
  private readonly logger = new Logger(SalesforceAdapterService.name);

  constructor(
    @Inject(CRM_REPOSITORY_PORT)
    private readonly crmRepository: CRM_REPOSITORY_PORT,
    @Inject(SALESFORCE_CONNECTION_REPOSITORY_PORT)
    private readonly salesforceConnectionRepository: SALESFORCE_CONNECTION_REPOSITORY_PORT,
    @Inject(SALESFORCE_API_PORT)
    private readonly salesforceApi: SALESFORCE_API_PORT,
  ) {}

  /**
   * Create a new CRM integration
   */
  async create(dto: CreateCrmIntegrationDto): Promise<CrmIntegration> {
    this.logger.log(`Creating CRM integration: ${dto.name} (${dto.provider})`);

    const integration = new CrmIntegration(
      randomUUID(),
      dto.organizationId,
      dto.provider,
      dto.name,
      ConnectionStatus.DISCONNECTED,
      dto.description,
      dto.clientId,
      dto.clientSecret,
      undefined, // accessToken
      undefined, // refreshToken
      undefined, // instanceUrl
      undefined, // tokenExpiresAt
      dto.syncConfig || {},
      undefined, // lastSyncAt
      undefined, // nextSyncAt
      0, // totalSyncs
      0, // successfulSyncs
      0, // failedSyncs
      0, // recordsSynced
      undefined, // lastErrorMessage
      undefined, // lastErrorAt
      dto.metadata || {},
      true, // isActive
    );

    integration.validate();
    return this.crmRepository.create(integration);
  }

  /**
   * Find CRM integration by ID
   */
  async findOne(id: string): Promise<CrmIntegration> {
    const integration = await this.crmRepository.findById(id);
    if (!integration) {
      throw new NotFoundException(`CRM integration with ID ${id} not found`);
    }
    return integration;
  }

  /**
   * Find all CRM integrations with optional filters
   */
  async findAll(filter?: FindCrmIntegrationsFilter): Promise<CrmIntegration[]> {
    return this.crmRepository.findAll(filter);
  }

  /**
   * Find integrations by organization
   */
  async findByOrganization(organizationId: string): Promise<CrmIntegration[]> {
    return this.crmRepository.findByOrganization(organizationId);
  }

  /**
   * Find active integrations for organization
   */
  async findActive(organizationId: string): Promise<CrmIntegration[]> {
    return this.crmRepository.findActive(organizationId);
  }

  /**
   * Update CRM integration
   */
  async update(id: string, dto: UpdateCrmIntegrationDto): Promise<CrmIntegration> {
    const integration = await this.findOne(id);

    if (dto.name !== undefined) integration.name = dto.name;
    if (dto.description !== undefined) integration.description = dto.description;
    if (dto.clientId !== undefined) integration.clientId = dto.clientId;
    if (dto.clientSecret !== undefined) integration.clientSecret = dto.clientSecret;
    if (dto.syncConfig !== undefined) {
      integration.updateSyncConfig(dto.syncConfig);
    }
    if (dto.metadata !== undefined) {
      integration.metadata = { ...integration.metadata, ...dto.metadata };
    }

    integration.validate();
    return this.crmRepository.update(integration);
  }

  /**
   * Delete CRM integration
   */
  async remove(id: string): Promise<void> {
    const integration = await this.findOne(id);
    
    // Delete associated Salesforce connection if exists
    if (integration.provider === CrmProvider.SALESFORCE) {
      const connection = await this.salesforceConnectionRepository.findByCrmIntegrationId(id);
      if (connection) {
        await this.salesforceConnectionRepository.delete(connection.id);
      }
    }

    await this.crmRepository.delete(id);
    this.logger.log(`Deleted CRM integration: ${id}`);
  }

  /**
   * Get OAuth authorization URL for Salesforce
   */
  getAuthorizationUrl(integrationId: string, redirectUri: string, state?: string): string {
    // Note: clientId will be retrieved from integration in real implementation
    // For now, assume it's passed or configured
    const clientId = process.env.SALESFORCE_CLIENT_ID || '';
    return this.salesforceApi.getAuthorizationUrl(clientId, redirectUri, state || integrationId);
  }

  /**
   * Connect to Salesforce using OAuth code
   */
  async connectSalesforce(integrationId: string, dto: ConnectSalesforceDto): Promise<CrmIntegration> {
    this.logger.log(`Connecting Salesforce integration: ${integrationId}`);

    const integration = await this.findOne(integrationId);

    if (integration.provider !== CrmProvider.SALESFORCE) {
      throw new BadRequestException('Integration is not a Salesforce integration');
    }

    if (!integration.clientId || !integration.clientSecret) {
      throw new BadRequestException('Client ID and Client Secret must be configured');
    }

    try {
      // Exchange authorization code for access token
      const oauthResult = await this.salesforceApi.getAccessToken(
        integration.clientId,
        integration.clientSecret,
        dto.redirectUri,
        dto.code,
      );

      // Get user and org info
      const [userInfo, orgInfo, apiLimits] = await Promise.all([
        this.salesforceApi.getUserInfo(oauthResult.access_token, oauthResult.instance_url),
        this.salesforceApi.getOrgInfo(oauthResult.access_token, oauthResult.instance_url),
        this.salesforceApi.getApiLimits(oauthResult.access_token, oauthResult.instance_url),
      ]);

      // Update integration
      integration.connect(
        oauthResult.access_token,
        oauthResult.refresh_token,
        oauthResult.instance_url,
        3600, // Salesforce tokens typically expire in 1 hour
      );

      const updatedIntegration = await this.crmRepository.update(integration);

      // Create or update Salesforce connection
      let connection = await this.salesforceConnectionRepository.findByCrmIntegrationId(integrationId);
      
      if (!connection) {
        connection = new SalesforceConnection(
          randomUUID(),
          integrationId,
          userInfo.organizationId,
          userInfo.id,
          SalesforceApiVersion.V61,
          orgInfo.name,
          orgInfo.edition as any,
          userInfo.username,
          userInfo.email,
          apiLimits,
          new Date(),
          [],
          [],
          {},
          {},
          new Date(),
          true,
          0,
        );
        connection.validate();
        await this.salesforceConnectionRepository.create(connection);
      } else {
        connection.updateApiLimits(apiLimits);
        connection.recordHealthCheckSuccess();
        await this.salesforceConnectionRepository.update(connection);
      }

      this.logger.log(`Successfully connected Salesforce: ${orgInfo.name}`);
      return updatedIntegration;
    } catch (error) {
      this.logger.error(`Failed to connect Salesforce: ${error.message}`);
      throw new BadRequestException(`Salesforce connection failed: ${error.message}`);
    }
  }

  /**
   * Disconnect from Salesforce
   */
  async disconnectSalesforce(integrationId: string): Promise<CrmIntegration> {
    const integration = await this.findOne(integrationId);

    if (integration.provider !== CrmProvider.SALESFORCE) {
      throw new BadRequestException('Integration is not a Salesforce integration');
    }

    integration.disconnect();
    const updated = await this.crmRepository.update(integration);

    this.logger.log(`Disconnected Salesforce integration: ${integrationId}`);
    return updated;
  }

  /**
   * Refresh Salesforce access token
   */
  async refreshSalesforceToken(integrationId: string): Promise<CrmIntegration> {
    const integration = await this.findOne(integrationId);

    if (integration.provider !== CrmProvider.SALESFORCE) {
      throw new BadRequestException('Integration is not a Salesforce integration');
    }

    if (!integration.refreshToken) {
      throw new BadRequestException('No refresh token available');
    }

    try {
      const oauthResult = await this.salesforceApi.refreshAccessToken(
        integration.clientId!,
        integration.clientSecret!,
        integration.refreshToken,
      );

      integration.refreshAccessToken(oauthResult.access_token, 3600);
      const updated = await this.crmRepository.update(integration);

      this.logger.log(`Refreshed Salesforce token: ${integrationId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to refresh token: ${error.message}`);
      integration.expireToken();
      await this.crmRepository.update(integration);
      throw new BadRequestException(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Test Salesforce connection
   */
  async testConnection(integrationId: string): Promise<boolean> {
    const integration = await this.findOne(integrationId);

    if (integration.status !== ConnectionStatus.CONNECTED) {
      throw new BadRequestException('Integration is not connected');
    }

    if (!integration.accessToken || !integration.instanceUrl) {
      throw new BadRequestException('Missing access token or instance URL');
    }

    // Refresh token if expired
    if (integration.isTokenExpired()) {
      await this.refreshSalesforceToken(integrationId);
    }

    try {
      const isHealthy = await this.salesforceApi.testConnection(
        integration.accessToken,
        integration.instanceUrl,
      );

      const connection = await this.salesforceConnectionRepository.findByCrmIntegrationId(integrationId);
      if (connection) {
        if (isHealthy) {
          connection.recordHealthCheckSuccess();
        } else {
          connection.recordHealthCheckFailure();
        }
        await this.salesforceConnectionRepository.update(connection);
      }

      return isHealthy;
    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Sync contacts from Salesforce
   */
  async syncContacts(dto: SyncContactsDto): Promise<SalesforceContact[]> {
    const integration = await this.findOne(dto.integrationId);
    await this.ensureConnected(integration);

    try {
      integration.startSync();
      await this.crmRepository.update(integration);

      const contacts = await this.salesforceApi.queryContacts(
        integration.accessToken!,
        integration.instanceUrl!,
        dto.filter,
        dto.limit || 100,
      );

      integration.recordSuccessfulSync(contacts.length);
      await this.crmRepository.update(integration);

      this.logger.log(`Synced ${contacts.length} contacts from Salesforce`);
      return contacts;
    } catch (error) {
      this.logger.error(`Contact sync failed: ${error.message}`);
      integration.recordFailedSync(error.message);
      await this.crmRepository.update(integration);
      throw new BadRequestException(`Contact sync failed: ${error.message}`);
    }
  }

  /**
   * Sync leads from Salesforce
   */
  async syncLeads(dto: SyncLeadsDto): Promise<SalesforceLead[]> {
    const integration = await this.findOne(dto.integrationId);
    await this.ensureConnected(integration);

    try {
      integration.startSync();
      await this.crmRepository.update(integration);

      const leads = await this.salesforceApi.queryLeads(
        integration.accessToken!,
        integration.instanceUrl!,
        dto.filter,
        dto.limit || 100,
      );

      integration.recordSuccessfulSync(leads.length);
      await this.crmRepository.update(integration);

      this.logger.log(`Synced ${leads.length} leads from Salesforce`);
      return leads;
    } catch (error) {
      this.logger.error(`Lead sync failed: ${error.message}`);
      integration.recordFailedSync(error.message);
      await this.crmRepository.update(integration);
      throw new BadRequestException(`Lead sync failed: ${error.message}`);
    }
  }

  /**
   * Log call to Salesforce as a Task
   */
  async logCall(integrationId: string, dto: LogCallDto): Promise<string> {
    const integration = await this.findOne(integrationId);
    await this.ensureConnected(integration);

    try {
      const task = {
        WhoId: dto.contactId,
        WhatId: dto.accountId,
        Subject: dto.subject,
        Status: 'Completed',
        Priority: 'Normal',
        ActivityDate: dto.activityDate || new Date().toISOString().split('T')[0],
        Description: dto.description,
        CallDurationInSeconds: dto.durationSeconds,
        CallType: dto.callType || 'Outbound',
        CallDisposition: dto.disposition,
      };

      const taskId = await this.salesforceApi.createTask(
        integration.accessToken!,
        integration.instanceUrl!,
        task,
      );

      this.logger.log(`Logged call to Salesforce: ${taskId}`);
      return taskId;
    } catch (error) {
      this.logger.error(`Call logging failed: ${error.message}`);
      throw new BadRequestException(`Call logging failed: ${error.message}`);
    }
  }

  /**
   * Get integration statistics
   */
  async getStatistics(organizationId: string): Promise<Record<string, any>> {
    const integrations = await this.crmRepository.findByOrganization(organizationId);

    const totalIntegrations = integrations.length;
    const connectedIntegrations = integrations.filter(
      (i) => i.status === ConnectionStatus.CONNECTED,
    ).length;
    const totalSyncs = integrations.reduce((sum, i) => sum + i.totalSyncs, 0);
    const successfulSyncs = integrations.reduce((sum, i) => sum + i.successfulSyncs, 0);
    const failedSyncs = integrations.reduce((sum, i) => sum + i.failedSyncs, 0);
    const totalRecordsSynced = integrations.reduce((sum, i) => sum + i.recordsSynced, 0);

    const byProvider = integrations.reduce(
      (acc, i) => {
        acc[i.provider] = (acc[i.provider] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byStatus = integrations.reduce(
      (acc, i) => {
        acc[i.status] = (acc[i.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalIntegrations,
      connectedIntegrations,
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      totalRecordsSynced,
      successRate: totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 100,
      byProvider,
      byStatus,
    };
  }

  /**
   * Get Salesforce connection details
   */
  async getSalesforceConnection(integrationId: string): Promise<SalesforceConnection | null> {
    return this.salesforceConnectionRepository.findByCrmIntegrationId(integrationId);
  }

  /**
   * Private helper: Ensure integration is connected
   */
  private async ensureConnected(integration: CrmIntegration): Promise<void> {
    if (integration.status !== ConnectionStatus.CONNECTED) {
      throw new BadRequestException('Integration is not connected');
    }

    if (!integration.accessToken || !integration.instanceUrl) {
      throw new BadRequestException('Missing access token or instance URL');
    }

    // Refresh token if expired
    if (integration.isTokenExpired()) {
      await this.refreshSalesforceToken(integration.id);
    }
  }
}

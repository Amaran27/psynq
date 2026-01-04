import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SalesforceAdapterService } from '../application/salesforce-adapter.service';
import { CRM_REPOSITORY_PORT } from '../domain/ports/crm-repository.port';
import { SALESFORCE_CONNECTION_REPOSITORY_PORT } from '../domain/ports/salesforce-connection-repository.port';
import { SALESFORCE_API_PORT } from '../domain/ports/salesforce-api.port';
import { CrmIntegration } from '../domain/crm-integration.domain';
import { SalesforceConnection } from '../domain/salesforce-connection.domain';
import { ConnectionStatus, CrmProvider, SyncDirection } from '../infrastructure/persistence/crm-integration.entity';
import { SalesforceApiVersion } from '../infrastructure/persistence/salesforce-connection.entity';

describe('SalesforceAdapterService', () => {
  let service: SalesforceAdapterService;
  let crmRepository: any;
  let salesforceConnectionRepository: any;
  let salesforceApi: any;

  const mockOrgId = '00D0000000000EAEAy';
  const mockUserId = '0050000000000AAEAy';
  const mockAccessToken = 'test_access_token';
  const mockRefreshToken = 'test_refresh_token';
  const mockInstanceUrl = 'https://test.salesforce.com';

  const mockIntegration = new CrmIntegration(
    '123e4567-e89b-12d3-a456-426614174000',
    '123e4567-e89b-12d3-a456-426614174001',
    CrmProvider.SALESFORCE,
    'Test Salesforce',
    ConnectionStatus.DISCONNECTED,
    'Test integration',
    'client_id',
    'client_secret',
  );

  beforeEach(async () => {
    crmRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByOrganization: jest.fn(),
      findActive: jest.fn(),
      findSyncDue: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    salesforceConnectionRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCrmIntegrationId: jest.fn(),
      findByOrgId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    salesforceApi = {
      getAuthorizationUrl: jest.fn(),
      getAccessToken: jest.fn(),
      refreshAccessToken: jest.fn(),
      getUserInfo: jest.fn(),
      getOrgInfo: jest.fn(),
      getApiLimits: jest.fn(),
      query: jest.fn(),
      queryContacts: jest.fn(),
      queryLeads: jest.fn(),
      createTask: jest.fn(),
      updateRecord: jest.fn(),
      createRecord: jest.fn(),
      getObjectMetadata: jest.fn(),
      testConnection: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesforceAdapterService,
        {
          provide: CRM_REPOSITORY_PORT,
          useValue: crmRepository,
        },
        {
          provide: SALESFORCE_CONNECTION_REPOSITORY_PORT,
          useValue: salesforceConnectionRepository,
        },
        {
          provide: SALESFORCE_API_PORT,
          useValue: salesforceApi,
        },
      ],
    }).compile();

    service = module.get<SalesforceAdapterService>(SalesforceAdapterService);
  });

  describe('create', () => {
    it('should create a new CRM integration', async () => {
      const dto = {
        organizationId: mockIntegration.organizationId,
        provider: CrmProvider.SALESFORCE,
        name: 'Test Integration',
        description: 'Test description',
        clientId: 'test_client_id',
        clientSecret: 'test_client_secret',
      };

      crmRepository.create.mockResolvedValue(mockIntegration);

      const result = await service.create(dto);

      expect(crmRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.name).toBe(mockIntegration.name);
    });

    it('should throw error for invalid integration data', async () => {
      const dto = {
        organizationId: '',
        provider: CrmProvider.SALESFORCE,
        name: '',
        description: 'Test',
      };

      crmRepository.create.mockImplementation(() => {
        throw new Error('CRM Integration validation failed: Name is required');
      });

      await expect(service.create(dto)).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    it('should return an integration by ID', async () => {
      crmRepository.findById.mockResolvedValue(mockIntegration);

      const result = await service.findOne(mockIntegration.id);

      expect(crmRepository.findById).toHaveBeenCalledWith(mockIntegration.id);
      expect(result).toEqual(mockIntegration);
    });

    it('should throw NotFoundException when integration not found', async () => {
      crmRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all integrations', async () => {
      const mockIntegrations = [mockIntegration];
      crmRepository.findAll.mockResolvedValue(mockIntegrations);

      const result = await service.findAll();

      expect(crmRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockIntegrations);
    });

    it('should return integrations with filters', async () => {
      const filter = {
        organizationId: mockIntegration.organizationId,
        provider: CrmProvider.SALESFORCE,
        status: ConnectionStatus.CONNECTED,
      };
      crmRepository.findAll.mockResolvedValue([mockIntegration]);

      const result = await service.findAll(filter);

      expect(crmRepository.findAll).toHaveBeenCalledWith(filter);
      expect(result).toBeDefined();
    });
  });

  describe('findByOrganization', () => {
    it('should return integrations for an organization', async () => {
      crmRepository.findByOrganization.mockResolvedValue([mockIntegration]);

      const result = await service.findByOrganization(mockIntegration.organizationId);

      expect(crmRepository.findByOrganization).toHaveBeenCalledWith(mockIntegration.organizationId);
      expect(result).toEqual([mockIntegration]);
    });
  });

  describe('update', () => {
    it('should update an integration', async () => {
      const updateDto = { name: 'Updated Name', description: 'Updated description' };
      const updatedIntegration = { ...mockIntegration, ...updateDto };

      crmRepository.findById.mockResolvedValue(mockIntegration);
      crmRepository.update.mockResolvedValue(updatedIntegration);

      const result = await service.update(mockIntegration.id, updateDto);

      expect(crmRepository.update).toHaveBeenCalled();
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when updating non-existent integration', async () => {
      crmRepository.findById.mockResolvedValue(null);

      await expect(service.update('non-existent-id', { name: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an integration', async () => {
      crmRepository.findById.mockResolvedValue(mockIntegration);
      salesforceConnectionRepository.findByCrmIntegrationId.mockResolvedValue(null);
      crmRepository.delete.mockResolvedValue(undefined);

      await service.remove(mockIntegration.id);

      expect(crmRepository.delete).toHaveBeenCalledWith(mockIntegration.id);
    });

    it('should delete associated Salesforce connection', async () => {
      const mockConnection = new SalesforceConnection(
        'conn-123',
        mockIntegration.id,
        mockOrgId,
        mockUserId,
        SalesforceApiVersion.V61,
      );

      crmRepository.findById.mockResolvedValue(mockIntegration);
      salesforceConnectionRepository.findByCrmIntegrationId.mockResolvedValue(mockConnection);
      salesforceConnectionRepository.delete.mockResolvedValue(undefined);
      crmRepository.delete.mockResolvedValue(undefined);

      await service.remove(mockIntegration.id);

      expect(salesforceConnectionRepository.delete).toHaveBeenCalledWith(mockConnection.id);
      expect(crmRepository.delete).toHaveBeenCalledWith(mockIntegration.id);
    });
  });

  describe('connectSalesforce', () => {
    it('should connect to Salesforce successfully', async () => {
      const dto = { code: 'auth_code', redirectUri: 'https://test.com/callback' };
      const mockIntegrationWithCreds = new CrmIntegration(
        mockIntegration.id,
        mockIntegration.organizationId,
        CrmProvider.SALESFORCE,
        mockIntegration.name,
        ConnectionStatus.DISCONNECTED,
        undefined,
        'client_id',
        'client_secret',
      );

      const mockOAuthResult = {
        access_token: mockAccessToken,
        refresh_token: mockRefreshToken,
        instance_url: mockInstanceUrl,
        id: 'https://test.salesforce.com/id/00D0000000000EAEAy/0050000000000AAEAy',
        token_type: 'Bearer',
        issued_at: '1234567890',
        signature: 'signature',
      };

      const mockUserInfo = {
        id: '0050000000000AAEAy',
        organizationId: '00D0000000000EAEAy',
        email: 'test@test.com',
        username: 'test@test.com',
        displayName: 'Test User',
      };

      const mockOrgInfo = {
        id: mockOrgId,
        name: 'Test Org',
        edition: 'Enterprise',
        instanceUrl: mockInstanceUrl,
      };

      const mockApiLimits = {
        dailyApiRequests: { max: 15000, remaining: 14500 },
      };

      crmRepository.findById.mockResolvedValue(mockIntegrationWithCreds);
      salesforceApi.getAccessToken.mockResolvedValue(mockOAuthResult);
      salesforceApi.getUserInfo.mockResolvedValue(mockUserInfo);
      salesforceApi.getOrgInfo.mockResolvedValue(mockOrgInfo);
      salesforceApi.getApiLimits.mockResolvedValue(mockApiLimits);
      crmRepository.update.mockImplementation((integration) => Promise.resolve(integration));
      salesforceConnectionRepository.findByCrmIntegrationId.mockResolvedValue(null);
      salesforceConnectionRepository.create.mockImplementation((conn) => Promise.resolve(conn));

      const result = await service.connectSalesforce(mockIntegration.id, dto);

      expect(salesforceApi.getAccessToken).toHaveBeenCalled();
      expect(salesforceApi.getUserInfo).toHaveBeenCalled();
      expect(salesforceApi.getOrgInfo).toHaveBeenCalled();
      expect(salesforceConnectionRepository.create).toHaveBeenCalled();
      expect(result.status).toBe(ConnectionStatus.CONNECTED);
    });

    it('should throw error for non-Salesforce integration', async () => {
      const nonSfIntegration = new CrmIntegration(
        mockIntegration.id,
        mockIntegration.organizationId,
        CrmProvider.ZENDESK,
        'Test Zendesk',
        ConnectionStatus.DISCONNECTED,
      );

      crmRepository.findById.mockResolvedValue(nonSfIntegration);

      await expect(
        service.connectSalesforce(mockIntegration.id, {
          code: 'test',
          redirectUri: 'https://test.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('disconnectSalesforce', () => {
    it('should disconnect from Salesforce', async () => {
      const connectedIntegration = new CrmIntegration(
        mockIntegration.id,
        mockIntegration.organizationId,
        CrmProvider.SALESFORCE,
        mockIntegration.name,
        ConnectionStatus.CONNECTED,
        undefined,
        'client_id',
        'client_secret',
        mockAccessToken,
        mockRefreshToken,
        mockInstanceUrl,
      );

      crmRepository.findById.mockResolvedValue(connectedIntegration);
      crmRepository.update.mockImplementation((integration) => Promise.resolve(integration));

      const result = await service.disconnectSalesforce(mockIntegration.id);

      expect(result.status).toBe(ConnectionStatus.DISCONNECTED);
      expect(result.accessToken).toBeUndefined();
    });
  });

  describe('refreshSalesforceToken', () => {
    it('should refresh access token', async () => {
      const connectedIntegration = new CrmIntegration(
        mockIntegration.id,
        mockIntegration.organizationId,
        CrmProvider.SALESFORCE,
        mockIntegration.name,
        ConnectionStatus.CONNECTED,
        undefined,
        'client_id',
        'client_secret',
        mockAccessToken,
        mockRefreshToken,
        mockInstanceUrl,
      );

      const mockOAuthResult = {
        access_token: 'new_access_token',
        refresh_token: mockRefreshToken,
        instance_url: mockInstanceUrl,
        id: 'https://test.salesforce.com/id/00D000000000000AAA/005000000000000AAA',
        token_type: 'Bearer',
        issued_at: '1234567890',
        signature: 'signature',
      };

      crmRepository.findById.mockResolvedValue(connectedIntegration);
      salesforceApi.refreshAccessToken.mockResolvedValue(mockOAuthResult);
      crmRepository.update.mockImplementation((integration) => Promise.resolve(integration));

      const result = await service.refreshSalesforceToken(mockIntegration.id);

      expect(salesforceApi.refreshAccessToken).toHaveBeenCalled();
      expect(result.accessToken).toBe('new_access_token');
    });

    it('should throw error when no refresh token available', async () => {
      const integrationWithoutRefreshToken = new CrmIntegration(
        mockIntegration.id,
        mockIntegration.organizationId,
        CrmProvider.SALESFORCE,
        mockIntegration.name,
        ConnectionStatus.CONNECTED,
        undefined,
        'client_id',
        'client_secret',
        mockAccessToken,
      );

      crmRepository.findById.mockResolvedValue(integrationWithoutRefreshToken);

      await expect(service.refreshSalesforceToken(mockIntegration.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const connectedIntegration = new CrmIntegration(
        mockIntegration.id,
        mockIntegration.organizationId,
        CrmProvider.SALESFORCE,
        mockIntegration.name,
        ConnectionStatus.CONNECTED,
        undefined,
        'client_id',
        'client_secret',
        mockAccessToken,
        mockRefreshToken,
        mockInstanceUrl,
      );

      crmRepository.findById.mockResolvedValue(connectedIntegration);
      salesforceApi.testConnection.mockResolvedValue(true);
      salesforceConnectionRepository.findByCrmIntegrationId.mockResolvedValue(null);

      const result = await service.testConnection(mockIntegration.id);

      expect(salesforceApi.testConnection).toHaveBeenCalledWith(mockAccessToken, mockInstanceUrl);
      expect(result).toBe(true);
    });

    it('should return false for failed connection', async () => {
      const connectedIntegration = new CrmIntegration(
        mockIntegration.id,
        mockIntegration.organizationId,
        CrmProvider.SALESFORCE,
        mockIntegration.name,
        ConnectionStatus.CONNECTED,
        undefined,
        'client_id',
        'client_secret',
        mockAccessToken,
        mockRefreshToken,
        mockInstanceUrl,
      );

      crmRepository.findById.mockResolvedValue(connectedIntegration);
      salesforceApi.testConnection.mockResolvedValue(false);
      salesforceConnectionRepository.findByCrmIntegrationId.mockResolvedValue(null);

      const result = await service.testConnection(mockIntegration.id);

      expect(result).toBe(false);
    });
  });

  describe('syncContacts', () => {
    it('should sync contacts from Salesforce', async () => {
      const dto = { integrationId: mockIntegration.id, limit: 50 };
      const mockContacts = [
        {
          Id: '003000000000001AAA',
          FirstName: 'John',
          LastName: 'Doe',
          Email: 'john@example.com',
          Phone: '+1234567890',
          CreatedDate: '2026-01-01T00:00:00Z',
          LastModifiedDate: '2026-01-01T00:00:00Z',
        },
      ];

      const connectedIntegration = new CrmIntegration(
        mockIntegration.id,
        mockIntegration.organizationId,
        CrmProvider.SALESFORCE,
        mockIntegration.name,
        ConnectionStatus.CONNECTED,
        undefined,
        'client_id',
        'client_secret',
        mockAccessToken,
        mockRefreshToken,
        mockInstanceUrl,
      );

      crmRepository.findById.mockResolvedValue(connectedIntegration);
      salesforceApi.queryContacts.mockResolvedValue(mockContacts);
      crmRepository.update.mockImplementation((integration) => Promise.resolve(integration));

      const result = await service.syncContacts(dto);

      expect(salesforceApi.queryContacts).toHaveBeenCalledWith(mockAccessToken, mockInstanceUrl, undefined, 50);
      expect(result).toEqual(mockContacts);
      expect(result.length).toBe(1);
    });
  });

  describe('syncLeads', () => {
    it('should sync leads from Salesforce', async () => {
      const dto = { integrationId: mockIntegration.id, limit: 50 };
      const mockLeads = [
        {
          Id: '00Q000000000001AAA',
          FirstName: 'Jane',
          LastName: 'Smith',
          Company: 'Test Corp',
          Status: 'Open',
          Email: 'jane@testcorp.com',
          Phone: '+1234567891',
          CreatedDate: '2026-01-01T00:00:00Z',
          LastModifiedDate: '2026-01-01T00:00:00Z',
        },
      ];

      const connectedIntegration = new CrmIntegration(
        mockIntegration.id,
        mockIntegration.organizationId,
        CrmProvider.SALESFORCE,
        mockIntegration.name,
        ConnectionStatus.CONNECTED,
        undefined,
        'client_id',
        'client_secret',
        mockAccessToken,
        mockRefreshToken,
        mockInstanceUrl,
      );

      crmRepository.findById.mockResolvedValue(connectedIntegration);
      salesforceApi.queryLeads.mockResolvedValue(mockLeads);
      crmRepository.update.mockImplementation((integration) => Promise.resolve(integration));

      const result = await service.syncLeads(dto);

      expect(salesforceApi.queryLeads).toHaveBeenCalledWith(mockAccessToken, mockInstanceUrl, undefined, 50);
      expect(result).toEqual(mockLeads);
      expect(result.length).toBe(1);
    });
  });

  describe('logCall', () => {
    it('should log call to Salesforce', async () => {
      const dto = {
        contactId: '003000000000001AAA',
        subject: 'Outbound call',
        durationSeconds: 120,
        disposition: 'connected' as any,
        description: 'Discussed product features',
      };

      const connectedIntegration = new CrmIntegration(
        mockIntegration.id,
        mockIntegration.organizationId,
        CrmProvider.SALESFORCE,
        mockIntegration.name,
        ConnectionStatus.CONNECTED,
        undefined,
        'client_id',
        'client_secret',
        mockAccessToken,
        mockRefreshToken,
        mockInstanceUrl,
      );

      crmRepository.findById.mockResolvedValue(connectedIntegration);
      salesforceApi.createTask.mockResolvedValue('00T000000000001AAA');

      const result = await service.logCall(mockIntegration.id, dto);

      expect(salesforceApi.createTask).toHaveBeenCalled();
      expect(result).toBe('00T000000000001AAA');
    });
  });

  describe('getStatistics', () => {
    it('should return integration statistics', async () => {
      const integrations = [
        new CrmIntegration(
          '1',
          mockIntegration.organizationId,
          CrmProvider.SALESFORCE,
          'SF1',
          ConnectionStatus.CONNECTED,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          {},
          undefined,
          undefined,
          10,
          9,
          1,
          100,
        ),
        new CrmIntegration(
          '2',
          mockIntegration.organizationId,
          CrmProvider.ZENDESK,
          'ZD1',
          ConnectionStatus.DISCONNECTED,
        ),
      ];

      crmRepository.findByOrganization.mockResolvedValue(integrations);

      const result = await service.getStatistics(mockIntegration.organizationId);

      expect(result.totalIntegrations).toBe(2);
      expect(result.connectedIntegrations).toBe(1);
      expect(result.totalSyncs).toBe(10);
      expect(result.successfulSyncs).toBe(9);
      expect(result.failedSyncs).toBe(1);
      expect(result.byProvider).toEqual({ salesforce: 1, zendesk: 1 });
    });
  });
});

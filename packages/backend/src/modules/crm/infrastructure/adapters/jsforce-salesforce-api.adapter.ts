import { Injectable, Logger } from '@nestjs/common';
import * as jsforce from 'jsforce';
import {
  SALESFORCE_API_PORT,
  SalesforceOAuthResult,
  SalesforceUserInfo,
  SalesforceOrgInfo,
  SalesforceApiLimits,
  SalesforceContact,
  SalesforceLead,
  SalesforceTask,
  SalesforceQueryResult,
  SalesforceObjectMetadata,
} from '../../domain/ports/salesforce-api.port';

@Injectable()
export class JSForceSalesforceApiAdapter implements SALESFORCE_API_PORT {
  private readonly logger = new Logger(JSForceSalesforceApiAdapter.name);
  private readonly loginUrl = 'https://login.salesforce.com';

  getAuthorizationUrl(clientId: string, redirectUri: string, state?: string): string {
    const oauth2 = new jsforce.OAuth2({
      loginUrl: this.loginUrl,
      clientId,
      redirectUri,
    });

    return oauth2.getAuthorizationUrl({ state: state || 'default', scope: 'api refresh_token' });
  }

  async getAccessToken(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string,
  ): Promise<SalesforceOAuthResult> {
    try {
      const conn = new jsforce.Connection({
        oauth2: {
          loginUrl: this.loginUrl,
          clientId,
          clientSecret,
          redirectUri,
        },
      });

      const userInfo = await conn.authorize(code);
      
      return {
        access_token: conn.accessToken || '',
        refresh_token: conn.refreshToken || undefined,
        instance_url: conn.instanceUrl || '',
        id: userInfo.id,
        token_type: 'Bearer',
        issued_at: Date.now().toString(),
        signature: '',
      };
    } catch (error) {
      this.logger.error(`Failed to get access token: ${error.message}`);
      throw new Error(`Salesforce OAuth failed: ${error.message}`);
    }
  }

  async refreshAccessToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
  ): Promise<SalesforceOAuthResult> {
    try {
      const conn = new jsforce.Connection({
        oauth2: {
          loginUrl: this.loginUrl,
          clientId,
          clientSecret,
        },
        refreshToken,
      });

      const result: any = await conn.oauth2.refreshToken(refreshToken);

      return {
        access_token: result.access_token,
        refresh_token: refreshToken,
        instance_url: result.instance_url,
        id: result.id,
        token_type: 'Bearer',
        issued_at: Date.now().toString(),
        signature: '',
      };
    } catch (error) {
      this.logger.error(`Failed to refresh token: ${error.message}`);
      throw new Error(`Salesforce token refresh failed: ${error.message}`);
    }
  }

  async getUserInfo(accessToken: string, instanceUrl: string): Promise<SalesforceUserInfo> {
    try {
      const conn = this.createConnection(accessToken, instanceUrl);
      const identity: any = await conn.identity();

      return {
        id: identity.user_id,
        organizationId: identity.organization_id,
        email: identity.email,
        username: identity.username,
        displayName: identity.display_name,
      };
    } catch (error) {
      this.logger.error(`Failed to get user info: ${error.message}`);
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  async getOrgInfo(accessToken: string, instanceUrl: string): Promise<SalesforceOrgInfo> {
    try {
      const conn = this.createConnection(accessToken, instanceUrl);
      const orgQuery = await conn.query<any>(
        'SELECT Id, Name, OrganizationType, InstanceName FROM Organization LIMIT 1',
      );

      if (orgQuery.totalSize === 0) {
        throw new Error('Organization not found');
      }

      const org = orgQuery.records[0];
      return {
        id: org.Id,
        name: org.Name,
        edition: org.OrganizationType,
        instanceUrl,
      };
    } catch (error) {
      this.logger.error(`Failed to get org info: ${error.message}`);
      throw new Error(`Failed to get org info: ${error.message}`);
    }
  }

  async getApiLimits(accessToken: string, instanceUrl: string): Promise<SalesforceApiLimits> {
    try {
      const conn = this.createConnection(accessToken, instanceUrl);
      const limits: any = await conn.limits();

      return {
        dailyApiRequests: {
          max: limits.DailyApiRequests?.Max || 15000,
          remaining: limits.DailyApiRequests?.Remaining || 15000,
        },
        dailyBulkApiRequests: limits.DailyBulkApiRequests
          ? {
              max: limits.DailyBulkApiRequests.Max,
              remaining: limits.DailyBulkApiRequests.Remaining,
            }
          : undefined,
        dailyStreamingApiEvents: limits.DailyStreamingApiEvents
          ? {
              max: limits.DailyStreamingApiEvents.Max,
              remaining: limits.DailyStreamingApiEvents.Remaining,
            }
          : undefined,
        dataStorageMB: limits.DataStorageMB
          ? {
              max: limits.DataStorageMB.Max,
              remaining: limits.DataStorageMB.Remaining,
            }
          : undefined,
        fileStorageMB: limits.FileStorageMB
          ? {
              max: limits.FileStorageMB.Max,
              remaining: limits.FileStorageMB.Remaining,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get API limits: ${error.message}`);
      throw new Error(`Failed to get API limits: ${error.message}`);
    }
  }

  async query<T = any>(
    accessToken: string,
    instanceUrl: string,
    soql: string,
  ): Promise<SalesforceQueryResult<T>> {
    try {
      const conn = this.createConnection(accessToken, instanceUrl);
      const result: any = await conn.query(soql);

      return {
        totalSize: result.totalSize,
        done: result.done,
        records: result.records,
        nextRecordsUrl: result.nextRecordsUrl,
      };
    } catch (error) {
      this.logger.error(`Failed to execute query: ${error.message}`);
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  async queryContacts(
    accessToken: string,
    instanceUrl: string,
    filter?: Record<string, any>,
    limit: number = 100,
  ): Promise<SalesforceContact[]> {
    try {
      let soql = `SELECT Id, FirstName, LastName, Email, Phone, MobilePhone, AccountId, OwnerId, CreatedDate, LastModifiedDate FROM Contact`;

      const whereClauses: string[] = [];
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (typeof value === 'string') {
            whereClauses.push(`${key} = '${value}'`);
          } else {
            whereClauses.push(`${key} = ${value}`);
          }
        });
      }

      if (whereClauses.length > 0) {
        soql += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      soql += ` ORDER BY LastModifiedDate DESC LIMIT ${limit}`;

      const result = await this.query<SalesforceContact>(accessToken, instanceUrl, soql);
      return result.records;
    } catch (error) {
      this.logger.error(`Failed to query contacts: ${error.message}`);
      throw new Error(`Failed to query contacts: ${error.message}`);
    }
  }

  async queryLeads(
    accessToken: string,
    instanceUrl: string,
    filter?: Record<string, any>,
    limit: number = 100,
  ): Promise<SalesforceLead[]> {
    try {
      let soql = `SELECT Id, FirstName, LastName, Email, Phone, Company, Status, OwnerId, CreatedDate, LastModifiedDate FROM Lead`;

      const whereClauses: string[] = [];
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (typeof value === 'string') {
            whereClauses.push(`${key} = '${value}'`);
          } else {
            whereClauses.push(`${key} = ${value}`);
          }
        });
      }

      if (whereClauses.length > 0) {
        soql += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      soql += ` ORDER BY LastModifiedDate DESC LIMIT ${limit}`;

      const result = await this.query<SalesforceLead>(accessToken, instanceUrl, soql);
      return result.records;
    } catch (error) {
      this.logger.error(`Failed to query leads: ${error.message}`);
      throw new Error(`Failed to query leads: ${error.message}`);
    }
  }

  async createTask(
    accessToken: string,
    instanceUrl: string,
    task: SalesforceTask,
  ): Promise<string> {
    try {
      const conn = this.createConnection(accessToken, instanceUrl);
      const result: any = await conn.sobject('Task').create(task);

      if (!result.success) {
        throw new Error(`Task creation failed: ${result.errors?.join(', ')}`);
      }

      return result.id;
    } catch (error) {
      this.logger.error(`Failed to create task: ${error.message}`);
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  async updateRecord(
    accessToken: string,
    instanceUrl: string,
    objectType: string,
    recordId: string,
    data: Record<string, any>,
  ): Promise<void> {
    try {
      const conn = this.createConnection(accessToken, instanceUrl);
      const result: any = await conn.sobject(objectType).update({
        Id: recordId,
        ...data,
      });

      if (!result.success) {
        throw new Error(`Update failed: ${result.errors?.join(', ')}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update record: ${error.message}`);
      throw new Error(`Failed to update record: ${error.message}`);
    }
  }

  async createRecord(
    accessToken: string,
    instanceUrl: string,
    objectType: string,
    data: Record<string, any>,
  ): Promise<string> {
    try {
      const conn = this.createConnection(accessToken, instanceUrl);
      const result: any = await conn.sobject(objectType).create(data);

      if (!result.success) {
        throw new Error(`Create failed: ${result.errors?.join(', ')}`);
      }

      return result.id;
    } catch (error) {
      this.logger.error(`Failed to create record: ${error.message}`);
      throw new Error(`Failed to create record: ${error.message}`);
    }
  }

  async getObjectMetadata(
    accessToken: string,
    instanceUrl: string,
    objectName: string,
  ): Promise<SalesforceObjectMetadata> {
    try {
      const conn = this.createConnection(accessToken, instanceUrl);
      const metadata: any = await conn.sobject(objectName).describe();

      return {
        name: metadata.name,
        label: metadata.label,
        fields: metadata.fields.map((field: any) => ({
          name: field.name,
          label: field.label,
          type: field.type,
          length: field.length,
          required: !field.nillable && !field.defaultedOnCreate,
          unique: field.unique,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get object metadata: ${error.message}`);
      throw new Error(`Failed to get object metadata: ${error.message}`);
    }
  }

  async testConnection(accessToken: string, instanceUrl: string): Promise<boolean> {
    try {
      const conn = this.createConnection(accessToken, instanceUrl);
      await conn.query('SELECT Id FROM User LIMIT 1');
      return true;
    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`);
      return false;
    }
  }

  private createConnection(accessToken: string, instanceUrl: string): jsforce.Connection {
    return new jsforce.Connection({
      accessToken,
      instanceUrl,
      version: '61.0',
    });
  }
}

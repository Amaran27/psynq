import { SalesforceConnection } from '../salesforce-connection.domain';

export interface SALESFORCE_CONNECTION_REPOSITORY_PORT {
  create(connection: SalesforceConnection): Promise<SalesforceConnection>;
  findById(id: string): Promise<SalesforceConnection | null>;
  findByCrmIntegrationId(crmIntegrationId: string): Promise<SalesforceConnection | null>;
  findByOrgId(orgId: string): Promise<SalesforceConnection | null>;
  update(connection: SalesforceConnection): Promise<SalesforceConnection>;
  delete(id: string): Promise<void>;
}

export const SALESFORCE_CONNECTION_REPOSITORY_PORT = Symbol('SALESFORCE_CONNECTION_REPOSITORY_PORT');

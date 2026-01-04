import { CrmIntegration } from '../crm-integration.domain';
import { ConnectionStatus, CrmProvider } from '../../infrastructure/persistence/crm-integration.entity';

export interface FindCrmIntegrationsFilter {
  organizationId?: string;
  provider?: CrmProvider;
  status?: ConnectionStatus;
  isActive?: boolean;
}

export interface CRM_REPOSITORY_PORT {
  create(integration: CrmIntegration): Promise<CrmIntegration>;
  findById(id: string): Promise<CrmIntegration | null>;
  findAll(filter?: FindCrmIntegrationsFilter): Promise<CrmIntegration[]>;
  findByOrganization(organizationId: string): Promise<CrmIntegration[]>;
  findByProvider(organizationId: string, provider: CrmProvider): Promise<CrmIntegration[]>;
  findActive(organizationId: string): Promise<CrmIntegration[]>;
  findSyncDue(): Promise<CrmIntegration[]>;
  update(integration: CrmIntegration): Promise<CrmIntegration>;
  delete(id: string): Promise<void>;
  count(filter?: FindCrmIntegrationsFilter): Promise<number>;
}

export const CRM_REPOSITORY_PORT = Symbol('CRM_REPOSITORY_PORT');

import { DataSource } from 'typeorm';
import { CrmIntegrationEntity, CrmProvider, SyncDirection } from '../../modules/crm/infrastructure/persistence/crm-integration.entity';

export async function seedCrmIntegrations(dataSource: DataSource): Promise<void> {
  const crmRepository = dataSource.getRepository(CrmIntegrationEntity);

  // Get first organization for demo purposes
  const orgRepository = dataSource.getRepository('OrganizationEntity');
  const organizations = await orgRepository.find({ take: 1 });
  
  if (organizations.length === 0) {
    console.log('⚠️  No organizations found, skipping CRM integration seed');
    return;
  }

  const organizationId = organizations[0].id;

  const templates: Partial<CrmIntegrationEntity>[] = [
    {
      organizationId,
      provider: CrmProvider.SALESFORCE,
      name: 'Salesforce Production',
      description: 'Main Salesforce production environment integration',
      syncConfig: {
        syncDirection: SyncDirection.BIDIRECTIONAL,
        syncInterval: 60, // 1 hour
        enableContactSync: true,
        enableLeadSync: true,
        enableAccountSync: false,
        enableCallLogging: true,
        enableTaskCreation: true,
        customFieldMappings: {
          phoneNumber: 'Phone',
          mobileNumber: 'MobilePhone',
          emailAddress: 'Email',
        },
        filters: {
          Status: 'Active',
        },
      },
      metadata: {
        environment: 'production',
        notes: 'Connected to main Salesforce org',
      },
      isActive: true,
    },
    {
      organizationId,
      provider: CrmProvider.SALESFORCE,
      name: 'Salesforce Sandbox',
      description: 'Salesforce sandbox for testing integrations',
      syncConfig: {
        syncDirection: SyncDirection.FROM_CRM,
        syncInterval: 120, // 2 hours
        enableContactSync: true,
        enableLeadSync: true,
        enableAccountSync: false,
        enableCallLogging: false,
        enableTaskCreation: false,
      },
      metadata: {
        environment: 'sandbox',
        notes: 'Test environment for integration development',
      },
      isActive: false,
    },
    {
      organizationId,
      provider: CrmProvider.ZENDESK,
      name: 'Zendesk Support',
      description: 'Zendesk integration for support ticket management',
      syncConfig: {
        syncDirection: SyncDirection.TO_CRM,
        syncInterval: 30, // 30 minutes
        enableContactSync: true,
        enableLeadSync: false,
        enableAccountSync: false,
        enableCallLogging: true,
        enableTaskCreation: true,
      },
      metadata: {
        ticketPrefix: 'PSYNQ',
      },
      isActive: false,
    },
    {
      organizationId,
      provider: CrmProvider.HUBSPOT,
      name: 'HubSpot CRM',
      description: 'HubSpot integration for marketing and sales',
      syncConfig: {
        syncDirection: SyncDirection.BIDIRECTIONAL,
        syncInterval: 120, // 2 hours
        enableContactSync: true,
        enableLeadSync: true,
        enableAccountSync: true,
        enableCallLogging: true,
        enableTaskCreation: false,
      },
      metadata: {
        dealPipeline: 'sales',
      },
      isActive: false,
    },
  ];

  for (const template of templates) {
    const existing = await crmRepository.findOne({
      where: {
        organizationId: template.organizationId,
        name: template.name,
      },
    });

    if (!existing) {
      await crmRepository.save(template);
      console.log(`✅ Created CRM integration: ${template.name}`);
    } else {
      console.log(`⏭️  CRM integration already exists: ${template.name}`);
    }
  }

  console.log('✅ CRM integration seed completed');
}

// Allow running directly via ts-node
const module_: any = module;
if (require.main === module_) {
  (async () => {
    const AppDataSource: DataSource = (await import('../../data-source')).default || (await import('../../data-source'));
    if (typeof AppDataSource === 'object' && 'initialize' in AppDataSource) {
      await AppDataSource.initialize();
      await seedCrmIntegrations(AppDataSource);
      await AppDataSource.destroy();
    } else {
      console.error('❌ Could not load DataSource');
    }
  })();
}

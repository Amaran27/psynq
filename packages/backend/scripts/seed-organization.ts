import { DataSource } from 'typeorm';
import { Organization } from '../src/modules/organization/domain/organization.domain';
import { randomUUID } from 'crypto';

/**
 * Seed Organizations (Tenants) for multi-tenancy support
 * Run: npm run seed:organization
 */
export async function seedOrganizations(dataSource: DataSource) {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    console.log('🏢 Seeding Organizations...');

    // Check if organizations already exist
    const existingOrgs = await queryRunner.query(
      'SELECT COUNT(*) as count FROM organizations',
    );
    
    if (parseInt(existingOrgs[0].count) > 0) {
      console.log('✓ Organizations already exist, skipping seed');
      return;
    }

    const organizations = [
      {
        id: randomUUID(),
        name: 'Psitrix Default',
        slug: 'psitrix-default',
        status: 'active',
      },
      {
        id: randomUUID(),
        name: 'Demo Organization',
        slug: 'demo-org',
        status: 'active',
      },
      {
        id: randomUUID(),
        name: 'Test Tenant',
        slug: 'test-tenant',
        status: 'inactive',
      },
    ];

    for (const org of organizations) {
      await queryRunner.query(
        `
        INSERT INTO organizations (id, name, slug, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (name) DO NOTHING
        `,
        [org.id, org.name, org.slug, org.status],
      );
      console.log(`  ✓ Created organization: ${org.name} (${org.slug})`);
    }

    console.log('✓ Organizations seeded successfully');
  } catch (error) {
    console.error('✗ Error seeding organizations:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// Standalone execution
if (require.main === module) {
  const { AppDataSource } = require('../ormconfig');

  AppDataSource.initialize()
    .then(async (dataSource: DataSource) => {
      await seedOrganizations(dataSource);
      await dataSource.destroy();
      process.exit(0);
    })
    .catch((error: any) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

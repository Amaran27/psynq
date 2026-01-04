import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateCrmIntegrationsTables1766360000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create crm_integrations table
    await queryRunner.createTable(
      new Table({
        name: 'crm_integrations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'disconnected'",
          },
          {
            name: 'client_id',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'client_secret',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'access_token',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'refresh_token',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'instance_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'token_expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'sync_config',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'last_sync_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'next_sync_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'total_syncs',
            type: 'integer',
            default: 0,
          },
          {
            name: 'successful_syncs',
            type: 'integer',
            default: 0,
          },
          {
            name: 'failed_syncs',
            type: 'integer',
            default: 0,
          },
          {
            name: 'records_synced',
            type: 'integer',
            default: 0,
          },
          {
            name: 'last_error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'last_error_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create salesforce_connections table
    await queryRunner.createTable(
      new Table({
        name: 'salesforce_connections',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'crm_integration_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'org_id',
            type: 'varchar',
            length: '18',
            isNullable: false,
          },
          {
            name: 'org_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'edition',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'api_version',
            type: 'varchar',
            length: '10',
            default: "'v61.0'",
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '18',
            isNullable: false,
          },
          {
            name: 'user_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'user_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'api_limits',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'limits_updated_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'available_objects',
            type: 'jsonb',
            isNullable: true,
            default: "'[]'",
          },
          {
            name: 'synced_objects',
            type: 'jsonb',
            isNullable: true,
            default: "'[]'",
          },
          {
            name: 'field_mappings',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'webhook_config',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'last_health_check',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'is_healthy',
            type: 'boolean',
            default: true,
          },
          {
            name: 'consecutive_failures',
            type: 'integer',
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for crm_integrations
    await queryRunner.createIndex(
      'crm_integrations',
      new TableIndex({
        name: 'IDX_crm_integrations_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'crm_integrations',
      new TableIndex({
        name: 'IDX_crm_integrations_organization_provider',
        columnNames: ['organization_id', 'provider'],
      }),
    );

    await queryRunner.createIndex(
      'crm_integrations',
      new TableIndex({
        name: 'IDX_crm_integrations_status',
        columnNames: ['status'],
      }),
    );

    // Create indexes for salesforce_connections
    await queryRunner.createIndex(
      'salesforce_connections',
      new TableIndex({
        name: 'IDX_salesforce_connections_crm_integration_id',
        columnNames: ['crm_integration_id'],
      }),
    );

    await queryRunner.createIndex(
      'salesforce_connections',
      new TableIndex({
        name: 'IDX_salesforce_connections_org_id',
        columnNames: ['org_id'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'crm_integrations',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'salesforce_connections',
      new TableForeignKey({
        columnNames: ['crm_integration_id'],
        referencedTableName: 'crm_integrations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const crmIntegrationsTable = await queryRunner.getTable('crm_integrations');
    if (crmIntegrationsTable) {
      const orgForeignKey = crmIntegrationsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('organization_id') !== -1,
      );
      if (orgForeignKey) {
        await queryRunner.dropForeignKey('crm_integrations', orgForeignKey);
      }
    }

    const salesforceConnectionsTable = await queryRunner.getTable('salesforce_connections');
    if (salesforceConnectionsTable) {
      const crmForeignKey = salesforceConnectionsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('crm_integration_id') !== -1,
      );
      if (crmForeignKey) {
        await queryRunner.dropForeignKey('salesforce_connections', crmForeignKey);
      }
    }

    // Drop indexes
    await queryRunner.dropIndex('salesforce_connections', 'IDX_salesforce_connections_org_id');
    await queryRunner.dropIndex('salesforce_connections', 'IDX_salesforce_connections_crm_integration_id');
    await queryRunner.dropIndex('crm_integrations', 'IDX_crm_integrations_status');
    await queryRunner.dropIndex('crm_integrations', 'IDX_crm_integrations_organization_provider');
    await queryRunner.dropIndex('crm_integrations', 'IDX_crm_integrations_organization_id');

    // Drop tables
    await queryRunner.dropTable('salesforce_connections');
    await queryRunner.dropTable('crm_integrations');
  }
}

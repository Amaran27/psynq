import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateWhatsAppConfigurationTable1766700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'whatsapp_configurations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'businessAccountId',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'phoneNumberId',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'accessToken',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'phoneNumber',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'webhookUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'webhookVerifyToken',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'enabled',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'allowInbound',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'allowOutbound',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'enableReadReceipts',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'hourlyMessageLimit',
            type: 'int',
            default: 1000,
            isNullable: false,
          },
          {
            name: 'maxRetryAttempts',
            type: 'int',
            default: 3,
            isNullable: false,
          },
          {
            name: 'retryDelayMs',
            type: 'int',
            default: 5000,
            isNullable: false,
          },
          {
            name: 'apiTimeoutMs',
            type: 'int',
            default: 30000,
            isNullable: false,
          },
          {
            name: 'businessName',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'businessDescription',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'businessEmail',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'businessWebsite',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Index for organization lookup
    await queryRunner.createIndex(
      'whatsapp_configurations',
      new TableIndex({
        name: 'IDX_WHATSAPP_CONFIG_ORG',
        columnNames: ['organizationId'],
      }),
    );

    // Foreign key to organizations
    await queryRunner.createForeignKey(
      'whatsapp_configurations',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('whatsapp_configurations');
  }
}

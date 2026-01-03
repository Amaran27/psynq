import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateLeadsTable1766341000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'leads',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'campaignId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'firstName',
            type: 'varchar',
          },
          {
            name: 'lastName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'phoneNumber',
            type: 'varchar',
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'company',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['new', 'contacted', 'callback_scheduled', 'no_answer', 'busy', 'failed', 'converted', 'dnc'],
            default: "'new'",
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'urgent'],
            default: "'medium'",
          },
          {
            name: 'assignedAgentId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'attemptCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'lastAttemptAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'nextAttemptAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'callHistory',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'customFields',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'timezone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'convertedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'conversionValue',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'leads',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'leads',
      new TableForeignKey({
        columnNames: ['campaignId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'campaigns',
        onDelete: 'SET NULL',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'leads',
      new TableIndex({
        name: 'IDX_leads_organizationId',
        columnNames: ['organizationId'],
      }),
    );

    await queryRunner.createIndex(
      'leads',
      new TableIndex({
        name: 'IDX_leads_campaignId',
        columnNames: ['campaignId'],
      }),
    );

    await queryRunner.createIndex(
      'leads',
      new TableIndex({
        name: 'IDX_leads_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'leads',
      new TableIndex({
        name: 'IDX_leads_priority',
        columnNames: ['priority'],
      }),
    );

    await queryRunner.createIndex(
      'leads',
      new TableIndex({
        name: 'IDX_leads_assignedAgentId',
        columnNames: ['assignedAgentId'],
      }),
    );

    await queryRunner.createIndex(
      'leads',
      new TableIndex({
        name: 'IDX_leads_phoneNumber',
        columnNames: ['phoneNumber'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('leads');
  }
}

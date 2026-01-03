import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateCampaignsTable1706400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'campaigns',
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
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['preview', 'progressive', 'predictive', 'power'],
            default: "'preview'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'],
            default: "'draft'",
          },
          {
            name: 'dialMode',
            type: 'enum',
            enum: ['preview', 'progressive', 'predictive', 'power'],
            default: "'preview'",
          },
          {
            name: 'startTime',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'endTime',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'schedule',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'maxAttempts',
            type: 'int',
            default: 3,
          },
          {
            name: 'retryIntervalMinutes',
            type: 'int',
            default: 60,
          },
          {
            name: 'abandonmentRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0.03,
            isNullable: true,
          },
          {
            name: 'linesPerAgent',
            type: 'int',
            default: 1,
            isNullable: true,
          },
          {
            name: 'leadListId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'totalLeads',
            type: 'int',
            default: 0,
          },
          {
            name: 'contactedLeads',
            type: 'int',
            default: 0,
          },
          {
            name: 'successfulCalls',
            type: 'int',
            default: 0,
          },
          {
            name: 'failedAttempts',
            type: 'int',
            default: 0,
          },
          {
            name: 'avgCallDurationSeconds',
            type: 'int',
            default: 0,
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
          {
            name: 'startedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Add foreign key to organizations
    await queryRunner.createForeignKey(
      'campaigns',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'campaigns',
      new TableIndex({
        name: 'IDX_campaigns_organizationId',
        columnNames: ['organizationId'],
      }),
    );

    await queryRunner.createIndex(
      'campaigns',
      new TableIndex({
        name: 'IDX_campaigns_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'campaigns',
      new TableIndex({
        name: 'IDX_campaigns_createdAt',
        columnNames: ['createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('campaigns');
  }
}

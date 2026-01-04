import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateReportTemplatesTable1766350000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create report_templates table
    await queryRunner.createTable(
      new Table({
        name: 'report_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
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
            type: 'varchar',
            length: '50',
            default: "'CUSTOM'",
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'DRAFT'",
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'queryTemplate',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'parameters',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'columns',
            type: 'jsonb',
          },
          {
            name: 'filters',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'sorting',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'groupBy',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'dateRangeType',
            type: 'varchar',
            length: '50',
            default: "'CUSTOM'",
          },
          {
            name: 'customStartDate',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'customEndDate',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'supportedFormats',
            type: 'varchar',
            length: '20',
            isArray: true,
          },
          {
            name: 'defaultFormat',
            type: 'varchar',
            length: '20',
            default: "'PDF'",
          },
          {
            name: 'isScheduled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'scheduleExpression',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'emailRecipients',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'executionCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'lastExecutedAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'lastExecutionDurationMs',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'layoutConfig',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create report_executions table
    await queryRunner.createTable(
      new Table({
        name: 'report_executions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'templateId',
            type: 'uuid',
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'executedBy',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'PENDING'",
          },
          {
            name: 'format',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'parameters',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'startedAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'durationMs',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'fileUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'fileName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'fileSizeBytes',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'totalRows',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalPages',
            type: 'int',
            default: 0,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'errorStack',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign keys
    await queryRunner.createForeignKey(
      'report_templates',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'report_executions',
      new TableForeignKey({
        columnNames: ['templateId'],
        referencedTableName: 'report_templates',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'report_executions',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'report_templates',
      new TableIndex({
        name: 'IDX_report_templates_organization_status',
        columnNames: ['organizationId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'report_templates',
      new TableIndex({
        name: 'IDX_report_templates_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'report_templates',
      new TableIndex({
        name: 'IDX_report_templates_scheduled',
        columnNames: ['isScheduled'],
        where: 'isScheduled = true',
      }),
    );

    await queryRunner.createIndex(
      'report_executions',
      new TableIndex({
        name: 'IDX_report_executions_template',
        columnNames: ['templateId'],
      }),
    );

    await queryRunner.createIndex(
      'report_executions',
      new TableIndex({
        name: 'IDX_report_executions_organization',
        columnNames: ['organizationId'],
      }),
    );

    await queryRunner.createIndex(
      'report_executions',
      new TableIndex({
        name: 'IDX_report_executions_created',
        columnNames: ['createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('report_executions', 'IDX_report_executions_created');
    await queryRunner.dropIndex('report_executions', 'IDX_report_executions_organization');
    await queryRunner.dropIndex('report_executions', 'IDX_report_executions_template');
    await queryRunner.dropIndex('report_templates', 'IDX_report_templates_scheduled');
    await queryRunner.dropIndex('report_templates', 'IDX_report_templates_type');
    await queryRunner.dropIndex('report_templates', 'IDX_report_templates_organization_status');

    // Drop foreign keys
    const reportExecutionsTable = await queryRunner.getTable('report_executions');
    const reportExecutionsFks = reportExecutionsTable?.foreignKeys.filter(
      (fk) => fk.columnNames.includes('templateId') || fk.columnNames.includes('organizationId'),
    );
    for (const fk of reportExecutionsFks || []) {
      await queryRunner.dropForeignKey('report_executions', fk);
    }

    const reportTemplatesTable = await queryRunner.getTable('report_templates');
    const reportTemplatesFks = reportTemplatesTable?.foreignKeys.filter(
      (fk) => fk.columnNames.includes('organizationId'),
    );
    for (const fk of reportTemplatesFks || []) {
      await queryRunner.dropForeignKey('report_templates', fk);
    }

    // Drop tables
    await queryRunner.dropTable('report_executions');
    await queryRunner.dropTable('report_templates');
  }
}

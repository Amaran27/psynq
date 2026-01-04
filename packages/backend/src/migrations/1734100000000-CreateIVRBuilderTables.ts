import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateIVRBuilderTables1734100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ivr_flows table
    await queryRunner.createTable(
      new Table({
        name: 'ivr_flows',
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
            isNullable: false,
          },
          {
            name: 'nodes',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'connections',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'variables',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'start_node_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
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
          {
            name: 'published_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create ivr_executions table
    await queryRunner.createTable(
      new Table({
        name: 'ivr_executions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'flow_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'call_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'current_node_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'context',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'steps',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'started_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for ivr_flows
    await queryRunner.createIndex(
      'ivr_flows',
      new TableIndex({
        name: 'IDX_ivr_flows_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'ivr_flows',
      new TableIndex({
        name: 'IDX_ivr_flows_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'ivr_flows',
      new TableIndex({
        name: 'IDX_ivr_flows_organization_id_status',
        columnNames: ['organization_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'ivr_flows',
      new TableIndex({
        name: 'IDX_ivr_flows_name',
        columnNames: ['name'],
      }),
    );

    // Create indexes for ivr_executions
    await queryRunner.createIndex(
      'ivr_executions',
      new TableIndex({
        name: 'IDX_ivr_executions_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'ivr_executions',
      new TableIndex({
        name: 'IDX_ivr_executions_flow_id',
        columnNames: ['flow_id'],
      }),
    );

    await queryRunner.createIndex(
      'ivr_executions',
      new TableIndex({
        name: 'IDX_ivr_executions_call_id',
        columnNames: ['call_id'],
      }),
    );

    await queryRunner.createIndex(
      'ivr_executions',
      new TableIndex({
        name: 'IDX_ivr_executions_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'ivr_executions',
      new TableIndex({
        name: 'IDX_ivr_executions_organization_id_flow_id',
        columnNames: ['organization_id', 'flow_id'],
      }),
    );

    await queryRunner.createIndex(
      'ivr_executions',
      new TableIndex({
        name: 'IDX_ivr_executions_started_at',
        columnNames: ['started_at'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'ivr_flows',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'ivr_executions',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'ivr_executions',
      new TableForeignKey({
        columnNames: ['flow_id'],
        referencedTableName: 'ivr_flows',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const executionsTable = await queryRunner.getTable('ivr_executions');
    if (!executionsTable) throw new Error('Executions table not found');
    const executionsForeignKeys = executionsTable.foreignKeys.filter(
      fk => fk.columnNames.indexOf('organization_id') !== -1 ||
           fk.columnNames.indexOf('flow_id') !== -1,
    );
    for (const foreignKey of executionsForeignKeys) {
      await queryRunner.dropForeignKey('ivr_executions', foreignKey);
    }

    const flowsTable = await queryRunner.getTable('ivr_flows');
    if (!flowsTable) throw new Error('Flows table not found');
    const flowsForeignKeys = flowsTable.foreignKeys.filter(
      fk => fk.columnNames.indexOf('organization_id') !== -1,
    );
    for (const foreignKey of flowsForeignKeys) {
      await queryRunner.dropForeignKey('ivr_flows', foreignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex('ivr_executions', 'IDX_ivr_executions_started_at');
    await queryRunner.dropIndex('ivr_executions', 'IDX_ivr_executions_organization_id_flow_id');
    await queryRunner.dropIndex('ivr_executions', 'IDX_ivr_executions_status');
    await queryRunner.dropIndex('ivr_executions', 'IDX_ivr_executions_call_id');
    await queryRunner.dropIndex('ivr_executions', 'IDX_ivr_executions_flow_id');
    await queryRunner.dropIndex('ivr_executions', 'IDX_ivr_executions_organization_id');

    await queryRunner.dropIndex('ivr_flows', 'IDX_ivr_flows_name');
    await queryRunner.dropIndex('ivr_flows', 'IDX_ivr_flows_organization_id_status');
    await queryRunner.dropIndex('ivr_flows', 'IDX_ivr_flows_status');
    await queryRunner.dropIndex('ivr_flows', 'IDX_ivr_flows_organization_id');

    // Drop tables
    await queryRunner.dropTable('ivr_executions');
    await queryRunner.dropTable('ivr_flows');
  }
}

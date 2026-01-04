import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateEvaluationTables1734000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create scorecards table
    await queryRunner.createTable(
      new Table({
        name: 'scorecards',
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
            name: 'criteria',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'passing_score',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'use_weighted_scoring',
            type: 'boolean',
            default: false,
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
        ],
      }),
      true,
    );

    // Create evaluations table
    await queryRunner.createTable(
      new Table({
        name: 'evaluations',
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
            name: 'scorecard_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'agent_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'evaluator_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'call_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'recording_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'scores',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'total_score',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'passed',
            type: 'boolean',
            isNullable: false,
          },
          {
            name: 'feedback',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'strengths',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'areas_for_improvement',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'action_items',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'calibration_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'dispute_reason',
            type: 'text',
            isNullable: true,
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
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for scorecards
    await queryRunner.createIndex(
      'scorecards',
      new TableIndex({
        name: 'IDX_scorecards_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'scorecards',
      new TableIndex({
        name: 'IDX_scorecards_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'scorecards',
      new TableIndex({
        name: 'IDX_scorecards_organization_id_status',
        columnNames: ['organization_id', 'status'],
      }),
    );

    // Create indexes for evaluations
    await queryRunner.createIndex(
      'evaluations',
      new TableIndex({
        name: 'IDX_evaluations_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'evaluations',
      new TableIndex({
        name: 'IDX_evaluations_scorecard_id',
        columnNames: ['scorecard_id'],
      }),
    );

    await queryRunner.createIndex(
      'evaluations',
      new TableIndex({
        name: 'IDX_evaluations_agent_id',
        columnNames: ['agent_id'],
      }),
    );

    await queryRunner.createIndex(
      'evaluations',
      new TableIndex({
        name: 'IDX_evaluations_evaluator_id',
        columnNames: ['evaluator_id'],
      }),
    );

    await queryRunner.createIndex(
      'evaluations',
      new TableIndex({
        name: 'IDX_evaluations_call_id',
        columnNames: ['call_id'],
      }),
    );

    await queryRunner.createIndex(
      'evaluations',
      new TableIndex({
        name: 'IDX_evaluations_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'evaluations',
      new TableIndex({
        name: 'IDX_evaluations_organization_id_agent_id',
        columnNames: ['organization_id', 'agent_id'],
      }),
    );

    await queryRunner.createIndex(
      'evaluations',
      new TableIndex({
        name: 'IDX_evaluations_organization_id_evaluator_id',
        columnNames: ['organization_id', 'evaluator_id'],
      }),
    );

    await queryRunner.createIndex(
      'evaluations',
      new TableIndex({
        name: 'IDX_evaluations_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'scorecards',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'evaluations',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'evaluations',
      new TableForeignKey({
        columnNames: ['scorecard_id'],
        referencedTableName: 'scorecards',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'evaluations',
      new TableForeignKey({
        columnNames: ['agent_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'evaluations',
      new TableForeignKey({
        columnNames: ['evaluator_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const evaluationsTable = await queryRunner.getTable('evaluations');
    if (!evaluationsTable) throw new Error('Evaluations table not found');
    const evaluationsForeignKeys = evaluationsTable.foreignKeys.filter(
      fk => fk.columnNames.indexOf('organization_id') !== -1 ||
           fk.columnNames.indexOf('scorecard_id') !== -1 ||
           fk.columnNames.indexOf('agent_id') !== -1 ||
           fk.columnNames.indexOf('evaluator_id') !== -1,
    );
    for (const foreignKey of evaluationsForeignKeys) {
      await queryRunner.dropForeignKey('evaluations', foreignKey);
    }

    const scorecardsTable = await queryRunner.getTable('scorecards');
    if (!scorecardsTable) throw new Error('Scorecards table not found');
    const scorecardsForeignKeys = scorecardsTable.foreignKeys.filter(
      fk => fk.columnNames.indexOf('organization_id') !== -1,
    );
    for (const foreignKey of scorecardsForeignKeys) {
      await queryRunner.dropForeignKey('scorecards', foreignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex('evaluations', 'IDX_evaluations_created_at');
    await queryRunner.dropIndex('evaluations', 'IDX_evaluations_organization_id_evaluator_id');
    await queryRunner.dropIndex('evaluations', 'IDX_evaluations_organization_id_agent_id');
    await queryRunner.dropIndex('evaluations', 'IDX_evaluations_status');
    await queryRunner.dropIndex('evaluations', 'IDX_evaluations_call_id');
    await queryRunner.dropIndex('evaluations', 'IDX_evaluations_evaluator_id');
    await queryRunner.dropIndex('evaluations', 'IDX_evaluations_agent_id');
    await queryRunner.dropIndex('evaluations', 'IDX_evaluations_scorecard_id');
    await queryRunner.dropIndex('evaluations', 'IDX_evaluations_organization_id');

    await queryRunner.dropIndex('scorecards', 'IDX_scorecards_organization_id_status');
    await queryRunner.dropIndex('scorecards', 'IDX_scorecards_status');
    await queryRunner.dropIndex('scorecards', 'IDX_scorecards_organization_id');

    // Drop tables
    await queryRunner.dropTable('evaluations');
    await queryRunner.dropTable('scorecards');
  }
}

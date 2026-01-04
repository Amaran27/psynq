import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreatePacingEnginesTable1766342000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'pacing_engines',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'campaignId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'sessionId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'algorithm',
            type: 'varchar',
            default: "'erlang_c'",
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'idle'",
          },
          {
            name: 'targetAbandonmentRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 3.0,
          },
          {
            name: 'maxConcurrentCalls',
            type: 'int',
            default: 10,
          },
          {
            name: 'linesPerAgent',
            type: 'int',
            default: 1,
          },
          {
            name: 'dialTimeoutSeconds',
            type: 'int',
            default: 30,
          },
          {
            name: 'minAgentsRequired',
            type: 'int',
            default: 5,
          },
          {
            name: 'availableAgents',
            type: 'int',
            default: 0,
          },
          {
            name: 'busyAgents',
            type: 'int',
            default: 0,
          },
          {
            name: 'activeCalls',
            type: 'int',
            default: 0,
          },
          {
            name: 'queuedCalls',
            type: 'int',
            default: 0,
          },
          {
            name: 'avgAnswerTimeSeconds',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'avgCallDurationSeconds',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'contactRate',
            type: 'decimal',
            precision: 5,
            scale: 4,
            default: 0.5,
          },
          {
            name: 'actualAbandonmentRate',
            type: 'decimal',
            precision: 5,
            scale: 4,
            default: 0,
          },
          {
            name: 'pacingCalculation',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'totalCallsDialed',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalCallsAnswered',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalCallsAbandoned',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalCallsConnected',
            type: 'int',
            default: 0,
          },
          {
            name: 'customParameters',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'startedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'stoppedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastCalculationAt',
            type: 'timestamp',
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

    // Create indexes
    await queryRunner.createIndex(
      'pacing_engines',
      new TableIndex({
        name: 'IDX_PACING_ENGINE_CAMPAIGN_STATUS',
        columnNames: ['campaignId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'pacing_engines',
      new TableIndex({
        name: 'IDX_PACING_ENGINE_SESSION',
        columnNames: ['sessionId'],
      }),
    );

    await queryRunner.createIndex(
      'pacing_engines',
      new TableIndex({
        name: 'IDX_PACING_ENGINE_ORGANIZATION',
        columnNames: ['organizationId'],
      }),
    );

    await queryRunner.createIndex(
      'pacing_engines',
      new TableIndex({
        name: 'IDX_PACING_ENGINE_LAST_CALCULATION',
        columnNames: ['lastCalculationAt'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'pacing_engines',
      new TableForeignKey({
        columnNames: ['campaignId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'campaigns',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'pacing_engines',
      new TableForeignKey({
        columnNames: ['sessionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'dialing_sessions',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'pacing_engines',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('pacing_engines');
  }
}

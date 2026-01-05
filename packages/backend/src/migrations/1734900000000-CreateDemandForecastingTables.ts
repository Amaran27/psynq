import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateDemandForecastingTables1734900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create forecast_models table
    await queryRunner.createTable(
      new Table({
        name: 'forecast_models',
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
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'training'",
            isNullable: false,
          },
          {
            name: 'training_data',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'performance',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
            isNullable: false,
          },
          {
            name: 'hyperparameters',
            type: 'jsonb',
            isNullable: false,
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
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'trained_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for forecast_models
    await queryRunner.createIndex(
      'forecast_models',
      new TableIndex({
        name: 'idx_forecast_models_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'forecast_models',
      new TableIndex({
        name: 'idx_forecast_models_organization_status',
        columnNames: ['organization_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'forecast_models',
      new TableIndex({
        name: 'idx_forecast_models_organization_type',
        columnNames: ['organization_id', 'type'],
      }),
    );

    await queryRunner.createIndex(
      'forecast_models',
      new TableIndex({
        name: 'idx_forecast_models_status_trained_at',
        columnNames: ['status', 'trained_at'],
      }),
    );

    // Create foreign key for forecast_models
    await queryRunner.createForeignKey(
      'forecast_models',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create forecasts table
    await queryRunner.createTable(
      new Table({
        name: 'forecasts',
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
            name: 'model_id',
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
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'interval',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'start_date',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'end_date',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'data_points',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'accuracy',
            type: 'jsonb',
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
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes for forecasts
    await queryRunner.createIndex(
      'forecasts',
      new TableIndex({
        name: 'idx_forecasts_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'forecasts',
      new TableIndex({
        name: 'idx_forecasts_model_id',
        columnNames: ['model_id'],
      }),
    );

    await queryRunner.createIndex(
      'forecasts',
      new TableIndex({
        name: 'idx_forecasts_organization_created_at',
        columnNames: ['organization_id', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'forecasts',
      new TableIndex({
        name: 'idx_forecasts_organization_type_interval',
        columnNames: ['organization_id', 'type', 'interval'],
      }),
    );

    await queryRunner.createIndex(
      'forecasts',
      new TableIndex({
        name: 'idx_forecasts_start_date_end_date',
        columnNames: ['start_date', 'end_date'],
      }),
    );

    // Create foreign keys for forecasts
    await queryRunner.createForeignKey(
      'forecasts',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'forecasts',
      new TableForeignKey({
        columnNames: ['model_id'],
        referencedTableName: 'forecast_models',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const forecastsTable = await queryRunner.getTable('forecasts');
    if (forecastsTable) {
      const orgFk = forecastsTable.foreignKeys.find(
        fk => fk.columnNames.indexOf('organization_id') !== -1,
      );
      const modelFk = forecastsTable.foreignKeys.find(
        fk => fk.columnNames.indexOf('model_id') !== -1,
      );
      if (orgFk) {
        await queryRunner.dropForeignKey('forecasts', orgFk);
      }
      if (modelFk) {
        await queryRunner.dropForeignKey('forecasts', modelFk);
      }
    }

    const modelsTable = await queryRunner.getTable('forecast_models');
    if (modelsTable) {
      const orgFk = modelsTable.foreignKeys.find(
        fk => fk.columnNames.indexOf('organization_id') !== -1,
      );
      if (orgFk) {
        await queryRunner.dropForeignKey('forecast_models', orgFk);
      }
    }

    // Drop indexes
    await queryRunner.dropIndex('forecasts', 'idx_forecasts_start_date_end_date');
    await queryRunner.dropIndex('forecasts', 'idx_forecasts_organization_type_interval');
    await queryRunner.dropIndex('forecasts', 'idx_forecasts_organization_created_at');
    await queryRunner.dropIndex('forecasts', 'idx_forecasts_model_id');
    await queryRunner.dropIndex('forecasts', 'idx_forecasts_organization_id');

    await queryRunner.dropIndex('forecast_models', 'idx_forecast_models_status_trained_at');
    await queryRunner.dropIndex('forecast_models', 'idx_forecast_models_organization_type');
    await queryRunner.dropIndex('forecast_models', 'idx_forecast_models_organization_status');
    await queryRunner.dropIndex('forecast_models', 'idx_forecast_models_organization_id');

    // Drop tables
    await queryRunner.dropTable('forecasts');
    await queryRunner.dropTable('forecast_models');
  }
}

import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateRatingEngineTables1766400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create rate_plans table
    await queryRunner.createTable(
      new Table({
        name: 'rate_plans',
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
            name: 'type',
            type: 'enum',
            enum: ['prepaid', 'postpaid', 'hybrid'],
            default: "'prepaid'",
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'active', 'suspended', 'archived'],
            default: "'draft'",
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'charge_type',
            type: 'enum',
            enum: ['per_minute', 'per_second', 'per_call', 'per_sms', 'flat_rate'],
            default: "'per_minute'",
            isNullable: false,
          },
          {
            name: 'base_rate',
            type: 'decimal',
            precision: 10,
            scale: 4,
            default: 0,
            isNullable: false,
          },
          {
            name: 'minimum_charge',
            type: 'decimal',
            precision: 10,
            scale: 4,
            default: 0,
            isNullable: false,
          },
          {
            name: 'rounding_method',
            type: 'enum',
            enum: ['ceil', 'floor', 'round'],
            default: "'ceil'",
            isNullable: false,
          },
          {
            name: 'rounding_increment',
            type: 'int',
            default: 1,
            isNullable: false,
          },
          {
            name: 'free_seconds',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'USD'",
            isNullable: false,
          },
          {
            name: 'billing_cycle',
            type: 'int',
            default: 30,
            isNullable: false,
          },
          {
            name: 'grace_period_days',
            type: 'int',
            default: 7,
            isNullable: false,
          },
          {
            name: 'low_balance_threshold',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 10,
            isNullable: false,
          },
          {
            name: 'auto_recharge',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'auto_recharge_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'auto_recharge_threshold',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'effective_from',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'effective_to',
            type: 'timestamp',
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

    // Create customer_wallets table
    await queryRunner.createTable(
      new Table({
        name: 'customer_wallets',
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
            name: 'customer_id',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'USD'",
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'suspended', 'closed'],
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'low_balance_threshold',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 10,
            isNullable: false,
          },
          {
            name: 'auto_recharge',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'auto_recharge_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'auto_recharge_threshold',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'last_recharge_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_debit_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'total_credited',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'total_debited',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'total_refunded',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'lifetime_value',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
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
        ],
      }),
      true,
    );

    // Create usage_records table
    await queryRunner.createTable(
      new Table({
        name: 'usage_records',
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
            name: 'customer_id',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'rate_plan_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'wallet_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'usage_type',
            type: 'enum',
            enum: ['voice_inbound', 'voice_outbound', 'sms_inbound', 'sms_outbound', 'data_transfer', 'api_call'],
            default: "'voice_outbound'",
            isNullable: false,
          },
          {
            name: 'start_time',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'end_time',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'duration_seconds',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'int',
            default: 1,
            isNullable: false,
          },
          {
            name: 'unit_cost',
            type: 'decimal',
            precision: 10,
            scale: 4,
            default: 0,
            isNullable: false,
          },
          {
            name: 'total_cost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'USD'",
            isNullable: false,
          },
          {
            name: 'rating_status',
            type: 'enum',
            enum: ['pending', 'rated', 'failed', 'disputed'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'rated_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'source_number',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'destination_number',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'call_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'campaign_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'rating_batch_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'failure_reason',
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

    // Create rating_batches table
    await queryRunner.createTable(
      new Table({
        name: 'rating_batches',
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
            name: 'status',
            type: 'enum',
            enum: ['pending', 'processing', 'completed', 'failed', 'partial'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'started_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'total_records',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'processed_records',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'successful_records',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'failed_records',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'USD'",
            isNullable: false,
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

    // Create foreign keys
    await queryRunner.createForeignKey(
      'rate_plans',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
        name: 'fk_rate_plans_organization',
      }),
    );

    await queryRunner.createForeignKey(
      'customer_wallets',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
        name: 'fk_customer_wallets_organization',
      }),
    );

    await queryRunner.createForeignKey(
      'usage_records',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
        name: 'fk_usage_records_organization',
      }),
    );

    await queryRunner.createForeignKey(
      'usage_records',
      new TableForeignKey({
        columnNames: ['rate_plan_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'rate_plans',
        onDelete: 'RESTRICT',
        name: 'fk_usage_records_rate_plan',
      }),
    );

    await queryRunner.createForeignKey(
      'usage_records',
      new TableForeignKey({
        columnNames: ['wallet_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'customer_wallets',
        onDelete: 'SET NULL',
        name: 'fk_usage_records_wallet',
      }),
    );

    await queryRunner.createForeignKey(
      'rating_batches',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
        name: 'fk_rating_batches_organization',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'rate_plans',
      new TableIndex({
        name: 'idx_rate_plans_organization',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'rate_plans',
      new TableIndex({
        name: 'idx_rate_plans_organization_status',
        columnNames: ['organization_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'customer_wallets',
      new TableIndex({
        name: 'idx_customer_wallets_organization',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'customer_wallets',
      new TableIndex({
        name: 'idx_customer_wallets_organization_customer',
        columnNames: ['organization_id', 'customer_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'usage_records',
      new TableIndex({
        name: 'idx_usage_records_organization_customer',
        columnNames: ['organization_id', 'customer_id'],
      }),
    );

    await queryRunner.createIndex(
      'usage_records',
      new TableIndex({
        name: 'idx_usage_records_rate_plan',
        columnNames: ['rate_plan_id'],
      }),
    );

    await queryRunner.createIndex(
      'usage_records',
      new TableIndex({
        name: 'idx_usage_records_rating_status',
        columnNames: ['rating_status'],
      }),
    );

    await queryRunner.createIndex(
      'usage_records',
      new TableIndex({
        name: 'idx_usage_records_start_time',
        columnNames: ['start_time'],
      }),
    );

    await queryRunner.createIndex(
      'rating_batches',
      new TableIndex({
        name: 'idx_rating_batches_organization_status',
        columnNames: ['organization_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'rating_batches',
      new TableIndex({
        name: 'idx_rating_batches_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('rating_batches', 'idx_rating_batches_created_at');
    await queryRunner.dropIndex('rating_batches', 'idx_rating_batches_organization_status');
    await queryRunner.dropIndex('usage_records', 'idx_usage_records_start_time');
    await queryRunner.dropIndex('usage_records', 'idx_usage_records_rating_status');
    await queryRunner.dropIndex('usage_records', 'idx_usage_records_rate_plan');
    await queryRunner.dropIndex('usage_records', 'idx_usage_records_organization_customer');
    await queryRunner.dropIndex('customer_wallets', 'idx_customer_wallets_organization_customer');
    await queryRunner.dropIndex('customer_wallets', 'idx_customer_wallets_organization');
    await queryRunner.dropIndex('rate_plans', 'idx_rate_plans_organization_status');
    await queryRunner.dropIndex('rate_plans', 'idx_rate_plans_organization');

    // Drop foreign keys
    await queryRunner.dropForeignKey('rating_batches', 'fk_rating_batches_organization');
    await queryRunner.dropForeignKey('usage_records', 'fk_usage_records_wallet');
    await queryRunner.dropForeignKey('usage_records', 'fk_usage_records_rate_plan');
    await queryRunner.dropForeignKey('usage_records', 'fk_usage_records_organization');
    await queryRunner.dropForeignKey('customer_wallets', 'fk_customer_wallets_organization');
    await queryRunner.dropForeignKey('rate_plans', 'fk_rate_plans_organization');

    // Drop tables
    await queryRunner.dropTable('rating_batches');
    await queryRunner.dropTable('usage_records');
    await queryRunner.dropTable('customer_wallets');
    await queryRunner.dropTable('rate_plans');
  }
}

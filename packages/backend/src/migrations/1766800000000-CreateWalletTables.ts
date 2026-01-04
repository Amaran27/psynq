import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateWalletTables1766800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create wallets table
    await queryRunner.createTable(
      new Table({
        name: 'wallets',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'customer_id',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '20',
            default: "'prepaid'",
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'USD'",
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 15,
            scale: 4,
            default: 0,
          },
          {
            name: 'credit_limit',
            type: 'decimal',
            precision: 15,
            scale: 4,
            default: 0,
          },
          {
            name: 'low_balance_threshold',
            type: 'decimal',
            precision: 15,
            scale: 4,
            default: 10,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'active'",
          },
          {
            name: 'auto_recharge',
            type: 'boolean',
            default: false,
          },
          {
            name: 'auto_recharge_amount',
            type: 'decimal',
            precision: 15,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'auto_recharge_trigger',
            type: 'decimal',
            precision: 15,
            scale: 4,
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
        ],
      }),
      true,
    );

    // Create indexes for wallets
    await queryRunner.createIndex(
      'wallets',
      new TableIndex({
        name: 'IDX_WALLET_ORG',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'wallets',
      new TableIndex({
        name: 'IDX_WALLET_CUSTOMER',
        columnNames: ['organization_id', 'customer_id'],
      }),
    );

    await queryRunner.createIndex(
      'wallets',
      new TableIndex({
        name: 'IDX_WALLET_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'wallets',
      new TableIndex({
        name: 'IDX_WALLET_LOW_BALANCE',
        columnNames: ['status', 'balance', 'low_balance_threshold'],
      }),
    );

    // Create foreign key for organization
    await queryRunner.createForeignKey(
      'wallets',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );

    // Create wallet_transactions table
    await queryRunner.createTable(
      new Table({
        name: 'wallet_transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'wallet_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '30',
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 15,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'balance_before',
            type: 'decimal',
            precision: 15,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'balance_after',
            type: 'decimal',
            precision: 15,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            isNullable: false,
          },
          {
            name: 'reference',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'reference_type',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'initiated_by',
            type: 'varchar',
            length: '100',
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
        ],
      }),
      true,
    );

    // Create indexes for wallet_transactions
    await queryRunner.createIndex(
      'wallet_transactions',
      new TableIndex({
        name: 'IDX_WALLET_TX_WALLET',
        columnNames: ['wallet_id'],
      }),
    );

    await queryRunner.createIndex(
      'wallet_transactions',
      new TableIndex({
        name: 'IDX_WALLET_TX_ORG',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'wallet_transactions',
      new TableIndex({
        name: 'IDX_WALLET_TX_TYPE',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'wallet_transactions',
      new TableIndex({
        name: 'IDX_WALLET_TX_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'wallet_transactions',
      new TableIndex({
        name: 'IDX_WALLET_TX_REFERENCE',
        columnNames: ['reference', 'reference_type'],
      }),
    );

    await queryRunner.createIndex(
      'wallet_transactions',
      new TableIndex({
        name: 'IDX_WALLET_TX_CREATED',
        columnNames: ['created_at'],
      }),
    );

    // Create foreign keys for wallet_transactions
    await queryRunner.createForeignKey(
      'wallet_transactions',
      new TableForeignKey({
        columnNames: ['wallet_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'wallets',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'wallet_transactions',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop wallet_transactions table
    const walletTxTable = await queryRunner.getTable('wallet_transactions');
    if (walletTxTable) {
      const walletTxForeignKeys = walletTxTable.foreignKeys;
      for (const foreignKey of walletTxForeignKeys) {
        await queryRunner.dropForeignKey('wallet_transactions', foreignKey);
      }
    }
    await queryRunner.dropTable('wallet_transactions', true);

    // Drop wallets table
    const walletTable = await queryRunner.getTable('wallets');
    if (walletTable) {
      const walletForeignKeys = walletTable.foreignKeys;
      for (const foreignKey of walletForeignKeys) {
        await queryRunner.dropForeignKey('wallets', foreignKey);
      }
    }
    await queryRunner.dropTable('wallets', true);
  }
}

import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateChannelsTable1766337000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create channels table
    await queryRunner.createTable(
      new Table({
        name: 'channels',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
          },
          {
            name: 'organizationId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'callId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'bridgeId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'state',
            type: 'enum',
            enum: [
              'Down',
              'Rsrvd',
              'OffHook',
              'Dialing',
              'Ring',
              'Ringing',
              'Up',
              'Busy',
              'DialingOffHook',
              'PreRing',
              'Unknown',
            ],
            default: "'Down'",
          },
          {
            name: 'direction',
            type: 'enum',
            enum: ['inbound', 'outbound'],
            default: "'inbound'",
          },
          {
            name: 'callerName',
            type: 'varchar',
          },
          {
            name: 'callerNumber',
            type: 'varchar',
          },
          {
            name: 'connectedName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'connectedNumber',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'dialedNumber',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'language',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'accountCode',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'channelvars',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'providerMetadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'answeredAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'endedAt',
            type: 'timestamp',
            isNullable: true,
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
      'channels',
      new TableIndex({
        name: 'IDX_CHANNEL_STATE',
        columnNames: ['state'],
      }),
    );

    await queryRunner.createIndex(
      'channels',
      new TableIndex({
        name: 'IDX_CHANNEL_ORGANIZATION',
        columnNames: ['organizationId'],
      }),
    );

    await queryRunner.createIndex(
      'channels',
      new TableIndex({
        name: 'IDX_CHANNEL_CALL',
        columnNames: ['callId'],
      }),
    );

    await queryRunner.createIndex(
      'channels',
      new TableIndex({
        name: 'IDX_CHANNEL_BRIDGE',
        columnNames: ['bridgeId'],
      }),
    );

    await queryRunner.createIndex(
      'channels',
      new TableIndex({
        name: 'IDX_CHANNEL_ENDED_AT',
        columnNames: ['endedAt'],
      }),
    );

    // Foreign keys
    await queryRunner.createForeignKey(
      'channels',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'channels',
      new TableForeignKey({
        columnNames: ['callId'],
        referencedTableName: 'calls',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('channels');
  }
}

import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateBridgesTable1766338000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bridges',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
          },
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'bridgeType',
            type: 'enum',
            enum: ['mixing', 'holding', 'dtmf_events'],
            default: "'mixing'",
          },
          {
            name: 'technology',
            type: 'enum',
            enum: ['simple_bridge', 'native_rtp', 'softmix'],
            default: "'softmix'",
          },
          {
            name: 'channelIds',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'creatorChannelId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'bridgeVars',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isRecording',
            type: 'boolean',
            default: false,
          },
          {
            name: 'recordingName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'destroyedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Index on organizationId for filtering
    await queryRunner.createIndex(
      'bridges',
      new TableIndex({
        name: 'IDX_bridges_organizationId',
        columnNames: ['organizationId'],
      }),
    );

    // Index on destroyedAt for active bridge queries
    await queryRunner.createIndex(
      'bridges',
      new TableIndex({
        name: 'IDX_bridges_destroyedAt',
        columnNames: ['destroyedAt'],
      }),
    );

    // Index on createdAt for time-based queries
    await queryRunner.createIndex(
      'bridges',
      new TableIndex({
        name: 'IDX_bridges_createdAt',
        columnNames: ['createdAt'],
      }),
    );

    // Foreign key to organizations
    await queryRunner.createForeignKey(
      'bridges',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('bridges');
    if (table) {
      const foreignKeys = table.foreignKeys.filter(
        (fk) => fk.columnNames.indexOf('organizationId') !== -1,
      );
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('bridges', fk);
      }
    }

    await queryRunner.dropIndex('bridges', 'IDX_bridges_createdAt');
    await queryRunner.dropIndex('bridges', 'IDX_bridges_destroyedAt');
    await queryRunner.dropIndex('bridges', 'IDX_bridges_organizationId');
    await queryRunner.dropTable('bridges');
  }
}

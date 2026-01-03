import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateCallTables1766336000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create calls table
    await queryRunner.createTable(
      new Table({
        name: 'calls',
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
            name: 'state',
            type: 'enum',
            enum: ['idle', 'ringing', 'answered', 'on_hold', 'ended'],
            default: "'idle'",
          },
          {
            name: 'direction',
            type: 'enum',
            enum: ['inbound', 'outbound'],
            default: "'inbound'",
          },
          {
            name: 'from',
            type: 'varchar',
          },
          {
            name: 'to',
            type: 'varchar',
          },
          {
            name: 'agentId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'externalId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'externalParentId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'providerMetadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'startedAt',
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
          {
            name: 'supervisorParticipantSid',
            type: 'varchar',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes on calls table
    await queryRunner.createIndex(
      'calls',
      new TableIndex({
        name: 'IDX_CALL_STATE',
        columnNames: ['state'],
      }),
    );

    await queryRunner.createIndex(
      'calls',
      new TableIndex({
        name: 'IDX_CALL_ORGANIZATION',
        columnNames: ['organizationId'],
      }),
    );

    await queryRunner.createIndex(
      'calls',
      new TableIndex({
        name: 'IDX_CALL_AGENT',
        columnNames: ['agentId'],
      }),
    );

    await queryRunner.createIndex(
      'calls',
      new TableIndex({
        name: 'IDX_CALL_EXTERNAL_ID',
        columnNames: ['externalId'],
      }),
    );

    // Foreign key to organizations
    await queryRunner.createForeignKey(
      'calls',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create call_participants table
    await queryRunner.createTable(
      new Table({
        name: 'call_participants',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'call_id',
            type: 'varchar',
          },
          {
            name: 'participant_id',
            type: 'varchar',
          },
          {
            name: 'participant_type',
            type: 'enum',
            enum: ['agent', 'customer', 'supervisor'],
          },
          {
            name: 'provider_call_sid',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'providerSpecificData',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'is_muted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_on_hold',
            type: 'boolean',
            default: false,
          },
          {
            name: 'joined_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'left_at',
            type: 'timestamp',
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

    // Create indexes on call_participants
    await queryRunner.createIndex(
      'call_participants',
      new TableIndex({
        name: 'IDX_PARTICIPANT_CALL',
        columnNames: ['call_id'],
      }),
    );

    await queryRunner.createIndex(
      'call_participants',
      new TableIndex({
        name: 'IDX_PARTICIPANT_TYPE',
        columnNames: ['participant_type'],
      }),
    );

    // Foreign key to calls
    await queryRunner.createForeignKey(
      'call_participants',
      new TableForeignKey({
        columnNames: ['call_id'],
        referencedTableName: 'calls',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create recordings table
    await queryRunner.createTable(
      new Table({
        name: 'recordings',
        columns: [
          {
            name: 'id',
            type: 'serial',
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
          },
          {
            name: 'url',
            type: 'varchar',
          },
          {
            name: 'duration',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'size',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'contentType',
            type: 'varchar',
            default: "'audio/wav'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes on recordings
    await queryRunner.createIndex(
      'recordings',
      new TableIndex({
        name: 'IDX_RECORDING_CALL',
        columnNames: ['callId'],
      }),
    );

    await queryRunner.createIndex(
      'recordings',
      new TableIndex({
        name: 'IDX_RECORDING_ORGANIZATION',
        columnNames: ['organizationId'],
      }),
    );

    // Foreign keys for recordings
    await queryRunner.createForeignKey(
      'recordings',
      new TableForeignKey({
        columnNames: ['callId'],
        referencedTableName: 'calls',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'recordings',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop recordings table
    await queryRunner.dropTable('recordings');

    // Drop call_participants table
    await queryRunner.dropTable('call_participants');

    // Drop calls table
    await queryRunner.dropTable('calls');
  }
}

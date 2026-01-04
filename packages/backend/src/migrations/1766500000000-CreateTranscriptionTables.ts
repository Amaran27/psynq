import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateTranscriptionTables1766500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "transcription_status_enum" AS ENUM (
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'FAILED'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "transcription_provider_enum" AS ENUM (
        'WHISPER',
        'GOOGLE',
        'AZURE',
        'AWS'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "audio_format_enum" AS ENUM (
        'WAV',
        'MP3',
        'FLAC',
        'OGG',
        'M4A'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "sentiment_score_enum" AS ENUM (
        'VERY_NEGATIVE',
        'NEGATIVE',
        'NEUTRAL',
        'POSITIVE',
        'VERY_POSITIVE'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "emotion_type_enum" AS ENUM (
        'ANGER',
        'DISGUST',
        'FEAR',
        'JOY',
        'SADNESS',
        'SURPRISE',
        'NEUTRAL'
      );
    `);

    // Create transcriptions table
    await queryRunner.createTable(
      new Table({
        name: 'transcriptions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'callId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'recordingId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'audioUrl',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'audioFormat',
            type: 'audio_format_enum',
            isNullable: false,
          },
          {
            name: 'audioDurationSeconds',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'audioSizeBytes',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'transcription_status_enum',
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: 'provider',
            type: 'transcription_provider_enum',
            isNullable: false,
          },
          {
            name: 'language',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'text',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'confidence',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'processingTimeMs',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'startedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Indexes for transcriptions
    await queryRunner.createIndex(
      'transcriptions',
      new TableIndex({
        name: 'IDX_TRANSCRIPTIONS_ORG_STATUS',
        columnNames: ['organizationId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'transcriptions',
      new TableIndex({
        name: 'IDX_TRANSCRIPTIONS_CALL',
        columnNames: ['callId'],
      }),
    );

    await queryRunner.createIndex(
      'transcriptions',
      new TableIndex({
        name: 'IDX_TRANSCRIPTIONS_RECORDING',
        columnNames: ['recordingId'],
      }),
    );

    await queryRunner.createIndex(
      'transcriptions',
      new TableIndex({
        name: 'IDX_TRANSCRIPTIONS_PROVIDER',
        columnNames: ['provider'],
      }),
    );

    await queryRunner.createIndex(
      'transcriptions',
      new TableIndex({
        name: 'IDX_TRANSCRIPTIONS_CREATED',
        columnNames: ['createdAt'],
      }),
    );

    // Foreign key
    await queryRunner.createForeignKey(
      'transcriptions',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );

    // Create transcription_segments table
    await queryRunner.createTable(
      new Table({
        name: 'transcription_segments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'transcriptionId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'segmentIndex',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'startTime',
            type: 'decimal',
            precision: 10,
            scale: 3,
            isNullable: false,
          },
          {
            name: 'endTime',
            type: 'decimal',
            precision: 10,
            scale: 3,
            isNullable: false,
          },
          {
            name: 'text',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'confidence',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'speaker',
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
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Indexes for transcription_segments
    await queryRunner.createIndex(
      'transcription_segments',
      new TableIndex({
        name: 'IDX_SEGMENTS_TRANSCRIPTION_INDEX',
        columnNames: ['transcriptionId', 'segmentIndex'],
      }),
    );

    await queryRunner.createIndex(
      'transcription_segments',
      new TableIndex({
        name: 'IDX_SEGMENTS_START_TIME',
        columnNames: ['startTime'],
      }),
    );

    // Foreign key
    await queryRunner.createForeignKey(
      'transcription_segments',
      new TableForeignKey({
        columnNames: ['transcriptionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'transcriptions',
        onDelete: 'CASCADE',
      }),
    );

    // Create sentiments table
    await queryRunner.createTable(
      new Table({
        name: 'sentiments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'transcriptionId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'segmentId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'callId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'score',
            type: 'sentiment_score_enum',
            isNullable: false,
          },
          {
            name: 'scoreValue',
            type: 'decimal',
            precision: 4,
            scale: 3,
            isNullable: false,
          },
          {
            name: 'magnitude',
            type: 'decimal',
            precision: 4,
            scale: 3,
            isNullable: false,
          },
          {
            name: 'emotion',
            type: 'emotion_type_enum',
            isNullable: true,
          },
          {
            name: 'emotionConfidence',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'keywords',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
          },
          {
            name: 'entities',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Indexes for sentiments
    await queryRunner.createIndex(
      'sentiments',
      new TableIndex({
        name: 'IDX_SENTIMENTS_ORG_TRANSCRIPTION',
        columnNames: ['organizationId', 'transcriptionId'],
      }),
    );

    await queryRunner.createIndex(
      'sentiments',
      new TableIndex({
        name: 'IDX_SENTIMENTS_CALL',
        columnNames: ['callId'],
      }),
    );

    await queryRunner.createIndex(
      'sentiments',
      new TableIndex({
        name: 'IDX_SENTIMENTS_SCORE',
        columnNames: ['score'],
      }),
    );

    await queryRunner.createIndex(
      'sentiments',
      new TableIndex({
        name: 'IDX_SENTIMENTS_CREATED',
        columnNames: ['createdAt'],
      }),
    );

    // Foreign keys
    await queryRunner.createForeignKey(
      'sentiments',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'sentiments',
      new TableForeignKey({
        columnNames: ['transcriptionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'transcriptions',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables (cascading will drop foreign keys)
    await queryRunner.dropTable('sentiments');
    await queryRunner.dropTable('transcription_segments');
    await queryRunner.dropTable('transcriptions');

    // Drop enum types
    await queryRunner.query(`DROP TYPE "emotion_type_enum"`);
    await queryRunner.query(`DROP TYPE "sentiment_score_enum"`);
    await queryRunner.query(`DROP TYPE "audio_format_enum"`);
    await queryRunner.query(`DROP TYPE "transcription_provider_enum"`);
    await queryRunner.query(`DROP TYPE "transcription_status_enum"`);
  }
}

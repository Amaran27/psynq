import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateFailedLoginsTable1735840000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'failed_logins',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'username',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'failure_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'attempted_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'failed_logins',
      new TableIndex({
        name: 'IDX_FAILED_LOGIN_IP',
        columnNames: ['ip_address'],
      }),
    );

    await queryRunner.createIndex(
      'failed_logins',
      new TableIndex({
        name: 'IDX_FAILED_LOGIN_USERNAME',
        columnNames: ['username'],
      }),
    );

    await queryRunner.createIndex(
      'failed_logins',
      new TableIndex({
        name: 'IDX_FAILED_LOGIN_ATTEMPTED_AT',
        columnNames: ['attempted_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('failed_logins');
  }
}

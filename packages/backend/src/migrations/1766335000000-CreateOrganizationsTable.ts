import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateOrganizationsTable1766335000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'organizations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'active'",
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

    // Create unique index on name
    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'IDX_ORGANIZATION_NAME',
        columnNames: ['name'],
        isUnique: true,
      }),
    );

    // Create unique index on slug
    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'IDX_ORGANIZATION_SLUG',
        columnNames: ['slug'],
        isUnique: true,
      }),
    );

    // Create index on status for filtering
    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'IDX_ORGANIZATION_STATUS',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('organizations', 'IDX_ORGANIZATION_STATUS');
    await queryRunner.dropIndex('organizations', 'IDX_ORGANIZATION_SLUG');
    await queryRunner.dropIndex('organizations', 'IDX_ORGANIZATION_NAME');
    await queryRunner.dropTable('organizations');
  }
}

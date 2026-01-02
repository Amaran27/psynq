import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixRolesColumn1735658400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop and recreate roles column as proper text[] array
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "roles_new" text[]`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "roles_new" = string_to_array(roles, ',')`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roles"`);
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "roles_new" TO "roles"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT ARRAY['agent']`,
    );

    // Fix sysadmin role
    await queryRunner.query(
      `UPDATE "users" SET "roles" = ARRAY['system_admin']::text[] WHERE username = 'sysadmin'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to text column
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "roles_old" text`);
    await queryRunner.query(
      `UPDATE "users" SET "roles_old" = array_to_string("roles", ',')`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roles"`);
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "roles_old" TO "roles"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT '["agent"]'::text`,
    );
  }
}

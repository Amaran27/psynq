import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class AddEmailVerifiedColumn1735840000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add emailVerified column to users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "emailVerified" boolean DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop emailVerified column from users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "emailVerified"
    `);
  }
}

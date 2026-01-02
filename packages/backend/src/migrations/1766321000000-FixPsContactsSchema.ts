import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPsContactsSchema1766321000000 implements MigrationInterface {
  name = 'FixPsContactsSchema1766321000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ps_contacts" ADD COLUMN IF NOT EXISTS "authenticate_qualify" varchar(3)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ps_contacts" DROP COLUMN "authenticate_qualify"`,
    );
  }
}

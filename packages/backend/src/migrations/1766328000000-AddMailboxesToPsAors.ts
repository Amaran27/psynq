import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMailboxesToPsAors1766328000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ps_aors_data" ADD COLUMN IF NOT EXISTS "mailboxes" TEXT`,
    );
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ps_aors_data" DROP COLUMN "mailboxes"`,
    );
  }
}

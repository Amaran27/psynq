import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds missing Asterisk PJSIP columns to ps_endpoints table
 * - contact_reject_unknown_contact_header: Prevents Asterisk from rewriting Contact header
 *   (fixes ASTERISK-30042 bug where x-ast-orig-host parameter is added)
 */
export class AddMissingAsteriskColumns1735888800000
  implements MigrationInterface
{
  name = 'AddMissingAsteriskColumns1735888800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add contact_reject_unknown_contact_header column to ps_endpoints
    // This prevents Asterisk from rewriting the Contact header with x-ast-orig-host parameter
    // which can cause issues with WebRTC clients
    await queryRunner.query(
      `ALTER TABLE "ps_endpoints" 
       ADD COLUMN IF NOT EXISTS "contact_reject_unknown_contact_header" VARCHAR(3) DEFAULT 'no'`,
    );

    // Add comment for documentation
    await queryRunner.query(
      `COMMENT ON COLUMN "ps_endpoints"."contact_reject_unknown_contact_header" IS 
       'Prevents Asterisk from rewriting Contact header (ASTERISK-30042 fix)'`,
    );

    console.log(
      '✅ Added contact_reject_unknown_contact_header column to ps_endpoints',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ps_endpoints" DROP COLUMN IF EXISTS "contact_reject_unknown_contact_header"`,
    );
  }
}

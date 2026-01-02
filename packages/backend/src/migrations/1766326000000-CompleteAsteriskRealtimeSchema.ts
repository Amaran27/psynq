import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteAsteriskRealtimeSchema1766326000000 implements MigrationInterface {
  name = 'CompleteAsteriskRealtimeSchema1766326000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Complete ps_contacts
    await queryRunner.query(
      `ALTER TABLE "ps_contacts" ADD COLUMN IF NOT EXISTS "outbound_proxy" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_contacts" ADD COLUMN IF NOT EXISTS "path" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_contacts" ADD COLUMN IF NOT EXISTS "user_agent" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_contacts" ADD COLUMN IF NOT EXISTS "reg_server" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_contacts" ADD COLUMN IF NOT EXISTS "prune_on_boot" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_contacts" ADD COLUMN IF NOT EXISTS "via_addr" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_contacts" ADD COLUMN IF NOT EXISTS "via_port" INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_contacts" ADD COLUMN IF NOT EXISTS "call_id" TEXT`,
    );

    // Complete ps_endpoints
    await queryRunner.query(
      `ALTER TABLE "ps_endpoints" ADD COLUMN IF NOT EXISTS "outbound_auth" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_endpoints" ADD COLUMN IF NOT EXISTS "outbound_proxy" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_endpoints" ADD COLUMN IF NOT EXISTS "callerid" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_endpoints" ADD COLUMN IF NOT EXISTS "dtmf_mode" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_endpoints" ADD COLUMN IF NOT EXISTS "rtp_symmetric" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_endpoints" ADD COLUMN IF NOT EXISTS "force_rport" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_endpoints" ADD COLUMN IF NOT EXISTS "rewrite_contact" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_endpoints" ADD COLUMN IF NOT EXISTS "ice_support" TEXT`,
    );

    // Complete ps_aors
    await queryRunner.query(
      `ALTER TABLE "ps_aors" ADD COLUMN IF NOT EXISTS "contact" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_aors" ADD COLUMN IF NOT EXISTS "default_expiration" INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_aors" ADD COLUMN IF NOT EXISTS "mailboxes" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_aors" ADD COLUMN IF NOT EXISTS "minimum_expiration" INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_aors" ADD COLUMN IF NOT EXISTS "maximum_expiration" INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_aors" ADD COLUMN IF NOT EXISTS "outbound_proxy" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_aors" ADD COLUMN IF NOT EXISTS "support_path" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "ps_aors" ADD COLUMN IF NOT EXISTS "voicemail_extension" TEXT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op
  }
}

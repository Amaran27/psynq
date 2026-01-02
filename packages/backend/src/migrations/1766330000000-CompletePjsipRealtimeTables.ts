import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompletePjsipRealtimeTables1766330000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ps_registrations (For outbound trunks to Twilio etc)
    await queryRunner.query(`
            CREATE TABLE "ps_registrations" (
                "id" TEXT PRIMARY KEY,
                "auth_rejection_permanent" TEXT,
                "client_uri" TEXT,
                "contact_user" TEXT,
                "expiration" INTEGER,
                "max_retries" INTEGER,
                "outbound_auth" TEXT,
                "outbound_proxy" TEXT,
                "retry_interval" INTEGER,
                "forbidden_retry_interval" INTEGER,
                "server_uri" TEXT,
                "transport" TEXT,
                "support_path" TEXT,
                "fatal_retry_interval" INTEGER,
                "line" TEXT,
                "endpoint" TEXT
            )
        `);

    // ps_identifies (For matching incoming trunk calls by IP/Header)
    await queryRunner.query(`
            CREATE TABLE "ps_identifies" (
                "id" TEXT PRIMARY KEY,
                "endpoint" TEXT,
                "match" TEXT,
                "match_header" TEXT
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ps_identifies"`);
    await queryRunner.query(`DROP TABLE "ps_registrations"`);
  }
}

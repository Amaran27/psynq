import { MigrationInterface, QueryRunner } from "typeorm";

export class RecreateAsteriskTablesClean1766323000000 implements MigrationInterface {
    name = 'RecreateAsteriskTablesClean1766323000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop existing tables to ensure a clean slate with no VARCHAR metadata lingering
        await queryRunner.query(`DROP TABLE IF EXISTS "ps_domain_aliases"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ps_contacts"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ps_aors"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ps_auths"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ps_endpoints"`);

        // Recreate using TEXT for ALL string columns to prevent ODBC padding
        
        await queryRunner.query(`
            CREATE TABLE "ps_endpoints" (
                "id" TEXT PRIMARY KEY,
                "transport" TEXT,
                "aors" TEXT,
                "auth" TEXT,
                "context" TEXT,
                "disallow" TEXT,
                "allow" TEXT,
                "webrtc" TEXT,
                "use_avpf" TEXT,
                "media_address" TEXT,
                "rtp_symmetric" TEXT,
                "force_rport" TEXT,
                "rewrite_contact" TEXT,
                "ice_support" TEXT,
                "media_use_received_transport" TEXT,
                "dtls_auto_generate_cert" TEXT,
                "dtls_verify" TEXT,
                "dtls_setup" TEXT,
                "identify_by" TEXT,
                "from_user" TEXT,
                "from_domain" TEXT,
                "media_encryption" TEXT,
                "dtls_fingerprint" TEXT,
                "bundle" TEXT,
                "dtmf_mode" TEXT,
                "rtp_engine" TEXT
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "ps_auths" (
                "id" TEXT PRIMARY KEY,
                "auth_type" TEXT,
                "password" TEXT,
                "username" TEXT,
                "realm" TEXT
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "ps_aors" (
                "id" TEXT PRIMARY KEY,
                "max_contacts" INTEGER,
                "remove_existing" TEXT,
                "support_path" TEXT,
                "qualify_frequency" INTEGER,
                "default_expiration" INTEGER
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "ps_contacts" (
                "id" TEXT PRIMARY KEY,
                "uri" TEXT,
                "expiration_time" TEXT,
                "qualify_frequency" INTEGER,
                "outbound_proxy" TEXT,
                "path" TEXT,
                "user_agent" TEXT,
                "endpoint" TEXT,
                "via_addr" TEXT,
                "via_port" INTEGER,
                "call_id" TEXT,
                "authenticate_qualify" TEXT
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "ps_domain_aliases" (
                "id" TEXT PRIMARY KEY,
                "domain" TEXT
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No-op
    }
}

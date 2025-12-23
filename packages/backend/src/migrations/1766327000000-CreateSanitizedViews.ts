import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSanitizedViews1766327000000 implements MigrationInterface {
    name = 'CreateSanitizedViews1766327000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Rename physical tables to _data
        await queryRunner.query(`ALTER TABLE "ps_endpoints" RENAME TO "ps_endpoints_data"`);
        await queryRunner.query(`ALTER TABLE "ps_auths" RENAME TO "ps_auths_data"`);
        await queryRunner.query(`ALTER TABLE "ps_aors" RENAME TO "ps_aors_data"`);
        await queryRunner.query(`ALTER TABLE "ps_globals" RENAME TO "ps_globals_data"`);

        // 2. Create Views that TRIM all string columns
        await queryRunner.query(`
            CREATE VIEW "ps_endpoints" AS 
            SELECT 
                TRIM(id) as id,
                TRIM(transport) as transport,
                TRIM(aors) as aors,
                TRIM(auth) as auth,
                TRIM(context) as context,
                TRIM(disallow) as disallow,
                TRIM(allow) as allow,
                TRIM(webrtc) as webrtc,
                TRIM(use_avpf) as use_avpf,
                TRIM(media_address) as media_address,
                TRIM(rtp_symmetric) as rtp_symmetric,
                TRIM(force_rport) as force_rport,
                TRIM(rewrite_contact) as rewrite_contact,
                TRIM(ice_support) as ice_support,
                TRIM(media_use_received_transport) as media_use_received_transport,
                TRIM(dtls_auto_generate_cert) as dtls_auto_generate_cert,
                TRIM(dtls_verify) as dtls_verify,
                TRIM(dtls_setup) as dtls_setup,
                TRIM(identify_by) as identify_by,
                TRIM(from_user) as from_user,
                TRIM(from_domain) as from_domain,
                TRIM(media_encryption) as media_encryption,
                TRIM(dtls_fingerprint) as dtls_fingerprint,
                TRIM(bundle) as bundle,
                TRIM(dtmf_mode) as dtmf_mode,
                TRIM(rtp_engine) as rtp_engine
            FROM "ps_endpoints_data"
        `);

        await queryRunner.query(`
            CREATE VIEW "ps_auths" AS 
            SELECT 
                TRIM(id) as id,
                TRIM(auth_type) as auth_type,
                TRIM(password) as password,
                TRIM(username) as username,
                TRIM(realm) as realm
            FROM "ps_auths_data"
        `);

        await queryRunner.query(`
            CREATE VIEW "ps_aors" AS 
            SELECT 
                TRIM(id) as id,
                max_contacts,
                TRIM(remove_existing) as remove_existing,
                TRIM(support_path) as support_path,
                qualify_frequency,
                default_expiration,
                TRIM(contact) as contact,
                minimum_expiration,
                maximum_expiration,
                TRIM(outbound_proxy) as outbound_proxy,
                TRIM(voicemail_extension) as voicemail_extension
            FROM "ps_aors_data"
        `);

        await queryRunner.query(`
            CREATE VIEW "ps_globals" AS 
            SELECT 
                TRIM(id) as id,
                TRIM(user_agent) as user_agent,
                TRIM(endpoint_identifier_order) as endpoint_identifier_order,
                TRIM(default_realm) as default_realm,
                max_forwards,
                keep_alive_interval,
                contact_expiration_check_interval
            FROM "ps_globals_data"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW IF EXISTS "ps_globals"`);
        await queryRunner.query(`DROP VIEW IF EXISTS "ps_aors"`);
        await queryRunner.query(`DROP VIEW IF EXISTS "ps_auths"`);
        await queryRunner.query(`DROP VIEW IF EXISTS "ps_endpoints"`);
        
        await queryRunner.query(`ALTER TABLE "ps_endpoints_data" RENAME TO "ps_endpoints"`);
        await queryRunner.query(`ALTER TABLE "ps_auths_data" RENAME TO "ps_auths"`);
        await queryRunner.query(`ALTER TABLE "ps_aors_data" RENAME TO "ps_aors"`);
        await queryRunner.query(`ALTER TABLE "ps_globals_data" RENAME TO "ps_globals"`);
    }
}

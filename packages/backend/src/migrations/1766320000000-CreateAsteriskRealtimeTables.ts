import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAsteriskRealtimeTables1766320000000 implements MigrationInterface {
    name = 'CreateAsteriskRealtimeTables1766320000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Asterisk Realtime Architecture - PJSIP Tables
        // These schemas are standard for Asterisk res_odbc

        // ps_endpoints
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ps_endpoints" (
                "id" varchar(40) NOT NULL,
                "transport" varchar(40),
                "aors" varchar(200),
                "auth" varchar(200),
                "context" varchar(40),
                "disallow" varchar(200),
                "allow" varchar(200),
                "direct_media" varchar(3),
                "connected_line_method" varchar(3),
                "direct_media_method" varchar(3),
                "direct_media_glare_mitigation" varchar(3),
                "disable_direct_media_on_nat" varchar(3),
                "dtmf_mode" varchar(7),
                "external_media_address" varchar(40),
                "force_rport" varchar(3),
                "ice_support" varchar(3),
                "identify_by" varchar(80),
                "mailboxes" varchar(40),
                "moh_suggest" varchar(40),
                "outbound_auth" varchar(40),
                "outbound_proxy" varchar(40),
                "rewrite_contact" varchar(3),
                "rtp_ipv6" varchar(3),
                "rtp_symmetric" varchar(3),
                "send_diversion" varchar(3),
                "send_pai" varchar(3),
                "send_rpid" varchar(3),
                "timers_min_se" integer,
                "timers" varchar(3),
                "timers_sess_expires" integer,
                "callerid" varchar(40),
                "callerid_privacy" varchar(40),
                "callerid_tag" varchar(40),
                "100rel" varchar(3),
                "aggregate_mwi" varchar(3),
                "trust_id_inbound" varchar(3),
                "trust_id_outbound" varchar(3),
                "use_pkey" varchar(3),
                "use_avpf" varchar(3),
                "media_encryption" varchar(3),
                "inband_progress" varchar(3),
                "call_group" varchar(40),
                "pickup_group" varchar(40),
                "named_call_group" varchar(40),
                "named_pickup_group" varchar(40),
                "device_state_busy_at" integer,
                "fax_detect" varchar(3),
                "t38_udptl" varchar(3),
                "t38_udptl_ec" varchar(3),
                "t38_udptl_maxdatagram" integer,
                "t38_udptl_nat" varchar(3),
                "t38_udptl_ipv6" varchar(3),
                "tone_zone" varchar(40),
                "language" varchar(40),
                "one_touch_recording" varchar(3),
                "record_on_feature" varchar(40),
                "record_off_feature" varchar(40),
                "rtp_engine" varchar(40),
                "allow_transfer" varchar(3),
                "allow_subscribe" varchar(3),
                "sdp_owner" varchar(40),
                "sdp_session" varchar(40),
                "tos_audio" varchar(10),
                "tos_video" varchar(10),
                "sub_min_expiry" integer,
                "from_domain" varchar(40),
                "from_user" varchar(40),
                "mwi_from_user" varchar(40),
                "dtls_verify" varchar(40),
                "dtls_rekey" varchar(40),
                "dtls_cert_file" varchar(200),
                "dtls_private_key" varchar(200),
                "dtls_cipher" varchar(40),
                "dtls_ca_file" varchar(200),
                "dtls_ca_path" varchar(200),
                "dtls_setup" varchar(40),
                "srtp_tag_32" varchar(3),
                "media_address" varchar(40),
                "redirect_method" varchar(40),
                "set_var" text,
                "cos_audio" integer,
                "cos_video" integer,
                "message_context" varchar(40),
                "force_avp" varchar(3),
                "media_use_received_transport" varchar(3),
                "accountcode" varchar(40),
                "user_eq_phone" varchar(3),
                "moh_passthrough" varchar(3),
                "media_encryption_optimistic" varchar(3),
                "rpid_immediate" varchar(3),
                "g726_non_standard" varchar(3),
                "rtp_keepalive" integer,
                "rtp_timeout" integer,
                "rtp_timeout_hold" integer,
                "bind_rtp_to_media_address" varchar(3),
                "voicemail_extension" varchar(40),
                "mwi_subscribe_replaces_unsolicited" integer,
                "deny" varchar(95),
                "permit" varchar(95),
                "acl" varchar(40),
                "contact_deny" varchar(95),
                "contact_permit" varchar(95),
                "contact_acl" varchar(40),
                "subscribe_context" varchar(40),
                "fax_detect_timeout" integer,
                "contact_user" varchar(40),
                "preferred_codec_only" varchar(3),
                "asymmetric_rtp_codec" varchar(3),
                "rtcp_mux" varchar(3),
                "allow_overlap" varchar(3),
                "refer_blind_progress" varchar(3),
                "notify_early_inuse_ringing" varchar(3),
                "max_audio_streams" integer,
                "max_video_streams" integer,
                "webrtc" varchar(3),
                "dtls_fingerprint" varchar(40),
                "incoming_mwi_mailbox" varchar(40),
                "bundle" varchar(3),
                "dtls_auto_generate_cert" varchar(3),
                "follow_early_media_fork" varchar(3),
                "accept_multiple_sdp_answers" varchar(3),
                "suppress_q850_reason_headers" varchar(3),
                "trust_connected_line" varchar(3),
                "send_connected_line" varchar(3),
                "ignore_183_without_sdp" varchar(3),
                "codec_prefs_incoming_offer" varchar(40),
                "codec_prefs_outgoing_offer" varchar(40),
                "codec_prefs_incoming_answer" varchar(40),
                "codec_prefs_outgoing_answer" varchar(40),
                "stir_shaken" varchar(3),
                "send_history_info" varchar(3),
                "allow_unauthenticated_options" varchar(3),
                "t38_bind_udptl_to_media_address" varchar(3),
                "geoloc_incoming_call_profile" varchar(40),
                "geoloc_outgoing_call_profile" varchar(40),
                "sdes_bypass_rpid" varchar(3),
                "sdes_rpid_key" varchar(40),
                "pause_on_precondition" varchar(3),
                PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "ps_endpoints_id" ON "ps_endpoints" ("id")`);

        // ps_auths
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ps_auths" (
                "id" varchar(40) NOT NULL,
                "auth_type" varchar(40),
                "nonce_lifetime" integer,
                "md5_cred" varchar(40),
                "password" varchar(80),
                "realm" varchar(40),
                "username" varchar(40),
                "refresh_token" varchar(255),
                "oauth_clientid" varchar(255),
                "oauth_secret" varchar(255),
                PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "ps_auths_id" ON "ps_auths" ("id")`);

        // ps_aors
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ps_aors" (
                "id" varchar(40) NOT NULL,
                "contact" varchar(255),
                "default_expiration" integer,
                "mailboxes" varchar(80),
                "max_contacts" integer,
                "minimum_expiration" integer,
                "remove_existing" varchar(3),
                "qualify_frequency" integer,
                "authenticate_qualify" varchar(3),
                "maximum_expiration" integer,
                "outbound_proxy" varchar(40),
                "support_path" varchar(3),
                "qualify_timeout" float,
                "voicemail_extension" varchar(40),
                PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "ps_aors_id" ON "ps_aors" ("id")`);

        // ps_contacts (Dynamic - for registrations)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ps_contacts" (
                "id" varchar(255) NOT NULL,
                "uri" varchar(255),
                "expiration_time" varchar(40),
                "qualify_frequency" integer,
                "outbound_proxy" varchar(40),
                "path" text,
                "user_agent" varchar(255),
                "qualify_timeout" float,
                "reg_server" varchar(255),
                "prune_on_boot" varchar(3),
                "endpoint" varchar(40),
                "via_addr" varchar(40),
                "via_port" integer,
                "call_id" varchar(255),
                PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "ps_contacts_id" ON "ps_contacts" ("id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "ps_contacts_qualifyfreq_exp" ON "ps_contacts" ("qualify_frequency", "expiration_time")`);

        // ps_domain_aliases
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ps_domain_aliases" (
                "id" varchar(40) NOT NULL,
                "domain" varchar(40),
                PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "ps_domain_aliases_id" ON "ps_domain_aliases" ("id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "ps_domain_aliases"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ps_contacts"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ps_aors"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ps_auths"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ps_endpoints"`);
    }
}

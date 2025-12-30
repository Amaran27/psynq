-- PJSIP Realtime Tables for Asterisk
-- These tables are required for dynamic SIP endpoint provisioning
-- Reference: https://docs.asterisk.org/Configuration/Channel-Drivers/SIP/Configuring-res_pjsip/

-- PJSIP AoRs (Address of Record)
CREATE TABLE IF NOT EXISTS ps_aors (
    id varchar(40) PRIMARY KEY,
    contact varchar(255),
    default_expiration integer DEFAULT 3600,
    mailboxes varchar(255),
    max_contacts integer DEFAULT 0,
    minimum_expiration integer DEFAULT 60,
    remove_existing boolean DEFAULT false,
    qualify_frequency integer DEFAULT 0,
    qualify_timeout numeric(5,2) DEFAULT 3.0,
    authenticate_qualify boolean DEFAULT false,
    maximum_expiration integer DEFAULT 7200,
    outbound_proxy varchar(255),
    path varchar(255),
    support_path boolean DEFAULT false,
    remove_unavailable boolean DEFAULT false,
    qualify_options varchar(255)
);

-- PJSIP Authentication Credentials
CREATE TABLE IF NOT EXISTS ps_auths (
    id varchar(40) PRIMARY KEY,
    auth_type varchar(20) DEFAULT 'userpass',
    nonce_lifetime integer DEFAULT 32,
    md5_cred varchar(255),
    password varchar(255),
    realm varchar(255),
    username varchar(255) NOT NULL,
    userpwd_md5_cred varchar(255),
    password_digest varchar(255)
);

-- PJSIP Contacts (Registered endpoints)
CREATE TABLE IF NOT EXISTS ps_contacts (
    id varchar(255) PRIMARY KEY,
    uri varchar(255),
    expire_timestamp integer,
    qualify_frequency integer DEFAULT 0,
    qualify_timeout numeric(5,2) DEFAULT 3.0,
    path varchar(255),
    user_agent varchar(255),
    reg_server varchar(255)
);

-- PJSIP Endpoints (SIP phones/clients)
CREATE TABLE IF NOT EXISTS ps_endpoints (
    id varchar(40) PRIMARY KEY,
    transport varchar(40),
    aors varchar(200),
    auths varchar(200),
    outbound_auth varchar(40),
    context varchar(40),
    disallow varchar(200) DEFAULT 'all',
    allow varchar(200) DEFAULT 'ulaw,alaw',
    direct_media boolean DEFAULT true,
    rtp_symmetric boolean DEFAULT false,
    force_rport boolean DEFAULT false,
    rewrite_contact boolean DEFAULT false,
    trust_id_inbound boolean DEFAULT false,
    send_rpid varchar(11) DEFAULT 'no',
    mailboxes varchar(200),
    webrtc boolean DEFAULT false,
    use_avpf boolean DEFAULT false,
    dtls_verify varchar(10) DEFAULT 'yes',
    dtls_cert_file varchar(255),
    dtls_private_key varchar(255),
    dtls_setup varchar(8) DEFAULT 'actpass',
    dtls_fingerprint varchar(10) DEFAULT 'sha-256',
    media_encryption varchar(9) DEFAULT 'no',
    timers boolean DEFAULT true,
    timers_min_se integer DEFAULT 90,
    timers_sess_expires integer DEFAULT 1800,
    allow_subscribe boolean DEFAULT false,
    allow_overlapping boolean DEFAULT true,
    allow_transfer boolean DEFAULT true
);

-- PJSIP Domain Aliases
CREATE TABLE IF NOT EXISTS ps_domain_aliases (
    id varchar(40) PRIMARY KEY,
    domain varchar(255) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ps_aors_id ON ps_aors(id);
CREATE INDEX IF NOT EXISTS idx_ps_auths_id ON ps_auths(id);
CREATE INDEX IF NOT EXISTS idx_ps_auths_username ON ps_auths(username);
CREATE INDEX IF NOT EXISTS idx_ps_contacts_id ON ps_contacts(id);
CREATE INDEX IF NOT EXISTS idx_ps_endpoints_id ON ps_endpoints(id);
CREATE INDEX IF NOT EXISTS idx_ps_endpoints_context ON ps_endpoints(context);
CREATE INDEX IF NOT EXISTS idx_ps_domain_aliases_domain ON ps_domain_aliases(domain);

-- Grant permissions to the database user
GRANT ALL PRIVILEGES ON TABLE ps_aors TO psynq_user;
GRANT ALL PRIVILEGES ON TABLE ps_auths TO psynq_user;
GRANT ALL PRIVILEGES ON TABLE ps_contacts TO psynq_user;
GRANT ALL PRIVILEGES ON TABLE ps_endpoints TO psynq_user;
GRANT ALL PRIVILEGES ON TABLE ps_domain_aliases TO psynq_user;

GRANT ALL PRIVILEGES ON SEQUENCE ps_aors_id_seq TO psynq_user;
GRANT ALL PRIVILEGES ON SEQUENCE ps_auths_id_seq TO psynq_user;
GRANT ALL PRIVILEGES ON SEQUENCE ps_contacts_id_seq TO psynq_user;
GRANT ALL PRIVILEGES ON SEQUENCE ps_endpoints_id_seq TO psynq_user;
GRANT ALL PRIVILEGES ON SEQUENCE ps_domain_aliases_id_seq TO psynq_user;

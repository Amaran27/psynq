-- ============================================================================
-- Psynq CDR (Call Detail Record) Table Setup
-- ============================================================================
-- This script creates the CDR table for Asterisk call logging via ODBC
-- Based on Asterisk CDR ODBC schema and best practices
-- Reference: https://medium.com/@theaakashpradhan/dockerizing-asterisk-with-odbc-configurations
-- ============================================================================

-- Create CDR table if it doesn't exist
CREATE TABLE IF NOT EXISTS cdr (
    acctid BIGSERIAL PRIMARY KEY,
    calldate TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    clid VARCHAR(80) NOT NULL DEFAULT '',
    src VARCHAR(80) NOT NULL DEFAULT '',
    dst VARCHAR(80) NOT NULL DEFAULT '',
    dcontext VARCHAR(80) NOT NULL DEFAULT '',
    channel VARCHAR(80) NOT NULL DEFAULT '',
    dstchannel VARCHAR(80) NOT NULL DEFAULT '',
    lastapp VARCHAR(80) NOT NULL DEFAULT '',
    lastdata VARCHAR(80) NOT NULL DEFAULT '',
    duration BIGINT NOT NULL DEFAULT 0,
    billsec BIGINT NOT NULL DEFAULT 0,
    disposition VARCHAR(45) NOT NULL DEFAULT '',
    amaflags BIGINT NOT NULL DEFAULT 0,
    accountcode VARCHAR(20) NOT NULL DEFAULT '',
    uniqueid VARCHAR(32) NOT NULL DEFAULT '',
    userfield VARCHAR(255) NOT NULL DEFAULT '',
    peeraccount VARCHAR(20) NOT NULL DEFAULT '',
    linkedid VARCHAR(32) NOT NULL DEFAULT '',
    sequence BIGINT NOT NULL DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cdr_calldate ON cdr(calldate DESC);
CREATE INDEX IF NOT EXISTS idx_cdr_uniqueid ON cdr(uniqueid);
CREATE INDEX IF NOT EXISTS idx_cdr_src ON cdr(src);
CREATE INDEX IF NOT EXISTS idx_cdr_dst ON cdr(dst);
CREATE INDEX IF NOT EXISTS idx_cdr_disposition ON cdr(disposition);

-- Comment on table for documentation
COMMENT ON TABLE cdr IS 'Asterisk Call Detail Records (CDR) logged via ODBC';

-- ============================================================================
-- Database Permissions for ODBC
-- ============================================================================
-- Based on best practices: GRANT SELECT, INSERT, UPDATE, DELETE
-- Reference: Medium.com Asterisk ODBC integration guide
-- ============================================================================

-- Grant permissions on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO psynq_user;

-- Grant permissions on all existing sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO psynq_user;

-- Set default privileges for future objects (CRITICAL for migrations)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO psynq_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO psynq_user;

-- Explicitly grant CDR permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON cdr TO psynq_user;
GRANT USAGE ON SEQUENCE cdr_acctid_seq TO psynq_user;

-- ============================================================================
-- Verification
-- ============================================================================
-- Run this to verify setup:
-- docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -c "\d cdr"
-- docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -c "SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'cdr';"
-- ============================================================================

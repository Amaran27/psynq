-- ============================================================================
-- Psynq CDR (Call Detail Record) Table Setup
-- ============================================================================
-- This script creates the CDR table for Asterisk call logging
-- Based on Asterisk CDR ODBC schema
-- ============================================================================

-- Create CDR table if it doesn't exist
CREATE TABLE IF NOT EXISTS cdr (
    acctid BIGSERIAL PRIMARY KEY,
    calldate TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
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

-- Create index on calldate for fast querying
CREATE INDEX IF NOT EXISTS idx_cdr_calldate ON cdr(calldate);

-- Create index on uniqueid for quick lookups
CREATE INDEX IF NOT EXISTS idx_cdr_uniqueid ON cdr(uniqueid);

-- Create index on src for call origin filtering
CREATE INDEX IF NOT EXISTS idx_cdr_src ON cdr(src);

-- Create index on dst for call destination filtering
CREATE INDEX IF NOT EXISTS idx_cdr_dst ON cdr(dst);

-- ============================================================================
-- Database Permissions for ODBC
-- ============================================================================
-- Grant necessary permissions for Asterisk ODBC connection
-- Based on Medium.com best practices for Asterisk ODBC integration
-- ============================================================================

-- Grant SELECT, INSERT, UPDATE, DELETE on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO psynq_user;

-- Grant USAGE on all existing sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO psynq_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO psynq_user;

-- Set default privileges for future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO psynq_user;

-- Grant SELECT on cdr table specifically (ensure CDR logging works)
GRANT SELECT, INSERT, UPDATE, DELETE ON cdr TO psynq_user;

-- Grant USAGE on cdr acctid sequence
GRANT USAGE ON SEQUENCE cdr_acctid_seq TO psynq_user;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- After execution, verify permissions with:
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'cdr';
-- ============================================================================

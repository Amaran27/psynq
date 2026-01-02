-- PostgreSQL Initialization Script
-- Phase 1 Infrastructure - Database Setup
-- Psitrix Psynq CPaaS Platform

-- ===================================
-- 1. CREATE REPLICATION USER
-- ===================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'replicator') THEN
        CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'change_me_in_production';
        RAISE NOTICE 'Created replication user: replicator';
    END IF;
END
$$;

-- ===================================
-- 2. CREATE APPLICATION USER
-- ===================================
-- Note: psynq_user is created by docker-compose environment variables
-- This script ensures it has the correct permissions if it were a separate user

-- Grant necessary privileges to application user
GRANT CONNECT ON DATABASE psynq TO psynq_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO psynq_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO psynq_user;

-- ===================================
-- 3. CREATE EXTENSIONS
-- ===================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";  -- Query performance monitoring
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Cryptographic functions

-- ===================================
-- 4. CORE TABLES (Managed by TypeORM)
-- ===================================
-- We let TypeORM handle table creation in development via synchronize: true
-- to avoid conflicts between manual SQL and entity definitions.

-- ===================================
-- 5. GRANT PERMISSIONS
-- ===================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO psynq_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO psynq_user;

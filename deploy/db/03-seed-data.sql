-- Seed Data for Psynq Application
-- This file contains initial data required for the application to function

-- Insert System Organization
INSERT INTO organizations (id, name, type, "isActive", "maxAgents", settings)
VALUES (
    'c18d8db4-55e4-4bae-8b18-f23e04c231de',
    'System Organization',
    'system',
    true,
    100,
    '{"telephony.provider": "asterisk", "storage.provider": "minio"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Insert System Admin User
INSERT INTO users (id, email, password, name, role, organizationid)
VALUES (
    '72fa5b0f-d44e-4407-b4bc-acb7973e5dd2',
    'sysadmin@psynq.local',
    '$2b$10$YourHashedPasswordHere',  -- This will be replaced by the setup script
    'System Administrator',
    'SYSTEM_ADMIN',
    'c18d8db4-55e4-4bae-8b18-f23e04c231de'
) ON CONFLICT (id) DO NOTHING;

-- Insert System Settings
INSERT INTO settings (key, value, "isSecret", organizationid)
VALUES
    ('telephony.provider', '"asterisk"', false, 'system-default'),
    ('storage.provider', '"minio"', false, 'system-default'),
    ('twilio.accountSid', '""', true, 'system-default'),
    ('twilio.authToken', '""', true, 'system-default')
ON CONFLICT DO NOTHING;

-- Create default wallet for system admin
INSERT INTO wallets (id, userid, balance, currency)
VALUES (
    uuid_generate_v4(),
    '72fa5b0f-d44e-4407-b4bc-acb7973e5dd2',
    100.00,
    'USD'
) ON CONFLICT DO NOTHING;

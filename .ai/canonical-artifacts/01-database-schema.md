# Canonical Database Schema - Psynq CPaaS Platform

**Version**: 1.0.0
**Last Updated**: December 31, 2025
**Status**: SINGLE SOURCE OF TRUTH
**Purpose**: Complete, unambiguous database schema for all 70+ tables

---

## Domain 1: Organization & Users (8 tables)

### Table: organizations

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PK, NOT NULL | gen_random_uuid() | Unique organization identifier |
| slug | VARCHAR(50) | UNIQUE, NOT NULL | | URL-friendly identifier (regex: `^[a-z0-9-]+$`) |
| name | VARCHAR(255) | NOT NULL | | Display name |
| legal_name | VARCHAR(255) | | | Legal entity name |
| plan_tier | plan_tier_enum | NOT NULL | 'free' | Subscription tier |
| status | org_status_enum | NOT NULL | 'active' | Organization status |
| max_agents | INT | NOT NULL, CHECK > 0 | 5 | Maximum allowed agents |
| max_concurrent_calls | INT | NOT NULL, CHECK > 0 | 10 | Concurrent call limit |
| default_caller_id | VARCHAR(20) | | | Default outbound caller ID |
| time_zone | VARCHAR(50) | NOT NULL | 'UTC' | Organization timezone |
| language | VARCHAR(10) | NOT NULL | 'en-US' | Default language |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | Last update timestamp |
| deleted_at | TIMESTAMPTZ | | | Soft delete timestamp |

**Indexes**:
- `idx_organizations_slug` ON (slug) UNIQUE
- `idx_organizations_status` ON (status)
- `idx_organizations_plan_tier` ON (plan_tier)
- `idx_organizations_created_at` ON (created_at DESC)

**Foreign Keys**: None (root table)

**Enums**:
```sql
CREATE TYPE plan_tier_enum AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE org_status_enum AS ENUM ('active', 'suspended', 'deleted');
```

**Constraints**:
- `check_max_agents_positive`: CHECK (max_agents > 0)
- `check_max_concurrent_calls_positive`: CHECK (max_concurrent_calls > 0)
- `check_slug_format`: CHECK (slug ~ '^[a-z0-9-]+$')

**Triggers**:
- `update_organizations_timestamp` BEFORE UPDATE SET updated_at = NOW()

---

### Table: organization_settings

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| organization_id | UUID | PK, FK, NOT NULL | | References organizations.id |
| recording_enabled | BOOLEAN | NOT NULL | true | Auto-record all calls |
| recording_format | recording_format_enum | NOT NULL | 'wav' | Recording audio format |
| recording_retention_days | INT | NOT NULL, CHECK > 0 | 30 | Days to keep recordings |
| queue_timeout_seconds | INT | NOT NULL, CHECK > 0 | 120 | Max time in queue |
| wrap_up_timeout_seconds | INT | NOT NULL, CHECK >= 0 | 600 | Agent wrap-up time |
| music_on_hold_class | VARCHAR(50) | NOT NULL | 'default' | MoH category |
| allow_international_calls | BOOLEAN | NOT NULL | false | Permit international dialing |
| default_dial_timeout | INT | NOT NULL, CHECK > 0 | 30 | Dial timeout (seconds) |
| default_ring_timeout | INT | NOT NULL, CHECK > 0 | 60 | Ring timeout (seconds) |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | Last update timestamp |

**Indexes**:
- `idx_org_settings_org_id` ON (organization_id) UNIQUE

**Foreign Keys**:
- `organization_id` → `organizations.id` ON DELETE CASCADE

**Enums**:
```sql
CREATE TYPE recording_format_enum AS ENUM ('wav', 'mp3', 'ogg');
```

**Constraints**:
- `check_recording_retention_positive`: CHECK (recording_retention_days > 0)
- `check_queue_timeout_positive`: CHECK (queue_timeout_seconds > 0)
- `check_wrap_up_timeout_non_negative`: CHECK (wrap_up_timeout_seconds >= 0)

---

### Table: organization_wallets

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| organization_id | UUID | PK, FK, NOT NULL | | References organizations.id |
| balance_decimals | BIGINT | NOT NULL, CHECK >= 0 | 0 | Balance in cents (100 = $1.00) |
| currency | VARCHAR(3) | NOT NULL | 'USD' | ISO 4217 currency code |
| credit_limit_decimals | BIGINT | NOT NULL | 0 | Maximum negative balance |
| low_balance_threshold_decimals | BIGINT | NOT NULL | 1000 | Alert threshold ($10.00) |
| auto_recharge_enabled | BOOLEAN | NOT NULL | false | Auto-topup when low |
| auto_recharge_amount_decimals | BIGINT | CHECK >= 0 | 0 | Auto-recharge amount |
| auto_recharge_threshold_decimals | BIGINT | CHECK >= 0 | 0 | Trigger balance |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | Last update timestamp |

**Indexes**:
- `idx_wallets_org_id` ON (organization_id) UNIQUE
- `idx_wallets_balance` ON (balance_decimals) - For low balance queries

**Foreign Keys**:
- `organization_id` → `organizations.id` ON DELETE CASCADE

**Constraints**:
- `check_balance_non_negative`: CHECK (balance_decimals >= -credit_limit_decimals)
- `check_currency_code`: CHECK (currency ~ '^[A-Z]{3}$')

---

### Table: users

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PK, NOT NULL | gen_random_uuid() | Unique user identifier |
| organization_id | UUID | FK, NOT NULL | | References organizations.id |
| username | VARCHAR(50) | UNIQUE, NOT NULL | | Login username |
| email | VARCHAR(255) | UNIQUE, NOT NULL | | Email address |
| password_hash | VARCHAR(255) | NOT NULL | | bcrypt hash |
| role | user_role_enum | NOT NULL | 'agent' | User role |
| status | user_status_enum | NOT NULL | 'pending' | Account status |
| sip_endpoint | VARCHAR(100) | FK, UNIQUE | | PJSIP endpoint name |
| full_name | VARCHAR(255) | | | Display name |
| phone_number | VARCHAR(20) | | | Contact number |
| department | VARCHAR(100) | | | Department name |
| agent_skill_level | INT | CHECK 1-5 | 3 | 1=Novice, 5=Expert |
| last_login_at | TIMESTAMPTZ | | | Last successful login |
| failed_login_attempts | INT | NOT NULL, CHECK >= 0 | 0 | Failed login count |
| locked_until | TIMESTAMPTZ | | | Account lock expiry |
| password_changed_at | TIMESTAMPTZ | NOT NULL | NOW() | Password last changed |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | Last update timestamp |
| deleted_at | TIMESTAMPTZ | | | Soft delete timestamp |

**Indexes**:
- `idx_users_org_id` ON (organization_id)
- `idx_users_username` ON (username) UNIQUE
- `idx_users_email` ON (email) UNIQUE
- `idx_users_sip_endpoint` ON (sip_endpoint) UNIQUE
- `idx_users_status` ON (status)
- `idx_users_role` ON (role)

**Foreign Keys**:
- `organization_id` → `organizations.id` ON DELETE CASCADE
- `sip_endpoint` → `ps_endpoints.id` ON DELETE SET NULL

**Enums**:
```sql
CREATE TYPE user_role_enum AS ENUM ('superadmin', 'admin', 'supervisor', 'agent');
CREATE TYPE user_status_enum AS ENUM ('pending', 'active', 'suspended', 'locked', 'deleted');
```

**Constraints**:
- `check_username_format`: CHECK (username ~ '^[a-zA-Z0-9_.-]{3,50}$')
- `check_email_format`: CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
- `check_skill_level_range`: CHECK (agent_skill_level BETWEEN 1 AND 5)
- `check_failed_login_non_negative`: CHECK (failed_login_attempts >= 0)

**Triggers**:
- `update_users_timestamp` BEFORE UPDATE SET updated_at = NOW()

---

### Table: user_sessions

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | BIGINT | PK, NOT NULL | GENERATED BY DEFAULT AS IDENTITY | Session ID |
| user_id | UUID | FK, NOT NULL | | References users.id |
| refresh_token | UUID | UNIQUE, NOT NULL | gen_random_uuid() | Refresh token UUID |
| access_token_hash | VARCHAR(255) | NOT NULL | | JWT token hash |
| ip_address | INET | NOT NULL | | Client IP address |
| user_agent | TEXT | | | Browser/client info |
| device_fingerprint | VARCHAR(255) | | | Device identifier |
| expires_at | TIMESTAMPTZ | NOT NULL | | Token expiry |
| last_used_at | TIMESTAMPTZ | NOT NULL | NOW() | Last activity |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |

**Indexes**:
- `idx_sessions_user_id` ON (user_id)
- `idx_sessions_refresh_token` ON (refresh_token) UNIQUE
- `idx_sessions_expires_at` ON (expires_at) - For cleanup jobs

**Foreign Keys**:
- `user_id` → `users.id` ON DELETE CASCADE

**Constraints**:
- `check_expires_future`: CHECK (expires_at > created_at)

---

### Table: user_permissions

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | BIGINT | PK, NOT NULL | GENERATED BY DEFAULT AS IDENTITY | Permission ID |
| user_id | UUID | FK, NOT NULL | | References users.id |
| permission | VARCHAR(100) | NOT NULL | | Permission string (e.g., "call:create") |
| resource_type | VARCHAR(50) | | | Resource type (optional) |
| resource_id | UUID | | | Specific resource ID (optional) |
| granted_by | UUID | FK | | References users.id (grantor) |
| granted_at | TIMESTAMPTZ | NOT NULL | NOW() | Grant timestamp |
| expires_at | TIMESTAMPTZ | | | Permission expiry (optional) |

**Indexes**:
- `idx_permissions_user_id` ON (user_id)
- `idx_permissions_permission` ON (permission)
- `idx_permissions_resource` ON (resource_type, resource_id)

**Foreign Keys**:
- `user_id` → `users.id` ON DELETE CASCADE
- `granted_by` → `users.id` ON DELETE SET NULL

**Constraints**:
- `check_permission_format`: CHECK (permission ~ '^[a-z_]+:[a-z_]+$')
- `check_resource_consistency`: CHECK ((resource_type IS NULL) = (resource_id IS NULL))

**Permission Format**: `{resource}:{action}`
Examples: `call:create`, `recording:view_own`, `billing:topup`

---

### Table: user_preferences

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| user_id | UUID | PK, FK, NOT NULL | | References users.id |
| language | VARCHAR(10) | NOT NULL | 'en-US' | Preferred language |
| time_zone | VARCHAR(50) | NOT NULL | 'UTC' | User timezone |
| theme | theme_enum | NOT NULL | 'system' | UI theme |
| notification_email_enabled | BOOLEAN | NOT NULL | true | Email notifications |
| notification_browser_enabled | BOOLEAN | NOT NULL | true | Browser notifications |
| auto_answer_calls | BOOLEAN | NOT NULL | false | Auto-answer inbound calls |
| default_queue_id | UUID | FK | | Default queue assignment |
| wrap_up_time_default | INT | CHECK >= 0 | 30 | Default wrap-up duration |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | Last update timestamp |

**Indexes**: Primary key only

**Foreign Keys**:
- `user_id` → `users.id` ON DELETE CASCADE
- `default_queue_id` → `queues.id` ON DELETE SET NULL

**Enums**:
```sql
CREATE TYPE theme_enum AS ENUM ('light', 'dark', 'system');
```

**Triggers**:
- `update_user_preferences_timestamp` BEFORE UPDATE SET updated_at = NOW()

---

### Table: user_audit_log

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | BIGINT | PK, NOT NULL | GENERATED BY DEFAULT AS IDENTITY | Audit ID |
| user_id | UUID | FK, NOT NULL | | References users.id |
| action | VARCHAR(50) | NOT NULL | | Action performed |
| resource_type | VARCHAR(50) | | | Resource affected |
| resource_id | UUID | | | Resource identifier |
| old_values | JSONB | | | Previous state |
| new_values | JSONB | | | New state |
| ip_address | INET | | | Client IP |
| user_agent | TEXT | | | Browser info |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Timestamp |

**Indexes**:
- `idx_audit_user_id` ON (user_id)
- `idx_audit_action` ON (action)
- `idx_audit_resource` ON (resource_type, resource_id)
- `idx_audit_created_at` ON (created_at DESC) - For queries

**Foreign Keys**:
- `user_id` → `users.id` ON DELETE CASCADE

**Action Values**: `login`, `logout`, `create`, `update`, `delete`, `assign`, `revoke`

---

## Domain 2: Telephony - PJSIP (4 tables)

**Note**: These are Asterisk PJSIP realtime tables. Structure is defined by Asterisk but documented here for completeness.

### Table: ps_endpoints (Asterisk Realtime)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK, NOT NULL | Endpoint ID |
| sorcery_id | VARCHAR(40) | UNIQUE, NOT NULL | Asterisk sorcery ID |
| transport | VARCHAR(40) | NOT NULL | Transport type (udp,tcp,tls,ws,wss) |
| aors | VARCHAR(40) | NOT NULL | References ps_aors.id |
| auths | VARCHAR(40) | | References ps_auths.id |
| context | VARCHAR(40) | NOT NULL | Dialplan context |
| disallow | VARCHAR(200) | NOT NULL | 'all' | Disallowed codecs |
| allow | VARCHAR(200) | NOT NULL | 'ulaw,alaw' | Allowed codecs |
| direct_media | VARCHAR(10) | NOT NULL | 'no' | Direct media flag |
| send_rpid | VARCHAR(10) | NOT NULL | 'yes' | Send Remote-Party-ID |
| send_pai | VARCHAR(10) | NOT NULL | 'yes' | Send P-Asserted-Identity |
| trust_id_inbound | VARCHAR(10) | NOT NULL | 'yes' | Trust inbound ID |
| trust_id_outbound | VARCHAR(10) | NOT NULL | 'yes' | Trust outbound ID |
| 100rel | VARCHAR(10) | NOT NULL | 'no' | REL100 support |
| timers | VARCHAR(10) | NOT NULL | 'yes' | Session timers |
| rtp_timeout | INT | | 60 | RTP timeout (seconds) |
| rtp_timeout_hold | INT | | 300 | RTP timeout on hold |
| deny | VARCHAR(95) | | '0.0.0.0/0.0.0.0' | ACL deny |
| permit | VARCHAR(95) | | '0.0.0.0/0.0.0.0' | ACL permit |

**Indexes**:
- `idx_ps_endpoints_sorcery_id` ON (sorcery_id) UNIQUE
- `idx_ps_endpoints_id` ON (id) UNIQUE

**Key Point**: Asterisk uses `sorcery_id` to reference this endpoint. Our `users.sip_endpoint` stores this value.

---

### Table: ps_aors (Asterisk Realtime)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK, NOT NULL | AOR ID |
| sorcery_id | VARCHAR(40) | UNIQUE, NOT NULL | Asterisk sorcery ID |
| contact | VARCHAR(255) | | SIP contact URI |
| max_contacts | INT | NOT NULL | 1 | Max concurrent contacts |
| qualify_frequency | INT | | 60 | Qualify interval (seconds) |
| qualify_timeout | INT | | 3.0 | Qualify timeout (seconds) |
| remove_existing | VARCHAR(10) | NOT NULL | 'no' | Remove stale contacts |

**Indexes**:
- `idx_ps_aors_sorcery_id` ON (sorcery_id) UNIQUE

---

### Table: ps_auths (Asterisk Realtime)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK, NOT NULL | Auth ID |
| sorcery_id | VARCHAR(40) | UNIQUE, NOT NULL | Asterisk sorcery ID |
| auth_type | VARCHAR(20) | NOT NULL | 'userpass' | Auth type |
| password | VARCHAR(80) | | SIP password (plaintext for Asterisk) |
| username | VARCHAR(80) | NOT NULL | SIP auth username |

**Indexes**:
- `idx_ps_auths_sorcery_id` ON (sorcery_id) UNIQUE

**Security Note**: Password stored in plaintext because Asterisk PJSIP requires it. Never expose this table via API.

---

### Table: ps_contacts (Asterisk Realtime - Auto-populated)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK, NOT NULL | Contact ID |
| sorcery_id | VARCHAR(40) | UNIQUE, NOT NULL | Asterisk sorcery ID |
| uri | VARCHAR(255) | NOT NULL | SIP contact URI |
| expiration_time | TIMESTAMPTZ | | Registration expiry |
| qualify_frequency | INT | | 60 | Qualify interval |
| qualify_timeout | INT | | 3.0 | Qualify timeout |
| user_agent | VARCHAR(255) | | Client user agent |
| reg_server | VARCHAR(50) | | Registrar server |

**Indexes**:
- `idx_ps_contacts_sorcery_id` ON (sorcery_id) UNIQUE
- `idx_ps_contacts_uri` ON (uri)

**Note**: This table is auto-populated by Asterisk when SIP clients register. Do not manually insert.

---

## Domain 3: Telephony - Calls (7 tables)

### Table: calls

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PK, NOT NULL | gen_random_uuid() | Unique call ID |
| organization_id | UUID | FK, NOT NULL | | References organizations.id |
| call_unique_id | VARCHAR(32) | UNIQUE, NOT NULL | | Asterisk unique ID |
| parent_call_id | UUID | FK | | References calls.id (for xfer/conf) |
| direction | call_direction_enum | NOT NULL | | Inbound or outbound |
| caller_number | VARCHAR(20) | NOT NULL | | E.164 format |
| callee_number | VARCHAR(20) | NOT NULL | | E.164 format |
| caller_id_name | VARCHAR(50) | | | CNAM |
| status | call_status_enum | NOT NULL | 'dialing' | Current call state |
| queue_id | UUID | FK | | References queues.id |
| agent_id | UUID | FK | | References users.id |
| sip_channel_id | VARCHAR(80) | | | Asterisk channel ID |
| sip_channel_uniqueid | VARCHAR(32) | | | Asterisk channel uniqueid |
| recording_enabled | BOOLEAN | NOT NULL | false | Is recording enabled |
| recording_url | VARCHAR(512) | | | MinIO URL |
| recording_duration_seconds | INT | | | Recording length |
| transcription_enabled | BOOLEAN | NOT NULL | false | Is transcription enabled |
| transcription_url | VARCHAR(512) | | | MinIO URL |
| started_at | TIMESTAMPTZ | | | Call start timestamp |
| answered_at | TIMESTAMPTZ | | | Answer timestamp |
| ended_at | TIMESTAMPTZ | | | End timestamp |
| duration_seconds | INT | CHECK >= 0 | 0 | Total duration |
| billsec_seconds | INT | CHECK >= 0 | 0 | Billable duration |
| disposition | VARCHAR(50) | | | Final disposition (answered, no_answer, busy, failed) |
| hangup_cause | VARCHAR(50) | | | SIP hangup reason |
| hangup_source | hangup_source_enum | | | Who hung up |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | Last update timestamp |

**Indexes**:
- `idx_calls_org_id` ON (organization_id)
- `idx_calls_unique_id` ON (call_unique_id) UNIQUE
- `idx_calls_status` ON (status)
- `idx_calls_agent_id` ON (agent_id)
- `idx_calls_queue_id` ON (queue_id)
- `idx_calls_started_at` ON (started_at DESC)
- `idx_calls_parent_call_id` ON (parent_call_id)

**Foreign Keys**:
- `organization_id` → `organizations.id` ON DELETE CASCADE
- `parent_call_id` → `calls.id` ON DELETE SET NULL
- `queue_id` → `queues.id` ON DELETE SET NULL
- `agent_id` → `users.id` ON DELETE SET NULL

**Enums**:
```sql
CREATE TYPE call_direction_enum AS ENUM ('inbound', 'outbound');
CREATE TYPE call_status_enum AS ENUM ('dialing', 'ringing', 'answered', 'on_hold', 'ended', 'failed');
CREATE TYPE hangup_source_enum AS ENUM ('caller', 'callee', 'system', 'provider');
```

**Constraints**:
- `check_duration_non_negative`: CHECK (duration_seconds >= 0)
- `check_billsec_non_negative`: CHECK (billsec_seconds >= 0)
- `check_answered_after_started`: CHECK (answered_at IS NULL OR answered_at >= started_at)
- `check_ended_after_answered`: CHECK (ended_at IS NULL OR answered_at IS NULL OR ended_at >= answered_at)

**Triggers**:
- `update_calls_timestamp` BEFORE UPDATE SET updated_at = NOW()

---

### Table: call_participants

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | BIGINT | PK, NOT NULL | GENERATED BY DEFAULT AS IDENTITY | Participant ID |
| call_id | UUID | FK, NOT NULL | | References calls.id |
| participant_type | participant_type_enum | NOT NULL | | Agent or customer |
| user_id | UUID | FK | | References users.id (if agent) |
| phone_number | VARCHAR(20) | | | E.164 format (if external) |
| sip_channel_id | VARCHAR(80) | | | Asterisk channel |
| joined_at | TIMESTAMPTZ | NOT NULL | NOW() | When joined |
| left_at | TIMESTAMPTZ | | | When left |
| duration_seconds | INT | CHECK >= 0 | 0 | Participation duration |
| is_muted | BOOLEAN | NOT NULL | false | Is muted |
| is_on_hold | BOOLEAN | NOT NULL | false | Is on hold |

**Indexes**:
- `idx_participants_call_id` ON (call_id)
- `idx_participants_user_id` ON (user_id)

**Foreign Keys**:
- `call_id` → `calls.id` ON DELETE CASCADE
- `user_id` → `users.id` ON DELETE SET NULL

**Enums**:
```sql
CREATE TYPE participant_type_enum AS ENUM ('agent', 'customer', 'supervisor', 'system');
```

---

### Table: call_dtmf

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | BIGINT | PK, NOT NULL | GENERATED BY DEFAULT AS IDENTITY | DTMF ID |
| call_id | UUID | FK, NOT NULL | | References calls.id |
| digit | VARCHAR(1) | NOT NULL, CHECK IN ('0'-'9','*','#') | | DTMF digit |
| duration_ms | INT | CHECK >= 0 | | Duration |
| received_at | TIMESTAMPTZ | NOT NULL | NOW() | Timestamp |

**Indexes**:
- `idx_dtmf_call_id` ON (call_id)
- `idx_dtmf_received_at` ON (received_at DESC)

**Foreign Keys**:
- `call_id` → `calls.id` ON DELETE CASCADE

---

### Table: call_variables

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | BIGINT | PK, NOT NULL | GENERATED BY DEFAULT AS IDENTITY | Variable ID |
| call_id | UUID | FK, NOT NULL | | References calls.id |
| key | VARCHAR(100) | NOT NULL | | Variable name |
| value | TEXT | | | Variable value |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Timestamp |

**Indexes**:
- `idx_call_vars_call_id` ON (call_id)
- `idx_call_vars_key` ON (key)

**Foreign Keys**:
- `call_id` → `calls.id` ON DELETE CASCADE

**Use Case**: Store dynamic call data (IVR selections, campaign IDs, custom fields)

---

### Table: call_recordings

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PK, NOT NULL | gen_random_uuid() | Recording ID |
| call_id | UUID | FK, UNIQUE, NOT NULL | | References calls.id |
| organization_id | UUID | FK, NOT NULL | | References organizations.id |
| file_path | VARCHAR(512) | NOT NULL | | MinIO path (e.g., `/org/{id}/calls/{id}.wav`) |
| file_format | recording_format_enum | NOT NULL | 'wav' | Audio format |
| file_size_bytes | BIGINT | CHECK >= 0 | | File size |
| duration_seconds | INT | CHECK >= 0 | | Recording length |
| is_dual_channel | BOOLEAN | NOT NULL | false | Separate agent/customer audio |
| transcription_status | transcription_status_enum | NOT NULL | 'pending' | Transcription state |
| transcription_url | VARCHAR(512) | | | MinIO transcription path |
| deleted_from_storage | BOOLEAN | NOT NULL | false | File deleted from MinIO |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |

**Indexes**:
- `idx_recordings_call_id` ON (call_id) UNIQUE
- `idx_recordings_org_id` ON (organization_id)
- `idx_recordings_created_at` ON (created_at DESC)

**Foreign Keys**:
- `call_id` → `calls.id` ON DELETE CASCADE
- `organization_id` → `organizations.id` ON DELETE CASCADE

**Enums**:
```sql
CREATE TYPE transcription_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed');
```

**File Path Convention**: `/org/{organization_id}/calls/{call_id}_{timestamp}.{format}`

---

### Table: call_transcriptions

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PK, NOT NULL | gen_random_uuid() | Transcription ID |
| recording_id | UUID | FK, NOT NULL | | References call_recordings.id |
| call_id | UUID | FK, NOT NULL | | References calls.id |
| provider | VARCHAR(50) | NOT NULL | 'deepgram' | STT provider |
| language_code | VARCHAR(10) | NOT NULL | 'en-US' | Detected language |
| confidence_score | DECIMAL(3,2) | CHECK 0-1 | | Overall confidence |
| full_text | TEXT | | | Complete transcription |
| word_timings | JSONB | | | Word-level timestamps |
| speaker_diarization | JSONB | | | Speaker segments |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |

**Indexes**:
- `idx_transcriptions_recording_id` ON (recording_id)
- `idx_transcriptions_call_id` ON (call_id)
- `idx_transcriptions_full_text` ON (full_text) - Full-text search

**Foreign Keys**:
- `recording_id` → `call_recordings.id` ON DELETE CASCADE
- `call_id` → `calls.id` ON DELETE CASCADE

---

### Table: call_tags

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | BIGINT | PK, NOT NULL | GENERATED BY DEFAULT AS IDENTITY | Tag ID |
| call_id | UUID | FK, NOT NULL | | References calls.id |
| tag | VARCHAR(50) | NOT NULL | | Tag text |
| tag_category | VARCHAR(50) | | | Category (e.g., 'quality', 'sentiment') |
| created_by | UUID | FK | | References users.id |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Timestamp |

**Indexes**:
- `idx_call_tags_call_id` ON (call_id)
- `idx_call_tags_tag` ON (tag)

**Foreign Keys**:
- `call_id` → `calls.id` ON DELETE CASCADE
- `created_by` → `users.id` ON DELETE SET NULL

---

## Domain 4: Queues & Routing (5 tables)

### Table: queues

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PK, NOT NULL | gen_random_uuid() | Queue ID |
| organization_id | UUID | FK, NOT NULL | | References organizations.id |
| name | VARCHAR(100) | NOT NULL | | Queue name |
| extension | VARCHAR(20) | NOT NULL | | Dialplan extension |
| strategy | queue_strategy_enum | NOT NULL | 'longest_idle_agent' | Routing strategy |
| max_wait_time_seconds | INT | CHECK >= 0 | 0 | Max queue time (0=unlimited) |
| wrap_up_time_seconds | INT | CHECK >= 0 | 30 | Agent wrap-up time |
| ring_timeout_seconds | INT | CHECK > 0 | 15 | Ring timeout |
| weight | INT | CHECK > 0 | 1 | Queue weight (priority) |
| music_on_hold_class | VARCHAR(50) | NOT NULL | 'default' | MoH category |
| announce_position | BOOLEAN | NOT NULL | true | Announce queue position |
| announce_hold_time | BOOLEAN | NOT NULL | true | Announce wait time |
| service_level_seconds | INT | CHECK >= 0 | 120 | SLA threshold |
| active | BOOLEAN | NOT NULL | true | Queue active status |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | Last update timestamp |

**Indexes**:
- `idx_queues_org_id` ON (organization_id)
- `idx_queues_extension` ON (organization_id, extension) UNIQUE
- `idx_queues_active` ON (active)

**Foreign Keys**:
- `organization_id` → `organizations.id` ON DELETE CASCADE

**Enums**:
```sql
CREATE TYPE queue_strategy_enum AS ENUM ('ring_all', 'longest_idle_agent', 'round_robin', 'least_recent', 'fewest_calls', 'random', 'linear');
```

---

### Table: queue_members

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | BIGINT | PK, NOT NULL | GENERATED BY DEFAULT AS IDENTITY | Member ID |
| queue_id | UUID | FK, NOT NULL | | References queues.id |
| user_id | UUID | FK, NOT NULL | | References users.id |
| penalty | INT | CHECK 0-100 | 0 | Penalty (lower=priority) |
| membership_type | membership_type_enum | NOT NULL | 'static' | Static or dynamic |
| paused | BOOLEAN | NOT NULL | false | Is paused |
| wrap_up_ready_time | TIMESTAMPTZ | | When ready after wrap-up |
| joined_at | TIMESTAMPTZ | NOT NULL | NOW() | Join timestamp |

**Indexes**:
- `idx_queue_members_queue_id` ON (queue_id)
- `idx_queue_members_user_id` ON (user_id)
- `idx_queue_members_membership` ON (queue_id, user_id) UNIQUE

**Foreign Keys**:
- `queue_id` → `queues.id` ON DELETE CASCADE
- `user_id` → `users.id` ON DELETE CASCADE

**Enums**:
```sql
CREATE TYPE membership_type_enum AS ENUM ('static', 'dynamic');
```

---

### Table: queue_stats

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | BIGINT | PK, NOT NULL | GENERATED BY DEFAULT AS IDENTITY | Stat ID |
| queue_id | UUID | FK, NOT NULL | | References queues.id |
| date | DATE | NOT NULL | | Statistic date |
| hour | INT | CHECK 0-23 | | Hourly bucket (NULL = daily) |
| total_calls | INT | CHECK >= 0 | 0 | Calls offered |
| answered_calls | INT | CHECK >= 0 | 0 | Calls answered |
| abandoned_calls | INT | CHECK >= 0 | 0 | Calls abandoned |
| total_wait_time_seconds | BIGINT | CHECK >= 0 | 0 | Cumulative wait time |
| total_talk_time_seconds | BIGINT | CHECK >= 0 | 0 | Cumulative talk time |
| total_wrap_up_time_seconds | BIGINT | CHECK >= 0 | 0 | Cumulative wrap-up |
 | max_wait_time_seconds | INT | CHECK >= 0 | 0 | Longest wait |
 | service_level_percent | DECIMAL(5,2) | CHECK 0-100 | | SLA percentage |

**Indexes**:
- `idx_queue_stats_queue_date` ON (queue_id, date, hour) UNIQUE

**Foreign Keys**:
- `queue_id` → `queues.id` ON DELETE CASCADE

---

### Table: routing_rules

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | BIGINT | PK, NOT NULL | GENERATED BY DEFAULT AS IDENTITY | Rule ID |
| organization_id | UUID | FK, NOT NULL | | References organizations.id |
| name | VARCHAR(100) | NOT NULL | | Rule name |
| priority | INT | CHECK > 0 | 100 | Priority (lower=first) |
| condition_type | condition_type_enum | NOT NULL | | Condition type |
| condition_value | VARCHAR(255) | NOT NULL | | Condition value |
| action_type | action_type_enum | NOT NULL | | Action type |
| action_value | VARCHAR(255) | NOT NULL | | Action value |
| active | BOOLEAN | NOT NULL | true | Rule active |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | Last update |

**Indexes**:
- `idx_routing_rules_org_priority` ON (organization_id, priority)

**Foreign Keys**:
- `organization_id` → `organizations.id` ON DELETE CASCADE

**Enums**:
```sql
CREATE TYPE condition_type_enum AS ENUM ('caller_number', 'callee_number', 'time_of_day', 'day_of_week', 'custom_field');
CREATE TYPE action_type_enum AS ENUM ('queue', 'agent', 'ivr', 'hangup', 'redirect');
```

---

### Table: skills

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | BIGINT | PK, NOT NULL | GENERATED BY DEFAULT AS IDENTITY | Skill ID |
| organization_id | UUID | FK, NOT NULL | | References organizations.id |
| name | VARCHAR(100) | NOT NULL | | Skill name |
| description | TEXT | | | Skill description |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |

**Indexes**:
- `idx_skills_org_name` ON (organization_id, name) UNIQUE

**Foreign Keys**:
- `organization_id` → `organizations.id` ON DELETE CASCADE

---

### Table: user_skills (Junction table)

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | BIGINT | PK, NOT NULL | GENERATED BY DEFAULT AS IDENTITY | ID |
| user_id | UUID | FK, NOT NULL | | References users.id |
| skill_id | BIGINT | FK, NOT NULL | | References skills.id |
| proficiency_level | INT | CHECK 1-5 | 3 | 1=Beginner, 5=Expert |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | Timestamp |

**Indexes**:
- `idx_user_skills_user_skill` ON (user_id, skill_id) UNIQUE

**Foreign Keys**:
- `user_id` → `users.id` ON DELETE CASCADE
- `skill_id` → `skills.id` ON DELETE CASCADE

---

## Migration Order

Execute migrations in this exact order:

```sql
-- 1. Enum types (must be first)
CREATE TYPE plan_tier_enum AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE org_status_enum AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE user_role_enum AS ENUM ('superadmin', 'admin', 'supervisor', 'agent');
CREATE TYPE user_status_enum AS ENUM ('pending', 'active', 'suspended', 'locked', 'deleted');
CREATE TYPE theme_enum AS ENUM ('light', 'dark', 'system');
CREATE TYPE recording_format_enum AS ENUM ('wav', 'mp3', 'ogg');
CREATE TYPE call_direction_enum AS ENUM ('inbound', 'outbound');
CREATE TYPE call_status_enum AS ENUM ('dialing', 'ringing', 'answered', 'on_hold', 'ended', 'failed');
CREATE TYPE hangup_source_enum AS ENUM ('caller', 'callee', 'system', 'provider');
CREATE TYPE participant_type_enum AS ENUM ('agent', 'customer', 'supervisor', 'system');
CREATE TYPE transcription_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE queue_strategy_enum AS ENUM ('ring_all', 'longest_idle_agent', 'round_robin', 'least_recent', 'fewest_calls', 'random', 'linear');
CREATE TYPE membership_type_enum AS ENUM ('static', 'dynamic');
CREATE TYPE condition_type_enum AS ENUM ('caller_number', 'callee_number', 'time_of_day', 'day_of_week', 'custom_field');
CREATE TYPE action_type_enum AS ENUM ('queue', 'agent', 'ivr', 'hangup', 'redirect');

-- 2. Core tables (Domain 1)
CREATE TABLE organizations (...);
CREATE TABLE organization_settings (...);
CREATE TABLE organization_wallets (...);
CREATE TABLE users (...);
CREATE TABLE user_sessions (...);
CREATE TABLE user_permissions (...);
CREATE TABLE user_preferences (...);
CREATE TABLE user_audit_log (...);

-- 3. PJSIP tables (Domain 2)
CREATE TABLE ps_endpoints (...);
CREATE TABLE ps_aors (...);
CREATE TABLE ps_auths (...);
CREATE TABLE ps_contacts (...);

-- 4. Call tables (Domain 3)
CREATE TABLE calls (...);
CREATE TABLE call_participants (...);
CREATE TABLE call_dtmf (...);
CREATE TABLE call_variables (...);
CREATE TABLE call_recordings (...);
CREATE TABLE call_transcriptions (...);
CREATE TABLE call_tags (...);

-- 5. Queue tables (Domain 4)
CREATE TABLE queues (...);
CREATE TABLE queue_members (...);
CREATE TABLE queue_stats (...);
CREATE TABLE routing_rules (...);
CREATE TABLE skills (...);
CREATE TABLE user_skills (...);

-- 6. Triggers (after all tables)
CREATE TRIGGER update_organizations_timestamp BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
-- (Repeat for all tables with updated_at)
```

---

## Validation Rules

### Column Naming Conventions
- **UUID columns**: `{entity}_id` (e.g., `user_id`, `call_id`)
- **Timestamps**: `{action}_at` (e.g., `created_at`, `answered_at`)
- **Booleans**: `is_{property}` or `{property}_enabled` or `has_{property}`
- **Enums**: `{property}_enum` type (e.g., `call_status_enum`)
- **Foreign keys**: Always `{referenced_table}_id`

### Data Integrity Checks
- All `VARCHAR` columns have explicit length
- All `INT` columns have CHECK constraints for range
- All timestamps use `TIMESTAMPTZ` (not `TIMESTAMP`)
- All enums have explicit value lists
- All foreign keys have explicit CASCADE/SET NULL rules
- All tables have `created_at` timestamp
- All mutable tables have `updated_at` timestamp with trigger

### Index Strategy
- **Foreign keys**: Always indexed
- **UNIQUE constraints**: Automatically indexed
- **Search columns**: Add indexes for frequently queried columns
- **Date ranges**: Use DESC order for timestamp indexes
- **Composite indexes**: Follow column order in WHERE clauses

---

## Continuing to Domains 5-12...

**Note**: This document shows the first 4 domains (29 tables). The complete canonical schema includes 70+ tables across 12 domains:

**Remaining Domains** (to be documented in full OpenProject work package):
- Domain 5: Phone Numbers (6 tables)
- Domain 6: CDR & Billing (6 tables)
- Domain 7: SMS & Messaging (8 tables)
- Domain 8: CRM Integration (7 tables)
- Domain 9: Campaigns (5 tables)
- Domain 10: Workforce Management (6 tables)
- Domain 11: QA & Analytics (5 tables)
- Domain 12: System & Audit (4 tables)

**See OpenProject Work Package**: #Canonical Database Schema (complete 70+ table specification)

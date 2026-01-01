#!/usr/bin/env python3
"""
Part 2: Infrastructure & Platform Epics and detailed Tasks
"""
import sys
sys.path.insert(0, 'd:/Project/psitrix/psynq/scripts')
from generate_detailed_workitems import create_item, write_items, get_id

def generate_infrastructure():
    """Generate Infrastructure & Platform detailed work items"""
    print("\nGenerating Infrastructure & Platform...")
    items = []
    phase = 'Phase: Infrastructure & Platform'
    
    # Epic: Docker Infrastructure
    epic1 = 'Epic: Docker Infrastructure'
    items.append(create_item(epic1, 'Epic', phase, 'High',
        '''Docker Compose orchestration for all services.
        
Services:
- postgres:14
- redis:7
- minio
- nginx
- asterisk (custom)
- backend (NestJS)
- frontend (Next.js)

Files:
- deploy/docker-compose.yml
- deploy/docker-compose.dev.yml
- deploy/docker-compose.prod.yml
- deploy/.env.example''', 0, 14, labels='Infrastructure'))

    # Task: Create docker-compose.yml
    items.append(create_item(
        'Task: Create production docker-compose.yml',
        'Task', epic1, 'High',
        '''File: deploy/docker-compose.yml

Services Definition:
```yaml
version: "3.8"
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: psynq
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    volumes:
      - minio_data:/data

  nginx:
    image: nginx:alpine
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
      - frontend

  asterisk:
    build: ./asterisk
    volumes:
      - ./asterisk/config:/etc/asterisk
      - asterisk_recordings:/var/spool/asterisk/recording
    ports:
      - "5060:5060/udp"
      - "5060:5060/tcp"
      - "8088:8088"
    depends_on:
      - postgres
      - redis

  backend:
    build:
      context: ../packages/backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@postgres:5432/psynq
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  frontend:
    build:
      context: ../packages/web
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: ${API_URL}
      NEXT_PUBLIC_WS_URL: ${WS_URL}
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
  minio_data:
  asterisk_recordings:
```

Acceptance Criteria:
- All services start with `docker-compose up -d`
- Health checks pass for all services
- Services restart on failure
- Volumes persist data across restarts
- NO HARDCODED PASSWORDS - all from .env''',
        0, 3, 8, 'Infrastructure,Docker'))

    # Task: Create .env.example
    items.append(create_item(
        'Task: Create .env.example with all config keys',
        'Task', epic1, 'High',
        '''File: deploy/.env.example

```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=psynq
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD
DB_NAME=psynq

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USER=psynqadmin
MINIO_PASSWORD=CHANGE_ME_STRONG_PASSWORD
MINIO_BUCKET_RECORDINGS=recordings
MINIO_BUCKET_UPLOADS=uploads

# Asterisk
ASTERISK_ARI_URL=http://asterisk:8088
ASTERISK_ARI_USER=psynq
ASTERISK_ARI_PASSWORD=CHANGE_ME_STRONG_PASSWORD
ASTERISK_AMI_HOST=asterisk
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USER=psynq
ASTERISK_AMI_SECRET=CHANGE_ME_STRONG_PASSWORD

# Backend
NODE_ENV=production
PORT=3000
JWT_SECRET=CHANGE_ME_64_CHAR_RANDOM_STRING
JWT_EXPIRY=24h
CORS_ORIGINS=https://yourdomain.com

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Telephony
SIP_DOMAIN=sip.yourdomain.com
SIP_PORT=5060
RTP_PORT_START=10000
RTP_PORT_END=20000
```

Acceptance Criteria:
- Every config key documented with description
- Default values are placeholders (CHANGE_ME)
- Grouped by service
- No secrets in version control''',
        0, 1, 2, 'Infrastructure,Config'))

    # Epic: PostgreSQL Database
    epic2 = 'Epic: PostgreSQL Database Setup'
    items.append(create_item(epic2, 'Epic', phase, 'High',
        '''PostgreSQL 14 with all required schemas.
        
Databases:
- psynq (main application)
- asterisk (CDR and realtime)

Extensions:
- uuid-ossp
- pg_trgm (full-text search)

Connection Pooling:
- PgBouncer for production''', 3, 14, labels='Database'))

    # Task: Core Schema
    items.append(create_item(
        'Task: Create core database schema - tenants and users',
        'Task', epic2, 'High',
        '''File: deploy/db/01-core-schema.sql

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Tenants table (multi-tenant support)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    settings JSONB DEFAULT '{}',
    max_agents INTEGER DEFAULT 10,
    max_concurrent_calls INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'supervisor', 'agent')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'locked')),
    settings JSONB DEFAULT '{}',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- Index for fast lookups
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Audit log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

Acceptance Criteria:
- Tables created successfully
- Indexes created for performance
- Triggers working for updated_at
- Foreign key constraints enforced
- CHECK constraints validated''',
        3, 2, 6, 'Database,Schema'))

    # Task: Telephony Schema
    items.append(create_item(
        'Task: Create telephony schema - calls, queues, agents',
        'Task', epic2, 'High',
        '''File: deploy/db/02-telephony-schema.sql

```sql
-- Queues table
CREATE TABLE queues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    strategy VARCHAR(50) DEFAULT 'ringall' 
        CHECK (strategy IN ('ringall', 'roundrobin', 'leastrecent', 'fewestcalls', 'random', 'linear', 'wrandom')),
    timeout INTEGER DEFAULT 30,
    wrapup_time INTEGER DEFAULT 10,
    max_wait_time INTEGER DEFAULT 300,
    max_callers INTEGER DEFAULT 50,
    music_on_hold VARCHAR(100) DEFAULT 'default',
    announce_frequency INTEGER DEFAULT 60,
    announce_position BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Skills table
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Agent skills (many-to-many)
CREATE TABLE agent_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency INTEGER DEFAULT 100 CHECK (proficiency BETWEEN 1 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, skill_id)
);

-- Queue members (agents in queues)
CREATE TABLE queue_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    penalty INTEGER DEFAULT 0,
    paused BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(queue_id, agent_id)
);

-- Calls table (CDR)
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    unique_id VARCHAR(100) NOT NULL,
    linked_id VARCHAR(100),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),
    caller_id VARCHAR(50),
    caller_name VARCHAR(100),
    callee_id VARCHAR(50),
    queue_id UUID REFERENCES queues(id),
    agent_id UUID REFERENCES users(id),
    status VARCHAR(30) NOT NULL CHECK (status IN 
        ('ringing', 'queued', 'answered', 'on_hold', 'transferred', 'completed', 'abandoned', 'failed')),
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answer_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration INTEGER DEFAULT 0,
    talk_time INTEGER DEFAULT 0,
    hold_time INTEGER DEFAULT 0,
    wait_time INTEGER DEFAULT 0,
    hangup_cause VARCHAR(50),
    recording_path VARCHAR(500),
    notes TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calls_tenant ON calls(tenant_id);
CREATE INDEX idx_calls_unique_id ON calls(unique_id);
CREATE INDEX idx_calls_agent ON calls(agent_id);
CREATE INDEX idx_calls_queue ON calls(queue_id);
CREATE INDEX idx_calls_start_time ON calls(start_time DESC);
CREATE INDEX idx_calls_direction ON calls(direction);
CREATE INDEX idx_calls_status ON calls(status);

-- Agent states table (real-time)
CREATE TABLE agent_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state VARCHAR(30) NOT NULL CHECK (state IN 
        ('offline', 'available', 'busy', 'on_call', 'wrapup', 'break', 'lunch', 'meeting', 'training')),
    reason VARCHAR(100),
    current_call_id UUID REFERENCES calls(id),
    state_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_agent_states_agent ON agent_states(agent_id);

-- Agent state history (for reporting)
CREATE TABLE agent_state_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES users(id),
    state VARCHAR(30) NOT NULL,
    reason VARCHAR(100),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_state_history_agent ON agent_state_history(agent_id);
CREATE INDEX idx_agent_state_history_started ON agent_state_history(started_at DESC);
```

Acceptance Criteria:
- All tables created with proper constraints
- Indexes for common queries
- Foreign keys enforce referential integrity
- Call status transitions validated
- Agent states tracked in real-time''',
        5, 2, 6, 'Database,Schema,Telephony'))

    return items

if __name__ == '__main__':
    generate_infrastructure()

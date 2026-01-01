# Prompt for Gemini: Generate Complete Psitrix Psynq Work Package CSVs

## Objective
Generate 14 complete CSV files for OpenProject import, covering the entire Psitrix Psynq CPaaS platform. Each work package must have implementation-level detail so that "2+ teams can build identical products without deviation."

## Critical Requirements

### 1. Detail Level - IMPLEMENTATION READY
Each task MUST specify:
- **Exact file paths**: `packages/backend/src/modules/auth/auth.service.ts`
- **Exact class names**: `AuthService`, `JwtStrategy`, `RoleGuard`
- **Exact method signatures**: `async validateUser(username: string, password: string): Promise<User>`
- **Database schemas**: Table names, column names, types, indexes, constraints
- **API endpoints**: `POST /api/v1/auth/login` with request/response schemas
- **Configuration keys**: `JWT_SECRET`, `JWT_EXPIRATION`, default values
- **Test requirements**: Unit tests for each method, integration tests for flows, E2E for APIs

### 2. NO MOCKS Policy
- **ZERO** mock implementations, stubs, or placeholders
- Every task must produce production-ready code
- All dependencies must be real (no mock services)
- Example: "Create AuthService with bcrypt password hashing (NOT a mock hasher)"

### 3. CSV Format (22 Columns)
```
Subject,Type,Description,Parent,Priority,Estimated time,Assignee,Status,Start date,Finish date,Progress,Responsible,Accountable,Consulted,Informed,Acceptance Criteria,Definition of Ready,Definition of Done,AI Agent Instructions,Notes,Tags,Custom Field 1
```

### 4. Work Package Types
- **Phase** (Type ID: 3): Top-level phase (e.g., "Phase 1: Infrastructure")
- **Epic** (Type ID: 5): Major functional area (e.g., "Epic: Docker Orchestration")
- **Feature** (Type ID: 4): Specific feature (e.g., "Feature: Docker Compose Base Configuration")
- **Task** (Type ID: 1): Concrete implementation task (e.g., "Task: Create docker-compose.yml")

### 5. Priority Levels
- **High** (ID: 9): Critical path items
- **Normal** (ID: 8): Standard items
- **Low** (ID: 7): Optional enhancements

### 6. Description Structure (MANDATORY for ALL items)
Each Description field MUST contain:

```markdown
# High-Level Design (HLD)
[Overall approach, architecture decisions, components involved]

# Low-Level Design (LLD)
## File Paths
- packages/backend/src/modules/[module]/[file].ts
- packages/web/src/components/[component]/[file].tsx

## Database Schema (if applicable)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_users_username ON users(username);
```

## API Endpoints (if applicable)
POST /api/v1/auth/login
Request: { username: string, password: string }
Response: { access_token: string, refresh_token: string, user: UserDto }

## Classes & Methods
```typescript
// File: packages/backend/src/modules/auth/auth.service.ts
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<User> {
    // Implementation details
  }

  async login(user: User): Promise<LoginResponse> {
    // Implementation details
  }
}
```

## Configuration (if applicable)
Environment variables:
- JWT_SECRET (required, min 32 chars)
- JWT_EXPIRATION (default: 3600s)
- BCRYPT_ROUNDS (default: 10)

# Definition of Ready (DOR)
- [ ] Requirements clear and unambiguous
- [ ] Dependencies identified and available
- [ ] Database schemas reviewed
- [ ] API contracts defined
- [ ] Test scenarios identified
- [ ] Environment variables documented
- [ ] No external blockers

# Definition of Done (DOD)
- [ ] Code implemented in correct file paths
- [ ] Unit tests written and passing (>80% coverage)
- [ ] Integration tests written and passing
- [ ] API endpoints tested with Postman/Playwright
- [ ] Database migrations created and tested
- [ ] Environment variables documented in .env.example
- [ ] Code review completed
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Documentation updated

# AI Agent Instructions
1. Create [exact file path]
2. Implement [exact class/function names]
3. NO MOCKS: Use real bcrypt, real database queries, real API calls
4. Test with: [exact test commands]
5. Verify: [exact verification steps]
6. Database: Create migration in [exact path]
7. API: Register endpoint in [exact controller]
```

### 7. Acceptance Criteria Format
```
## Functional Requirements
1. User can login with username/password
2. JWT token returned on successful login
3. Invalid credentials return 401 error

## Non-Functional Requirements
1. Password hashing uses bcrypt with 10 rounds
2. JWT tokens expire after 1 hour
3. Login endpoint responds in < 200ms

## Testing Requirements
- Unit: AuthService.validateUser() tests
- Integration: Login flow end-to-end
- E2E: Playwright test for login UI
```

---

## Project Context: Psitrix Psynq CPaaS Platform

### Technology Stack
- **Frontend (Web)**: React 18 + Next.js (App Router), TypeScript, WebRTC, SIP.js, WebSockets
- **Mobile**: React Native, TypeScript (shares 70% logic with web via /core)
- **Backend**: Node.js + NestJS, REST APIs, WebSockets, event-driven architecture
- **Telephony**: Asterisk (controlled via ARI interface), abstracted via TelephonyProvider interface
- **Data**: PostgreSQL (primary), Redis (state/pubsub), MinIO (S3-compatible storage)
- **Infrastructure**: Docker + Docker Compose, NGINX, Linux-only (Ubuntu/Debian)

### Architecture Patterns
- **Backend**: Hexagonal Architecture (Domain → Ports → Adapters)
- **Call State**: Explicit FSM (IDLE→RINGING→ANSWERED→ON_HOLD→ENDED)
- **Event-Driven**: Commands → Events via Redis pub/sub
- **Telephony**: Adapter Pattern (TelephonyProvider interface)
- **Frontend**: Container-Presenter pattern

### Directory Structure
```
/packages
  /core      -> shared logic, models, API clients
  /web       -> React + Next.js
  /mobile    -> React Native
  /backend   -> NestJS services
/deploy     -> docker-compose.yml, scripts, containers
```

### Phase 1 Constraints (IMPORTANT)
- NO Kubernetes (Docker Compose only)
- NO Kamailio (Asterisk only)
- NO Kafka (Redis pub/sub only)
- NO real-time billing (batch rating only)

---

## 14 Phases to Generate

### Phase 1: Infrastructure Foundation (~150 items)
**Epics:**
1. Docker Orchestration (docker-compose.yml, secrets, networks, volumes)
2. PostgreSQL High Availability (primary + replica, repmgr, failover)
3. Redis Cluster (6 nodes, cluster formation, persistence)
4. MinIO Object Storage (buckets, policies, backup integration)
5. NGINX Reverse Proxy (HTTP, SSL/TLS, reverse proxy rules, rate limiting)
6. Monitoring Stack (Prometheus, Grafana, Alertmanager, exporters)
7. Logging Stack (Loki, Promtail, aggregation, retention)
8. Backup & Restore (PostgreSQL backup, MinIO backup, restore procedures)

**Key Deliverables:**
- deploy/docker-compose.yml (all services)
- deploy/secrets/ (password management)
- deploy/db/ (PostgreSQL schemas, migrations)
- deploy/nginx/ (reverse proxy configs)
- deploy/monitoring/ (Prometheus, Grafana configs)

### Phase 2: Backend Core (~180 items)
**Epics:**
1. Authentication & Authorization (JWT, OAuth2, RBAC, session management)
2. Multi-tenancy (Tenant isolation, tenant-scoped queries, tenant middleware)
3. User Management (CRUD, roles, permissions, password policies)
4. Audit Logging (Activity logs, change tracking, compliance reports)
5. Health Checks (Liveness, readiness, dependency health)
6. API Gateway (Rate limiting, request validation, API versioning)

**Key Deliverables:**
- packages/backend/src/modules/auth/
- packages/backend/src/modules/tenant/
- packages/backend/src/modules/user/
- packages/backend/src/common/guards/
- packages/backend/src/common/decorators/
- Database migrations for auth, users, tenants, audit_logs

### Phase 3: Telephony Core (~200 items)
**Epics:**
1. Asterisk ARI Integration (ARI client, event handling, WebSocket management)
2. SIP Endpoint Management (Create/update/delete endpoints, registration monitoring)
3. Call State Machine (FSM with all states, transitions, guards, actions)
4. Call Recording (Recording start/stop, storage, metadata, playback API)
5. CDR (Call Detail Records) (CDR capture, storage, querying, export)
6. Telephony Provider Abstraction (TelephonyProvider interface, Asterisk adapter)

**Key Deliverables:**
- packages/backend/src/modules/telephony/
- packages/backend/src/modules/telephony/providers/asterisk/
- packages/backend/src/modules/call/state-machine/
- packages/backend/src/modules/recording/
- Database schemas: sip_endpoints, calls, call_legs, recordings, cdr

### Phase 4: Dialer Engine (~150 items)
**Epics:**
1. Campaign Management (Create/update/delete campaigns, scheduling, DNC lists)
2. Progressive Dialer (Manual dial, screen pop, wrap-up codes)
3. Predictive Dialer (Pacing algorithm, abandonment rate control, agent availability prediction)
4. Preview Dialer (Contact preview, agent-initiated dial)
5. Lead Management (Lead import, list management, contact priority)
6. Dialer Compliance (DNC checking, calling hour restrictions, consent tracking)

**Key Deliverables:**
- packages/backend/src/modules/dialer/
- packages/backend/src/modules/campaign/
- packages/backend/src/modules/lead/
- Pacing algorithm implementation
- Database schemas: campaigns, leads, dial_attempts, dnc_list

### Phase 5: Workforce Management (~120 items)
**Epics:**
1. Shift Management (Shift templates, assignment, swap requests)
2. Forecasting (Historical analysis, call volume prediction, staffing requirements)
3. Scheduling (Auto-scheduling, manual adjustments, shift optimization)
4. Adherence Tracking (Real-time adherence, scheduled vs actual, variance reports)
5. Time-off Management (PTO requests, approval workflows, balance tracking)

**Key Deliverables:**
- packages/backend/src/modules/wfm/
- Forecasting algorithms (time-series analysis)
- Scheduling optimization (constraint solver)
- Database schemas: shifts, schedules, adherence_logs, time_off_requests

### Phase 6: AI & NLP (~180 items)
**Epics:**
1. Sentiment Analysis (Real-time sentiment detection, emotion classification)
2. Intent Detection (NLP model training, intent classification, entity extraction)
3. Speech-to-Text (STT integration - Whisper/Google/Azure, transcription pipeline)
4. Text-to-Speech (TTS integration - Amazon Polly/Google/Azure, voice synthesis)
5. Chatbot Integration (Dialog flow, context management, response generation)
6. AI Assist (Agent suggestions, next-best-action, response templates)

**Key Deliverables:**
- packages/backend/src/modules/ai/
- ML pipelines for sentiment/intent
- STT/TTS adapters
- Database schemas: conversations, transcriptions, intents, sentiment_scores

### Phase 7: Omnichannel (~160 items)
**Epics:**
1. Email Channel (IMAP/SMTP integration, email parsing, threading)
2. SMS Channel (Twilio/Plivo integration, SMS gateway, MMS support)
3. WhatsApp Channel (WhatsApp Business API, message templates, media)
4. Chat Channel (WebSocket chat, typing indicators, file sharing)
5. Social Media (Facebook, Twitter, Instagram integration)
6. Unified Inbox (Cross-channel conversation view, routing, context switching)

**Key Deliverables:**
- packages/backend/src/modules/channels/
- Channel adapters for each platform
- Unified conversation model
- Database schemas: conversations, messages, channel_accounts, routing_rules

### Phase 8: Analytics & Reporting (~140 items)
**Epics:**
1. Real-time Dashboards (Live metrics, agent status, queue stats)
2. Historical Reports (Standard reports, custom date ranges, drill-down)
3. Custom Report Builder (Drag-drop interface, metric selection, visualization)
4. Data Export (CSV/Excel/PDF export, scheduled reports, email delivery)
5. Performance Metrics (KPIs, SLAs, benchmarks, trend analysis)

**Key Deliverables:**
- packages/backend/src/modules/analytics/
- packages/web/src/components/dashboards/
- Report templates and generators
- Database schemas: metrics, reports, report_schedules

### Phase 9: Integrations (~130 items)
**Epics:**
1. CRM Integrations (Salesforce, HubSpot, Zoho connectors)
2. Ticketing Systems (Zendesk, Jira, Freshdesk connectors)
3. Webhooks (Webhook manager, retry logic, signature verification)
4. REST APIs (Public API endpoints, API keys, rate limiting)
5. Zapier/Make Integration (App connectors, triggers, actions)

**Key Deliverables:**
- packages/backend/src/modules/integrations/
- CRM/ticketing adapters
- Webhook delivery system
- Database schemas: integrations, api_keys, webhook_logs

### Phase 10: Supervisor Tools (~110 items)
**Epics:**
1. Real-time Monitoring (Agent grid, call monitoring, queue wallboard)
2. Call Control (Barge, whisper, coach, transfer, conference)
3. Agent Assist (Real-time suggestions, script prompts, knowledge base)
4. Quality Management (Call scoring, evaluation forms, coaching)

**Key Deliverables:**
- packages/backend/src/modules/supervisor/
- packages/web/src/components/supervisor/
- Real-time monitoring via WebSockets
- Database schemas: call_evaluations, coaching_sessions

### Phase 11: Admin Portal (~150 items)
**Epics:**
1. User Management UI (User CRUD, role assignment, permission matrix)
2. System Configuration (Global settings, feature flags, API limits)
3. Tenant Management (Tenant CRUD, resource allocation, billing plans)
4. Billing Dashboard (Usage tracking, invoicing, payment integration)
5. System Logs (Audit logs, error logs, search/filter)

**Key Deliverables:**
- packages/web/src/app/admin/
- Admin React components
- Settings management API
- Database schemas: system_config, billing_usage, invoices

### Phase 12: Agent Desktop (Frontend) (~200 items)
**Epics:**
1. Agent Dashboard (Status widget, queue stats, call controls)
2. Softphone UI (Dial pad, call timer, hold/mute/transfer buttons)
3. Contact Information (Customer profile, interaction history, notes)
4. Script Engine (Dynamic scripts, branching logic, variable insertion)
5. Disposition Codes (Wrap-up form, outcome selection, notes)
6. WebRTC Integration (SIP.js setup, audio handling, connection status)

**Key Deliverables:**
- packages/web/src/app/agent/
- packages/web/src/components/softphone/
- WebRTC state management
- React hooks for call control

### Phase 13: Security & Compliance (~120 items)
**Epics:**
1. Encryption (Data at rest, data in transit, key management)
2. API Security (JWT validation, API rate limiting, CORS)
3. DDoS Protection (Rate limiting, IP whitelisting, bot detection)
4. Compliance (GDPR, PCI-DSS, HIPAA controls)
5. Penetration Testing (Security audit, vulnerability scanning)

**Key Deliverables:**
- packages/backend/src/common/security/
- Encryption middleware
- Compliance reporting
- Security documentation

### Phase 14: DevOps & Deployment (~160 items)
**Epics:**
1. CI/CD Pipelines (GitHub Actions, build, test, deploy)
2. Monitoring & Alerting (Prometheus alerts, PagerDuty integration)
3. Load Testing (JMeter scenarios, stress tests, capacity planning)
4. Performance Tuning (Database optimization, caching, CDN)
5. Disaster Recovery (Backup verification, failover testing, runbooks)
6. Documentation (API docs, deployment guides, architecture diagrams)

**Key Deliverables:**
- .github/workflows/
- Load testing scripts
- Performance benchmarks
- Deployment runbooks

---

## Example Work Package (Reference)

Here's a correctly formatted Task from the successful test import:

**Subject:** Task: Create docker-compose.yml with all services

**Type:** Task

**Description:**
```markdown
Create the main docker-compose.yml file with all infrastructure service definitions.

# High-Level Design (HLD)
Define all infrastructure services in docker-compose format with correct images, ports, volumes, networks, environment variables, and health checks.

# Low-Level Design (LLD)

## File Path
deploy/docker-compose.yml

## Service Definitions

### PostgreSQL Primary
```yaml
postgres_primary:
  image: postgres:14-alpine
  container_name: psynq_postgres_primary
  environment:
    POSTGRES_DB: psynq
    POSTGRES_USER: psynq_admin
    POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
  volumes:
    - postgres_primary_data:/var/lib/postgresql/data
    - ./db:/docker-entrypoint-initdb.d
  networks:
    - db_network
  ports:
    - "5432:5432"
  secrets:
    - postgres_password
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U psynq_admin -d psynq"]
    interval: 10s
    timeout: 5s
    retries: 5
```

[... additional services ...]

# Definition of Ready (DOR)
- [ ] All service images documented with versions
- [ ] Docker network topology designed
- [ ] Volume persistence requirements defined
- [ ] Secrets management approach decided
- [ ] Health check commands identified for each service
- [ ] Port mappings documented (no conflicts)
- [ ] Service dependencies mapped
- [ ] Environment variable requirements listed

# Definition of Done (DOD)
- [ ] docker-compose.yml created at deploy/docker-compose.yml
- [ ] All 9 services defined correctly
- [ ] Networks defined: db_network, redis_network, app_network, monitoring_network
- [ ] Volumes defined for all stateful services
- [ ] Secrets configured for passwords
- [ ] Health checks configured for postgres_primary, minio
- [ ] depends_on with health conditions configured
- [ ] docker-compose config validates with no errors
- [ ] docker-compose up -d starts all services
- [ ] docker-compose ps shows all services healthy within 60s
- [ ] Code review completed

# AI Agent Instructions
When implementing this task:
1. Create deploy/docker-compose.yml with exact YAML structure above
2. Use Docker Compose v3.8 or higher features
3. NO MOCKS: Use real image names (postgres:14-alpine, redis:7-alpine, etc.)
4. Test with: docker-compose -f deploy/docker-compose.yml config
5. Verify secrets files exist before starting services
6. Use healthcheck conditions for service startup ordering
7. Ensure all ports are documented and non-conflicting
8. Include restart: unless-stopped for production resilience
9. Document any image version pinning decisions
```

**Parent:** Feature: Docker Compose Base Configuration

**Priority:** Normal

**Estimated time:** 4h

**Acceptance Criteria:**
```
## Functional Requirements
- All 9 services defined with correct images
- Health checks configured for critical services (PostgreSQL, MinIO)
- Service dependencies prevent startup race conditions
- Secrets loaded from files (not environment variables)
- Persistent volumes configured for all stateful services

## Non-Functional Requirements
- docker-compose config completes in < 2s
- docker-compose up -d starts services in correct order
- No port conflicts with host or between services
- Services isolated via networks

## Testing Requirements
- Unit: YAML syntax validation
- Integration: docker-compose config succeeds
- E2E: docker-compose up && docker-compose ps shows healthy services
```

**Definition of Ready:**
```
1. Docker Compose v3.8 requirements documented
2. All service images identified with versions
3. Network topology designed
4. Port mappings documented (no conflicts)
5. Volume requirements specified
6. Secrets files location agreed
7. Health check commands tested manually
```

**Definition of Done:**
```
1. docker-compose.yml created at deploy/docker-compose.yml
2. docker-compose config succeeds
3. docker-compose up -d starts all services
4. docker-compose ps shows all healthy within 60s
5. Can connect to postgres_primary on localhost:5432
6. Can access MinIO console on localhost:9001
7. Can access Grafana on localhost:3000
8. Logs accessible via docker-compose logs
9. Code review approved
10. Tested on clean Docker environment
```

**AI Agent Instructions:**
```
Test with REAL Docker (NO simulation).
Use exact image versions.
NO hardcoded passwords (use secrets).
Validate YAML before committing.
Test health checks manually first.
```

---

## Output Requirements

Generate 14 separate CSV files:
1. `phase1_infrastructure.csv` (~150 items)
2. `phase2_backend_core.csv` (~180 items)
3. `phase3_telephony.csv` (~200 items)
4. `phase4_dialer.csv` (~150 items)
5. `phase5_wfm.csv` (~120 items)
6. `phase6_ai_nlp.csv` (~180 items)
7. `phase7_omnichannel.csv` (~160 items)
8. `phase8_analytics.csv` (~140 items)
9. `phase9_integrations.csv` (~130 items)
10. `phase10_supervisor.csv` (~110 items)
11. `phase11_admin_portal.csv` (~150 items)
12. `phase12_frontend.csv` (~200 items)
13. `phase13_security.csv` (~120 items)
14. `phase14_devops.csv` (~160 items)

**Total: ~2,400 work packages**

Each CSV must:
- Start with the 22-column header
- Have exactly 1 Phase item (first row)
- Organize as: Phase → Epics → Features → Tasks
- Use proper Parent references (e.g., "Epic: Docker Orchestration")
- Include complete HLD/LLD/DOR/DOD/AI Instructions for EVERY item
- Specify exact file paths, class names, method signatures for all Tasks
- Use priority: High (critical path), Normal (standard), Low (nice-to-have)
- Estimate time realistically (Tasks: 2-8h, Features: 8-20h, Epics: 40-80h, Phases: 200-400h)

---

## Quality Checklist

Before submitting each CSV, verify:
- [ ] All 22 columns present in header
- [ ] Parent references are exact Subject matches
- [ ] Every Description has HLD, LLD, DOR, DOD, AI Instructions sections
- [ ] File paths use correct monorepo structure (packages/backend/src/...)
- [ ] Database schemas include types, indexes, constraints
- [ ] API endpoints include request/response schemas
- [ ] No "TODO", "TBD", "mock", "stub" anywhere
- [ ] Acceptance Criteria split into Functional/Non-Functional/Testing
- [ ] DOR has 5-8 checklist items
- [ ] DOD has 8-12 checklist items
- [ ] AI Instructions emphasize "NO MOCKS"
- [ ] Time estimates are realistic

---

## Start Generation

Generate all 14 CSV files following the structure and detail level shown above. Each phase should be a complete, standalone CSV ready for OpenProject import.

**Remember:** The goal is that 2+ independent teams can take these work packages and build identical products without ambiguity. Every task must be unambiguous and implementation-ready.

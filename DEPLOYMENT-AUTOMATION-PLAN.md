# Psynq Deployment Automation & Portability Plan

## Problem Statement
Current deployment requires manual steps:
- Creating PJSIP database tables manually
- Running migrations with conflicts
- Manual volume cleanup when things break
- No automated setup for new environments

## Target User Profile
**"Limited technical knowledge users"** who:
- Can run Docker and Docker Compose
- Can execute basic scripts (`./setup.sh` or `setup.bat`)
- Should NOT need to:
  - Understand database migrations
  - Know SQL commands
  - Debug Asterisk configuration
  - Manually create tables

## Industry Best Practices (Researched)

### 1. Docker Image Versioning Strategy
**Standard**: Pin specific versions, don't use `latest` tags
```yaml
# ❌ BAD
image: postgres:15-alpine

# ✅ GOOD
image: postgres:15.5-alpine
```

### 2. Database Initialization with Docker
**Standard**: Use `/docker-entrypoint-initdb.d/` for automatic schema setup
```dockerfile
# Place SQL files in this directory
COPY db/init/*.sql /docker-entrypoint-initdb.d/
```

### 3. Multi-Stage Database Setup
**Best Practice**: Separate concerns
- **Stage 1**: Base schema (migrations)
- **Stage 2**: Seed data (default org, admin user)
- **Stage 3**: PJSIP tables (Asterisk integration)

### 4. Idempotent Scripts
**Standard**: Scripts that can run multiple times safely
```bash
# ✅ GOOD: Idempotent
CREATE TABLE IF NOT EXISTS ps_endpoints (...);

# ❌ BAD: Not idempotent
CREATE TABLE ps_endpoints (...);
```

### 5. Environment-Based Configuration
**Standard**: All config via environment variables
```yaml
# docker-compose.yml
environment:
  - DB_HOST=${DB_HOST}
  - DB_PORT=${DB_PORT}
```

### 6. Health Check Dependencies
**Standard**: Use health checks, not `sleep` commands
```yaml
depends_on:
  postgres:
    condition: service_healthy
```

## Proposed Solution

### Architecture: "One-Command Setup"

```bash
# Windows
.\setup.bat

# Linux/Mac
./setup.sh
```

This single command should:
1. ✅ Create all necessary directories
2. ✅ Generate required configuration files
3. ✅ Create database schema (including PJSIP tables)
4. ✅ Seed initial data (admin user, system org)
5. ✅ Start all services
6. ✅ Verify health
7. ✅ Display login URL and credentials

### Implementation Plan

#### Phase 1: Database Automation (Immediate)
**Files to create:**
1. `deploy/db/base-schema.sql` - Core application tables
2. `deploy/db/pjsip-schema.sql` - Asterisk PJSIP tables
3. `deploy/db/seed-data.sql` - Initial seed data
4. `deploy/db/init.sh` - Orchestrates database setup

#### Phase 2: Configuration Generation
**Files to create:**
1. `scripts/generate-env.ps1` - Windows env generator
2. `scripts/generate-env.sh` - Linux/Mac env generator
3. `deploy/config/.env.template` - Template with defaults

#### Phase 3: Migration System Fix
**Files to modify:**
1. Fix migration conflicts in existing migrations
2. Add PJSIP table creation to migrations
3. Create `scripts/reset-db.ps1` and `reset-db.sh`

#### Phase 4: One-Command Setup
**Files to create:**
1. `setup.bat` - Windows installer
2. `setup.sh` - Linux/Mac installer
3. `deploy/docker-compose.prod.yml` - Production-ready compose file

### Technical Specifications

#### Database Initialization Flow

```
docker-compose up -d postgres
    ↓
Wait for health check
    ↓
Execute init-db.sh script
    ↓
┌─────────────────────────────────────┐
│ 1. Create base schema (migrations)  │
│ 2. Create PJSIP tables              │
│ 3. Seed initial data                │
│ 4. Verify tables exist              │
└─────────────────────────────────────┘
    ↓
Start backend (auto-connects to DB)
    ↓
Start Asterisk (connects to DB + ARI)
    ↓
Start web (connects to backend)
```

#### Directory Structure
```
psynq/
├── deploy/
│   ├── db/
│   │   ├── 01-base-schema.sql       # Core tables
│   │   ├── 02-pjsip-schema.sql      # Asterisk PJSIP tables
│   │   ├── 03-seed-data.sql         # Admin user, org
│   │   └── init-db.sh               # Orchestrator
│   ├── config/
│   │   ├── .env.template            # Environment template
│   │   └── .env.example             # Example with comments
│   └── docker-compose.yml           # Updated with health checks
├── scripts/
│   ├── setup.ps1                    # Windows setup
│   ├── setup.sh                     # Linux/Mac setup
│   ├── reset-db.ps1                 # DB reset (dev)
│   ├── reset-db.sh
│   ├── generate-env.ps1             # Env generator
│   └── generate-env.sh
└── README-SETUP.md                  # User-friendly setup guide
```

### Error Handling & Recovery

#### Automatic Recovery
```bash
# Script detects issues and auto-fixes
if ! docker ps | grep -q "psynq-postgres"; then
    echo "PostgreSQL not running, starting..."
    docker-compose up -d postgres
    wait_for_health "psynq-postgres"
fi
```

#### User-Friendly Error Messages
```bash
# Instead of:
ERROR: relation "ps_auths" does not exist

# Show:
❌ Database setup incomplete
💡 Running: docker exec psynq-postgres psql -f ...
✅ Fixed! Database schema updated
```

### Configuration Management

#### Environment Variable Precedence
1. `.env` file (gitignored, user-specific)
2. `.env.template` (committed, defaults)
3. Hardcoded defaults (last resort)

#### Sensitive Data Handling
```bash
# Auto-generate secure passwords
DB_PASSWORD=$(openssl rand -base64 32)
ARI_PASSWORD=$(openssl rand -base64 32)
```

### Health Verification

#### Post-Setup Checks
```bash
# Verify all services healthy
check_service_health "psynq-postgres" "Database"
check_service_health "psynq-redis" "Cache"
check_service_health "psynq-backend" "API"
check_service_health "psynq-asterisk" "Telephony"
check_service_health "psynq-web" "Frontend"

# Verify database tables
check_db_tables "ps_auths" "ps_endpoints" "users" "organizations"

# Verify API connectivity
check_http "http://localhost:3001/health"

# Verify Asterisk ARI
check_asterisk_ari "http://localhost:8088/ari"
```

### Portability Features

#### Cross-Platform Compatibility
```bash
# Detect OS
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    ./setup.bat
elif [[ "$OSTYPE" == "darwin"* ]]; then
    ./setup-mac.sh
else
    ./setup.sh
fi
```

#### Auto-Configuration
```bash
# Detect available ports
if ! netstat -an | grep -q ":5432 "; then
    DB_PORT=5432  # Default available
else
    DB_PORT=5433  # Port in use, use alternative
fi
```

### Documentation Strategy

#### User-Facing Docs
1. **README-SETUP.md** - Quick start (5 min read)
2. **TROUBLESHOOTING.md** - Common issues & fixes
3. **CONFIGURATION.md** - All env variables explained
4. **UPGRADE.md** - How to upgrade between versions

#### Developer Docs
1. **DEPLOYMENT-ARCHITECTURE.md** - Technical details
2. **MIGRATIONS.md** - Database migration system
3. **CONTRIBUTING.md** - How to add deployment features

## Success Criteria

### For Non-Technical Users
- ✅ Single command to set up entire system
- ✅ Automatic error recovery
- ✅ Clear progress indicators (35%... 70%... Done!)
- ✅ Helpful error messages with fixes
- ✅ No manual SQL or Docker commands required

### For Technical Users
- ✅ Idempotent operations (can re-run safely)
- ✅ Environment variable overrides
- ✅ Development vs production modes
- ✅ Easy to customize and extend
- ✅ Version-pinned Docker images

### For Maintenance
- ✅ Automated database backups
- ✅ One-command reset/restore
- ✅ Health monitoring dashboards
- ✅ Upgrade scripts between versions

## Next Steps

1. **Create database initialization scripts** (1-2 hours)
2. **Write setup automation scripts** (2-3 hours)
3. **Fix migration system** (1-2 hours)
4. **Add health checks to docker-compose** (1 hour)
5. **Write user-friendly documentation** (1-2 hours)
6. **Test on fresh Windows/Mac/Linux installs** (2-3 hours)

**Total Estimated Time: 8-13 hours**

---

## Reference Implementations

### Similar Projects (Best Practices)
1. **Nextcloud Docker** - Excellent setup automation
   - Auto-configuration on first run
   - Database initialization scripts
   - Health checks and recovery

2. **Discourse Docker** - Comprehensive setup
   - Multi-stage setup scripts
   - Automatic dependency detection
   - Detailed progress reporting

3. **Odoo Docker** - Portability focus
   - Cross-platform scripts
   - Environment-based config
   - Easy backup/restore

### Key Learnings from Industry
- **Auto-configuration over manual setup** - Detect and configure automatically
- **Fail-fast with clear errors** - Don't continue if setup fails
- **Progress indicators** - Show what's happening (40%... 80%...)
- **Idempotent operations** - Scripts can run multiple times safely
- **Separate secrets from config** - Use .env files, never commit secrets

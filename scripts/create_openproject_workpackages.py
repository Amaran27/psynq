#!/usr/bin/env python3
"""
Direct OpenProject Work Package Creation for Psitrix Psynq
Creates all 14 phases with complete hierarchy and implementation details
"""
import requests
import time
import json
from typing import Dict, List, Any

# OpenProject Configuration
API_URL = "http://localhost:8080/api/v3"
API_KEY = "9ad0c551d5fffa8dfe0d3f44189f1d535b399a5c8aa22eaf90cc2ce829f8c2a0"
PROJECT_ID = 3

# Work Package Type IDs
TYPE_IDS = {
    "Phase": 3,
    "Epic": 5,
    "Feature": 4,
    "User story": 6,
    "Task": 1,
    "Bug": 7
}

# Priority IDs
PRIORITY_IDS = {
    "Low": 7,
    "Normal": 8,
    "High": 9,
    "Immediate": 10
}

class OpenProjectCreator:
    def __init__(self):
        self.session = requests.Session()
        self.session.auth = ("apikey", API_KEY)
        self.created_items = {}  # Track created items by subject

    def create_work_package(self, subject: str, wp_type: str, description: str,
                          parent_subject: str = None, priority: str = "Normal",
                          estimated_time: str = "", tags: str = "") -> Dict:
        """Create a single work package"""

        # Prepare data
        data = {
            "subject": subject,
            "description": {
                "format": "markdown",
                "raw": description
            },
            "_links": {
                "type": {
                    "href": f"{API_URL}/types/{TYPE_IDS[wp_type]}"
                },
                "project": {
                    "href": f"{API_URL}/projects/{PROJECT_ID}"
                },
                "status": {
                    "href": f"{API_URL}/statuses/1"  # New
                },
                "priority": {
                    "href": f"{API_URL}/priorities/{PRIORITY_IDS[priority]}"
                }
            }
        }

        # Add parent if specified
        if parent_subject and parent_subject in self.created_items:
            data["_links"]["parent"] = {
                "href": self.created_items[parent_subject]["_links"]["self"]["href"]
            }

        # Add estimated time if provided
        if estimated_time:
            data["estimatedTime"] = estimated_time

        # Create work package
        url = f"{API_URL}/projects/{PROJECT_ID}/work_packages"
        response = self.session.post(url, json=data)

        if response.status_code in [200, 201]:
            wp = response.json()
            self.created_items[subject] = wp
            print(f"✅ Created: {subject}")
            return wp
        else:
            print(f"❌ Failed to create {subject}: {response.status_code}")
            print(f"Response: {response.text}")
            return None

    def create_phase_hierarchy(self, phase_data: Dict):
        """Create a complete phase with all epics, features, and tasks"""

        phase_name = phase_data["name"]
        print(f"\n🚀 Creating {phase_name}")

        # Create Phase
        phase_wp = self.create_work_package(
            subject=phase_name,
            wp_type="Phase",
            description=phase_data["description"],
            priority="High",
            estimated_time=phase_data.get("estimated_time", "200h")
        )

        if not phase_wp:
            return False

        # Create Epics
        for epic_data in phase_data["epics"]:
            epic_name = epic_data["name"]
            print(f"\n📂 Creating Epic: {epic_name}")

            # Create Epic
            epic_wp = self.create_work_package(
                subject=epic_name,
                wp_type="Epic",
                description=epic_data["description"],
                parent_subject=phase_name,
                priority="High",
                estimated_time=epic_data.get("estimated_time", "40h")
            )

            if not epic_wp:
                continue

            # Create Features under Epic
            for feature_data in epic_data["features"]:
                feature_name = feature_data["name"]
                print(f"  📋 Creating Feature: {feature_name}")

                feature_wp = self.create_work_package(
                    subject=feature_name,
                    wp_type="Feature",
                    description=feature_data["description"],
                    parent_subject=epic_name,
                    priority=feature_data.get("priority", "Normal"),
                    estimated_time=feature_data.get("estimated_time", "12h")
                )

                if not feature_wp:
                    continue

                # Create Tasks under Feature
                for task_data in feature_data["tasks"]:
                    task_name = task_data["name"]

                    task_wp = self.create_work_package(
                        subject=task_name,
                        wp_type="Task",
                        description=task_data["description"],
                        parent_subject=feature_name,
                        priority=task_data.get("priority", "Normal"),
                        estimated_time=task_data.get("estimated_time", "4h")
                    )

                    if task_wp:
                        time.sleep(0.1)  # Rate limiting

        return True

def get_phase1_data():
    """Get complete Phase 1 data structure"""
    return {
        "name": "Phase 1: Infrastructure Foundation",
        "description": """Complete infrastructure setup for Psitrix Psynq CPaaS platform.

# High-Level Design (HLD)
- Docker Compose orchestration for all services
- PostgreSQL 14+ with streaming replication (primary + replica)
- Redis 7+ cluster (3 masters, 3 replicas)
- MinIO S3-compatible storage for recordings
- NGINX reverse proxy with SSL termination
- Monitoring stack (Prometheus, Grafana, Alertmanager)
- Logging stack (Loki, Promtail)
- Backup automation for PostgreSQL and MinIO

# Architecture Decisions
- Single-node deployment for Phase 1 (multi-node in Phase 2)
- No Kubernetes (constraint)
- Docker volumes for persistence
- Internal Docker networks for service isolation
- External access only through NGINX

# Deliverables
- deploy/docker-compose.yml (all services)
- PostgreSQL HA setup with repmgr
- Redis cluster configuration
- MinIO buckets and policies
- NGINX config with reverse proxy rules
- Monitoring dashboards
- Backup/restore scripts
- Health check endpoints

# Definition of Ready (DOR)
- [ ] Docker Compose v3.8+ available
- [ ] All service images accessible
- [ ] Network topology designed
- [ ] Volume persistence strategy defined
- [ ] Secrets management approach decided
- [ ] Health check requirements specified
- [ ] Port conflict analysis completed
- [ ] Service startup order determined

# Definition of Done (DOD)
- [ ] All services start successfully via docker-compose up
- [ ] PostgreSQL replication working (primary ↔ replica)
- [ ] Redis cluster operational (6 nodes)
- [ ] MinIO accessible via S3 API
- [ ] NGINX proxying all services correctly
- [ ] Monitoring stack collecting metrics
- [ ] Logging stack aggregating logs
- [ ] Backup scripts tested and working
- [ ] All health endpoints responding
- [ ] docker-compose logs show no errors
- [ ] Code review completed

# AI Agent Instructions
1. Use Docker Compose v3.8+ features
2. NO MOCKS: Use real service images and configurations
3. Test each service individually before full orchestration
4. Verify network isolation between service groups
5. Document all port mappings and their purposes
6. Implement proper health checks for all services
7. Create secrets management that works in production
8. Test backup/restore procedures with real data""",
        "estimated_time": "200h",
        "epics": [
            {
                "name": "Epic: Docker Orchestration",
                "description": "Set up Docker Compose orchestration for all infrastructure services.",
                "estimated_time": "40h",
                "features": [
                    {
                        "name": "Feature: Docker Compose Base Configuration",
                        "description": "Create main docker-compose.yml with service definitions, networks, and volumes.",
                        "estimated_time": "12h",
                        "tasks": [
                            {
                                "name": "Task: Create docker-compose.yml with all services",
                                "description": """Create the main docker-compose.yml file with all infrastructure service definitions.

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

### PostgreSQL Replica
```yaml
postgres_replica:
  image: postgres:14-alpine
  container_name: psynq_postgres_replica
  environment:
    POSTGRES_DB: psynq
    POSTGRES_USER: psynq_admin
    POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    POSTGRES_PRIMARY_HOST: postgres_primary
  volumes:
    - postgres_replica_data:/var/lib/postgresql/data
    - ./db/replica-setup.sh:/docker-entrypoint-initdb.d/replica-setup.sh
  networks:
    - db_network
  ports:
    - "5433:5432"
  depends_on:
    postgres_primary:
      condition: service_healthy
  secrets:
    - postgres_password
```

### Redis Cluster (6 nodes)
```yaml
redis-node-1:
  image: redis:7-alpine
  container_name: psynq_redis_1
  command: redis-server /usr/local/etc/redis/redis.conf
  volumes:
    - redis_node_1_data:/data
    - ./redis/redis-cluster.conf:/usr/local/etc/redis/redis.conf
  networks:
    - redis_network
  ports:
    - "7000:7000"
    - "17000:17000"

# ... repeat for redis-node-2 through redis-node-6 (ports 7001-7005, 17001-17005)
```

### MinIO
```yaml
minio:
  image: minio/minio:latest
  container_name: psynq_minio
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER_FILE: /run/secrets/minio_root_user
    MINIO_ROOT_PASSWORD_FILE: /run/secrets/minio_root_password
  volumes:
    - minio_data:/data
  networks:
    - app_network
  ports:
    - "9000:9000"
    - "9001:9001"
  secrets:
    - minio_root_user
    - minio_root_password
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### NGINX
```yaml
nginx:
  image: nginx:alpine
  container_name: psynq_nginx
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/conf.d:/etc/nginx/conf.d:ro
    - ./nginx/ssl:/etc/nginx/ssl:ro
  networks:
    - app_network
  ports:
    - "80:80"
    - "443:443"
  depends_on:
    - minio
```

### Prometheus
```yaml
prometheus:
  image: prom/prometheus:latest
  container_name: psynq_prometheus
  command:
    - '--config.file=/etc/prometheus/prometheus.yml'
    - '--storage.tsdb.path=/prometheus'
  volumes:
    - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    - prometheus_data:/prometheus
  networks:
    - monitoring_network
    - db_network
    - redis_network
  ports:
    - "9090:9090"
```

### Grafana
```yaml
grafana:
  image: grafana/grafana:latest
  container_name: psynq_grafana
  environment:
    GF_SECURITY_ADMIN_PASSWORD_FILE: /run/secrets/grafana_admin_password
  volumes:
    - grafana_data:/var/lib/grafana
    - ./monitoring/grafana-datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml:ro
    - ./monitoring/grafana-dashboards.yml:/etc/grafana/provisioning/dashboards/dashboards.yml:ro
  networks:
    - monitoring_network
  ports:
    - "3000:3000"
  depends_on:
    - prometheus
    - loki
  secrets:
    - grafana_admin_password
```

### Loki
```yaml
loki:
  image: grafana/loki:latest
  container_name: psynq_loki
  command: -config.file=/etc/loki/local-config.yaml
  volumes:
    - ./monitoring/loki-config.yml:/etc/loki/local-config.yaml:ro
    - loki_data:/loki
  networks:
    - monitoring_network
  ports:
    - "3100:3100"
```

### Promtail
```yaml
promtail:
  image: grafana/promtail:latest
  container_name: psynq_promtail
  command: -config.file=/etc/promtail/config.yml
  volumes:
    - ./monitoring/promtail-config.yml:/etc/promtail/config.yml:ro
    - /var/lib/docker/containers:/var/lib/docker/containers:ro
    - /var/log:/var/log:ro
  networks:
    - monitoring_network
  depends_on:
    - loki
```

## Networks
```yaml
networks:
  db_network:
    driver: bridge
  redis_network:
    driver: bridge
  app_network:
    driver: bridge
  monitoring_network:
    driver: bridge
```

## Volumes
```yaml
volumes:
  postgres_primary_data:
  postgres_replica_data:
  redis_node_1_data:
  redis_node_2_data:
  redis_node_3_data:
  redis_node_4_data:
  redis_node_5_data:
  redis_node_6_data:
  minio_data:
  prometheus_data:
  grafana_data:
  loki_data:
```

## Secrets
```yaml
secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
  minio_root_user:
    file: ./secrets/minio_root_user.txt
  minio_root_password:
    file: ./secrets/minio_root_password.txt
  grafana_admin_password:
    file: ./secrets/grafana_admin_password.txt
```

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
9. Document any image version pinning decisions""",
                                "estimated_time": "4h"
                            },
                            {
                                "name": "Task: Create secrets template files",
                                "description": """Create template files for Docker secrets with instructions for generating actual secret values.

# High-Level Design (HLD)
Provide secure template files for all secrets used in docker-compose.yml with instructions for generating strong passwords.

# Low-Level Design (LLD)

## Directory Structure
```
deploy/
  secrets/
    .gitignore
    README.md
    postgres_password.txt.example
    minio_root_user.txt.example
    minio_root_password.txt.example
    grafana_admin_password.txt.example
    generate-secrets.sh
```

## File: deploy/secrets/.gitignore
```
# Ignore all actual secret files
*.txt

# Keep examples
!*.txt.example
```

## File: deploy/secrets/README.md
```markdown
# Secrets Management

## Setup Instructions
1. Run generate-secrets.sh to create secret files with random passwords
2. Or manually create each .txt file with your own values
3. Never commit .txt files (only .txt.example)

## Required Secrets
- postgres_password.txt: PostgreSQL admin password (min 16 chars)
- minio_root_user.txt: MinIO root username (e.g., admin)
- minio_root_password.txt: MinIO root password (min 16 chars)
- grafana_admin_password.txt: Grafana admin password (min 12 chars)

## Password Requirements
- Minimum 16 characters for database passwords
- Minimum 12 characters for admin passwords
- Include: uppercase, lowercase, numbers, special chars
- Do NOT use: <, >, &, "", '', `, $

## Generating Secrets
```bash
cd deploy/secrets
./generate-secrets.sh
```
```

## File: deploy/secrets/postgres_password.txt.example
```
REPLACE_WITH_STRONG_PASSWORD_MIN_16_CHARS
```

## File: deploy/secrets/minio_root_user.txt.example
```
admin
```

## File: deploy/secrets/minio_root_password.txt.example
```
REPLACE_WITH_STRONG_PASSWORD_MIN_16_CHARS
```

## File: deploy/secrets/grafana_admin_password.txt.example
```
REPLACE_WITH_STRONG_PASSWORD_MIN_12_CHARS
```

## File: deploy/secrets/generate-secrets.sh
```bash
#!/bin/bash
# Generate random secrets for Psitrix Psynq infrastructure

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Function to generate random password
generate_password() {
    local length=$1
    openssl rand -base64 $((length * 3 / 4)) | tr -d "=+/" | cut -c1-$length
}

echo "🔐 Generating secrets..."

# PostgreSQL password (24 chars)
echo "$(generate_password 24)" > "$SCRIPT_DIR/postgres_password.txt"
echo "✅ Generated postgres_password.txt"

# MinIO root user
echo "admin" > "$SCRIPT_DIR/minio_root_user.txt"
echo "✅ Generated minio_root_user.txt"

# MinIO root password (24 chars)
echo "$(generate_password 24)" > "$SCRIPT_DIR/minio_root_password.txt"
echo "✅ Generated minio_root_password.txt"

# Grafana admin password (20 chars)
echo "$(generate_password 20)" > "$SCRIPT_DIR/grafana_admin_password.txt"
echo "✅ Generated grafana_admin_password.txt"

# Set permissions (read-only for owner)
chmod 400 "$SCRIPT_DIR/"*.txt

echo ""
echo "🎉 All secrets generated successfully!"
echo "📝 Secret files are read-only (chmod 400)"
echo ""
echo "⚠️  IMPORTANT: Never commit these files to git!"
echo "⚠️  .gitignore is configured to exclude *.txt files"
```

## File: deploy/secrets/generate-secrets.ps1
```powershell
# Generate random secrets for Psitrix Psynq infrastructure (Windows)

$ErrorActionPreference = ""Stop""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Generate-Password {
    param([int]$Length)

    # Generate random bytes and convert to base64
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $rng.GetBytes($bytes)
    $base64 = [Convert]::ToBase64String($bytes)

    # Remove special chars that cause issues in Docker
    $password = $base64 -replace '[=+/]',''
    return $password.Substring(0, $Length)
}

Write-Host ""🔐 Generating secrets..."" -ForegroundColor Cyan

# PostgreSQL password (24 chars)
Generate-Password 24 | Out-File -FilePath ""$ScriptDir\postgres_password.txt"" -NoNewline -Encoding ASCII
Write-Host ""✅ Generated postgres_password.txt"" -ForegroundColor Green

# MinIO root user
""admin"" | Out-File -FilePath ""$ScriptDir\minio_root_user.txt"" -NoNewline -Encoding ASCII
Write-Host ""✅ Generated minio_root_user.txt"" -ForegroundColor Green

# MinIO root password (24 chars)
Generate-Password 24 | Out-File -FilePath ""$ScriptDir\minio_root_password.txt"" -NoNewline -Encoding ASCII
Write-Host ""✅ Generated minio_root_password.txt"" -ForegroundColor Green

# Grafana admin password (20 chars)
Generate-Password 20 | Out-File -FilePath ""$ScriptDir\grafana_admin_password.txt"" -NoNewline -Encoding ASCII
Write-Host ""✅ Generated grafana_admin_password.txt"" -ForegroundColor Green

Write-Host """"
Write-Host ""🎉 All secrets generated successfully!"" -ForegroundColor Green
Write-Host ""⚠️  IMPORTANT: Never commit these files to git!"" -ForegroundColor Yellow
Write-Host ""⚠️  .gitignore is configured to exclude *.txt files"" -ForegroundColor Yellow
```

# Definition of Ready (DOR)
- [ ] Secret requirements identified (which services need which secrets)
- [ ] Password complexity requirements defined
- [ ] .gitignore strategy decided to prevent accidental commits
- [ ] Platforms identified (Linux + Windows)

# Definition of Done (DOD)
- [ ] deploy/secrets directory created
- [ ] .gitignore configured to exclude *.txt files
- [ ] README.md with setup instructions created
- [ ] Example files created for all 4 secrets
- [ ] generate-secrets.sh created and tested on Linux
- [ ] generate-secrets.ps1 created and tested on Windows
- [ ] Scripts generate passwords meeting complexity requirements
- [ ] Scripts set correct file permissions (400 on Linux)
- [ ] Tested: Generated secrets work with docker-compose
- [ ] Code review completed

# AI Agent Instructions
1. Create all files in deploy/secrets/ directory
2. NO MOCKS: Scripts must generate REAL random passwords using openssl/RNGCryptoServiceProvider
3. Test password generation: Must be random, not predictable
4. Validate .gitignore prevents accidental commit of .txt files
5. Document password requirements clearly in README
6. Provide both Bash and PowerShell versions for cross-platform support
7. Set restrictive permissions on generated secrets (chmod 400)""",
                                "estimated_time": "2h"
                            }
                        ]
                    }
                ]
            }
        ]
    }

def main():
    print("🚀 Starting Psitrix Psynq Work Package Creation")
    print("=" * 60)

    creator = OpenProjectCreator()

    # Test connection
    try:
        response = creator.session.get(f"{API_URL}/projects/{PROJECT_ID}")
        if response.status_code != 200:
            print(f"❌ Cannot connect to OpenProject: {response.status_code}")
            return
        print("✅ Connected to OpenProject")
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return

    # Create Phase 1 (as example - we can expand this)
    phase1_data = get_phase1_data()

    print(f"\n📊 Phase 1 will create:")
    print(f"   - 1 Phase")
    print(f"   - {len(phase1_data['epics'])} Epics")
    features_count = sum(len(epic['features']) for epic in phase1_data['epics'])
    print(f"   - {features_count} Features")
    tasks_count = sum(len(feature['tasks']) for epic in phase1_data['epics'] for feature in epic['features'])
    print(f"   - {tasks_count} Tasks")
    print(f"   Total: {1 + len(phase1_data['epics']) + features_count + tasks_count} work packages")

    # Ask user to confirm
    confirm = input("\n⚠️  This will create work packages directly in OpenProject. Continue? (y/N): ")
    if confirm.lower() != 'y':
        print("❌ Aborted by user")
        return

    # Create Phase 1
    success = creator.create_phase_hierarchy(phase1_data)

    if success:
        print("
🎉 Phase 1 creation completed!"        print(f"Created {len(creator.created_items)} work packages")
    else:
        print("\n❌ Phase 1 creation failed")

if __name__ == "__main__":
    main()
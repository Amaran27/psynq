# Psitrix Psynq - Cloud Telephony CPaaS Platform

## 🎯 Single Source of Truth

**All project documentation, specifications, and work items are now managed in OpenProject.**

👉 **[OpenProject Workspace](https://openproject.psynq.dev)** - Login to access:
- Work packages (96+ items)
- Architecture specifications
- AI agent guidelines
- Test plans & results
- Deployment guides
- Progress tracking

## 🚀 Quick Links

| Documentation | OpenProject Work Package |
|---------------|------------------------|
| Architecture & Tech Stack | #Architecture Specification |
| AI Role Templates | #AI Agent Guidelines |
| Database Schema | #Canonical Database Schema |
| API Specification | #OpenAPI Specification |
| State Machines | #State Machine Definitions |
| Security & RBAC | #Security Model |
| Error Codes | #Error Catalog |
| Event Schemas | #Event Schema Registry |
| Test Plans | #Testing Catalog |
| Monitoring | #Monitoring & Alerting |
| Deployment Guide | #Deployment Procedures |

## 📦 Project Overview

**Psitrix Psynq** is a production-grade Contact Center as a Service (CCaaS) platform designed to compete with industry giants (Exotel, Ozonetel). Built on an **Asterisk-Centric**, **Provider-Agnostic**, and **Highly Scalable** architecture.

### Tech Stack
- **Frontend**: React 19 + Next.js (App Router), TypeScript, WebRTC, SIP.js
- **Backend**: Node.js + NestJS, REST APIs, WebSockets, event-driven
- **Telephony**: Asterisk 22.7.0 (ARI interface), abstracted via provider interface
- **Data**: PostgreSQL 15, Redis 7, MinIO (S3-compatible)
- **Infrastructure**: Docker + Docker Compose, Linux-only (Ubuntu/Debian)

## 📝 Local Files Status

### ✅ Kept (Generated / README)
- `README.md` (this file - project overview)
- `package.json` (dependencies, scripts)
- `docker-compose*.yml` (deployment configs)

### 📦 Archived (Migrated to OpenProject)
- `.ai/spec.md` → OpenProject #Architecture Specification
- `.ai/ai-role-templates.md` → OpenProject #AI Agent Guidelines
- `WORK-PACKAGE-COMPLETENESS-AUDIT.md` → OpenProject #Documentation Assessment
- All testing docs → OpenProject work packages
- All deployment guides → OpenProject work packages

See [`.archive/ARCHIVED-LOCAL-DOCS.md`](.archive/ARCHIVED-LOCAL-DOCS.md) for complete migration log.

## 🚀 Getting Started

1. **Read Architecture**: OpenProject → #Architecture Specification
2. **Join OpenProject**: Request access from project admin
3. **Claim Work Package**: Assign yourself to tasks in OpenProject
4. **Follow AI Guidelines**: See #AI Agent Guidelines if you're an AI assistant

## 📖 Development Workflow

```bash
# Start development environment
cd deploy
docker-compose up -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f backend
```

## 🔐 Access Credentials

Development credentials are in `.env` files (not in git). Production credentials use Vault.

## 📞 Support

- **Documentation**: OpenProject work packages
- **Issues**: Create work package in OpenProject
- **Questions**: Post in OpenProject comments

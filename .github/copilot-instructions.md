# Psitrix Psynq - AI Coding Guidelines

## Architecture Overview
Psitrix Psynq is a cloud telephony/CPaaS platform with voice-first, web-first, API-first design. Mobile is a supervisor companion app. Follow Phase-1 constraints: no Kubernetes, Kamailio, Kafka, or real-time billing.

## Technology Stack
- **Frontend (Web)**: React 18 + Next.js (App Router), TypeScript, WebRTC, SIP.js/JsSIP, WebSockets
- **Mobile**: React Native, TypeScript, shared core logic
- **Backend**: Node.js + NestJS, REST APIs, WebSockets, event-driven
- **Telephony**: Asterisk (ARI interface), abstracted via provider interface
- **Data**: PostgreSQL (primary), Redis (state/pubsub), MinIO (S3-compatible storage)
- **Infrastructure**: Docker + Docker Compose, NGINX, Linux-only (Ubuntu/Debian)

## Approved Dependencies
Use only approved open-source components with safe licenses for commercial use:
- Asterisk (GPLv2, external control only)
- SIP.js/JsSIP, React/Next.js, NestJS (MIT)
- PostgreSQL, Redis (self-hosted), MinIO (infrastructure use)
- Avoid: Vicidial, FusionPBX, FreePBX (GPL coupling risks)

## Code Organization (Monorepo)
```
/packages
  /core      -> shared logic, models, API clients
  /web       -> React + Next.js
  /mobile    -> React Native
  /backend   -> NestJS services
/deploy     -> docker-compose.yml, scripts, containers
```

## Backend Patterns
- **Hexagonal Architecture**: Domain (pure TS, no NestJS imports) → Ports (interfaces) → Adapters (Nest providers)
- **Call State Machines**: Explicit FSM (IDLE→RINGING→ANSWERED→ON_HOLD→ENDED) with guard conditions
- **Event-Driven**: Commands (StartCall) → Events (CallStarted) via Redis pub/sub
- **Telephony**: Adapter Pattern (TelephonyProvider interface), Command Pattern for actions

## Frontend Patterns
- **Container-Presenter**: Containers handle state/API/events, Views are pure UI
- **State Management**: Centralized store (Zustand/Redux Toolkit) for auth, agent status, calls; local for forms/modals
- **Events**: Subscribe to WebSockets for real-time updates

## Key Conventions
- Mobile shares 70% logic with web via /core
- Telephony abstracted: never call Asterisk directly from business logic
- Role-based access: Admin/Supervisor/Agent with explicit permissions
- Billing: Usage-based batch rating, no real-time
- Deployment: One-click via /deploy, Docker Compose only

## Development Workflow
- Build: `docker-compose up --build` in /deploy
- Test: Unit tests for domain logic, integration for adapters
- Debug: Backend logs via Docker, frontend via browser dev tools
- Avoid: Direct DB access in controllers, logic in Asterisk dialplans, premature microservices

## Operational Rules (SSOT and Artifacts)
- OpenProject work items are the Single Source of Truth (SSOT).
  - Always reflect progress by updating statuses and percentage_done in OpenProject as tasks evolve.
  - Do not use local Markdown files for status tracking or documentation snapshots; record notes in work items.
- Containers-only execution: all commands, builds, tests, and scripts must run inside containerized environments via Docker Compose.
- Architecture compliance is mandatory: Hexagonal Architecture must be implemented strictly.
  - Domain layer must be pure TypeScript with zero NestJS imports.
  - Ports define interfaces/contracts only.
  - Adapters implement ports using frameworks (NestJS providers, TypeORM, bcrypt, etc.).
  - Controllers are thin and use application use cases.
  - Keep business rules out of framework-bound services.

## Agile Workflow (MANDATORY)
### Work Item Lifecycle
1. **Planning**: Query OpenProject for open work items in project #6 (Psitrix Psynq)
2. **Start Work**: Update status to "In progress" (ID: 7), set percentage_done to 10%
3. **During Work**: Update percentage_done incrementally (25%, 50%, 75%)
4. **Complete Work**: Set percentage_done to 100% AND status_id to 12 (Closed)
5. **Update Parent**: When child tasks complete, update parent Epic/Feature progress

### Status IDs (OpenProject)
- `1` = New (default)
- `7` = In progress (working on it)
- `12` = Closed (100% complete, tested, merged)
- `13` = On hold (blocked/waiting)
- `14` = Rejected (won't do)

### Definition of Done (DoD)
Before closing a work item, verify:
- ✅ Code implemented following hexagonal architecture
- ✅ Build successful (`npm run build` passes)
- ✅ Backend/Frontend running without errors
- ✅ Lint errors addressed or documented
- ✅ Manual testing performed
- ✅ OpenProject updated: status=Closed, percentage_done=100%
- ✅ Parent work items updated with aggregate progress

### SSOT Protocol
**ALWAYS** update OpenProject immediately when:
- Starting work on a task
- Completing a milestone (25%, 50%, 75%, 100%)
- Encountering blockers (status=On hold)
- Finishing work (status=Closed + 100%)

**NEVER**:
- Mark 100% without closing the item
- Leave completed work in "In progress" status
- Update local docs instead of OpenProject
- Forget to update parent Epic/Feature progress

## References
- See `docs/` for architecture references and constraints
- Follow guiding principles: APIs over config, reliability over features, phase-based expansion
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

## References
- [docs/readme.md](docs/readme.md) - Complete architecture and constraints
- Follow guiding principles: APIs over config, reliability over features, phase-based expansion
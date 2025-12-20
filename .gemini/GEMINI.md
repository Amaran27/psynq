# Project Context: psynq

## Technology Stack
- **Language:** TypeScript (Backend & Frontend)
- **Backend Framework:** NestJS
- **Frontend Framework:** Next.js (React)
- **Database:** PostgreSQL with TypeORM
- **Telephony:** Asterisk (ARI), Twilio (as SIP Trunk), Mediasoup (WebRTC)
- **State Management:** State Machine in `@psynq/core` for call lifecycles.

## Architectural Principles
- **Ports & Adapters (Hexagonal Architecture):** All external integrations (Telephony, Storage) must be abstracted via Ports (interfaces) and implemented via Adapters.
- **Provider Agnostic:** Business logic in `CallService` should never depend on provider-specific features (e.g., Twilio SIDs). Use the abstraction layer.
- **Mono-repo Structure:** Use npm workspaces (`packages/core`, `packages/backend`, `packages/web`).
- **Asterisk-Centric:** The project is migrating towards routing all telephony through Asterisk. Twilio and other providers should be treated as SIP trunks connected to Asterisk, not direct API targets for call control.

## Coding Standards
- **Strict Typing:** Always use TypeScript interfaces/types. Avoid `any`.
- **Minimal Comments:** Code should be self-documenting. Use comments only to explain "why" complex logic exists.
- **DRY Webhooks:** Consolidate webhook handling into a standard event format to avoid duplicating logic for different providers.
- **State Integrity:** All call state transitions must go through the `CallStateMachine` in the core package.

## Development Priorities
1. Complete the migration of call control logic from Twilio-native to Asterisk-native.
2. Consolidate and standardize webhook processing.
3. Implement robust WebRTC connectivity (SIP.js/Mediasoup) for the web interface.
4. Ensure multi-tenancy (Organization-based isolation) is maintained across all services.

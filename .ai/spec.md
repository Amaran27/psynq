# System Specification & Architecture Source of Truth (Psynq)

## 1. Core Vision
**Psynq** is a production-grade Contact Center as a Service (CCaaS) platform designed to compete with industry giants (Exotel, Ozonetel). It is built on an **Asterisk-Centric**, **Provider-Agnostic**, and **Highly Scalable** architecture. It orchestrates telephony operations through Asterisk ARI while treating external providers (Twilio, etc.) purely as SIP trunks.

## 2. Implementation Status & Roadmap

| Feature | Status | Description |
| :--- | :--- | :--- |
| **Ports & Adapters (Hexagonal)** | ✅ Implemented | Core logic is decoupled from infrastructure via strict Port interfaces. |
| **Asterisk-Centric Telephony** | ✅ Implemented | All call control is handled by Asterisk ARI. Direct provider API calls are removed. |
| **Abstract Event Bus** | ✅ Implemented | Pluggable bus (Local/Redis) for distributed event propagation. |
| **Multi-Tenancy (Isolated)** | ✅ Implemented | Room-based WebSockets and dynamic ARI connection pooling per Organization. |
| **Industry Standard Mappers** | ✅ Implemented | Using `class-transformer` and `class-validator` for all DTOs and entities. |
| **Encrypted Secrets** | ✅ Implemented | AES-256 transparent encryption for all telephony/storage credentials in DB. |
| **Provider-Agnostic Frontend** | ✅ Implemented | `AudioPort` interface with `SipJsAdapter` for Asterisk WebRTC. |
| **Skill-Based ACD (Routing)** | ✅ Implemented | Intelligent queue management based on agent proficiency and LRU idle time. |
| **Visual IVR Flow Builder** | ✅ Implemented | JSON-based workflow engine for custom call logic and DTMF branching. |
| **Real-Time Billing Engine** | ✅ Implemented | Per-second rating, wallet management, and credit-locking for commercialization. |
| **Real-Time AI Coaching** | ✅ Implemented | Live transcription and sentiment analysis via RTP forking. |
| **SIP Proxy Layer (HA)** | ❌ Planned | Kamailio/OpenSIPS integration for carrier-grade high availability. |

## 3. Core Architecture

### Event-Driven Orchestration (Abstract Event Bus)
- **`EventBusPort`**: Decouples `CallService` from `CallGateway`.
- **Plug-and-Play**: Supports `LocalEventBusAdapter` (Single Container) and `RedisEventBusAdapter` (Cloud/Distributed).
- **Events**: `call.new`, `call.updated`, `participant.joined`.

### Multi-Tenant Telephony (`AsteriskAdapter`)
- **Dynamic Connection Pooling**: ARI clients are initialized on-demand per `organizationId`.
- **SIP Trunking**: Outbound calls route through `PJSIP` endpoints defined in tenant settings.
- **Unified Supervisor**: Uses ARI `snoopChannel` for barge/whisper mode.

### Data Integrity & State
- **`CallStateMachine`**: Strict transition enforcement in `@psynq/core`.
- **State Rollback**: `CallService` rolls back DB state if telephony commands (bridging/origination) fail.
- **Agnostic Schema**: Renamed provider-specific columns (e.g., `parentCallSid` -> `externalParentId`).

## 4. Tech Stack

| Layer | Technology | Key Libraries |
| :--- | :--- | :--- |
| **Backend** | NestJS (v11) | `typeorm`, `@nestjs/event-emitter`, `class-transformer` |
| **Frontend** | Next.js (React 19) | `zustand`, `sip.js`, `socket.io-client` |
| **Telephony** | Asterisk (ARI) | `ari-client` |
| **Database** | PostgreSQL | `pg` |
| **Security** | AES-256 | `crypto-js` |

## 5. Non-Negotiable Development Rules

1.  **Provider Agnostic**: Business logic must never mention "Twilio" or "Asterisk" directly. Use `TelephonyPort`.
2.  **No Manual Mapping**: Use `plainToInstance` and `instanceToPlain` for all Entity <-> DTO conversions.
3.  **Strict Validation**: All incoming requests and configuration updates must use `class-validator` DTOs.
4.  **Event-First**: Side effects (notifications, UI updates) must be triggered via `EventBus.publish`.
5.  **Tenant Bound**: Every database query and external command must include an `organizationId`.
6.  **Secret Management**: Sensitive keys in `SettingsService` must be saved with `isSecret: true`.

## 6. Strategic Gap Analysis (The Path to "Giant" Status)

### Infrastructure (Reliability)
To match Exotel/Ozonetel, we must transition from direct-ARI to a **SIP Proxy Tier**.
- **Action**: Introduce **Kamailio** as the signaling entry point. Asterisk should only handle media mixing.

### Billing (Revenue)
CPaaS requires per-second accuracy.
- **Action**: Implement a **Rating Engine** that reads destination prefixes and subtracts credit from a Redis-backed wallet in real-time.

### Intelligence (Value-Add)
Post-call analysis is not enough.
- **Action**: Use **Vosk/Deepgram** via RTP streaming to provide live sentiment alerts to Supervisors.
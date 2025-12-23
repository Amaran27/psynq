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

### Open-Source Production Stack
- **Telephony Engine**: Asterisk ARI (Media handling & Call Control).
- **SIP Proxy / SBC**: Kamailio (Security, Load Balancing, NAT traversal).
- **Provisioning**: Asterisk Realtime Architecture (ARA). Configuration is pulled dynamically from PostgreSQL via ODBC.
- **Media Proxy**: RTPEngine (Handles WebRTC <-> PSTN media bridging).

### Event-Driven Orchestration (Abstract Event Bus)
- **`EventBusPort`**: Decouples `CallService` from `CallGateway`.
- **Plug-and-Play**: Supports `LocalEventBusAdapter` (Single Container) and `RedisEventBusAdapter` (Cloud/Distributed).
- **Events**: `call.new`, `call.updated`, `telephony.channel_entered`, `intelligence.coaching_tip`.

### Provisioning & Scaling (No-Reload Strategy)
- **Zero-Downtime Updates**: Move away from static `.conf` files. 
- **DB-Driven Endpoints**: All PJSIP endpoints (Agents), AORs, and Auth objects are stored in PostgreSQL.
- **Dynamic Identity**: SIP identities are mapped directly to User Entity usernames via the `TelephonyPort` interface.
- **UI Configurability**: The web dashboard interacts with the Backend API, which writes to the Database. Asterisk reflects these changes instantly without a service reload.

### Security & Hardening
- **SBC Layer**: Kamailio acts as the entry point, protecting Asterisk from DoS and brute-force attacks (Planned).
- **WSS & SRTP**: Mandatory encryption for all signaling and media.
- **Environment-Based Secrets**: Database and ARI credentials are never stored in config files; they are injected at runtime via Docker Environment Variables and processed by a custom `entrypoint.sh` templating engine.
- **JWT-Based Auth**: Future migration from static SIP passwords to short-lived tokens for WebRTC clients.

### Real-Time Billing Engine
- **Prefix Rating**: Matches dialed numbers against a hierarchical prefix table (LCR style).
- **Credit Enforcement**: Checks multi-tenant wallet balances before call origination.
- **Per-Second Billing**: Automatically calculates and deducts costs upon `call_ended` events.

### Data Integrity & State
- **`CallStateMachine`**: Strict transition enforcement in `@psynq/core`.
- **Presence Management**: Standardized agent states (`available`, `busy`, `break`, `wrap_up`, `offline`) with automated transitions during call lifecycles.
- **State Rollback**: `CallService` rolls back DB state if telephony commands fail.

## 4. Tech Stack

| Layer | Technology | Key Libraries |
| :--- | :--- | :--- |
| **Backend** | NestJS (v11) | `typeorm`, `socket.io`, `class-transformer`, `langchain` |
| **Frontend** | Next.js (React 19) | `zustand`, `sip.js`, `socket.io-client`, `reflect-metadata` |
| **Telephony** | Asterisk (ARI) | `ari-client` |
| **Transcription** | Deepgram | `@deepgram/sdk` |
| **Database** | PostgreSQL | `pg` |
| **Security** | AES-256 | `crypto-js`, `bcrypt`, `jwt` |

## 5. Non-Negotiable Development Rules

1.  **Provider Agnostic**: Business logic must never mention "Twilio" or "Asterisk" directly. Use `TelephonyPort`.
2.  **No Manual Mapping**: Use `plainToInstance` and `instanceToPlain` for all Entity <-> DTO conversions.
3.  **Strict Validation**: All incoming requests and configuration updates must use `class-validator` DTOs.
4.  **Event-First**: Side effects (notifications, UI updates) must be triggered via `EventBus.publish`.
5.  **Tenant Bound**: Every database query and external command must include an `organizationId`.
6.  **Secret Management**: Sensitive keys in `SettingsService` must be saved with `isSecret: true`.
7.  **Decorator Resilience**: Always import `reflect-metadata` in frontend entry points to support `@psynq/core` models.

## 6. Strategic Gap Analysis (The Path to "Giant" Status)

### Infrastructure (Reliability)
To match Exotel/Ozonetel, we must transition from direct-ARI to a **SIP Proxy Tier**.
- **Action**: Introduce **Kamailio** as the signaling entry point. Asterisk should only handle media mixing.

### Billing (Revenue)
✅ **Implemented**: Per-second rating engine with prefix matching and pre-call balance enforcement.

### Intelligence (Value-Add)
✅ **Implemented**: Real-time STT (Deepgram) + LLM (LangChain) coaching tips via RTP forking.
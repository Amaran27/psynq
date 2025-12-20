# System Specification & Architecture Source of Truth

## 1. Core Vision
**Psynq** is a Contact Center as a Service (CCaaS) platform designed to be **UI-Centric and Multi-tenant**. It orchestrates telephony and storage operations across multiple providers while maintaining strict tenant isolation and dynamic configuration. The system supports a wide range of roles from Agents to System Administrators, providing a provider-agnostic experience powered by a unified state machine.

## 2. Current Architecture (Hexagonal & Multi-tenant)

The system follows the **Hexagonal Architecture (Ports and Adapters)** pattern with a specialized layer for multi-tenancy.

### Context & Identity Layer
-   **`TenantInterceptor`**: Extracts `organizationId`, `userId`, and `roles` from the JWT and attaches them to the request context.
-   **`SettingsEngine`**: A hierarchical configuration system that resolves settings using the following lookup order: **Redis Cache** -> **Organization-Specific DB** -> **System-Default DB**.
-   **RBAC (Role-Based Access Control)**: Enforces access levels (`AGENT`, `SUPERVISOR`, `ADMIN`, `SYSTEM_ADMIN`) via the `RolesGuard`.

### Core Domain (`packages/core`)
-   **`CallStateMachine`**: Enforces strict state transitions (`IDLE` -> `RINGING` -> `ANSWERED` <-> `ON_HOLD` -> `ENDED`).
-   **Shared Types**: `Call`, `CallState`, `CallDirection`.

### Ports (`packages/backend/src/ports`)
-   **`TelephonyPort`**: Contract for telephony operations. Methods accept `organizationId` or `Call` entities for context-aware routing.
-   **`StoragePort`**: Contract for file storage. Methods accept `organizationId` for dynamic credential resolution.

### Adapters (`packages/backend/src/adapters`)
1.  **`TelephonyRouterAdapter` & `StorageRouterAdapter`**: 
    -   **Pattern**: Strategy Pattern.
    -   **Role**: Primary implementations injected into services. They dynamically resolve configurations via the `SettingsService` and delegate to specific provider adapters.
2.  **Revised Architecture (Asterisk-Centric)**:
    -   **Primary Telephony**: `AsteriskAdapter` serves as the main telephony hub
    -   **SIP Trunking**: `TwilioAdapter` configured as SIP trunk provider for PSTN access
    -   **Provider Flexibility**: Multiple SIP providers can be configured in Asterisk
    -   **Frontend Integration**: WebRTC/SIP.js connects directly to Asterisk for browser-based communications
3.  **Dynamic Adapters**: All provider-specific adapters re-initialize their underlying SDK clients on-the-fly using decrypted credentials fetched from the `SettingsEngine` for each request.

## 3. Tech Stack Audit

| Component | Technology | Version | Key Libraries |
| :--- | :--- | :--- | :--- |
| **Backend** | Node.js / NestJS | v11 | `@nestjs/core`, `@nestjs/cache-manager` |
| **Database** | PostgreSQL | v15+ | `pg`, `typeorm` |
| **Caching** | Redis | - | `ioredis`, `cache-manager-ioredis` |
| **Telephony** | Asterisk-Centric | - | `ari-client`, `twilio` (SIP trunking), `sip.js` |
| **Storage** | Object Storage | - | `@aws-sdk/client-s3`, `minio` |
| **Security** | Encryption | AES-256 | `crypto-js` |

## 4. Data Contract

### Organization Entity (`organizations`)
Represents a tenant in the system.
```typescript
{
  id: string;                 // UUID
  name: string;               // Tenant Name
  createdAt: Date;
}
```

### Setting Entity (`settings`)
Universal configuration store.
```typescript
{
  id: string;
  organizationId?: string;    // Null for system defaults
  key: string;                // e.g., 'telephony.twilio.config'
  value: JSONB;               // Encrypted if isSecret=true
  isSecret: boolean;          // Masked in UI returns
}
```

### Call Entity (`calls`)
```typescript
{
  id: string;                 // Internal UUID or Provider SID
  organizationId: string;     // Tenant ID
  state: CallState;
  direction: CallDirection;
  from: string;
  to: string;
  agentId?: string;
  externalId?: string;
  providerMetadata?: JSONB;   // Store provider-specific IDs
}
```

### Recording Entity (`recordings`)
```typescript
{
  id: number;
  callId: string;
  url: string;                // Resolved via StorageRouter
  key: string;                // recordings/{callId}/{timestamp}.wav
  contentType: string;
}
```

## 5. Resolved Architectural Decisions

1.  **UI-Centric Configuration**: Shifted from `.env` files to a database-backed `SettingsEngine`, allowing per-tenant infrastructure overrides without service restarts.
2.  **Context-Aware Routing**: All infrastructure ports now require `organizationId`, ensuring that business logic never accidentally leaks data between tenants.
3.  **On-the-Fly Initialization**: Infrastructure clients are stateless and created using the context of the current request, enabling a truly multi-cloud/multi-provider deployment.
4.  **Encryption at Rest**: All sensitive credentials (API Keys, Secrets) are stored encrypted in the database and only decrypted in-memory during request execution.
5.  **Asterisk-Centric Telephony (NEW)**: Asterisk serves as the central telephony hub with Twilio and other providers configured as SIP trunks, providing:
    - Unified call control through Asterisk ARI
    - Provider-agnostic PSTN access via multiple SIP trunks
    - Advanced PBX features (IVR, queuing, recording, conferencing)
    - Simplified frontend architecture with direct Asterisk WebRTC connection

## 6. Non-Negotiable Development Rules

1.  **ZERO Static Config**: No business or infrastructure logic may rely on `.env` for tenant-specific data. All config must come from `SettingsService`.
2.  **RBAC Enforced**: All settings and administrative endpoints must be protected by `RolesGuard`. Only `ADMIN` or `SYSTEM_ADMIN` can modify configuration.
3.  **Encrypted Secrets**: All UI-configured API keys must be saved with `isSecret: true` to ensure they are encrypted at rest.
4.  **Provider Agnostic Logic**: Business logic must use the `Router` adapters and `getCapabilities()` to interact with infrastructure.
5.  **Tenant Isolation**: Every entity modification and infrastructure call must be scoped by `organizationId`.
6.  **Unified Bridging**: All bridging must use the unified `bridgeParticipants` method.
7.  **Asterisk Supervisor**: Asterisk supervisor features must use ARI Snoop logic (`snoopChannel`).

## 7. Migration Plan: Multi-Provider to Asterisk-Centric Architecture

### Phase 1: Configure Asterisk SIP Trunking
1. Set up Twilio Elastic SIP Trunking in Twilio Console
2. Configure Asterisk PJSIP trunk settings for Twilio
3. Test basic outbound calls through Asterisk → Twilio → PSTN
4. Configure inbound routing from Twilio numbers to Asterisk

### Phase 2: Update Backend Architecture
1. Modify `TelephonyRouterAdapter` to route all calls through `AsteriskAdapter`
2. Update `AsteriskAdapter` to handle SIP trunk selection
3. Implement provider failover logic in Asterisk dialplan
4. Add least cost routing configuration in Asterisk

### Phase 3: Frontend Migration
1. Replace Twilio Voice SDK with SIP.js/WebRTC for Asterisk connection
2. Update authentication to use Asterisk user credentials
3. Implement WebRTC media handling through Asterisk
4. Test browser-to-Asterisk audio connectivity

### Phase 4: Advanced Features Implementation
1. Configure Asterisk IVR and queuing systems
2. Implement call recording storage through MinIO/S3
3. Set up supervisor monitoring features (barge/whisper)
4. Configure real-time reporting and analytics

### Phase 5: Cleanup and Optimization
1. Remove direct Twilio API dependencies (except for account management)
2. Optimize Asterisk performance and resource usage
3. Implement monitoring and alerting for Asterisk services
4. Document new architecture and operational procedures

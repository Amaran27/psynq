# Psitrix Psynq

## Product, Architecture, and Technology Decisions (Phase 1 / v1)

---

## 1. Overview

**Psitrix Psynq** is a **cloud telephony / CPaaS platform** designed for advanced call handling, routing, and supervision, comparable to platforms such as Ozonetel, Exotel, and Knowlarity.

Psynq is **voice-first**, **web-first**, and **API-first**, with mobile positioned as a **supervisor and admin companion**, not a replacement for the web platform.

This document defines the **Phase‑1 (v1) architecture**. Advanced orchestration, SIP proxy layers, and large-scale distributed systems are **intentionally deferred** to preserve portability, simplicity, and execution velocity.

The platform abstracts all telephony infrastructure (Asterisk, SIP, carriers) behind a clean UI and APIs. Customers never interact with PBX-level configuration.

---

## 2. Product Scope (What Psynq Is)

Psynq provides:

* Virtual numbers
* Inbound & outbound calling
* IVR and call routing
* Agent call handling
* Supervisor monitoring (whisper, barge)
* Call recording
* Reporting and analytics
* APIs and webhooks

Psynq is **not**:

* A PBX product
* A dialplan-exposed system
* A chatbot or AI research platform

---

## 3. Core Feature Set

### 3.1 Voice & Telephony

* Virtual numbers (local / toll‑free)
* SIP‑based inbound and outbound calling
* IVR with DTMF
* Time‑based and queue‑based routing
* Call forwarding and failover
* Call recording

### 3.2 Agent Capabilities

* Web‑based softphone
* Answer / hold / mute / transfer
* Warm and cold transfers
* Call notes and dispositions
* Call history

### 3.3 Supervisor Capabilities

* Live call monitoring
* Agent status tracking
* Whisper (coach agent privately)
* Barge (join active call)
* Call recording playback

### 3.4 Reporting

* Call volume
* Answered vs missed
* Agent performance
* Queue wait times
* Date and number‑based filters

---

## 4. Messaging & Adjacent Channels

### 4.1 SMS (Phase 1)

* Transactional SMS API
* OTP and notification use cases
* Delivery reports (DLRs)
* Missed‑call follow‑up SMS

### 4.2 Missed Call Services (Phase 1)

* Missed call detection
* Auto‑callback
* IVR trigger on callback
* SMS / webhook follow‑up

### 4.3 WhatsApp (Deferred to Phase 2)

* WhatsApp Business API integration
* Inbound and outbound template messages
* Basic agent routing

---

## 5. Customer Interaction Model

Customers interact only with:

* Web UI (admin, agent, supervisor)
* REST APIs
* Webhooks

Customers never interact with:

* Asterisk
* SIP configurations
* Dialplans
* RTP streams

If a customer asks for Asterisk access, the abstraction has failed.

---

## 6. Mobile App Strategy

### 6.1 Purpose of Mobile App

The mobile app is a **selling point**, positioned as a **supervisor and admin companion**.

It is not intended to replace the web console.

### 6.2 Mobile App Capabilities

**Admin / Supervisor:**

* Live dashboards
* Agent status
* Active call counts
* Reports (read‑only)
* Alerts and notifications

**Advanced Supervision:**

* Whisper (via PSTN join)
* Barge (via PSTN join)

### 6.3 Mobile App Limitations

* No IVR editing
* No billing configuration
* No carrier routing changes
* No heavy data exports

---

## 7. Whisper & Barge Design

### Phase 1 (v1)

* PSTN‑based supervisor join
* System calls supervisor’s phone and bridges into live call
* High reliability and low operational risk

### Phase 2 (Optional)

* In‑app VoIP whisper / barge using WebRTC

All whisper and barge actions are:

* Role‑restricted
* Audited
* Logged for compliance

---

## 8. Technology Stack (Phase 1 – Final)

### 8.1 Frontend (Web)

* **React 18**
* **Next.js (App Router)**
* TypeScript
* WebRTC
* SIP.js / JsSIP
* WebSockets

Used for:

* Admin portal
* Agent console
* IVR builder
* Reports

---

### 8.2 Mobile App

* **React Native**
* TypeScript
* Shared core logic with web
* Push notifications (FCM / APNs)

Flutter is intentionally not used due to weaker WebRTC and SIP ecosystem support.

---

### 8.3 Backend (Control Plane)

* **Node.js + NestJS**
* REST APIs
* WebSockets
* Event‑driven architecture

Responsibilities:

* Call flow logic
* Routing decisions
* Agent and supervisor state
* Reporting APIs
* Billing and usage tracking

Billing model (v1):

* Usage‑based batch rating
* Configurable credit limits
* Real‑time rating deferred

Call state ownership:

* Backend + Redis is the source of truth for active calls and agent presence

API stability:

* Versioned APIs with backward‑compatibility guarantees

---

### 8.4 Telephony Layer

* **Asterisk** (media and SIP engine)
* **ARI (Asterisk REST Interface)**
* Minimal dialplan logic

Asterisk is an internal infrastructure component and is never customer‑facing.

SIP scaling (v1):

* Controlled horizontal scaling of Asterisk instances
* SIP proxy layers (e.g., Kamailio) intentionally deferred

Telephony abstraction:

* Telephony is exposed via a provider interface
* Asterisk is the default implementation
* Future engines can be added without impacting product APIs

---

### 8.5 Data & State Layer

* **PostgreSQL** – primary database (replication supported)
* **Redis** – call state, agent presence, pub/sub (replication or restart‑safe configuration per deployment)
* **MinIO** – S3‑compatible object storage for call recordings

---

### 8.6 Infrastructure & Deployment

* **Docker** (all components containerized)
* **Docker Compose** (primary orchestration for portability and simplicity)
* **NGINX** (HTTP APIs, WebSockets, and frontend load balancing)
* CI/CD via GitHub Actions or GitLab CI

Docker Compose is used for portability and controlled scaling. Cluster‑level orchestration is intentionally out of scope for Phase 1.

Failure modes (explicit):

* Backend down → UI isolated, calls continue
* Asterisk down → active calls drop
* Redis unavailable → real‑time features degrade

Asterisk containers are deployed with explicit RTP port ranges and host‑level networking where required to preserve call quality.

---

### 8.7 Security & Access Control

* Role‑based access control (Admin, Supervisor, Agent)
* Secure API authentication (token‑based)
* Encrypted transport for APIs and WebSockets
* Secrets managed per deployment environment

---

### 8.8 Operating System

**Target OS: Linux only**

* Ubuntu Server LTS or Debian

Windows and macOS are not supported for production.

---

## 9. Code Organization Strategy

### Monorepo (Recommended)

```
/packages
  /core      -> shared logic, models, API clients
  /web       -> React + Next.js
  /mobile    -> React Native
  /backend   -> NestJS services
/deploy     -> one‑click install and operations
  docker-compose.yml
  /scripts
    install.sh
    migrate.sh
  /telephony -> Asterisk container
  /storage   -> MinIO container
  /frontend  -> Next.js container
  /nginx     -> load balancer config
```

This enables:

* 60–70% code sharing
* Clear separation of concerns
* Portable, repeatable deployments

---

## 10. Deployment Modes

Supported in Phase 1:

* Single‑node (POC / demo)
* Multi‑container single host
* Multi‑host (manual scaling)
* Cloud or on‑prem installations

Advanced orchestration (e.g., Kubernetes) is deferred until justified by scale.

---

## 11. Product Positioning

**Psitrix Psynq**

> A modern, voice‑first cloud telephony platform for intelligent call handling, supervision, and reporting — accessible from web and mobile.

---

## 12. Guiding Principles

* Web‑first, mobile‑companion
* Telephony infrastructure is invisible
* APIs over configuration
* Reliability over feature count
* Phase‑based expansion
* Minimal components for low friction
* Maximum portability
* Scalability without premature complexity
* Containerized for consistency
* Compliance enforced per jurisdiction

---

## 13. Deferred Components (Explicit Non‑Goals for Phase 1)

* Kubernetes
* SIP proxies (Kamailio / OpenSIPS)
* Distributed event platforms (Kafka)
* Real‑time billing
* AI / bot‑driven interactions

These may be introduced in later phases without impacting customer‑facing APIs.

---

## 14. Next Logical Steps

* Lock MVP feature checklist
* Draw inbound call lifecycle
* Implement backend and telephony provider interface
* Validate one‑click deployment
* Begin pilot customer onboarding
* Target 99.9% uptime for core control‑plane services under supported deployments

---

## 15. Open-Source Components and Licensing

### Approved Open-Source Stack

Use battle-tested open-source building blocks for infrastructure, while keeping orchestration, UX, and product logic proprietary.

#### Telephony Layer
- **Asterisk** (GPLv2): Use unmodified via ARI for external control
- **FreeSWITCH** (MPL 1.1): Future addition for high concurrency

#### SIP/WebRTC Libraries
- **SIP.js / JsSIP** (MIT): Safe for modification and commercial redistribution
- **WebRTC** (BSD): Industry standard

#### Backend & Infrastructure
- **NestJS** (MIT)
- **Node.js** (MIT)
- **PostgreSQL** (PostgreSQL License)
- **Redis** (RSAL): Self-host only
- **MinIO** (AGPLv3): Use as infrastructure only, not as resold service
- **NGINX** (BSD-like)
- **Docker/Docker Compose** (Apache 2.0)

#### Frontend & Mobile
- **React/Next.js** (MIT)
- **React Native** (MIT)
- **Redux Toolkit** (MIT)

### Components to Avoid
- Vicidial (GPL, dialplan-coupled)
- FusionPBX (GPL-adjacent, PBX-first)
- FreePBX (GPL, UI/workflow coupling)
- OpenSIPS UI bundles (product coupling)

### Licensing Safety
All approved components are safe for commercial use with proper usage patterns (external control for Asterisk, infrastructure-only for MinIO).

---

**This document defines the agreed Phase‑1 architecture and constraints for Psitrix Psynq.**

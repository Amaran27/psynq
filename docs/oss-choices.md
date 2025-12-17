# OSS Choices & License Guidance

Purpose: a short reference for open-source options relevant to Psynq features (media bridge, recording, transcription, storage, and related infra). This document lists candidate projects, recommended usage patterns (embed vs run-as-service), and license notes to help avoid accidental copyleft obligations before redistribution.

---

## Summary guidance
- Prefer **permissive** licenses (MIT / Apache‑2.0 / BSD) for components we plan to embed or redistribute. These are safe for commercial products without forcing source distribution.
- Treat **copyleft** licenses (GPL, AGPL, MPL variants) with care. Use them as separate services (black‑box) or obtain a commercial license / legal sign‑off before redistribution.
- For storage and heavy infra, prefer managed services (AWS S3, Azure Blob, GCS) or well-understood OSS with permissive licensing if you need an on‑prem option.
- Always run a legal check before shipping a component that could affect redistribution obligations.

---

## Candidate projects (feature → project → recommended usage → license notes)

### Media / SFU / media bridge
- mediasoup — production-grade SFU
  - Usage: run as a service or embed (Node.js); **recommended** for any server‑side media bridging/recording PoC.
  - License: MIT (permissive).

- Janus Gateway — WebRTC gateway
  - Usage: run as a service (gateway/SFU); good for server-side bridging if required.
  - License: permissive (verify current license before redistribution).

- Jitsi (Videobridge) — conferencing stack
  - Usage: run as service for conferencing/video needs; Apache‑2.0 (permissive).

- Asterisk — PSTN telephony engine
  - Usage: powerful telephony features; **run-as-service or use provider offering**. Caution: Asterisk is GPLv2 — modifying/distributing combined binaries may carry obligations.

### Transcription / ASR
- OpenAI Whisper (open-source model implementations) / community wrappers
  - Usage: on‑prem transcription server or batch job for transcripts; check model usage terms.
  - License: open-source (many wrappers are MIT). Verify.

- Vosk (Kaldi-based) / Whisper wrappers
  - Usage: on‑prem ASR for privacy/compliance; typically permissive (Apache‑2.0) — verify final package license.

### Recording & Storage
- MinIO (S3‑compatible) — local / on‑prem object storage
  - Usage: great for local/dev and S3‑compatible APIs. **IMPORTANT**: verify MinIO server license (project has had license changes historically). If redistribution or embedding is a requirement, seek legal review.

- Ceph / Rook — on‑prem object store (enterprises)
  - Usage: long-term on‑prem storage; check operational costs and license.

- AWS S3 / Azure Blob / GCS — managed cloud storage
  - Usage: recommended for production (no redistributable license issues).

### Call recording, QA, analytics
- Build app-level logic (RecordingEntity, metadata, ingestion, transcription hooks) using our own code (no license issue).
- For automated QA/score engines, prefer permissive libs for NLP or build on top of transcription outputs.

### Others (supporting tools)
- Prometheus / Grafana (monitoring): permissive and standard for metrics/alerts.
- PostgreSQL (database): permissive-like (PostgreSQL license), fine for embed/redistribute; follow DB vendor terms.

---

## Practical rules for Psynq
1. Use permissive OSS (MIT/Apache/BSD) when you plan to bundle or redistribute. Examples: mediasoup, Jitsi (Apache), many ASR wrappers.
2. If a tool is GPL/AGPL (e.g., Asterisk, some older projects), run it as an independent service and avoid incorporating its code into redistributed binaries without legal signoff.
3. For object storage, prefer managed providers in production to avoid license and operational complexities. MinIO is useful for dev; check its license for redistribution scenarios.
4. Document each chosen component + license in `docs/oss-choices.md` and add a legal-review checklist prior to any distribution.

---

## Next steps / action items
- [ ] Add this doc to the repo (done).  
- [ ] For each planned backend feature (recording, SFU, ASR), pick a candidate OSS and add it to a `legal-review` checklist.  
- [ ] Ask the legal team to sign off on any copyleft components before we redistribute or bundle them.

If you want, I can: (A) add component selections for our immediate roadmap (recordings PoC: mediasoup + MinIO + Whisper/Vosk) and create a legal-review ticket, or (B) open a PR for this doc and add the legal checklist items to the todo list. Which do you prefer? (A / B)

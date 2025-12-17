# Mediasoup Production Scaffold (Local-first)

Objective: build a production-grade, local-first mediasoup + coturn environment for development/testing that is safe, observable, and reproducible. This scaffold is intended to be "production-like" (configuration, metrics, logging), but run locally via Docker Compose before migrating to cloud/k8s.

Key design points
- Node-native SFU (mediasoup) for deep app integration and fine-grained control.
- coturn for TURN relaying (long-term auth in prod, TLS/DTLS enabled when deploying externally).
- Local MinIO acting as S3-compatible storage for recordings and artifacts.
- Prometheus + Grafana for metrics and dashboards. Export mediasoup & Node metrics.

Run locally
1. cd `deploy/mediasoup`
2. docker-compose up --build -d
3. Start the signal server: `docker logs -f psynq-mediasoup-signal` to see status

Developer notes
- Mediasoup requires native libs and may need additional build dependencies for the worker image (build-essential, python3, libsrtp, etc.). Use the CI to produce reproducible images.
- Keep secrets out of .env for production. Use Vault or local dev mode of Vault for secrets in development.

Next tasks (short term)
- Implement `MediasoupService` worker spawn & lifecycle management with graceful shutdown. ✅ DONE
- Provide a secure local configuration for TURN (long-term auth with HMAC) and add TLS certificates for DTLS if possible.
- Add synthetic tests that run headless WebRTC clients and exercise TURN + SFU. ✅ DONE (basic WebRTC support test with puppeteer)
- Hook recording ingestion to MinIO and add persistence for metadata in DB.

Security
- For local development, a minimal test user is used for coturn; for production, rotate to HMAC and TLS, store keys in Vault.

Operational
- Add Prometheus config for scraping mediasoup metrics and Node metrics. ✅ DONE (prom-client integrated, /mediasoup/metrics endpoint)
- Add Grafana dashboards for worker CPU, memory, RTP packet loss, jitter and TURN bandwidth.

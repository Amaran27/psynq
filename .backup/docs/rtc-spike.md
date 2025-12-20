# RTC Spike (Phase‑0)

Purpose: create a simple local environment to validate WebRTC client → TURN → media server (Janus/mediasoup) flows and to capture TURN/SFU observability needs.

Components included:
- coturn (TURN server) — for NAT traversal and as relay fallback
- Janus (WebRTC server) — provides general-purpose WebRTC bridging and recording plugins for POC

How to run (local dev):
1. cd `deploy/rtc`
2. docker-compose up -d
3. Open `http://localhost:8088` for Janus demos (if included in image) or inspect Janus log to find demo pages.
4. Configure your browser demo to use ICE servers:
   - STUN/TURN: `[{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'turn:localhost:3478', username: 'testuser', credential: 'testpass' }]`

Notes & recommendations:
- This is strictly for local development. Do NOT expose the TURN server to the public internet with weak credentials.
- For production, replace Janus with Mediasoup if you want an SFU with fine-grained Node.js integration (mediasoup requires native build steps). Both Janus and mediasoup are proven options - pick based on team skill (mediasoup=Node.js, Janus=C plugin extensibility).
- For TURN production, use long-term credential mechanism and TLS/DTLS where supported. Monitor TURN bandwidth and capacity (plan starting bandwidth and scaling rules).

Next steps for the spike:
- Add a minimal client demo that connects to Janus and performs a 1:1 audio call through TURN when necessary.
- Capture WebRTC stats (getStats) and export to backend for analytics (RTP packet counts, jitter, packet loss).
- Add synthetic test to run nightly that exercises TURN and SFU.

Security: ensure TLS for signalling and media in production, and restrict IP access for SIP/ARI servers (do not publicly expose SIP ports without SBC).

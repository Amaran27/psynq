# Asterisk Integration (Phase‑0 Spike)

This document describes a minimal local development setup and the spike plan to validate Twilio ↔ Asterisk connectivity and event correlation.

## Goals
- Run an Asterisk dev container with ARI enabled.
- Validate ARI events (StasisStart, ChannelHangup) are received by `AsteriskAdapter`.
- Simulate incoming SIP events and confirm `CallService` reconciliation (parentCallSid mapping behavior).

## Local dev steps
1. Start Asterisk container:
   - cd `deploy/asterisk` && docker-compose up -d
   - Add `ari.conf` and ensure ARI user/password are set. Expose HTTP ARI on port `8088`.
2. Configure Asterisk dialplan to push calls to `Stasis('psynq-app')` so ARI `StasisStart` events are emitted.
3. For quick tests, use `curl` or `ari-client` to trigger events or originate channels.

## Test plan
- Unit tests: add a jest spec to verify adapter `setCallReceivedCallback` and `handleIncomingCall` behavior.
- Integration test (manual): originate a channel into the Stasis app and verify backend receives a call update.

## Notes
- For connecting Twilio Elastic SIP Trunk to local Asterisk for full end‑to‑end testing you will need a public reachable endpoint (SBC or cloud VM) or use a public NAT + secure firewall rules. For early validation we simulate events locally.
- Keep security in mind: do not expose SIP/ARI to the public internet in production without an SBC or hardened firewall.
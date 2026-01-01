# Development Docker Compose

This document explains how to run the frontend and backend in development containers.

Quickstart

1. Build and start dev services:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
```

2. Check health:

```bash
# backend
curl http://localhost:3001/health
# frontend
curl http://localhost:3000/
```

3. Logs:

```bash
docker compose logs -f backend
docker compose logs -f web
```

Notes & debugging

- Hot reload: Both services use bind-mounted volumes and run the project in watch/dev mode (`nest start --watch`, `next dev`) so editing files on the host triggers reload inside the container.
- Databases / Asterisk: Containers use `host.docker.internal` to reach services that are running on the host or in other compose stacks mapped to host ports (e.g., Asterisk on 8088/8089, Postgres on 5432). If you run the whole stack in compose, adjust environment variables accordingly.
- Debugging Node:
  - Backend exposes `9229` for the Node inspector. Start the container and attach VS Code to `localhost:9229`.

Playwright tests

- You can run Playwright on the host against the containerized services. For CI, consider adding a Playwright test container in the same compose stack.

If you want, I can now bring the dev compose up and run the Playwright `make_call.spec.ts` test against it, then iterate on failures (it will likely require verifying the `ASTERISK_WEBRTC_URI` and network reachability).
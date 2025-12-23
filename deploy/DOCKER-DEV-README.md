## Development Docker Compose for Psynq

This file (`docker-compose.dev.yml`) is a development override that runs the `backend` and `web` services inside containers using the project's source code (bind-mounted).

Main features:
- Uses `packages/backend/Dockerfile.dev` and `packages/web/Dockerfile.dev`.
- Mounts source as volumes so edits on the host trigger in-container watchers (`nest start --watch`, `next dev`).
- Maps debug port `9229` for Node (backend) so you can attach a debugger.
- Uses `host.docker.internal` so containers can reach host services (Asterisk) mapped to the host.

Commands:

Start (build & run):
```
docker compose -f docker-compose.dev.yml up --build
```

Start in background:
```
docker compose -f docker-compose.dev.yml up --build -d
```

Stop and remove containers:
```
docker compose -f docker-compose.dev.yml down
```

Debugging (attach VS Code to backend):
1. Expose `9229` in `docker-compose.dev.yml` (done).
2. Start backend with `npm run start:dev` (the container CMD does that by default).
3. In VS Code create an "Attach to Node" configuration pointing to `localhost:9229` and attach.

Notes:
- Hot reload is handled by `nest` (`--watch`) and Next (`next dev`). Docker does not automatically restart containers on code changes, the dev servers inside the container do.
- If you run Playwright from the host, point API calls to `http://localhost:3001` and UI at `http://localhost:3000`.
- If Asterisk or DB are not accessible inside the container via `host.docker.internal`, ensure Asterisk ports are published on the host (docker-compose used to run Asterisk in this repo maps ports 8088/8089 to host).

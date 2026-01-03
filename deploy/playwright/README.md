Playwright automation to trigger outbound call from web UI

Overview

This folder contains a Playwright test that automates the web UI to place an outbound call. It cannot be executed from the remote assistant unless you grant remote access; run it locally in your dev environment where the web app and Asterisk are reachable.

Prereqs

- Node 18+ installed
- From repo root: `npm install -D @playwright/test`
- The web app running (e.g. http://localhost:3000) and backend/ARI configured

Configuration

Create a `.env` file in this folder (or export env vars) with:

APP_URL=http://localhost:3000
USERNAME=your-username
PASSWORD=your-password
DIAL_NUMBER=+918608273468

If your UI uses different selectors than the defaults, update `selectors` in the test file.

Run

From repo root:

```powershell
npx playwright test deploy/playwright/make_call.spec.ts --project=chromium
```

Fast quality gate (recommended)

This repo has a strict quality goal: **zero browser console warnings/errors** and **zero failing API calls** in the core UI flow.

The test `deploy/playwright/console_gate.spec.ts` fails if:
- the page emits any `console.warn` or `console.error`
- any `fetch`/`xhr` request returns a 4xx/5xx
- the page throws an unhandled error

Run it container-only (recommended)

This keeps execution fully containerized and uses a Playwright image with browsers preinstalled.

```powershell
docker compose -f deploy/playwright/docker-compose.playwright.yml run --rm playwright
```

If you need to override credentials without creating `deploy/playwright/.env`, you can pass env vars:

```powershell
$env:APP_URL="http://localhost:3000"; $env:USERNAME="sysadmin"; $env:PASSWORD="PsynqAdmin2025!!"; docker compose -f deploy/playwright/docker-compose.playwright.yml run --rm playwright
```

What the script does

- Navigates to APP_URL
- Signs in with USERNAME/PASSWORD (if selectors match)
- Opens the call UI and enters `DIAL_NUMBER`
- Clicks the call button

Notes

- You may need to adapt selectors to match your UI components (data-testid or class names help).
- Run `docker logs -f psynq-asterisk` and enable `pjsip set logger on` in Asterisk CLI to watch SIP/INVITE flow while the test runs.

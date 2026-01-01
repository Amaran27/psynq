Minute-level Task Template

Title: [<estimate_mins>m] Short descriptive title
Type: Task
Release: <ReleaseName or Number>
Priority: <Immediate/High/Medium/Low>
Estimate_minutes: <integer>
Owner_role: <backend-dev/frontend-dev/qa/sre/designer>
Dependencies: <work package IDs or subjects>
Tags: <comma-separated>

Description:
- Short summary (1-2 lines)

Acceptance Criteria (must be testable):
1. Given <preconditions>, when <action>, then <expected result>.
2. <Non-functional expectations e.g., latency, error codes>

Steps (minute-level breakdown):
1. [<mins>] Create/Update OpenAPI spec or contract
2. [<mins>] Implement endpoint/service/module
3. [<mins>] Unit tests (include file names)
4. [<mins>] Integration test using mock or staging service
5. [<mins>] Add CI job / pipeline step
6. [<mins>] Code review + merge gating

Inputs:
- Required files, API specs, seed data, credentials (use dev secrets)

Outputs:
- Code changes, tests, updated OpenAPI, acceptance test results

Definition of Done:
- All steps complete, CI green, acceptance tests pass, OpenAPI validated, review signoff obtained

Notes:
- Always reference parent Epic and link to contract tests when changing interfaces.
- For parallel teams: include explicit input/output artifact examples and a contract test that both teams run.

Example:
Title: [30m] Implement POST /calls/start
Type: Task
Release: MVP-1
Priority: Immediate
Estimate_minutes: 30
Owner_role: backend-dev

Description:
- Implement API to start an outbound call.

Acceptance Criteria:
1. POST /calls/start returns 201 with call_id and initial state RINGING.
2. DB contains call record with status RINGING.
3. OpenAPI spec contains request/response schema; validated in CI.

Steps:
1. [5m] Add OpenAPI spec for POST /calls/start
2. [15m] Implement controller + service + validation
3. [5m] Unit tests for controller/service
4. [3m] Integration test using local Asterisk mock
5. [2m] Add CI e2e test step

DoD:
- Tests pass on CI preview, OpenAPI validated, review signoff.

# AI Assistant Role Templates

These templates are to be appended to work package descriptions so AI agents understand how to act when assigned.

## Developer
AI role: **Developer** — Implement code changes, add unit and integration tests, follow repository coding standards (ESLint/Prettier, Black/Flake8 where applicable). Avoid hardcoded credentials or environment-specific values; use sandbox integrations and secrets from Vault. Add consumer-driven contract tests for provider adapters and include migration scripts, changelog, and documentation updates. Open PR with tests and clear description; include runbook for deployment and rollback.

## Tester
AI role: **Tester** — Reproduce issues, write reproducible steps, run integration and e2e tests against sandbox environments, collect logs, and provide failure reports. Create test cases and automated tests where applicable; validate fixes and perform regression testing. Add test artifacts to PRs and reference the related work package.

## Analyst / Spec Writer
AI role: **Analyst** — Produce design documents, sequence diagrams, OpenAPI specs, data model schemas, and acceptance criteria. Define test cases and non-functional requirements (performance, scale, security). Collaborate with stakeholders to finalize requirements.

## SRE / Ops
AI role: **SRE** — Add monitoring queries, alert rules, runbooks, canary test plans, and load-test scripts. Define healthchecks, capacity planning, and DR runbooks. Ensure observability (metrics, logs, traces) and automate recovery steps.

## QA / Auditor
AI role: **QA/Auditor** — Execute audit plans, run security/pen tests, verify compliance checklists, and confirm policy adherence (no-hardcodes, sandboxed tests). Produce audit reports and remediation tickets.

---

Placement: Add a short "AI Assistant Instructions" section at the end of each critical work package description referencing the appropriate role(s).

Automation: Use task `#91` (Add AI Assistant Role Templates to Work Items) to apply templates to existing work packages. Manual review required for edge-cases.

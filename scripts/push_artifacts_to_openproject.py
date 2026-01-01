#!/usr/bin/env python3
"""Push all canonical artifacts and documentation to OpenProject."""

import asyncio
import importlib.util
import json
import sys
from pathlib import Path
from typing import Dict, Optional

REPO_ROOT = Path(__file__).resolve().parent.parent
MCP_CONFIG = REPO_ROOT / ".vscode" / "mcp.json"
if not MCP_CONFIG.exists():
    raise SystemExit(".vscode/mcp.json not found.")

with MCP_CONFIG.open() as fp:
    config = json.load(fp)

server_cfg = config.get("servers", {}).get("openproject", {})
env = server_cfg.get("env", {})
BASE_URL = env.get("OPENPROJECT_URL", "http://localhost:8080")
API_KEY = env.get("OPENPROJECT_API_KEY")
if not API_KEY:
    raise SystemExit("OPENPROJECT_API_KEY missing in .vscode/mcp.json")

module_path = REPO_ROOT / "deploy" / "openproject" / "openproject-mcp-server" / "openproject-mcp.py"
spec = importlib.util.spec_from_file_location("openproject_mcp", module_path)
if spec is None or spec.loader is None:
    raise SystemExit("Unable to load the OpenProject MCP client module")
openproject_mcp = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = openproject_mcp
spec.loader.exec_module(openproject_mcp)
OpenProjectClient = openproject_mcp.OpenProjectClient

CANONICAL_PROJECT_ID = 4  
DOCUMENTATION_PROJECT_ID = 5  
MAIN_PROJECT_ID = 3  
TASK_TYPE_ID = 1

ARTIFACTS_DIR = REPO_ROOT / ".ai" / "canonical-artifacts"
EXPORTS_DIR = REPO_ROOT / "openproject_exports"
DOCS_DIR = REPO_ROOT / "docs"
DEPLOY_DIR = REPO_ROOT / "deploy"


async def create_or_update_artifact_wp(
    client: OpenProjectClient,
    project_id: int,
    subject: str,
    description: str,
) -> int:
    """Create an artifact WP or find existing by subject."""
    resp = await client.get_work_packages(project_id, page_size=100)
    elements = resp.get("_embedded", {}).get("elements", [])
    for wp in elements:
        if wp.get("subject", "").strip() == subject.strip():
            print(f"  Found existing: {subject} (#{wp.get('id')})")
            # Optional: Update description if needed, but skipping for now to avoid overwriting edits
            return int(wp["id"])

    print(f"  Creating: {subject}")
    created = await client.create_work_package({
        "project": project_id,
        "type": TASK_TYPE_ID,
        "subject": subject,
        "description": description,
    })
    wp_id = int(created.get("id"))
    print(f"    → #{wp_id}")
    return wp_id


def safe_read_file(file_path: Path, max_chars: int = 8000) -> str:
    """Read file safely with UTF-8 encoding."""
    try:
        return file_path.read_text(encoding="utf-8")[:max_chars]
    except Exception as e:
        return f"[Error reading file: {e}]"


async def main():
    client = OpenProjectClient(BASE_URL, API_KEY)

    print("\n=== CANONICAL ARTIFACTS (Project #4) ===")
    artifacts: Dict[str, int] = {}

    # 1. Database Schema
    db_schema_file = ARTIFACTS_DIR / "01-database-schema.md"
    if db_schema_file.exists():
        content = safe_read_file(db_schema_file)
        wp_id = await create_or_update_artifact_wp(
            client,
            CANONICAL_PROJECT_ID,
            "Canonical Database Schema",
            f"**Authority**: Single source of truth for all data models.\n\n{content}...\n\n[Full document in Git: .ai/canonical-artifacts/01-database-schema.md]"
        )
        artifacts["database_schema"] = wp_id

    # 2. OpenAPI
    openapi_file = ARTIFACTS_DIR / "02-openapi-specification.yaml"
    if openapi_file.exists():
        content = safe_read_file(openapi_file, 2000)
        wp_id = await create_or_update_artifact_wp(
            client,
            CANONICAL_PROJECT_ID,
            "OpenAPI Specification",
            f"**Authority**: Complete REST API contract for all services.\n\n```yaml\n{content}\n...\n```\n\n[Full document in Git: .ai/canonical-artifacts/02-openapi-specification.yaml]"
        )
        artifacts["openapi"] = wp_id

    # 3. State Machines
    state_file = ARTIFACTS_DIR / "03-state-machines.md"
    if state_file.exists():
        content = safe_read_file(state_file)
        wp_id = await create_or_update_artifact_wp(
            client,
            CANONICAL_PROJECT_ID,
            "State Machine Definitions",
            f"**Authority**: Canonical call/agent/transfer/recording state diagrams.\n\n{content}...\n\n[Full document in Git: .ai/canonical-artifacts/03-state-machines.md]"
        )
        artifacts["state_machines"] = wp_id

    # 4. Security Model
    security_file = ARTIFACTS_DIR / "04-security-model.md"
    if security_file.exists():
        content = safe_read_file(security_file)
        wp_id = await create_or_update_artifact_wp(
            client,
            CANONICAL_PROJECT_ID,
            "Security Model",
            f"**Authority**: RBAC, authentication, encryption, threat model, and audit logging design.\n\n{content}...\n\n[Full document in Git: .ai/canonical-artifacts/04-security-model.md]"
        )
        artifacts["security_model"] = wp_id

    # 5. Error Catalog
    error_file = ARTIFACTS_DIR / "05-error-catalog.md"
    if error_file.exists():
        content = safe_read_file(error_file)
        wp_id = await create_or_update_artifact_wp(
            client,
            CANONICAL_PROJECT_ID,
            "Error Catalog",
            f"**Authority**: All error codes, messages, and HTTP status mappings.\n\n{content}...\n\n[Full document in Git: .ai/canonical-artifacts/05-error-catalog.md]"
        )
        artifacts["error_catalog"] = wp_id

    # 6. Event Schemas
    event_file = ARTIFACTS_DIR / "06-event-schemas.md"
    if event_file.exists():
        content = safe_read_file(event_file)
        wp_id = await create_or_update_artifact_wp(
            client,
            CANONICAL_PROJECT_ID,
            "Event Schema Registry",
            f"**Authority**: All async event schemas (Asterisk ARI, internal events, webhooks).\n\n{content}...\n\n[Full document in Git: .ai/canonical-artifacts/06-event-schemas.md]"
        )
        artifacts["event_schemas"] = wp_id

    print("\n=== DOCUMENTATION ARTIFACTS (Project #5) ===")
    docs: Dict[str, int] = {}

    # 7. System Overview (HLD)
    readme_file = REPO_ROOT / "README.md"
    if readme_file.exists():
        content = safe_read_file(readme_file, 5000)
        wp_id = await create_or_update_artifact_wp(
            client,
            DOCUMENTATION_PROJECT_ID,
            "System Overview & Architecture (HLD)",
            f"**Authority**: High-level design, technology stack, and project constraints.\n\n{content}...\n\n[Full document in Git: README.md]"
        )
        docs["system_overview"] = wp_id

    # 8. Telephony Architecture (LLD)
    asterisk_readme = DEPLOY_DIR / "asterisk" / "README.md"
    if asterisk_readme.exists():
        content = safe_read_file(asterisk_readme, 5000)
        wp_id = await create_or_update_artifact_wp(
            client,
            DOCUMENTATION_PROJECT_ID,
            "Telephony Architecture & Configuration",
            f"**Authority**: Asterisk PJSIP, ARI, and dialplan configuration details.\n\n{content}...\n\n[Full document in Git: deploy/asterisk/README.md]"
        )
        docs["telephony_arch"] = wp_id

    # 9. OpenProject Integration
    op_integration_file = REPO_ROOT / "OPENPROJECT-INTEGRATION.md"
    if op_integration_file.exists():
        content = safe_read_file(op_integration_file, 5000)
        wp_id = await create_or_update_artifact_wp(
            client,
            DOCUMENTATION_PROJECT_ID,
            "OpenProject Integration Guide",
            f"**Authority**: Guide for using OpenProject with MCP and AI agents.\n\n{content}...\n\n[Full document in Git: OPENPROJECT-INTEGRATION.md]"
        )
        docs["op_integration"] = wp_id

    # 10. Standards
    standards_file = EXPORTS_DIR / "standards_coverage.md"
    if standards_file.exists():
        content = safe_read_file(standards_file, 5000)
        wp_id = await create_or_update_artifact_wp(
            client,
            DOCUMENTATION_PROJECT_ID,
            "Standards & Regulatory Coverage",
            f"**Authority**: HIPAA, GDPR, TRAI, PCI-DSS, ISO 27001, SOC2 requirements and controls.\n\n{content}"
        )
        docs["standards"] = wp_id

    # 11. Task Template
    template_file = EXPORTS_DIR / "minute_task_template.md"
    if template_file.exists():
        content = safe_read_file(template_file, 5000)
        wp_id = await create_or_update_artifact_wp(
            client,
            DOCUMENTATION_PROJECT_ID,
            "Minute-level Task Template",
            f"**Authority**: Standard template for all child tasks ensuring consistency, DoD, acceptance criteria, and CI links.\n\n{content}"
        )
        docs["task_template"] = wp_id

    # 12. AI Guidelines
    ai_guidelines_file = REPO_ROOT / ".archive" / "docs-migrated" / "ai-role-templates.md"
    if ai_guidelines_file.exists():
        content = safe_read_file(ai_guidelines_file, 3000)
        wp_id = await create_or_update_artifact_wp(
            client,
            DOCUMENTATION_PROJECT_ID,
            "AI Agent Guidelines",
            f"**Authority**: Role definitions, allowed actions, constraints, and decision gates for all AI-driven tasks.\n\n{content}...\n\n[Full document in Git: .archive/docs-migrated/ai-role-templates.md]"
        )
        docs["ai_guidelines"] = wp_id

    # 13. Security Audit Report
    security_audit_file = DOCS_DIR / "testing" / "SECURITY-AUDIT-REPORT.md"
    if security_audit_file.exists():
        content = safe_read_file(security_audit_file, 5000)
        wp_id = await create_or_update_artifact_wp(
            client,
            DOCUMENTATION_PROJECT_ID,
            "Security Audit Report",
            f"**Authority**: Latest security audit findings and remediation plan.\n\n{content}...\n\n[Full document in Git: docs/testing/SECURITY-AUDIT-REPORT.md]"
        )
        docs["security_audit"] = wp_id

    # 14. QA/Testing Results (Latest)
    test_results = list(DOCS_DIR.glob("testing/*.md"))
    if test_results:
        latest_test = sorted(test_results, key=lambda x: x.stat().st_mtime, reverse=True)[0]
        content = safe_read_file(latest_test, 2000)
        wp_id = await create_or_update_artifact_wp(
            client,
            DOCUMENTATION_PROJECT_ID,
            "Testing Catalog & Results",
            f"**Authority**: E2E, integration, unit, and performance test plans with latest results.\n\n{content}...\n\n[Full document in Git: {latest_test.relative_to(REPO_ROOT)}]"
        )
        docs["testing"] = wp_id

    # 15. Deployment Guide
    deploy_guide = DEPLOY_DIR / "openproject" / "SETUP-GUIDE.md"
    if deploy_guide.exists():
        content = safe_read_file(deploy_guide, 2000)
        wp_id = await create_or_update_artifact_wp(
            client,
            DOCUMENTATION_PROJECT_ID,
            "Deployment Procedures",
            f"**Authority**: Docker Compose, OpenProject setup, Asterisk config, and infrastructure as code.\n\n{content}...\n\n[Full document in Git: {deploy_guide.relative_to(REPO_ROOT)}]"
        )
        docs["deployment"] = wp_id

    # 16. Monitoring
    monitoring_desc = """**Authority**: SLOs, metrics, dashboards, and alerting policy.

## Key Metrics:
- Call success rate (target: 99.5%)
- Call setup latency (target: <500ms)
- Agent login/logout latency (target: <200ms)
- Database query latency (target: p95 <50ms)
- API response time (target: p99 <1000ms)
- Error rate (target: <0.1%)

## Dashboards:
- Call metrics: success/failure counts, latency distributions, concurrent calls
- Agent metrics: login/logout counts, idle time, call handling time
- System metrics: CPU, memory, disk, network I/O
- Database metrics: connection pool, slow queries, replication lag

## Alerts:
- Error rate > 1% → page on-call
- Call success rate < 98% → page on-call
- API latency p99 > 5s → warning, > 10s → page
- Database replication lag > 10s → warning"""
    
    wp_id = await create_or_update_artifact_wp(
        client,
        DOCUMENTATION_PROJECT_ID,
        "Monitoring & Alerting",
        monitoring_desc
    )
    docs["monitoring"] = wp_id

    print("\n=== LINKING ARTIFACTS FROM MAIN PROJECT WPs ===")
    print("Updating main project task descriptions to reference canonical artifacts...")

    resp = await client.get_work_packages(MAIN_PROJECT_ID, page_size=200)
    main_wps = resp.get("_embedded", {}).get("elements", [])

    updates_made = 0

    artifact_links = {
        "database_schema": ["CRM: Requirements & Data Mapping", "Dev: Dev Compose + Seeded DBs"],
        "openapi": ["Contracts: OpenAPI for Public APIs", "Contracts: Contract-driven Acceptance Tests"],
        "state_machines": ["Convert: Build Call FSM → minute tasks"],
        "security_model": ["Security: Threat Modeling per Feature", "Security: SSO / OAuth2 Integration"],
        "error_catalog": ["Tooling: OpenProject Templates & CI Link"],
        "event_schemas": ["Convert: Implement ARI Client → minute tasks"],
    }

    doc_links = {
        "standards": ["Compliance: HIPAA", "Compliance: TRAI", "Compliance: GDPR"],
        "task_template": ["Ambiguity Remediation"],
        "ai_guidelines": ["Ambiguity Remediation"],
        "system_overview": ["Phase 1: Core Platform"],
        "telephony_arch": ["Telephony: Asterisk Container"],
        "op_integration": ["Tooling: OpenProject Templates"],
        "security_audit": ["Security: Threat Modeling"],
    }

    for wp in main_wps:
        subject = wp.get("subject", "").strip()
        current_desc = wp.get("description", {}).get("raw", "") or ""

        new_desc_parts = [current_desc]
        linked = False

        for artifact_key, matching_subjects in {**artifact_links, **doc_links}.items():
            if any(match in subject for match in matching_subjects):
                if artifact_key in artifacts:
                    new_desc_parts.append(f"**📌 Canonical Reference**: See OpenProject WP #{artifacts[artifact_key]}")
                    linked = True
                elif artifact_key in docs:
                    new_desc_parts.append(f"**📌 Documentation Reference**: See OpenProject WP #{docs[artifact_key]}")
                    linked = True

        if linked and new_desc_parts[1:]:
            # Check if already linked to avoid duplication
            if "Canonical Reference" not in current_desc and "Documentation Reference" not in current_desc:
                new_description = "\n\n".join(new_desc_parts)
                try:
                    await client.update_work_package(int(wp["id"]), {"description": new_description})
                    updates_made += 1
                    print(f"  ✓ #{wp['id']}: {subject}")
                except Exception as e:
                    print(f"  ⚠ #{wp['id']}: {subject} (update failed)")

    print(f"\n=== SUMMARY ===")
    print(f"✅ Canonical Artifacts created: {len(artifacts)}")
    for key, wp_id in artifacts.items():
        print(f"   - {key} → #{wp_id}")
    print(f"\n✅ Documentation Artifacts created: {len(docs)}")
    for key, wp_id in docs.items():
        print(f"   - {key} → #{wp_id}")
    print(f"\n✅ Main project WPs updated with artifact links: {updates_made}")
    print(f"\n🎯 SSOT COMPLETE! All artifacts centralized in OpenProject!")


if __name__ == "__main__":
    asyncio.run(main())

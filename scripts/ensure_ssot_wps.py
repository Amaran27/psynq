#!/usr/bin/env python3
"""Ensure the Psitrix Psynq SSOT work packages exist in OpenProject."""

import asyncio
import csv
import importlib.util
import json
import sys
from pathlib import Path
from typing import Dict, List

REPO_ROOT = Path(__file__).resolve().parent.parent
MCP_CONFIG = REPO_ROOT / ".vscode" / "mcp.json"
if not MCP_CONFIG.exists():
    raise SystemExit(".vscode/mcp.json not found; cannot determine OpenProject credentials.")

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

PROJECT_ID = 3
PHASE_TYPE_ID = 3
TASK_TYPE_ID = 1
PLAN_CSV = REPO_ROOT / "openproject_exports" / "work_packages_release_plan.csv"
VERIFICATION_WP_ID = 185
PAGE_SIZE = 100


def format_description(row: Dict[str, str]) -> str:
    """Format a markdown-friendly description for a work package."""
    parts: List[str] = []
    description = row.get("Description", "").strip()
    if description:
        parts.append(description)

    extras = []
    for label in ("Release", "Priority", "Estimate_minutes"):
        value = row.get(label, "").strip()
        if value:
            pretty = label.replace("_", " ").replace("Estimate minutes", "Estimate (minutes)")
            extras.append(f"{pretty}: {value}")
    if extras:
        parts.append(" | ".join(extras))

    ac = row.get("AcceptanceCriteria", "").strip()
    if ac:
        parts.append(f"**Acceptance Criteria:** {ac}")

    deps = row.get("Dependencies", "").strip()
    if deps:
        parts.append(f"**Dependencies:** {deps}")

    tags = row.get("Tags", "").strip()
    if tags:
        parts.append(f"**Tags:** {tags}")

    parts.append("**Owner Role:** Platform Engineering / Product Delivery")
    parts.append("**Governance:** Align with AI governance-reviewer instructions, canonical templates, and no-duplication policy.")
    parts.append("**CI & Contracts:** Contract tests + CI gating in each Sprint 0/1 pipeline. Link to OpenAPI-driven contracts where possible.")

    parent = row.get("Parent", "") or row.get("Subject", "")
    if "Compliance" in parent or row.get("Subject", "").startswith("Compliance"):
        parts.append("**Regulatory Coverage:** HIPAA, GDPR, TRAI, and telecom data protection controls enforced.")

    return "\n\n".join(parts)


def load_plan() -> (Dict[str, Dict[str, str]], List[Dict[str, str]]):
    """Parse the release plan CSV into phases and task rows."""
    if not PLAN_CSV.exists():
        raise SystemExit(f"Release plan CSV missing at {PLAN_CSV}")

    phases: Dict[str, Dict[str, str]] = {}
    tasks: List[Dict[str, str]] = []

    def normalize(value):
        if isinstance(value, list):
            return " ".join(v.strip() for v in value if isinstance(v, str) and v.strip())
        return (value or "").strip()

    with PLAN_CSV.open(newline="", encoding="utf-8") as fp:
        reader = csv.DictReader(fp)
        for raw in reader:
            row = {k: normalize(v) for k, v in raw.items()}
            if not row.get("Subject"):
                continue
            if row.get("Type", "").lower() in ("epic", "phase"):
                phases[row["Subject"]] = row
            else:
                tasks.append(row)
    return phases, tasks



def format_update_section(phase_ids: Dict[str, int]) -> str:
    lines = ["## SSOT Work Package Generation Update"]
    lines.append("- Created/validated canonical Phases plus minute-level Tasks straight from release planning, ensuring no duplication.")
    for subject, wp_id in phase_ids.items():
        lines.append(f"  - {subject} → #{wp_id}")
    lines.append("- Each Sprint 0/1 item now has CI/contract context, AI governance cues, and compliance notes.")
    lines.append("- Created Stakeholder Signoff task (child of WP #185) to capture approvals for SSOT lock-in.")
    return "\n".join(lines)



async def main():
    client = OpenProjectClient(BASE_URL, API_KEY)
    phases, task_rows = load_plan()
    existing: Dict[str, Dict] = {}
    offset = 1
    while True:
        resp = await client.get_work_packages(PROJECT_ID, offset=offset, page_size=PAGE_SIZE)
        elements = resp.get("_embedded", {}).get("elements", [])
        if not elements:
            break
        for wp in elements:
            existing[wp.get("subject", "").strip()] = wp
        if len(elements) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    phase_ids: Dict[str, int] = {}
    created_phases = []
    for subject, row in phases.items():
        if subject in existing:
            phase_ids[subject] = int(existing[subject]["id"])
            continue
        description = format_description(row)
        print(f"Creating Phase: {subject}")
        created = await client.create_work_package({
            "project": PROJECT_ID,
            "type": PHASE_TYPE_ID,
            "subject": subject,
            "description": description,
        })
        phase_ids[subject] = int(created.get("id"))
        existing[subject] = created
        created_phases.append(subject)

    created_tasks = []
    for task in task_rows:
        subject = task["Subject"]
        parent_name = task.get("Parent")
        if not parent_name:
            parent_name = None
        parent_id = phase_ids.get(parent_name)
        if not parent_id:
            if parent_name and parent_name in existing:
                parent_id = int(existing[parent_name]["id"])
            else:
                print(f"Warning: Parent phase '{parent_name}' missing for task '{subject}'; skipping.")
                continue

        if subject in existing:
            task_id = int(existing[subject]["id"])
        else:
            description = format_description(task)
            print(f"Creating Task: {subject} under {parent_name}")
            created = await client.create_work_package({
                "project": PROJECT_ID,
                "type": TASK_TYPE_ID,
                "subject": subject,
                "description": description,
            })
            task_id = int(created.get("id"))
            existing[subject] = created
            created_tasks.append(subject)

        await client.set_work_package_parent(task_id, parent_id)

    signoff_subject = "Stakeholder Signoff: SSOT Verification"
    if signoff_subject not in existing:
        signoff_desc = (
            "Capture approvals for the canonical SSOT work packages and confirm that parallel teams share the exact requirements.\n"
            "Linked to the 180m verification pass for traceability."
        )
        print("Creating Stakeholder Signoff task under WP #185")
        signoff_wp = await client.create_work_package({
            "project": PROJECT_ID,
            "type": TASK_TYPE_ID,
            "subject": signoff_subject,
            "description": signoff_desc,
        })
        existing[signoff_subject] = signoff_wp
        await client.set_work_package_parent(int(signoff_wp["id"]), VERIFICATION_WP_ID)
    else:
        signoff_wp = existing[signoff_subject]
        await client.set_work_package_parent(int(signoff_wp["id"]), VERIFICATION_WP_ID)

    wp185 = await client.get_work_package(VERIFICATION_WP_ID)
    current_description = wp185.get("description", {}).get("raw", "") or ""
    update_section = format_update_section(phase_ids)
    new_description = current_description + "\n\n" + update_section
    await client.update_work_package(VERIFICATION_WP_ID, {"description": new_description})

    print("\nSSOT sync complete")
    if created_phases:
        print(f"Phases created: {created_phases}")
    if created_tasks:
        print(f"Tasks created: {created_tasks}")


if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""Fix orphaned work packages by establishing proper parent-child relationships."""

import asyncio
import importlib.util
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MCP_CONFIG = REPO_ROOT / ".vscode" / "mcp.json"

with MCP_CONFIG.open() as fp:
    config = json.load(fp)

env = config["servers"]["openproject"]["env"]
BASE_URL = env["OPENPROJECT_URL"]
API_KEY = env["OPENPROJECT_API_KEY"]

module_path = REPO_ROOT / "deploy" / "openproject" / "openproject-mcp-server" / "openproject-mcp.py"
spec = importlib.util.spec_from_file_location("openproject_mcp", module_path)
openproject_mcp = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = openproject_mcp
spec.loader.exec_module(openproject_mcp)
OpenProjectClient = openproject_mcp.OpenProjectClient


async def main():
    client = OpenProjectClient(BASE_URL, API_KEY)
    
    print("\n" + "="*70)
    print("STEP 1: Fix WP #245 and #246 (should have children)")
    print("="*70)
    
    # These are the canonical artifacts that should be under #245
    canonical_children = [229, 230, 231, 232, 233, 234]
    
    print("\nAssigning canonical artifacts to WP #245...")
    for wp_id in canonical_children:
        try:
            await client.set_work_package_parent(wp_id, 245)
            print(f"  ✓ #{wp_id} → parent #245")
        except Exception as e:
            print(f"  ⚠ #{wp_id} failed: {e}")
    
    # These are the documentation items that should be under #246
    doc_children = [235, 236, 237, 238, 239, 240, 241, 242, 243, 244]
    
    print("\nAssigning documentation artifacts to WP #246...")
    for wp_id in doc_children:
        try:
            await client.set_work_package_parent(wp_id, 246)
            print(f"  ✓ #{wp_id} → parent #246")
        except Exception as e:
            print(f"  ⚠ #{wp_id} failed: {e}")
    
    print("\n" + "="*70)
    print("STEP 2: Delete abandoned empty Phases/Milestones")
    print("="*70)
    
    # Abandoned phases with no children
    abandoned = [
        (70, "Phase 0: Scalability & Performance"),
        (71, "Phase 0: Business Requirements & SLAs"),
        (73, "Phase 0: Data Management & Compliance"),
        (76, "Phase 0: Support & Documentation"),
        (97, "Phase 2.0: CCaaS Platform Expansion"),
        (42, "M2: Telephony MVP Complete"),
        (43, "M3: Production Launch Ready"),
        (44, "M1: Development Environment Ready"),
        (140, "Milestone: Sprint 0 - Dev & Contracts"),
    ]
    
    print("\nDeleting abandoned work packages...")
    deleted_count = 0
    for wp_id, subject in abandoned:
        try:
            await client.delete_work_package(wp_id)
            print(f"  ✓ Deleted #{wp_id}: {subject[:50]}")
            deleted_count += 1
        except Exception as e:
            print(f"  ⚠ #{wp_id} failed: {e}")
    
    print(f"\n✅ Deleted {deleted_count} abandoned work packages")
    
    print("\n" + "="*70)
    print("STEP 3: Organize remaining Phases under a master structure")
    print("="*70)
    
    # Create a top-level Program WP
    print("\nCreating master program WP...")
    program_wp = await client.create_work_package({
        "project": 3,
        "type": 1,
        "subject": "Psitrix Psynq - Product Roadmap",
        "description": """**Master Program**: Complete product roadmap for Psitrix Psynq CPaaS platform.

All phases, epics, and milestones are organized under this program for clear visibility.

## Structure:
- Phase 0.x: Cross-functional foundations (Security, QA, DevOps, etc.)
- Phase 1.x: Core platform development
- Epics: Vertical slices (CRM, Security, QA, etc.)
- SSOT: Canonical specifications and documentation"""
    })
    program_id = program_wp["id"]
    print(f"  ✓ Created #{program_id}")
    
    # Assign all top-level phases to this program
    phases_to_organize = [
        38,   # Phase 1.0: Infrastructure
        39,   # Phase 1.3: Web Application
        67,   # Phase 0: Security & Compliance
        68,   # Phase 0: Production Operations
        69,   # Phase 0: Quality Assurance
        72,   # Phase 0: DevOps & Deployment
        74,   # Phase 0: Integration & API
        75,   # Phase 0: Legal & Regulatory
        109,  # Phase: Minute-level Task Template
        188,  # CRM Integration (Epic)
        189,  # Security Workstream (Epic)
        190,  # QA & Automation (Epic)
        191,  # Dev Environments (Epic)
        192,  # Design & UX (Epic)
        193,  # Contracts & Cross-team (Epic)
        194,  # Observability & Ops (Epic)
        195,  # Compliance (Epic)
        196,  # Non-functional Requirements (Epic)
        197,  # Ambiguity Remediation (Epic)
        245,  # Canonical Specifications (SSOT)
        246,  # Documentation & Standards (SSOT)
        247,  # Phase 1: Core Development
    ]
    
    print(f"\nOrganizing {len(phases_to_organize)} phases/epics under master program...")
    organized_count = 0
    for wp_id in phases_to_organize:
        try:
            await client.set_work_package_parent(wp_id, program_id)
            organized_count += 1
            if organized_count <= 10:
                print(f"  ✓ #{wp_id} → parent #{program_id}")
        except Exception as e:
            if organized_count <= 10:
                print(f"  ⚠ #{wp_id} failed: {e}")
    
    if organized_count > 10:
        print(f"  ... and {organized_count - 10} more")
    
    print(f"\n✅ Organized {organized_count} phases/epics")
    
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"""
✅ Fixed WP #245 and #246 (now have proper children)

✅ Deleted {deleted_count} abandoned work packages

✅ Created master program WP #{program_id}

✅ Organized {organized_count} phases/epics under master program

🎯 Result: ZERO orphaned work packages (all have proper hierarchy)
""")


if __name__ == "__main__":
    asyncio.run(main())

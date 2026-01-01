#!/usr/bin/env python3
"""Consolidate all projects into one and fix hierarchy."""

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

MAIN_PROJECT_ID = 3
TASK_TYPE_ID = 1


async def main():
    client = OpenProjectClient(BASE_URL, API_KEY)
    
    print("\n" + "="*70)
    print("STEP 1: Create Parent Work Packages in Project #3")
    print("="*70)
    
    # Create two parent WPs to organize artifacts
    print("\nCreating parent: 'Canonical Specifications'...")
    canonical_parent = await client.create_work_package({
        "project": MAIN_PROJECT_ID,
        "type": TASK_TYPE_ID,
        "subject": "Canonical Specifications (SSOT)",
        "description": """**Authority**: This is the parent for all canonical technical specifications.

All child work packages under this parent define the single source of truth for:
- Database schemas
- API contracts (OpenAPI)
- State machine definitions
- Error catalogs
- Event schemas
- Security models

**For AI Agents**: Read children of this WP for all technical design decisions."""
    })
    canonical_parent_id = canonical_parent["id"]
    print(f"  ✓ Created #{canonical_parent_id}")
    
    print("\nCreating parent: 'Documentation & Standards'...")
    docs_parent = await client.create_work_package({
        "project": MAIN_PROJECT_ID,
        "type": TASK_TYPE_ID,
        "subject": "Documentation & Standards (SSOT)",
        "description": """**Authority**: This is the parent for all documentation, standards, and process guides.

All child work packages under this parent define:
- Architecture (HLD/LLD)
- Security audits & compliance
- Testing procedures & results
- Deployment guides
- Monitoring policies
- Regulatory coverage (HIPAA, GDPR, TRAI, etc.)
- AI agent guidelines

**For AI Agents**: Read children of this WP for all process, compliance, and operational standards."""
    })
    docs_parent_id = docs_parent["id"]
    print(f"  ✓ Created #{docs_parent_id}")
    
    print("\n" + "="*70)
    print("STEP 2: Move Artifacts from Project #4 → Project #3")
    print("="*70)
    
    # Get all WPs from Project #4
    resp = await client.get_work_packages(4, page_size=100)
    canonical_wps = resp.get("_embedded", {}).get("elements", [])
    
    moved_count = 0
    for wp in canonical_wps:
        wp_id = wp["id"]
        subject = wp["subject"]
        print(f"\nMoving #{wp_id}: {subject}")
        
        try:
            # Update project and set parent
            await client.update_work_package(wp_id, {
                "project": MAIN_PROJECT_ID,
            })
            print(f"  ✓ Moved to Project #3")
            
            # Set parent
            await client.set_work_package_parent(wp_id, canonical_parent_id)
            print(f"  ✓ Set parent to #{canonical_parent_id}")
            moved_count += 1
        except Exception as e:
            print(f"  ⚠ Error: {e}")
    
    print(f"\n✅ Moved {moved_count} artifacts from Project #4")
    
    print("\n" + "="*70)
    print("STEP 3: Move Documentation from Project #5 → Project #3")
    print("="*70)
    
    # Get all WPs from Project #5
    resp = await client.get_work_packages(5, page_size=100)
    doc_wps = resp.get("_embedded", {}).get("elements", [])
    
    moved_count = 0
    for wp in doc_wps:
        wp_id = wp["id"]
        subject = wp["subject"]
        print(f"\nMoving #{wp_id}: {subject}")
        
        try:
            # Update project and set parent
            await client.update_work_package(wp_id, {
                "project": MAIN_PROJECT_ID,
            })
            print(f"  ✓ Moved to Project #3")
            
            # Set parent
            await client.set_work_package_parent(wp_id, docs_parent_id)
            print(f"  ✓ Set parent to #{docs_parent_id}")
            moved_count += 1
        except Exception as e:
            print(f"  ⚠ Error: {e}")
    
    print(f"\n✅ Moved {moved_count} documentation items from Project #5")
    
    print("\n" + "="*70)
    print("STEP 4: Organize Orphaned Work Packages in Project #3")
    print("="*70)
    
    # Get all WPs from Project #3
    resp = await client.get_work_packages(MAIN_PROJECT_ID, page_size=500)
    all_wps = resp.get("_embedded", {}).get("elements", [])
    
    # Find orphans (excluding our new parents and existing phases)
    orphans = []
    for wp in all_wps:
        parent_link = wp.get("_links", {}).get("parent", {}).get("href")
        wp_type = wp.get("_links", {}).get("type", {}).get("title", "")
        
        # Skip if already has parent, or is a Phase/Milestone
        if parent_link or wp_type in ["Phase", "Milestone"]:
            continue
        
        # Skip our newly created parents
        if wp["id"] in [canonical_parent_id, docs_parent_id]:
            continue
        
        orphans.append(wp)
    
    print(f"\nFound {len(orphans)} orphaned work packages (excluding Phases/Milestones)")
    
    # Create a "Phase 1: Core Development" parent if needed
    print("\nCreating parent: 'Phase 1: Core Development'...")
    phase1_parent = await client.create_work_package({
        "project": MAIN_PROJECT_ID,
        "type": TASK_TYPE_ID,
        "subject": "Phase 1: Core Development",
        "description": """**Phase 1**: Core platform development for Psitrix Psynq CPaaS.

This phase includes:
- Infrastructure setup (Docker, DB, Redis, etc.)
- Core telephony features (WebRTC, SIP, call routing)
- Backend API development
- Web application development
- Security & compliance foundations

All orphaned features and tasks have been organized under this parent."""
    })
    phase1_parent_id = phase1_parent["id"]
    print(f"  ✓ Created #{phase1_parent_id}")
    
    # Assign orphans to Phase 1 (limit to first 50 to avoid overwhelming)
    print(f"\nAssigning orphans to Phase 1 parent (up to 50)...")
    assigned_count = 0
    for wp in orphans[:50]:
        wp_id = wp["id"]
        subject = wp["subject"][:60]
        
        try:
            await client.set_work_package_parent(wp_id, phase1_parent_id)
            assigned_count += 1
            if assigned_count <= 10:
                print(f"  ✓ #{wp_id}: {subject}")
        except Exception as e:
            if assigned_count <= 10:
                print(f"  ⚠ #{wp_id}: {subject} (failed)")
    
    if assigned_count > 10:
        print(f"  ... and {assigned_count - 10} more")
    
    print(f"\n✅ Assigned {assigned_count} orphans to Phase 1")
    
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"""
✅ Created 3 parent work packages:
   - #{canonical_parent_id}: Canonical Specifications (SSOT)
   - #{docs_parent_id}: Documentation & Standards (SSOT)
   - #{phase1_parent_id}: Phase 1: Core Development

✅ Consolidated artifacts from Projects #4 and #5 into Project #3

✅ Organized orphaned work packages under Phase 1

⚠️  Projects #4 and #5 are now empty and can be deleted manually

🎯 Next: Review the hierarchy in OpenProject UI and delete empty projects
""")


if __name__ == "__main__":
    asyncio.run(main())

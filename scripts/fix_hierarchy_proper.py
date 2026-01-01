#!/usr/bin/env python3
"""
Fix OpenProject hierarchy to follow Azure DevOps / Industry Standard.

Hierarchy:
  Phase (Program/Initiative) - Top level
  └── Epic (Large body of work)
      └── Feature (Deliverable functionality)
          └── User Story (User-facing requirement)
              └── Task (Implementation work)
              └── Bug (Defect)

Type IDs in OpenProject:
  1 = Task
  2 = Milestone
  3 = Phase
  4 = Feature
  5 = Epic
  6 = User story
  7 = Bug
"""

import asyncio
import importlib.util
import json
import re
import sys
from pathlib import Path
from collections import defaultdict

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

# Type IDs
TYPE_TASK = 1
TYPE_MILESTONE = 2
TYPE_PHASE = 3
TYPE_FEATURE = 4
TYPE_EPIC = 5
TYPE_USER_STORY = 6
TYPE_BUG = 7


def determine_correct_type(wp):
    """Determine the correct type based on subject/content."""
    subject = wp.get("subject", "").lower()
    
    # Bug detection
    if "[bug]" in subject or subject.startswith("bug:"):
        return TYPE_BUG, "Bug"
    
    # User Story detection
    if "user story:" in subject or subject.startswith("user story"):
        return TYPE_USER_STORY, "User story"
    
    # Feature detection
    if "feature:" in subject or subject.startswith("feature"):
        return TYPE_FEATURE, "Feature"
    
    # Epic detection (large scope indicators)
    if "(epic)" in subject or "epic:" in subject:
        return TYPE_EPIC, "Epic"
    
    # Phase detection
    if "phase" in subject:
        return TYPE_PHASE, "Phase"
    
    # Milestone detection
    if "milestone" in subject or subject.startswith("m1:") or subject.startswith("m2:") or subject.startswith("m3:"):
        return TYPE_MILESTONE, "Milestone"
    
    # Default to Task
    return TYPE_TASK, "Task"


async def main():
    client = OpenProjectClient(BASE_URL, API_KEY)
    
    print("\n" + "="*80)
    print("STEP 1: Get all work packages and analyze")
    print("="*80)
    
    resp = await client.get_work_packages(3, page_size=500)
    all_wps = resp.get("_embedded", {}).get("elements", [])
    wp_by_id = {wp["id"]: wp for wp in all_wps}
    
    print(f"Total WPs: {len(all_wps)}")
    
    # Categorize by correct type
    type_changes = []
    for wp in all_wps:
        wp_id = wp["id"]
        current_type = wp.get("_links", {}).get("type", {}).get("title", "Unknown")
        correct_type_id, correct_type_name = determine_correct_type(wp)
        
        if current_type != correct_type_name:
            type_changes.append({
                "id": wp_id,
                "subject": wp["subject"],
                "current_type": current_type,
                "correct_type_id": correct_type_id,
                "correct_type_name": correct_type_name
            })
    
    print(f"\nType changes needed: {len(type_changes)}")
    
    print("\n" + "="*80)
    print("STEP 2: Fix work package types")
    print("="*80)
    
    fixed_types = 0
    for change in type_changes:
        try:
            await client.update_work_package(change["id"], {"type": change["correct_type_id"]})
            fixed_types += 1
            if fixed_types <= 15:
                print(f"  ✓ #{change['id']}: {change['current_type']} → {change['correct_type_name']}")
                print(f"      {change['subject'][:60]}")
        except Exception as e:
            print(f"  ⚠ #{change['id']} failed: {e}")
    
    if fixed_types > 15:
        print(f"  ... and {fixed_types - 15} more")
    
    print(f"\n✅ Fixed {fixed_types} type assignments")
    
    print("\n" + "="*80)
    print("STEP 3: Remove the incorrect 'Product Roadmap' Task parent")
    print("="*80)
    
    # The Product Roadmap (#248) is a Task acting as a program - delete it
    # First, unparent all its children
    resp = await client.get_work_packages(3, page_size=500)
    all_wps = resp.get("_embedded", {}).get("elements", [])
    
    for wp in all_wps:
        parent_link = wp.get("_links", {}).get("parent", {}).get("href")
        if parent_link and "/248" in parent_link:
            try:
                await client.remove_work_package_parent(wp["id"])
                print(f"  ✓ Unparented #{wp['id']}")
            except Exception as e:
                print(f"  ⚠ #{wp['id']} failed: {e}")
    
    # Delete the Product Roadmap task
    try:
        await client.delete_work_package(248)
        print(f"\n✅ Deleted #248 (Product Roadmap - wrong type)")
    except Exception as e:
        print(f"⚠ Could not delete #248: {e}")
    
    print("\n" + "="*80)
    print("STEP 4: Create proper Epic containers")
    print("="*80)
    
    # Create Epics for major workstreams
    epics_to_create = [
        ("Infrastructure & Platform Epic", "All infrastructure, Docker, database, and platform setup work"),
        ("Telephony & WebRTC Epic", "Asterisk, SIP, WebRTC, and call handling functionality"),
        ("Security & Compliance Epic", "Authentication, authorization, encryption, and regulatory compliance"),
        ("Quality & Testing Epic", "QA, testing frameworks, E2E tests, and quality gates"),
        ("Operations & Monitoring Epic", "SRE, observability, logging, alerting, and runbooks"),
        ("Integration & APIs Epic", "CRM integrations, OpenAPI contracts, and external APIs"),
    ]
    
    epic_ids = {}
    for name, desc in epics_to_create:
        try:
            epic = await client.create_work_package({
                "project": 3,
                "type": TYPE_EPIC,
                "subject": name,
                "description": f"**Epic**: {desc}\n\nContains Features and User Stories for this workstream."
            })
            epic_ids[name] = epic["id"]
            print(f"  ✓ Created Epic #{epic['id']}: {name}")
        except Exception as e:
            print(f"  ⚠ Failed to create {name}: {e}")
    
    print("\n" + "="*80)
    print("STEP 5: Reorganize hierarchy (Phase → Epic → Feature → User Story → Task)")
    print("="*80)
    
    # Refresh WPs after type changes
    resp = await client.get_work_packages(3, page_size=500)
    all_wps = resp.get("_embedded", {}).get("elements", [])
    wp_by_id = {wp["id"]: wp for wp in all_wps}
    
    # Map phases to epics
    phase_epic_map = {
        "Phase 1.0": "Infrastructure & Platform Epic",
        "Phase 1.1": "Telephony & WebRTC Epic",
        "Phase 1.2": "Infrastructure & Platform Epic",
        "Phase 1.3": "Telephony & WebRTC Epic",
        "Phase 0: Security": "Security & Compliance Epic",
        "Phase 0: Production": "Operations & Monitoring Epic",
        "Phase 0: Quality": "Quality & Testing Epic",
        "Phase 0: DevOps": "Operations & Monitoring Epic",
        "Phase 0: Integration": "Integration & APIs Epic",
        "Phase 0: Legal": "Security & Compliance Epic",
    }
    
    # Assign Features to Epics based on content
    feature_epic_map = {
        "Authentication": "Security & Compliance Epic",
        "Call Recording": "Telephony & WebRTC Epic",
        "Call Flow": "Telephony & WebRTC Epic",
        "WebRTC": "Telephony & WebRTC Epic",
        "Softphone": "Telephony & WebRTC Epic",
        "CRM": "Integration & APIs Epic",
        "Docker": "Infrastructure & Platform Epic",
        "Database": "Infrastructure & Platform Epic",
        "Redis": "Infrastructure & Platform Epic",
        "NGINX": "Infrastructure & Platform Epic",
        "MinIO": "Infrastructure & Platform Epic",
        "Security": "Security & Compliance Epic",
        "Threat": "Security & Compliance Epic",
        "Vulnerability": "Security & Compliance Epic",
        "SSO": "Security & Compliance Epic",
        "OAuth": "Security & Compliance Epic",
        "QA": "Quality & Testing Epic",
        "Test": "Quality & Testing Epic",
        "E2E": "Quality & Testing Epic",
        "Ops": "Operations & Monitoring Epic",
        "Logging": "Operations & Monitoring Epic",
        "Metrics": "Operations & Monitoring Epic",
        "Alert": "Operations & Monitoring Epic",
        "SLO": "Operations & Monitoring Epic",
        "Compliance": "Security & Compliance Epic",
        "HIPAA": "Security & Compliance Epic",
        "GDPR": "Security & Compliance Epic",
        "TRAI": "Security & Compliance Epic",
        "Asterisk": "Telephony & WebRTC Epic",
        "SIP": "Telephony & WebRTC Epic",
        "ARI": "Telephony & WebRTC Epic",
        "Backend": "Infrastructure & Platform Epic",
        "API": "Integration & APIs Epic",
        "OpenAPI": "Integration & APIs Epic",
        "Contract": "Integration & APIs Epic",
    }
    
    organized = 0
    for wp in all_wps:
        wp_id = wp["id"]
        wp_type = wp.get("_links", {}).get("type", {}).get("title", "Unknown")
        subject = wp.get("subject", "")
        
        # Skip if already properly parented or is an Epic
        if wp_type == "Epic":
            continue
        
        # Find appropriate Epic parent
        target_epic = None
        for keyword, epic_name in feature_epic_map.items():
            if keyword.lower() in subject.lower():
                target_epic = epic_name
                break
        
        if target_epic and target_epic in epic_ids:
            epic_parent_id = epic_ids[target_epic]
            
            # Only assign Features, User Stories, and Tasks directly to Epics
            # (We'll do proper Feature → User Story → Task later)
            if wp_type in ["Feature", "User story", "Task", "Bug"]:
                try:
                    await client.set_work_package_parent(wp_id, epic_parent_id)
                    organized += 1
                    if organized <= 10:
                        print(f"  ✓ #{wp_id} [{wp_type}] → Epic #{epic_parent_id}")
                except Exception as e:
                    pass
    
    if organized > 10:
        print(f"  ... and {organized - 10} more")
    
    print(f"\n✅ Organized {organized} work packages under Epics")
    
    print("\n" + "="*80)
    print("STEP 6: Clean up empty Phases")
    print("="*80)
    
    # Refresh and check for empty phases
    resp = await client.get_work_packages(3, page_size=500)
    all_wps = resp.get("_embedded", {}).get("elements", [])
    
    parent_child_map = defaultdict(list)
    for wp in all_wps:
        parent_link = wp.get("_links", {}).get("parent", {}).get("href")
        if parent_link:
            parent_id = int(parent_link.split("/")[-1])
            parent_child_map[parent_id].append(wp["id"])
    
    phases_to_delete = []
    for wp in all_wps:
        wp_type = wp.get("_links", {}).get("type", {}).get("title", "Unknown")
        if wp_type == "Phase" and wp["id"] not in parent_child_map:
            phases_to_delete.append(wp)
    
    deleted = 0
    for wp in phases_to_delete:
        try:
            await client.delete_work_package(wp["id"])
            deleted += 1
            print(f"  ✓ Deleted empty Phase #{wp['id']}: {wp['subject'][:50]}")
        except Exception as e:
            print(f"  ⚠ #{wp['id']} failed: {e}")
    
    print(f"\n✅ Deleted {deleted} empty Phases")
    
    print("\n" + "="*80)
    print("FINAL SUMMARY")
    print("="*80)
    print(f"""
✅ Fixed {fixed_types} type assignments (Task → Feature/User Story/Bug/etc.)
✅ Created {len(epic_ids)} proper Epics
✅ Organized {organized} work packages under Epics
✅ Deleted {deleted} empty Phases

🎯 New Hierarchy:
   Epic (6 created)
   └── Feature (contains deliverable functionality)
       └── User Story (user-facing requirements)
           └── Task (implementation work)
           └── Bug (defects)
""")


if __name__ == "__main__":
    asyncio.run(main())

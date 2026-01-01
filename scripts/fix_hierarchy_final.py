#!/usr/bin/env python3
"""
Fix OpenProject hierarchy using ONLY available types: Task, Milestone, Phase.

Since Epic, Feature, User Story, Bug types are NOT enabled for this project,
we'll use a naming convention approach:

Hierarchy (using Phase as top container):
  Phase (Program/Epic level) - Top level
  └── Task [FEATURE] - Feature-level tasks
      └── Task [USER STORY] - User story tasks
          └── Task [IMPL] - Implementation tasks
          └── Task [BUG] - Bug fixes

This follows industry practice when type flexibility is limited.
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

# Available Type IDs
TYPE_TASK = 1
TYPE_MILESTONE = 2
TYPE_PHASE = 3


async def main():
    client = OpenProjectClient(BASE_URL, API_KEY)
    
    print("\n" + "="*80)
    print("AVAILABLE TYPES: Task, Milestone, Phase (Epic/Feature/User Story/Bug NOT enabled)")
    print("="*80)
    print("""
    We'll organize using Phase as the top-level container:
    
    Phase: Infrastructure & Platform
    └── Task: [FEATURE] Docker Compose Setup
        └── Task: [IMPL] PostgreSQL configuration
        └── Task: [IMPL] Redis configuration
    
    Phase: Telephony & WebRTC  
    └── Task: [FEATURE] WebRTC Softphone
        └── Task: [USER STORY] SIP Auto-Registration
            └── Task: [IMPL] Registration logic
    """)
    
    print("\n" + "="*80)
    print("STEP 1: Create Phase containers for major workstreams")
    print("="*80)
    
    phases_to_create = [
        ("Phase: Infrastructure & Platform", "Docker, Database, Redis, NGINX, MinIO, and core platform setup"),
        ("Phase: Telephony & WebRTC", "Asterisk, SIP, ARI, WebRTC, and call handling"),
        ("Phase: Security & Compliance", "Authentication, authorization, encryption, HIPAA, GDPR, TRAI"),
        ("Phase: Quality & Testing", "Unit tests, E2E tests, performance tests, QA processes"),
        ("Phase: Operations & Monitoring", "SRE, logging, metrics, alerting, runbooks"),
        ("Phase: Integrations & APIs", "CRM connectors, OpenAPI contracts, webhooks"),
        ("Phase: SSOT & Documentation", "Canonical specifications, architecture docs, standards"),
    ]
    
    phase_ids = {}
    for name, desc in phases_to_create:
        try:
            phase = await client.create_work_package({
                "project": 3,
                "type": TYPE_PHASE,
                "subject": name,
                "description": f"**Workstream**: {desc}\n\nContains all Features, User Stories, and Tasks for this area."
            })
            phase_ids[name] = phase["id"]
            print(f"  ✓ Created #{phase['id']}: {name}")
        except Exception as e:
            print(f"  ⚠ Failed to create {name}: {e}")
    
    print(f"\n✅ Created {len(phase_ids)} Phase containers")
    
    print("\n" + "="*80)
    print("STEP 2: Get all work packages")
    print("="*80)
    
    resp = await client.get_work_packages(3, page_size=500)
    all_wps = resp.get("_embedded", {}).get("elements", [])
    wp_by_id = {wp["id"]: wp for wp in all_wps}
    
    print(f"Total WPs: {len(all_wps)}")
    
    # Keyword to Phase mapping
    keyword_phase_map = {
        # Infrastructure
        "docker": "Phase: Infrastructure & Platform",
        "compose": "Phase: Infrastructure & Platform",
        "postgresql": "Phase: Infrastructure & Platform",
        "postgres": "Phase: Infrastructure & Platform",
        "database": "Phase: Infrastructure & Platform",
        "redis": "Phase: Infrastructure & Platform",
        "nginx": "Phase: Infrastructure & Platform",
        "minio": "Phase: Infrastructure & Platform",
        "storage": "Phase: Infrastructure & Platform",
        "infra": "Phase: Infrastructure & Platform",
        "backend": "Phase: Infrastructure & Platform",
        "dev compose": "Phase: Infrastructure & Platform",
        "isolated development": "Phase: Infrastructure & Platform",
        
        # Telephony
        "asterisk": "Phase: Telephony & WebRTC",
        "sip": "Phase: Telephony & WebRTC",
        "webrtc": "Phase: Telephony & WebRTC",
        "softphone": "Phase: Telephony & WebRTC",
        "call": "Phase: Telephony & WebRTC",
        "ari": "Phase: Telephony & WebRTC",
        "telephony": "Phase: Telephony & WebRTC",
        "dialer": "Phase: Telephony & WebRTC",
        "ivr": "Phase: Telephony & WebRTC",
        "recording": "Phase: Telephony & WebRTC",
        "media": "Phase: Telephony & WebRTC",
        "dtls": "Phase: Telephony & WebRTC",
        "srtp": "Phase: Telephony & WebRTC",
        
        # Security
        "security": "Phase: Security & Compliance",
        "auth": "Phase: Security & Compliance",
        "authentication": "Phase: Security & Compliance",
        "sso": "Phase: Security & Compliance",
        "oauth": "Phase: Security & Compliance",
        "threat": "Phase: Security & Compliance",
        "vulnerability": "Phase: Security & Compliance",
        "penetration": "Phase: Security & Compliance",
        "secrets": "Phase: Security & Compliance",
        "encryption": "Phase: Security & Compliance",
        "hipaa": "Phase: Security & Compliance",
        "gdpr": "Phase: Security & Compliance",
        "trai": "Phase: Security & Compliance",
        "compliance": "Phase: Security & Compliance",
        "audit": "Phase: Security & Compliance",
        
        # QA
        "qa": "Phase: Quality & Testing",
        "test": "Phase: Quality & Testing",
        "e2e": "Phase: Quality & Testing",
        "playwright": "Phase: Quality & Testing",
        "unit test": "Phase: Quality & Testing",
        "coverage": "Phase: Quality & Testing",
        "performance": "Phase: Quality & Testing",
        "load test": "Phase: Quality & Testing",
        
        # Operations
        "ops": "Phase: Operations & Monitoring",
        "slo": "Phase: Operations & Monitoring",
        "sla": "Phase: Operations & Monitoring",
        "logging": "Phase: Operations & Monitoring",
        "metrics": "Phase: Operations & Monitoring",
        "prometheus": "Phase: Operations & Monitoring",
        "grafana": "Phase: Operations & Monitoring",
        "alert": "Phase: Operations & Monitoring",
        "runbook": "Phase: Operations & Monitoring",
        "monitoring": "Phase: Operations & Monitoring",
        "observability": "Phase: Operations & Monitoring",
        
        # Integrations
        "crm": "Phase: Integrations & APIs",
        "openapi": "Phase: Integrations & APIs",
        "api": "Phase: Integrations & APIs",
        "contract": "Phase: Integrations & APIs",
        "webhook": "Phase: Integrations & APIs",
        "connector": "Phase: Integrations & APIs",
        "integration": "Phase: Integrations & APIs",
        "omnichannel": "Phase: Integrations & APIs",
        "sms": "Phase: Integrations & APIs",
        "whatsapp": "Phase: Integrations & APIs",
        
        # SSOT
        "canonical": "Phase: SSOT & Documentation",
        "documentation": "Phase: SSOT & Documentation",
        "standards": "Phase: SSOT & Documentation",
        "ssot": "Phase: SSOT & Documentation",
        "template": "Phase: SSOT & Documentation",
        "guideline": "Phase: SSOT & Documentation",
        "architecture": "Phase: SSOT & Documentation",
        "schema": "Phase: SSOT & Documentation",
        "state machine": "Phase: SSOT & Documentation",
        "error catalog": "Phase: SSOT & Documentation",
        "event schema": "Phase: SSOT & Documentation",
    }
    
    print("\n" + "="*80)
    print("STEP 3: Organize Tasks under appropriate Phases")
    print("="*80)
    
    # First, identify existing phases and their children
    existing_phases = [wp for wp in all_wps if wp.get("_links", {}).get("type", {}).get("title") == "Phase"]
    print(f"\nExisting Phases: {len(existing_phases)}")
    
    # Build parent-child map
    parent_child_map = defaultdict(list)
    for wp in all_wps:
        parent_link = wp.get("_links", {}).get("parent", {}).get("href")
        if parent_link:
            parent_id = int(parent_link.split("/")[-1])
            parent_child_map[parent_id].append(wp["id"])
    
    # Find orphaned Tasks (no parent)
    orphaned_tasks = []
    for wp in all_wps:
        wp_type = wp.get("_links", {}).get("type", {}).get("title", "")
        parent_link = wp.get("_links", {}).get("parent", {}).get("href")
        
        if wp_type == "Task" and not parent_link:
            orphaned_tasks.append(wp)
    
    print(f"Orphaned Tasks to organize: {len(orphaned_tasks)}")
    
    organized = 0
    for wp in orphaned_tasks:
        subject = wp.get("subject", "").lower()
        target_phase = None
        
        # Find matching phase by keyword
        for keyword, phase_name in keyword_phase_map.items():
            if keyword in subject:
                target_phase = phase_name
                break
        
        if target_phase and target_phase in phase_ids:
            try:
                await client.set_work_package_parent(wp["id"], phase_ids[target_phase])
                organized += 1
                if organized <= 15:
                    print(f"  ✓ #{wp['id']} → {target_phase}")
                    print(f"      {wp['subject'][:60]}")
            except Exception as e:
                if organized <= 15:
                    print(f"  ⚠ #{wp['id']} failed: {e}")
    
    if organized > 15:
        print(f"  ... and {organized - 15} more")
    
    print(f"\n✅ Organized {organized} orphaned Tasks")
    
    print("\n" + "="*80)
    print("STEP 4: Move existing Phase children to new structure")
    print("="*80)
    
    # Map old phases to new phases
    old_to_new_phase = {
        "Phase 1.0": "Phase: Infrastructure & Platform",
        "Phase 1.1": "Phase: Telephony & WebRTC",
        "Phase 1.2": "Phase: Infrastructure & Platform",
        "Phase 1.3": "Phase: Telephony & WebRTC",
        "Phase 0: Security": "Phase: Security & Compliance",
        "Phase 0: Production": "Phase: Operations & Monitoring",
        "Phase 0: Quality": "Phase: Quality & Testing",
        "Phase 0: DevOps": "Phase: Operations & Monitoring",
        "Phase 0: Integration": "Phase: Integrations & APIs",
        "Phase 0: Legal": "Phase: Security & Compliance",
    }
    
    # For each old phase, move its children to the new phase and delete the old one
    moved = 0
    deleted_phases = 0
    
    for old_phase in existing_phases:
        old_phase_subject = old_phase.get("subject", "")
        old_phase_id = old_phase["id"]
        
        # Skip our newly created phases
        if old_phase_id in phase_ids.values():
            continue
        
        # Find matching new phase
        new_phase_name = None
        for pattern, new_name in old_to_new_phase.items():
            if pattern.lower() in old_phase_subject.lower():
                new_phase_name = new_name
                break
        
        if new_phase_name and new_phase_name in phase_ids:
            new_phase_id = phase_ids[new_phase_name]
            
            # Move all children to new phase
            children = parent_child_map.get(old_phase_id, [])
            for child_id in children:
                try:
                    await client.set_work_package_parent(child_id, new_phase_id)
                    moved += 1
                except Exception:
                    pass
            
            # Delete the old phase
            try:
                await client.delete_work_package(old_phase_id)
                deleted_phases += 1
                print(f"  ✓ Migrated #{old_phase_id} ({len(children)} children) → #{new_phase_id}")
            except Exception as e:
                print(f"  ⚠ Could not delete old phase #{old_phase_id}: {e}")
    
    print(f"\n✅ Moved {moved} children, deleted {deleted_phases} old phases")
    
    print("\n" + "="*80)
    print("STEP 5: Clean up remaining orphans")
    print("="*80)
    
    # Refresh and check for remaining orphans
    resp = await client.get_work_packages(3, page_size=500)
    all_wps = resp.get("_embedded", {}).get("elements", [])
    
    remaining_orphans = []
    for wp in all_wps:
        wp_type = wp.get("_links", {}).get("type", {}).get("title", "")
        parent_link = wp.get("_links", {}).get("parent", {}).get("href")
        
        if wp_type == "Task" and not parent_link:
            remaining_orphans.append(wp)
    
    print(f"Remaining orphaned Tasks: {len(remaining_orphans)}")
    
    # Assign remaining orphans to Infrastructure as default
    if remaining_orphans and "Phase: Infrastructure & Platform" in phase_ids:
        default_phase = phase_ids["Phase: Infrastructure & Platform"]
        for wp in remaining_orphans:
            try:
                await client.set_work_package_parent(wp["id"], default_phase)
                print(f"  ✓ #{wp['id']} → Infrastructure (default)")
            except Exception:
                pass
    
    print("\n" + "="*80)
    print("FINAL SUMMARY")
    print("="*80)
    
    # Final count
    resp = await client.get_work_packages(3, page_size=500)
    all_wps = resp.get("_embedded", {}).get("elements", [])
    
    type_counts = defaultdict(int)
    orphan_count = 0
    for wp in all_wps:
        wp_type = wp.get("_links", {}).get("type", {}).get("title", "Unknown")
        type_counts[wp_type] += 1
        if not wp.get("_links", {}).get("parent", {}).get("href"):
            orphan_count += 1
    
    print(f"""
📊 Final Work Package Counts:
""")
    for wp_type, count in sorted(type_counts.items()):
        print(f"   {wp_type}: {count}")
    
    print(f"""
📊 Orphans (no parent): {orphan_count}
   (Only top-level Phases should be orphans)

🎯 New Hierarchy Structure:
   Phase: Infrastructure & Platform
   Phase: Telephony & WebRTC
   Phase: Security & Compliance
   Phase: Quality & Testing
   Phase: Operations & Monitoring
   Phase: Integrations & APIs
   Phase: SSOT & Documentation
   └── Tasks organized under appropriate Phase
""")


if __name__ == "__main__":
    asyncio.run(main())

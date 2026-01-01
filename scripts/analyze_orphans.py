#!/usr/bin/env python3
"""Analyze orphaned phases and milestones in detail."""

import asyncio
import importlib.util
import json
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


async def main():
    client = OpenProjectClient(BASE_URL, API_KEY)
    
    # Get all WPs
    resp = await client.get_work_packages(3, page_size=500)
    all_wps = resp.get("_embedded", {}).get("elements", [])
    
    # Build parent-child map
    parent_child_map = defaultdict(list)
    for wp in all_wps:
        parent_link = wp.get("_links", {}).get("parent", {}).get("href")
        if parent_link:
            parent_id = int(parent_link.split("/")[-1])
            parent_child_map[parent_id].append(wp["id"])
    
    # Analyze orphans by type
    print("\n" + "="*70)
    print("ORPHANED WORK PACKAGES ANALYSIS")
    print("="*70)
    
    orphan_stats = defaultdict(list)
    
    for wp in all_wps:
        wp_id = wp["id"]
        subject = wp["subject"]
        wp_type = wp.get("_links", {}).get("type", {}).get("title", "Unknown")
        parent_link = wp.get("_links", {}).get("parent", {}).get("href")
        has_children = wp_id in parent_child_map
        
        if not parent_link:  # No parent = orphan
            orphan_stats[wp_type].append({
                "id": wp_id,
                "subject": subject,
                "has_children": has_children,
                "child_count": len(parent_child_map.get(wp_id, []))
            })
    
    # Print by type
    total_orphans = 0
    for wp_type, orphans in sorted(orphan_stats.items()):
        print(f"\n{'='*70}")
        print(f"{wp_type}: {len(orphans)} orphaned")
        print(f"{'='*70}")
        
        for item in orphans:
            status = "✓ HAS CHILDREN" if item["has_children"] else "⚠ NO CHILDREN (ABANDONED)"
            print(f"  #{item['id']:>3} {status:>25} | {item['subject'][:50]}")
            if item["has_children"]:
                print(f"       └─ {item['child_count']} children")
        
        total_orphans += len(orphans)
    
    print(f"\n{'='*70}")
    print(f"TOTAL ORPHANED: {total_orphans}")
    print(f"{'='*70}")
    
    # Count truly abandoned (no children)
    abandoned = []
    for wp_type, orphans in orphan_stats.items():
        for item in orphans:
            if not item["has_children"]:
                abandoned.append(item)
    
    print(f"\n⚠️  TRULY ABANDONED (no parent, no children): {len(abandoned)}")
    if abandoned:
        print("\nThese should be deleted or assigned to a parent:")
        for item in abandoned[:20]:
            print(f"  #{item['id']:>3} {item['subject']}")
    
    # Check for phases that should be organized
    phase_orphans = orphan_stats.get("Phase", [])
    if phase_orphans:
        print(f"\n{'='*70}")
        print(f"PHASE ORGANIZATION RECOMMENDATION")
        print(f"{'='*70}")
        
        with_children = [p for p in phase_orphans if p["has_children"]]
        without_children = [p for p in phase_orphans if not p["has_children"]]
        
        print(f"\n✓ {len(with_children)} Phases with children (keep as top-level)")
        print(f"⚠ {len(without_children)} Phases without children (should review)")
        
        if without_children:
            print("\nPhases to review:")
            for p in without_children:
                print(f"  #{p['id']:>3} {p['subject']}")


if __name__ == "__main__":
    asyncio.run(main())

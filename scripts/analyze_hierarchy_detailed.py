#!/usr/bin/env python3
"""Analyze current work package types and hierarchy to understand the mess."""

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
    
    print("\n" + "="*80)
    print("CURRENT WORK PACKAGE ANALYSIS")
    print("="*80)
    
    # Count by type
    type_counts = defaultdict(list)
    for wp in all_wps:
        wp_type = wp.get("_links", {}).get("type", {}).get("title", "Unknown")
        type_counts[wp_type].append(wp)
    
    print(f"\nTotal Work Packages: {len(all_wps)}")
    print(f"\nBy Type:")
    for wp_type, wps in sorted(type_counts.items()):
        print(f"  {wp_type}: {len(wps)}")
    
    # Build hierarchy tree
    print("\n" + "="*80)
    print("CURRENT HIERARCHY TREE")
    print("="*80)
    
    # Build parent-child map
    parent_child_map = defaultdict(list)
    wp_by_id = {wp["id"]: wp for wp in all_wps}
    
    for wp in all_wps:
        parent_link = wp.get("_links", {}).get("parent", {}).get("href")
        if parent_link:
            parent_id = int(parent_link.split("/")[-1])
            parent_child_map[parent_id].append(wp["id"])
    
    # Find root WPs (no parent)
    roots = [wp for wp in all_wps if not wp.get("_links", {}).get("parent", {}).get("href")]
    
    def print_tree(wp_id, indent=0):
        wp = wp_by_id.get(wp_id)
        if not wp:
            return
        
        wp_type = wp.get("_links", {}).get("type", {}).get("title", "?")
        subject = wp.get("subject", "")[:50]
        prefix = "  " * indent + ("├── " if indent > 0 else "")
        
        print(f"{prefix}[{wp_type:>10}] #{wp_id}: {subject}")
        
        children = parent_child_map.get(wp_id, [])
        for child_id in children[:5]:  # Limit children shown
            print_tree(child_id, indent + 1)
        if len(children) > 5:
            print(f"{'  ' * (indent + 1)}└── ... and {len(children) - 5} more children")
    
    print(f"\nRoots: {len(roots)}")
    for root in roots[:10]:
        print_tree(root["id"])
        print()
    
    if len(roots) > 10:
        print(f"... and {len(roots) - 10} more root WPs")
    
    # Show problematic items
    print("\n" + "="*80)
    print("HIERARCHY ISSUES")
    print("="*80)
    
    issues = []
    for wp in all_wps:
        wp_id = wp["id"]
        wp_type = wp.get("_links", {}).get("type", {}).get("title", "Unknown")
        subject = wp.get("subject", "")
        parent_link = wp.get("_links", {}).get("parent", {}).get("href")
        
        # Check for wrong hierarchy
        if parent_link:
            parent_id = int(parent_link.split("/")[-1])
            parent_wp = wp_by_id.get(parent_id)
            if parent_wp:
                parent_type = parent_wp.get("_links", {}).get("type", {}).get("title", "Unknown")
                
                # Define valid parent-child relationships (Azure DevOps style)
                valid_parents = {
                    "Task": ["Feature", "User story", "Epic", "Phase"],
                    "Bug": ["Feature", "User story", "Epic", "Phase", "Task"],
                    "User story": ["Feature", "Epic", "Phase"],
                    "Feature": ["Epic", "Phase"],
                    "Epic": ["Phase", "Milestone"],
                    "Phase": [],  # Phases should be top-level or under Program
                    "Milestone": ["Phase"],
                }
                
                if wp_type in valid_parents and parent_type not in valid_parents.get(wp_type, []):
                    issues.append({
                        "id": wp_id,
                        "type": wp_type,
                        "subject": subject,
                        "parent_id": parent_id,
                        "parent_type": parent_type,
                        "issue": f"{wp_type} should not be child of {parent_type}"
                    })
    
    if issues:
        print(f"\n⚠️  Found {len(issues)} hierarchy violations:")
        for issue in issues[:20]:
            print(f"  #{issue['id']} [{issue['type']}] → parent #{issue['parent_id']} [{issue['parent_type']}]")
            print(f"      Issue: {issue['issue']}")
            print(f"      Subject: {issue['subject'][:60]}")
    else:
        print("\n✅ No hierarchy violations found")
    
    # Recommend structure
    print("\n" + "="*80)
    print("RECOMMENDED HIERARCHY (Azure DevOps Style)")
    print("="*80)
    print("""
    Phase (Program/Initiative)
    └── Epic (Large body of work)
        └── Feature (Deliverable functionality)
            └── User Story (User-facing requirement)
                └── Task (Implementation work)
                └── Bug (Defect)
    
    Milestone: Time-bound checkpoint (can be at any level)
    """)


if __name__ == "__main__":
    asyncio.run(main())

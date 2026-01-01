#!/usr/bin/env python3
"""Check OpenProject work package hierarchy and identify orphans."""

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
    
    # Check all 3 projects
    for project_id in [3, 4, 5]:
        print(f"\n{'='*70}")
        print(f"PROJECT #{project_id}")
        print(f"{'='*70}")
        
        try:
            # Get project details
            project = await client.get_project(project_id)
            print(f"Name: {project.get('name')}")
            print(f"Description: {project.get('description', {}).get('raw', 'N/A')[:100]}")
        except Exception as e:
            print(f"Error fetching project: {e}")
            continue
        
        # Get all work packages
        resp = await client.get_work_packages(project_id, page_size=500)
        elements = resp.get("_embedded", {}).get("elements", [])
        
        print(f"\nTotal Work Packages: {len(elements)}")
        
        # Analyze hierarchy
        orphans = []  # No parent
        parents = set()  # Has children
        
        for wp in elements:
            wp_id = wp.get("id")
            parent_link = wp.get("_links", {}).get("parent", {}).get("href")
            
            if not parent_link:
                orphans.append(wp)
            else:
                # Extract parent ID from href
                parent_id = parent_link.split("/")[-1] if parent_link else None
                if parent_id:
                    parents.add(int(parent_id))
        
        print(f"Top-level (no parent): {len(orphans)}")
        print(f"Parents (have children): {len(parents)}")
        
        # Show orphans
        if orphans:
            print(f"\n--- Top-level Work Packages (no parent) ---")
            for wp in orphans[:30]:
                wp_type = wp.get("_links", {}).get("type", {}).get("title", "Unknown")
                print(f"  #{wp['id']:>3} [{wp_type:>10}] {wp['subject']}")
        
        # Show hierarchy depth
        parent_child_map = defaultdict(list)
        for wp in elements:
            parent_link = wp.get("_links", {}).get("parent", {}).get("href")
            if parent_link:
                parent_id = int(parent_link.split("/")[-1])
                parent_child_map[parent_id].append(wp["id"])
        
        if parent_child_map:
            print(f"\n--- Parents with Most Children (Top 10) ---")
            sorted_parents = sorted(parent_child_map.items(), key=lambda x: len(x[1]), reverse=True)
            for parent_id, children in sorted_parents[:10]:
                # Find parent subject
                parent_wp = next((wp for wp in elements if wp["id"] == parent_id), None)
                parent_subject = parent_wp["subject"] if parent_wp else "Unknown"
                print(f"  #{parent_id}: {parent_subject} → {len(children)} children")


if __name__ == "__main__":
    asyncio.run(main())

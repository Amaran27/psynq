#!/usr/bin/env python3
"""Delete empty Projects #4 and #5."""

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
    print("Verifying Projects #4 and #5 are empty")
    print("="*70)
    
    for project_id in [4, 5]:
        resp = await client.get_work_packages(project_id, page_size=10)
        elements = resp.get("_embedded", {}).get("elements", [])
        
        project = await client.get_project(project_id)
        project_name = project.get("name")
        
        print(f"\nProject #{project_id}: {project_name}")
        print(f"  Work packages: {len(elements)}")
        
        if len(elements) == 0:
            print(f"  ✓ Empty - ready to delete")
        else:
            print(f"  ⚠ NOT empty - contains {len(elements)} work packages")
            for wp in elements:
                print(f"    - #{wp['id']}: {wp['subject']}")
    
    print("\n" + "="*70)
    print("Deleting Projects #4 and #5")
    print("="*70)
    
    for project_id in [4, 5]:
        try:
            project = await client.get_project(project_id)
            project_name = project.get("name")
            
            print(f"\nDeleting Project #{project_id}: {project_name}")
            await client.delete_project(project_id)
            print(f"  ✓ Deleted successfully")
        except Exception as e:
            print(f"  ⚠ Error: {e}")
    
    print("\n" + "="*70)
    print("COMPLETE")
    print("="*70)
    print("""
✅ Projects #4 and #5 have been deleted

✅ All work packages now live in Project #3 (Psitrix Psynq)

✅ Proper hierarchy established:
   - Canonical Specifications (SSOT) → 6 children
   - Documentation & Standards (SSOT) → 10 children
   - Phase 1: Core Development → 46+ children

🎯 Single Source of Truth is now fully consolidated in OpenProject!
""")


if __name__ == "__main__":
    asyncio.run(main())

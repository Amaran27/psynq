#!/usr/bin/env python3
"""
Import work packages from CSV into OpenProject via MCP API.
Handles parent-child relationships by creating parents first.
Creates: Phase → Epic → Feature → User Story → Task hierarchy
"""
import csv
import time
from pathlib import Path

# Direct MCP API calls using the activated OpenProject tools
# These will be executed by the AI agent's MCP integration

# Get project info
def get_project_id():
    """Get the project ID for 'Psitrix Psynq'"""
    # Hardcoded based on our known project
    return 3

# Get type IDs
TYPE_MAP = {
    "Task": 1,
    "Milestone": 2,
    "Phase": 3,
    "Feature": 4,
    "Epic": 5,
    "User story": 6,
    "Bug": 7
}

STATUS_MAP = {
    "New": 1,
    "In progress": 7,
    "Closed": 12
}

PRIORITY_MAP = {
    "Low": 8,
    "Normal": 9,
    "High": 10,
    "Immediate": 11
}

def parse_estimated_time(time_str):
    """Parse estimated time like '4h' into hours as float"""
    if not time_str:
        return None
    time_str = time_str.strip().lower()
    if time_str.endswith('h'):
        return float(time_str[:-1])
    return None

def import_csv(csv_path):
    """Import work packages from CSV"""
    project_id = get_project_id()
    if not project_id:
        print("Failed to get project ID", file=sys.stderr)
        return False
    
    # Read CSV and build work package list
    work_packages = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            work_packages.append(row)
    
    print(f"Found {len(work_packages)} work packages to import")
    
    # Create mapping of subject to work package ID
    subject_to_id = {}
    
    # First pass: Create all work packages without parent relationships
    # We'll do this in phases to respect hierarchy
    phases_to_create = []
    epics_to_create = []
    tasks_to_create = []
    
    for wp in work_packages:
        if wp['Type'] == 'Phase':
            phases_to_create.append(wp)
        elif wp['Type'] == 'Epic':
            epics_to_create.append(wp)
        else:
            tasks_to_create.append(wp)
    
    # Create Phases first (no parents)
    print(f"\n=== Creating {len(phases_to_create)} Phases ===")
    for wp in phases_to_create:
        params = {
            "project_id": project_id,
            "subject": wp['Subject'],
            "type_id": TYPE_MAP.get(wp['Type'], 1),
            "description": wp.get('Description', ''),
            "priority_id": PRIORITY_MAP.get(wp.get('Priority', 'Normal'), 9),
            "status_id": STATUS_MAP.get(wp.get('Status', 'New'), 1)
        }
        
        # Add estimated time if present
        est_time = parse_estimated_time(wp.get('Estimated time', ''))
        if est_time:
            params['estimated_hours'] = est_time
        
        print(f"Creating Phase: {wp['Subject']}")
        result = call_mcp("create_work_package", params)
        if result and 'id' in result:
            subject_to_id[wp['Subject']] = result['id']
            print(f"  ✓ Created #{result['id']}")
        else:
            print(f"  ✗ Failed to create Phase: {wp['Subject']}")
    
    # Create Epics (with Phase parents)
    print(f"\n=== Creating {len(epics_to_create)} Epics ===")
    for wp in epics_to_create:
        params = {
            "project_id": project_id,
            "subject": wp['Subject'],
            "type_id": TYPE_MAP.get(wp['Type'], 1),
            "description": wp.get('Description', ''),
            "priority_id": PRIORITY_MAP.get(wp.get('Priority', 'Normal'), 9),
            "status_id": STATUS_MAP.get(wp.get('Status', 'New'), 1)
        }
        
        est_time = parse_estimated_time(wp.get('Estimated time', ''))
        if est_time:
            params['estimated_hours'] = est_time
        
        print(f"Creating Epic: {wp['Subject']}")
        result = call_mcp("create_work_package", params)
        if result and 'id' in result:
            wp_id = result['id']
            subject_to_id[wp['Subject']] = wp_id
            print(f"  ✓ Created #{wp_id}")
            
            # Set parent if specified
            parent_subject = wp.get('Parent', '').strip()
            if parent_subject and parent_subject in subject_to_id:
                parent_id = subject_to_id[parent_subject]
                print(f"  Setting parent to #{parent_id} ({parent_subject})")
                parent_result = call_mcp("set_work_package_parent", {
                    "work_package_id": wp_id,
                    "parent_id": parent_id
                })
                if parent_result:
                    print(f"  ✓ Parent set")
                else:
                    print(f"  ✗ Failed to set parent")
        else:
            print(f"  ✗ Failed to create Epic: {wp['Subject']}")
    
    # Create Tasks (with Epic parents)
    print(f"\n=== Creating {len(tasks_to_create)} Tasks ===")
    for wp in tasks_to_create:
        params = {
            "project_id": project_id,
            "subject": wp['Subject'],
            "type_id": TYPE_MAP.get(wp['Type'], 1),
            "description": wp.get('Description', ''),
            "priority_id": PRIORITY_MAP.get(wp.get('Priority', 'Normal'), 9),
            "status_id": STATUS_MAP.get(wp.get('Status', 'New'), 1)
        }
        
        est_time = parse_estimated_time(wp.get('Estimated time', ''))
        if est_time:
            params['estimated_hours'] = est_time
        
        print(f"Creating Task: {wp['Subject']}")
        result = call_mcp("create_work_package", params)
        if result and 'id' in result:
            wp_id = result['id']
            subject_to_id[wp['Subject']] = wp_id
            print(f"  ✓ Created #{wp_id}")
            
            # Set parent if specified
            parent_subject = wp.get('Parent', '').strip()
            if parent_subject and parent_subject in subject_to_id:
                parent_id = subject_to_id[parent_subject]
                print(f"  Setting parent to #{parent_id} ({parent_subject})")
                parent_result = call_mcp("set_work_package_parent", {
                    "work_package_id": wp_id,
                    "parent_id": parent_id
                })
                if parent_result:
                    print(f"  ✓ Parent set")
                else:
                    print(f"  ✗ Failed to set parent")
        else:
            print(f"  ✗ Failed to create Task: {wp['Subject']}")
    
    print(f"\n=== Import Complete ===")
    print(f"Successfully created {len(subject_to_id)} work packages")
    return True

if __name__ == "__main__":
    csv_path = Path(__file__).parent.parent / "openproject_exports" / "work_packages_import_hierarchy.csv"
    if not csv_path.exists():
        print(f"CSV file not found: {csv_path}", file=sys.stderr)
        sys.exit(1)
    
    success = import_csv(csv_path)
    sys.exit(0 if success else 1)

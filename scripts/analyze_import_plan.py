"""
Import all work packages from comprehensive CSV to OpenProject.
This script will be executed by the AI agent which will call MCP tools for each work package.
"""

import csv
from pathlib import Path

# Phase name to ID mapping (just created)
PHASE_MAP = {
    "Phase: Infrastructure & Platform": 258,
    "Phase: Telephony & WebRTC": 257,
    "Phase: Backend & Domain Logic": 259,
    "Phase: Frontend Web Application": 262,
    "Phase: Security & Compliance": 261,
    "Phase: Quality & Testing": 260,
    "Phase: Operations & Monitoring": 265,
    "Phase: Integrations & APIs": 263,
    "Phase: SSOT & Documentation": 264,
}

# Type name to ID mapping
TYPE_MAP = {
    "Phase": 3,
    "Epic": 5,
    "Feature": 4,
    "User story": 6,
    "Task": 1,
    "Bug": 7,
}

# Priority mapping
PRIORITY_MAP = {
    "Low": 8,
    "Normal": 9,
    "High": 10,
    "Immediate": 11,
}

def load_csv():
    """Load all work packages from CSV"""
    csv_path = Path(__file__).parent.parent / "openproject_exports" / "work_packages_comprehensive.csv"
    
    work_packages = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            work_packages.append(row)
    
    return work_packages

def organize_by_type(work_packages):
    """Organize work packages by type for hierarchical import"""
    by_type = {
        "Phase": [],
        "Epic": [],
        "Feature": [],
        "User story": [],
        "Task": [],
    }
    
    for wp in work_packages:
        wp_type = wp['Type']
        if wp_type in by_type:
            by_type[wp_type].append(wp)
    
    return by_type

def generate_import_plan(work_packages):
    """Generate detailed import plan"""
    organized = organize_by_type(work_packages)
    
    print("=" * 80)
    print(" COMPREHENSIVE WORK PACKAGE IMPORT PLAN")
    print("=" * 80)
    print(f"\nTotal Work Packages: {len(work_packages)}")
    print(f"\n✅ Phases: {len(organized['Phase'])} (Already created manually)")
    print(f"📦 Epics: {len(organized['Epic'])}")
    print(f"🎯 Features: {len(organized['Feature'])}")
    print(f"📝 User Stories: {len(organized['User story'])}")
    print(f"✔️  Tasks: {len(organized['Task'])}")
    print(f"\nREMAINING TO IMPORT: {len(work_packages) - len(organized['Phase'])} work packages")
    
    print("\n" + "=" * 80)
    print(" IMPORT ORDER (respecting hierarchy)")
    print("=" * 80)
    
    # Group by phase
    phase_groups = {}
    for wp in work_packages:
        if wp['Type'] == 'Phase':
            phase_groups[wp['Subject']] = {
                'epics': [],
                'features': [],
                'user_stories': [],
                'tasks': []
            }
    
    for wp in work_packages:
        wp_type = wp['Type']
        parent = wp.get('Parent', '').strip()
        
        # Find which phase this belongs to
        for phase_name in phase_groups:
            if wp_type == 'Epic' and parent == phase_name:
                phase_groups[phase_name]['epics'].append(wp)
            elif wp_type == 'Feature':
                # Feature's parent is an Epic, need to trace back
                for epic in organized['Epic']:
                    if epic['Subject'] == parent and epic.get('Parent') == phase_name:
                        phase_groups[phase_name]['features'].append(wp)
                        break
            elif wp_type == 'User story' or wp_type == 'Task':
                # Trace back through hierarchy
                for feature in organized['Feature']:
                    if feature['Subject'] == parent:
                        for epic in organized['Epic']:
                            if epic['Subject'] == feature.get('Parent'):
                                phase_name_found = epic.get('Parent')
                                if phase_name_found in phase_groups:
                                    if wp_type == 'User story':
                                        phase_groups[phase_name_found]['user_stories'].append(wp)
                                    else:
                                        phase_groups[phase_name_found]['tasks'].append(wp)
                                break
                        break
    
    for i, (phase_name, items) in enumerate(phase_groups.items(), 1):
        phase_id = PHASE_MAP.get(phase_name, "???")
        print(f"\n{i}. {phase_name} (#{phase_id})")
        print(f"   - {len(items['epics'])} Epics")
        print(f"   - {len(items['features'])} Features")
        print(f"   - {len(items['user_stories'])} User Stories")
        print(f"   - {len(items['tasks'])} Tasks")
        print(f"   SUBTOTAL: {len(items['epics']) + len(items['features']) + len(items['user_stories']) + len(items['tasks'])} items")
    
    print("\n" + "=" * 80)
    return organized, phase_groups

if __name__ == "__main__":
    work_packages = load_csv()
    organized, phase_groups = generate_import_plan(work_packages)
    
    print("\n✅ Import plan generated. Agent will now proceed with systematic import.")
    print("   using OpenProject MCP tools in batches...\n")

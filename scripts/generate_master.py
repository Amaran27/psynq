#!/usr/bin/env python3
"""
Master Generator - Runs all parts in sequence and properly consolidates.
"""
import csv
import os
from datetime import datetime

OUTPUT_DIR = 'd:/Project/psitrix/psynq/openproject_exports'
FINAL_CSV = os.path.join(OUTPUT_DIR, 'work_packages_final.csv')

# CSV Headers
HEADERS = [
    'Subject', 'Type', 'Project', 'Parent', 'Priority', 'Status',
    'Start date', 'Due date', 'Assignee', 'Estimated time', 'Labels',
    'Version', 'Story Points', 'Risk Level', 'Definition of Ready',
    'Definition of Done', 'Acceptance Criteria', 'Success Metrics',
    'External Dependencies', 'Rollback Plan', 'Description', '% Complete'
]

def collect_all_items():
    """Import and run all generator modules"""
    all_items = []
    
    print("="*60)
    print("PSYNQ CCAAS MASTER WORK ITEMS GENERATOR")
    print("="*60)
    print(f"\nStarted: {datetime.now()}")
    
    # Import all generator modules
    import sys
    sys.path.insert(0, 'd:/Project/psitrix/psynq/scripts')
    
    # Part 1: Base Phases
    print("\n[1/12] Generating Phases...")
    from generate_detailed_workitems import generate_phases
    items = generate_phases()
    all_items.extend(items)
    print(f"  Added {len(items)} phases")
    
    # Part 2: Infrastructure
    print("\n[2/12] Generating Infrastructure...")
    from generate_detailed_part2 import generate_infrastructure
    items = generate_infrastructure()
    all_items.extend(items)
    print(f"  Added {len(items)} infrastructure items")
    
    # Part 3: Backend Core
    print("\n[3/12] Generating Backend Core...")
    from generate_detailed_part3 import generate_backend_core
    items = generate_backend_core()
    all_items.extend(items)
    print(f"  Added {len(items)} backend core items")
    
    # Part 4: Telephony
    print("\n[4/12] Generating Telephony...")
    from generate_detailed_part4 import generate_telephony
    items = generate_telephony()
    all_items.extend(items)
    print(f"  Added {len(items)} telephony items")
    
    # Part 5: Dialer
    print("\n[5/12] Generating Dialer...")
    from generate_detailed_part5 import generate_dialer
    items = generate_dialer()
    all_items.extend(items)
    print(f"  Added {len(items)} dialer items")
    
    # Part 6: Frontend
    print("\n[6/12] Generating Frontend...")
    from generate_detailed_part6 import generate_frontend
    items = generate_frontend()
    all_items.extend(items)
    print(f"  Added {len(items)} frontend items")
    
    # Part 7: Admin UI
    print("\n[7/12] Generating Admin UI...")
    from generate_detailed_part7 import generate_admin_ui
    items = generate_admin_ui()
    all_items.extend(items)
    print(f"  Added {len(items)} admin UI items")
    
    # Part 8: Queue Routing
    print("\n[8/12] Generating Queue Routing...")
    from generate_detailed_part8 import generate_queue_config
    items = generate_queue_config()
    all_items.extend(items)
    print(f"  Added {len(items)} queue routing items")
    
    # Part 9: Analytics
    print("\n[9/12] Generating Analytics...")
    from generate_detailed_part9 import generate_analytics
    items = generate_analytics()
    all_items.extend(items)
    print(f"  Added {len(items)} analytics items")
    
    # Part 10: Recording
    print("\n[10/12] Generating Recording...")
    from generate_detailed_part10 import generate_recording
    items = generate_recording()
    all_items.extend(items)
    print(f"  Added {len(items)} recording items")
    
    # Part 11: Security
    print("\n[11/12] Generating Security...")
    from generate_detailed_part11 import generate_security
    items = generate_security()
    all_items.extend(items)
    print(f"  Added {len(items)} security items")
    
    # Part 12: Agent Desktop
    print("\n[12/12] Generating Agent Desktop...")
    from generate_detailed_part12 import generate_agent_desktop
    items = generate_agent_desktop()
    all_items.extend(items)
    print(f"  Added {len(items)} agent desktop items")
    
    return all_items

def write_final_csv(items):
    """Write all items to final CSV"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    with open(FINAL_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=HEADERS)
        writer.writeheader()
        for item in items:
            writer.writerow(item)
    
    # Count lines
    with open(FINAL_CSV, 'r', encoding='utf-8') as f:
        line_count = sum(1 for _ in f)
    
    return line_count

def print_summary(items):
    """Print summary statistics"""
    print("\n" + "="*60)
    print("GENERATION COMPLETE")
    print("="*60)
    
    # Count by type
    type_counts = {}
    for item in items:
        item_type = item.get('Type', 'Unknown')
        type_counts[item_type] = type_counts.get(item_type, 0) + 1
    
    print(f"\nTotal Work Items: {len(items)}")
    print("\nBreakdown by Type:")
    for t, count in sorted(type_counts.items()):
        print(f"  - {t}: {count}")
    
    # Count by phase
    phase_counts = {}
    for item in items:
        parent = item.get('Parent', '')
        if parent.startswith('Phase:'):
            phase_counts[parent] = phase_counts.get(parent, 0) + 1
    
    print("\nItems per Phase:")
    for phase, count in sorted(phase_counts.items()):
        print(f"  - {phase.replace('Phase: ', '')}: {count}")

def main():
    # Collect all items
    items = collect_all_items()
    
    # Write to CSV
    line_count = write_final_csv(items)
    
    # Print summary
    print_summary(items)
    
    print(f"\nOutput: {FINAL_CSV}")
    print(f"CSV Lines: {line_count}")
    print(f"\nCompleted: {datetime.now()}")
    
    return len(items)

if __name__ == '__main__':
    total = main()
    print(f"\n{'='*60}")
    print(f"TOTAL WORK ITEMS: {total}")
    print(f"{'='*60}")

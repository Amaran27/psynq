#!/usr/bin/env python3
"""
Consolidate all detailed work items into a single CSV file.
Also generate summary statistics.
"""
import csv
import os
import subprocess
from datetime import datetime

OUTPUT_DIR = 'd:/Project/psitrix/psynq/openproject_exports'
CONSOLIDATED_FILE = os.path.join(OUTPUT_DIR, 'work_packages_consolidated.csv')

def consolidate_all():
    """Run all generator parts and consolidate results"""
    print("=" * 60)
    print("PSYNQ CCAAS DETAILED WORK ITEMS GENERATOR")
    print("=" * 60)
    print(f"\nStarted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # List of all generator parts
    generators = [
        ('generate_detailed_workitems.py', 'Base (Phases)'),
        ('generate_detailed_part2.py', 'Infrastructure'),
        ('generate_detailed_part3.py', 'Backend Auth'),
        ('generate_detailed_part4.py', 'Telephony'),
        ('generate_detailed_part5.py', 'Dialer'),
        ('generate_detailed_part6.py', 'Frontend'),
        ('generate_detailed_part7.py', 'Admin UI'),
        ('generate_detailed_part8.py', 'Queue Routing'),
        ('generate_detailed_part9.py', 'Analytics'),
        ('generate_detailed_part10.py', 'Recording'),
        ('generate_detailed_part11.py', 'Security'),
    ]
    
    all_items = []
    headers = None
    
    # Run each generator and collect items
    for script, description in generators:
        script_path = f'd:/Project/psitrix/psynq/scripts/{script}'
        if os.path.exists(script_path):
            print(f"\n>>> Running: {description} ({script})")
            try:
                result = subprocess.run(
                    ['python', script_path],
                    capture_output=True,
                    text=True,
                    cwd='d:/Project/psitrix/psynq/scripts'
                )
                print(result.stdout)
                if result.stderr:
                    print(f"  Errors: {result.stderr}")
            except Exception as e:
                print(f"  Failed: {e}")
    
    # Now read the individual CSV file (which was appended to by all parts)
    main_csv = os.path.join(OUTPUT_DIR, 'work_packages_detailed.csv')
    if os.path.exists(main_csv):
        with open(main_csv, 'r', encoding='utf-8', newline='') as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames
            all_items = list(reader)
    
    # Write consolidated file with deduplication
    seen = set()
    unique_items = []
    for item in all_items:
        key = (item.get('Subject', ''), item.get('Type', ''), item.get('Parent', ''))
        if key not in seen:
            seen.add(key)
            unique_items.append(item)
    
    # Write consolidated output
    if unique_items and headers:
        with open(CONSOLIDATED_FILE, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(unique_items)
    
    # Print summary
    print("\n" + "=" * 60)
    print("GENERATION COMPLETE")
    print("=" * 60)
    
    # Count by type
    type_counts = {}
    for item in unique_items:
        item_type = item.get('Type', 'Unknown')
        type_counts[item_type] = type_counts.get(item_type, 0) + 1
    
    print(f"\nTotal Unique Items: {len(unique_items)}")
    print("\nBreakdown by Type:")
    for t, count in sorted(type_counts.items()):
        print(f"  - {t}: {count}")
    
    # Count by parent phase
    phase_counts = {}
    for item in unique_items:
        parent = item.get('Parent', '')
        if parent.startswith('Phase:'):
            phase_counts[parent] = phase_counts.get(parent, 0) + 1
    
    if phase_counts:
        print("\nItems per Phase:")
        for phase, count in sorted(phase_counts.items()):
            print(f"  - {phase}: {count}")
    
    print(f"\nOutput files:")
    print(f"  - {main_csv}")
    print(f"  - {CONSOLIDATED_FILE}")
    
    # Count lines in consolidated file
    with open(CONSOLIDATED_FILE, 'r', encoding='utf-8') as f:
        line_count = sum(1 for _ in f)
    print(f"\nConsolidated CSV: {line_count} lines")
    
    print(f"\nCompleted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    return len(unique_items)

if __name__ == '__main__':
    total = consolidate_all()
    print(f"\n{'='*60}")
    print(f"TOTAL WORK ITEMS GENERATED: {total}")
    print(f"{'='*60}")

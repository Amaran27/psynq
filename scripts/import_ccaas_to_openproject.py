#!/usr/bin/env python3
"""
CCaaS Work Items Phase-by-Phase Import Script for OpenProject
Imports 1,128 work items maintaining proper hierarchy:
Phase → Epic → Feature → Task

Safeguards:
1. Phase-by-Phase processing to minimize API conflicts.
2. Sequential creation of Epics and Features.
3. Parallel creation of Tasks with retry logic.
4. Automatic retry on 409 (Conflict) and 429 (Rate Limit).
"""

import csv
import requests
import time
import os
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration
OPENPROJECT_URL = os.environ.get('OPENPROJECT_URL', 'http://localhost:8080')
API_KEY = os.environ.get('OPENPROJECT_API_KEY', '9ad0c551d5fffa8dfe0d3f44189f1d535b399a5c8aa22eaf90cc2ce829f8c2a0')
PROJECT_ID = 6  # Psitrix Psynq (New Project)

# Work Package Type IDs
TYPE_IDS = {
    'Phase': 3,
    'Epic': 5,
    'Feature': 4,
    'Task': 1,
    'User story': 6,
    'Bug': 7
}

# Priority IDs
PRIORITY_IDS = {
    'Low': 7,
    'Normal': 8,
    'High': 9,
    'Immediate': 10
}

STATUS_NEW = 1

# API Session
session = requests.Session()
session.auth = ('apikey', API_KEY)
session.headers.update({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
})

# Global state
created_items = {}  # subject -> id
created_items_lock = threading.Lock()
import_stats = {'created': 0, 'errors': 0, 'skipped': 0}
stats_lock = threading.Lock()

def create_work_package(item, parent_id=None):
    """Create a single work package with retry logic"""
    subject = item['Subject']
    wp_type = item['Type']
    
    # Build payload
    payload = {
        'subject': subject,
        '_links': {
            'type': {'href': f'/api/v3/types/{TYPE_IDS.get(wp_type, 1)}'},
            'status': {'href': f'/api/v3/statuses/{STATUS_NEW}'},
            'priority': {'href': f'/api/v3/priorities/{PRIORITY_IDS.get(item.get("Priority", "Normal"), 8)}'},
            'project': {'href': f'/api/v3/projects/{PROJECT_ID}'}
        }
    }
    
    # Description with metadata
    description = item.get('Description', '')
    role = item.get('Role', 'Developer')
    ai_instr = item.get('AI Agent Instructions', '')
    dor = item.get('Definition of Ready', '')
    dod = item.get('Definition of Done', '')
    ac = item.get('Acceptance Criteria', '')
    
    rich_desc = f"""{description}

---
### 🤖 AI Agent Context
**Role:** {role}
**Instructions:** 
{ai_instr}

---
### 📋 Project Metadata
**Definition of Ready:** {dor}
**Definition of Done:** {dod}
**Acceptance Criteria:** {ac}
"""
    payload['description'] = {'format': 'markdown', 'raw': rich_desc}
    
    if parent_id:
        payload['_links']['parent'] = {'href': f'/api/v3/work_packages/{parent_id}'}
    
    # Retry logic
    max_retries = 5
    for attempt in range(max_retries):
        try:
            resp = session.post(f'{OPENPROJECT_URL}/api/v3/projects/{PROJECT_ID}/work_packages', json=payload, timeout=30)
            if resp.status_code in [200, 201]:
                wp_id = resp.json()['id']
                with created_items_lock:
                    created_items[subject] = wp_id
                with stats_lock:
                    import_stats['created'] += 1
                return wp_id
            elif resp.status_code == 409: # Conflict
                time.sleep(1 * (attempt + 1))
                continue
            elif resp.status_code == 429: # Rate limit
                wait = int(resp.headers.get('Retry-After', 2))
                time.sleep(wait)
                continue
            else:
                print(f"  ❌ Error {resp.status_code} for '{subject[:50]}': {resp.text[:100]}")
                break
        except Exception as e:
            print(f"  ❌ Exception for '{subject[:50]}': {e}")
            time.sleep(1)
            
    with stats_lock:
        import_stats['errors'] += 1
    return None

def import_phase_tree(phase_item, all_items):
    """Import a single phase and all its descendants"""
    print(f"\n🚀 Importing Phase: {phase_item['Subject']}")
    
    # 1. Create Phase
    phase_id = create_work_package(phase_item)
    if not phase_id: return
    
    # 2. Find and create Epics for this Phase
    epics = [i for i in all_items if i['Parent'] == phase_item['Subject'] and i['Type'] == 'Epic']
    for epic in epics:
        print(f"  📦 Epic: {epic['Subject']}")
        epic_id = create_work_package(epic, phase_id)
        if not epic_id: continue
        
        # 3. Find and create Features for this Epic
        features = [i for i in all_items if i['Parent'] == epic['Subject'] and i['Type'] == 'Feature']
        for feature in features:
            print(f"    🔹 Feature: {feature['Subject']}")
            feature_id = create_work_package(feature, epic_id)
            if not feature_id: continue
            
            # 4. Find and create Tasks for this Feature (Parallel)
            tasks = [i for i in all_items if i['Parent'] == feature['Subject'] and i['Type'] == 'Task']
            if tasks:
                print(f"      ⚙️  Tasks: {len(tasks)} (parallel)")
                with ThreadPoolExecutor(max_workers=5) as executor:
                    futures = [executor.submit(create_work_package, task, feature_id) for task in tasks]
                    for f in as_completed(futures):
                        pass # Results handled in create_work_package

def main():
    csv_file = 'd:/Project/psitrix/psynq/openproject_exports/work_packages_detailed.csv'
    print(f"📄 Reading {csv_file}...")
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        all_items = list(csv.DictReader(f))
    
    phases = [i for i in all_items if i['Type'] == 'Phase']
    print(f"📊 Found {len(phases)} Phases and {len(all_items)} total items.")
    
    start_time = time.time()
    
    # Process each Phase one by one
    for phase in phases:
        import_phase_tree(phase, all_items)
        print(f"✅ Phase '{phase['Subject']}' complete.")
        time.sleep(1) # Small breather between phases
        
    duration = time.time() - start_time
    print("\n" + "="*60)
    print(f"🎉 Import Complete in {duration:.2f}s")
    print(f"✅ Created: {import_stats['created']}")
    print(f"❌ Errors: {import_stats['errors']}")
    print("="*60)

if __name__ == "__main__":
    main()

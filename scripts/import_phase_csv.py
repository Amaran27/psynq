#!/usr/bin/env python3
"""
Simple OpenProject CSV Importer
Imports work packages from CSV maintaining hierarchy
"""
import csv
import requests
import sys
from time import sleep

# Configuration
OPENPROJECT_URL = 'http://localhost:8080'
API_KEY = '9ad0c551d5fffa8dfe0d3f44189f1d535b399a5c8aa22eaf90cc2ce829f8c2a0'
PROJECT_ID = 3  # Psitrix Psynq

# Type IDs
TYPE_MAP = {
    'Phase': 3,
    'Epic': 5,
    'Feature': 4,
    'User story': 6,
    'Task': 1,
    'Bug': 7
}

PRIORITY_MAP = {
    'Low': 7,
    'Normal': 8,
    'High': 9,
    'Immediate': 10
}

def create_work_package(item, parent_id=None):
    """Create a single work package via API"""
    
    payload = {
        'subject': item['Subject'],
        '_links': {
            'type': {'href': f'/api/v3/types/{TYPE_MAP.get(item["Type"], 1)}'},
            'status': {'href': '/api/v3/statuses/1'},  # New
            'priority': {'href': f'/api/v3/priorities/{PRIORITY_MAP.get(item["Priority"], 8)}'},
            'project': {'href': f'/api/v3/projects/{PROJECT_ID}'}
        }
    }
    
    # Add description
    if item.get('Description'):
        payload['description'] = {
            'format': 'markdown',
            'raw': item['Description']
        }
    
    # Add dates
    if item.get('Start date'):
        payload['startDate'] = item['Start date']
    if item.get('Due date'):
        payload['dueDate'] = item['Due date']
    
    # Add parent
    if parent_id:
        payload['_links']['parent'] = {'href': f'/api/v3/work_packages/{parent_id}'}
    
    # Make API request
    response = requests.post(
        f'{OPENPROJECT_URL}/api/v3/projects/{PROJECT_ID}/work_packages',
        json=payload,
        auth=('apikey', API_KEY),
        headers={'Content-Type': 'application/json'}
    )
    
    if response.status_code in [200, 201]:
        wp = response.json()
        return wp['id']
    else:
        print(f"  ❌ Error creating '{item['Subject']}': {response.status_code}")
        print(f"     {response.text[:200]}")
        return None

def import_csv(csv_file):
    """Import CSV file maintaining hierarchy"""
    print(f"\n📂 Reading: {csv_file}")
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        items = list(reader)
    
    print(f"📊 Found {len(items)} items to import\n")
    
    # Track created items for parent linking
    created = {}
    
    # Import in order (hierarchy preserved)
    for idx, item in enumerate(items, 1):
        subject = item['Subject']
        parent_ref = item.get('Parent', '')
        
        print(f"[{idx}/{len(items)}] Creating: {subject[:60]}...")
        
        # Resolve parent ID
        parent_id = created.get(parent_ref) if parent_ref else None
        
        # Create work package
        wp_id = create_work_package(item, parent_id)
        
        if wp_id:
            created[subject] = wp_id
            print(f"  ✅ Created #{wp_id}")
        else:
            print(f"  ❌ Failed")
        
        # Rate limiting
        sleep(0.2)
    
    print(f"\n✅ Import complete: {len(created)}/{len(items)} items created")
    return len(created)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python import_phase_csv.py <csv_file>")
        print("Example: python import_phase_csv.py phase1_infrastructure.csv")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    
    try:
        imported = import_csv(csv_file)
        print(f"\n🎉 Successfully imported {imported} work packages!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

#!/usr/bin/env python3
"""
CCaaS Detailed Work Items Generator
Generates implementation-level work items with exact specs.
NO MOCKS, NO STUBS - Real implementation details only.
"""

import csv
import os
from datetime import datetime, timedelta

# Output file
OUTPUT_FILE = 'd:/Project/psitrix/psynq/openproject_exports/work_packages_detailed.csv'

# CSV Headers
HEADERS = [
    'Subject', 'Type', 'Project', 'Parent', 'Priority', 'Status',
    'Start date', 'Due date', 'Assignee', 'Estimated time', 'Labels',
    'Version', 'Story Points', 'Risk Level', 'Definition of Ready',
    'Definition of Done', 'Acceptance Criteria', 'Success Metrics',
    'External Dependencies', 'Rollback Plan', 'Description', '% Complete'
]

# Work item counter
work_item_id = 0

def get_id():
    global work_item_id
    work_item_id += 1
    return work_item_id

def write_items(items, mode='a'):
    """Write items to CSV file"""
    with open(OUTPUT_FILE, mode, newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=HEADERS)
        if mode == 'w':
            writer.writeheader()
        for item in items:
            writer.writerow(item)
    print(f"  Written {len(items)} items (total: {work_item_id})")

def create_item(subject, item_type, parent, priority, description, 
                start_days=0, duration_days=14, estimated_hours=None,
                labels='', assignee='', risk='Low'):
    """Create a single work item with all required fields"""
    
    base_date = datetime(2026, 1, 15)
    start = base_date + timedelta(days=start_days)
    end = start + timedelta(days=duration_days)
    
    dor_map = {
        'Phase': 'Phase scope defined; all Epics planned; budget approved; team assigned',
        'Epic': 'Epic scope defined; Features identified; technical approach approved',
        'Feature': 'Requirements documented; API contract defined; DB schema approved',
        'User story': 'Story groomed; acceptance criteria clear; dependencies resolved',
        'Task': 'Task requirements clear; file paths defined; function signatures approved'
    }
    
    dod_map = {
        'Phase': 'All Epics completed; documentation published; stakeholder signoff',
        'Epic': 'All Features completed; integration tested; performance benchmarked',
        'Feature': 'All tasks completed; feature tested e2e; deployed to staging',
        'User story': 'Story implemented; unit tests passing; code reviewed',
        'Task': 'Implementation complete; tests passing with REAL services; PR merged'
    }
    
    return {
        'Subject': subject,
        'Type': item_type,
        'Project': 'Psitrix Psynq',
        'Parent': parent,
        'Priority': priority,
        'Status': 'New',
        'Start date': start.strftime('%Y-%m-%d'),
        'Due date': end.strftime('%Y-%m-%d'),
        'Assignee': assignee,
        'Estimated time': f'{estimated_hours}h' if estimated_hours else '',
        'Labels': labels,
        'Version': 'v1.0.0-MVP',
        'Story Points': '',
        'Risk Level': risk,
        'Definition of Ready': dor_map.get(item_type, ''),
        'Definition of Done': dod_map.get(item_type, ''),
        'Acceptance Criteria': 'Tests passing with REAL services; NO MOCKS; Code reviewed',
        'Success Metrics': 'Feature functional; performance acceptable',
        'External Dependencies': 'None',
        'Rollback Plan': 'Revert commit; redeploy previous version',
        'Description': description,
        '% Complete': '0'
    }

# =============================================================================
# PART 1: PHASES
# =============================================================================
def generate_phases():
    """Generate the 14 Phase work items - returns list"""
    items = []
    
    phases = [
        ('Phase: Infrastructure & Platform', 'Docker, PostgreSQL, Redis, MinIO, NGINX. Foundation services.', 0, 75),
        ('Phase: Telephony & WebRTC', 'Asterisk ARI, PJSIP, SIP.js, WebRTC, Call Routing, IVR.', 30, 90),
        ('Phase: Dialer & Campaign Management', 'Preview/Progressive/Predictive Dialers, Campaigns, Voice Broadcast.', 75, 90),
        ('Phase: Workforce Engagement Management', 'WFM, QM, Gamification, Scheduling, QA Scoring.', 120, 90),
        ('Phase: AI & Conversational Intelligence', 'Voicebot, Chatbot, Agent Assist, Sentiment, Transcription.', 150, 90),
        ('Phase: Omnichannel Engagement', 'WhatsApp, SMS, Email, Chat, Video, Social Media.', 105, 90),
        ('Phase: Analytics & Reporting', 'Real-time Dashboards, Historical Reports, KPIs.', 90, 75),
        ('Phase: Integrations & APIs', 'Salesforce, Zoho, HubSpot, REST API, Webhooks.', 120, 60),
        ('Phase: Supervisor & Monitoring Tools', 'Live Monitoring, Whisper, Barge, Silent Monitor.', 105, 60),
        ('Phase: Admin & Configuration UI', 'Admin Panels, Visual Builders, No-Code Tools.', 90, 90),
        ('Phase: Backend Core Services', 'NestJS, Auth, Domain Services, API Layer.', 15, 90),
        ('Phase: Frontend Applications', 'Agent Desktop, Supervisor Console, Admin Portal.', 60, 90),
        ('Phase: Security & Compliance', 'HIPAA, GDPR, PCI-DSS, Encryption, Audit.', 150, 60),
        ('Phase: Operations & DevOps', 'CI/CD, Monitoring, DR, Backup, Deployment.', 180, 60),
    ]
    
    for name, desc, start, duration in phases:
        items.append(create_item(
            subject=name,
            item_type='Phase',
            parent='',
            priority='High',
            description=f"{desc}\n\nAI Agent Instructions:\nImplement with REAL services only. NO MOCKS, NO STUBS. All settings via admin UI.",
            start_days=start,
            duration_days=duration,
            labels='General'
        ))
    
    write_items(items, mode='w')  # First write - create file with headers
    return items

if __name__ == '__main__':
    print("=" * 60)
    print("CCaaS Detailed Work Items Generator")
    print("=" * 60)
    
    # Generate Phases first
    phases = generate_phases()
    
    print(f"\nPhases created: {len(phases)}")
    print("Run next script parts to add Epics, Features, Tasks...")

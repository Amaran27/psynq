"""
Generate complete work packages CSV with ALL standard fields
Reads the original 312-item CSV and enhances it with industry-standard fields
"""
import csv
from datetime import datetime, timedelta

# Read original CSV
input_file = 'openproject_exports/work_packages_comprehensive.csv'
output_file = 'openproject_exports/work_packages_complete.csv'

# Helper functions
def get_assignee(work_type, subject):
    """Determine assignee based on work type and subject"""
    assignee_map = {
        'HLD': 'Solutions Architect',
        'LLD': 'Backend Developer',
        'Database': 'Database Engineer',
        'Docker': 'DevOps Engineer',
        'Redis': 'Backend Developer',
        'Security': 'Security Engineer',
        'QA': 'QA Engineer',
        'Docs': 'Technical Writer',
        'Frontend': 'Frontend Developer',
        'Asterisk': 'Asterisk Engineer',
        'WebRTC': 'WebRTC Developer',
        'API': 'Backend Developer',
        'Performance': 'Performance Engineer',
    }
    
    for keyword, assignee in assignee_map.items():
        if keyword in subject:
            return assignee
    
    if 'Phase' in work_type:
        return 'Project Manager'
    elif 'Epic' in work_type:
        return 'Tech Lead'
    elif 'Feature' in work_type:
        return 'Engineering Manager'
    else:
        return 'Backend Developer'

def get_start_date(row_idx, work_type):
    """Calculate start date based on row index and type"""
    base_date = datetime(2026, 1, 15)
    
    # Phases start at beginning
    if 'Phase' in work_type:
        phase_offset = {
            0: 0,  # Infrastructure - start immediately
            1: 20, # Telephony - 20 days later
            2: 15, # Backend
            3: 30, # Frontend
            4: 25, # Security
            5: 35, # Quality
            6: 40, # Operations
            7: 30, # Integrations
            8: 0,  # SSOT - parallel with Infrastructure
        }
        offset = phase_offset.get(row_idx % 9, 0)
        return (base_date + timedelta(days=offset)).strftime('%Y-%m-%d')
    
    # Calculate based on row index for progressive timeline
    days_offset = row_idx // 5  # Stagger starts
    return (base_date + timedelta(days=days_offset)).strftime('%Y-%m-%d')

def get_due_date(start_date, work_type, estimated_time):
    """Calculate due date based on start date and estimated time"""
    start = datetime.strptime(start_date, '%Y-%m-%d')
    
    if 'Phase' in work_type:
        duration = 75  # ~2.5 months
    elif 'Epic' in work_type:
        duration = 45  # ~1.5 months
    elif 'Feature' in work_type:
        duration = 20  # ~3 weeks
    elif 'User story' in work_type:
        duration = 1   # 1 day for HLD/LLD
    else:
        # Task - parse estimated time
        if estimated_time:
            if 'h' in estimated_time:
                hours = float(estimated_time.replace('h', ''))
                duration = max(1, int(hours / 6))  # Convert hours to days (6h work day)
            else:
                duration = 1
        else:
            duration = 1
    
    return (start + timedelta(days=duration)).strftime('%Y-%m-%d')

def get_labels(subject):
    """Generate labels/tags based on subject"""
    labels = []
    
    # Technical area
    if any(x in subject for x in ['Docker', 'Database', 'PostgreSQL', 'Redis', 'MinIO', 'NGINX']):
        labels.append('Infrastructure')
    if any(x in subject for x in ['Frontend', 'React', 'WebRTC', 'UI', 'Web']):
        labels.append('Frontend')
    if any(x in subject for x in ['Backend', 'API', 'NestJS', 'Service']):
        labels.append('Backend')
    if any(x in subject for x in ['Asterisk', 'SIP', 'Telephony', 'Call', 'ARI']):
        labels.append('Telephony')
    if any(x in subject for x in ['Security', 'Encryption', 'Auth', 'SSL', 'TLS']):
        labels.append('Security')
    if any(x in subject for x in ['Database', 'PostgreSQL', 'Schema', 'Migration']):
        labels.append('Database')
    if any(x in subject for x in ['Performance', 'Load', 'Benchmark']):
        labels.append('Performance')
    
    # Work type
    if 'QA' in subject or 'Test' in subject:
        labels.append('Testing')
    if 'Docs' in subject or 'Documentation' in subject:
        labels.append('Documentation')
    if 'HLD' in subject:
        labels.append('HighLevelDesign')
    if 'LLD' in subject:
        labels.append('LowLevelDesign')
    
    # Compliance
    if any(x in subject.lower() for x in ['hipaa', 'gdpr', 'compliance', 'audit']):
        labels.append('Compliance')
    
    return ','.join(labels) if labels else 'General'

def get_version(row_idx):
    """Assign version/milestone"""
    if row_idx < 100:
        return 'v1.0.0-MVP'
    elif row_idx < 200:
        return 'v1.0.0-Beta'
    else:
        return 'v1.0.0-GA'

def get_risk_level(work_type, subject):
    """Determine risk level"""
    high_risk_keywords = ['Security', 'Encryption', 'Auth', 'Payment', 'Asterisk', 'PJSIP', 'Real-time', 'WebRTC', 'Performance']
    medium_risk_keywords = ['Integration', 'Migration', 'API', 'Database', 'Call']
    
    if any(x in subject for x in high_risk_keywords):
        return 'High'
    elif any(x in subject for x in medium_risk_keywords):
        return 'Medium'
    else:
        return 'Low'

def get_story_points(work_type, estimated_time):
    """Estimate story points (Fibonacci scale)"""
    if 'Phase' in work_type:
        return '89'
    elif 'Epic' in work_type:
        return '34'
    elif 'Feature' in work_type:
        return '13'
    elif 'User story' in work_type:
        return '5'
    else:
        # Task - base on estimated time
        if estimated_time:
            if 'h' in estimated_time:
                hours = float(estimated_time.replace('h', ''))
                if hours <= 1:
                    return '1'
                elif hours <= 2:
                    return '2'
                elif hours <= 4:
                    return '3'
                else:
                    return '5'
        return '2'

def get_definition_of_ready(work_type, subject):
    """Generate Definition of Ready"""
    if 'Phase' in work_type:
        return "Phase scope defined; all Epic placeholders created; budget approved; team assigned; dependencies identified; risks assessed"
    elif 'Epic' in work_type:
        return "Epic scope defined; Features identified; team capacity confirmed; technical approach approved; dependencies documented"
    elif 'Feature' in work_type:
        return "Feature requirements documented; design reviewed; team trained; dependencies resolved; acceptance criteria defined"
    elif 'HLD' in subject:
        return "Business requirements documented; architecture principles defined; stakeholders identified; review scheduled"
    elif 'LLD' in subject:
        return "HLD completed; technical stack confirmed; API contracts defined; data models approved"
    elif 'QA' in subject or 'Test' in subject:
        return "Implementation completed; test strategy approved; test environment ready; acceptance criteria defined"
    elif 'Security' in subject:
        return "Security requirements documented; threat model reviewed; compliance requirements known; tools selected"
    elif 'Docs' in subject:
        return "Implementation completed; technical review done; documentation template ready; screenshots/diagrams available"
    else:
        return "Requirements clear; dependencies resolved; design approved; team capacity confirmed; acceptance criteria defined"

def get_definition_of_done(work_type, subject):
    """Generate Definition of Done"""
    base_dod = "Implementation complete; code reviewed; tests passing with REAL services (no mocks); documentation updated; CI/CD passing"
    
    if 'Phase' in work_type:
        return "All Epics completed; phase deliverables met; documentation published; stakeholder signoff; zero mocks in codebase"
    elif 'Epic' in work_type:
        return "All Features completed; integration tested; performance benchmarked; monitoring enabled; runbook created; zero mocks"
    elif 'Feature' in work_type:
        return "All User Stories/Tasks completed; feature tested end-to-end; documented; deployed to staging; zero mocks"
    elif 'QA' in subject or 'Test' in subject:
        return "All test cases written; all tests passing; test coverage >80%; tests use REAL services (no mocks); integrated into CI"
    elif 'Security' in subject:
        return base_dod + "; security scan passed; penetration test passed; compliance verified; incident response documented"
    elif 'Docs' in subject:
        return "Documentation complete; peer-reviewed; published; screenshots/diagrams added; examples tested; searchable"
    else:
        return base_dod

def get_acceptance_criteria(work_type, subject):
    """Generate explicit acceptance criteria"""
    if 'Docker' in subject:
        return "✓ Docker builds successfully\n✓ Image size <200MB\n✓ Container starts healthy\n✓ No security vulnerabilities\n✓ Documentation complete"
    elif 'Database' in subject or 'PostgreSQL' in subject:
        return "✓ Schema created correctly\n✓ All migrations apply successfully\n✓ Foreign keys enforced\n✓ Indexes created\n✓ Performance acceptable (<100ms queries)"
    elif 'Redis' in subject:
        return "✓ Redis service operational\n✓ Cache operations working\n✓ TTL expiration correct\n✓ Pub/sub delivering messages\n✓ Persistence enabled"
    elif 'Test' in subject or 'QA' in subject:
        return "✓ All test cases pass\n✓ Uses REAL services (no mocks)\n✓ Test coverage >80%\n✓ Runs in CI pipeline\n✓ No flaky tests"
    elif 'Security' in subject:
        return "✓ Security controls implemented\n✓ Penetration test passed\n✓ Vulnerability scan clean\n✓ Compliance verified\n✓ Audit log enabled"
    elif 'API' in subject:
        return "✓ All endpoints functional\n✓ Request validation working\n✓ Error handling comprehensive\n✓ API documented (OpenAPI)\n✓ Rate limiting implemented"
    elif 'Docs' in subject:
        return "✓ Documentation complete\n✓ All sections written\n✓ Examples tested\n✓ Screenshots current\n✓ Peer-reviewed"
    else:
        return "✓ Feature implemented\n✓ Code reviewed\n✓ Tests passing (real services)\n✓ Documentation updated\n✓ Deployed to staging"

def get_success_metrics(work_type, subject):
    """Define success metrics/KPIs"""
    if 'Performance' in subject or 'Load' in subject:
        return "Response time <100ms (p95); Throughput >1000 req/s; CPU <70%; Memory <2GB; Zero crashes"
    elif 'Database' in subject:
        return "Query time <100ms; Connection pool utilization <80%; Zero deadlocks; Backup time <30min; Recovery tested"
    elif 'Redis' in subject:
        return "Cache hit rate >80%; Latency <1ms (p95); Throughput >10000 ops/s; Memory usage <2GB; Zero data loss"
    elif 'Call' in subject or 'Asterisk' in subject:
        return "Call setup time <3s; MOS score >4.0; Call success rate >99%; Zero dropped calls; CDR accuracy 100%"
    elif 'QA' in subject or 'Test' in subject:
        return "Test coverage >80%; Test execution time <10min; Zero flaky tests; Defect detection rate >90%; CI success rate >95%"
    elif 'Security' in subject:
        return "Zero critical vulnerabilities; OWASP Top 10 addressed; Penetration test passed; Audit findings <5; Incident response time <1h"
    elif 'API' in subject:
        return "API uptime >99.9%; Response time <200ms; Error rate <0.1%; API docs coverage 100%; Rate limit enforcement 100%"
    else:
        return "Deliverable completed on time; Quality gates passed; Stakeholder acceptance achieved; Zero production defects"

def get_external_dependencies(subject):
    """Identify external dependencies"""
    deps = []
    
    if 'Twilio' in subject:
        deps.append('Twilio API (account + credentials)')
    if any(x in subject for x in ['Salesforce', 'CRM']):
        deps.append('Salesforce API (license + integration user)')
    if 'HubSpot' in subject:
        deps.append('HubSpot API (API key)')
    if 'AWS' in subject or 'S3' in subject:
        deps.append('AWS Account (credentials + permissions)')
    if any(x in subject for x in ['SSL', 'TLS', 'Certificate']):
        deps.append('SSL Certificates (Let\'s Encrypt or commercial CA)')
    if 'SMTP' in subject or 'Email' in subject:
        deps.append('SMTP Service (SendGrid/AWS SES credentials)')
    if 'Asterisk' in subject:
        deps.append('SIP Trunk Provider (credentials + DID numbers)')
    if 'Payment' in subject:
        deps.append('Payment Gateway (API credentials)')
    
    return '; '.join(deps) if deps else 'None'

def get_rollback_plan(work_type, subject):
    """Define rollback plan for production changes"""
    if 'Database' in subject or 'Migration' in subject:
        return "Run rollback migration; Restore from backup if needed; Verify data integrity; Test application connectivity"
    elif 'Docker' in subject or 'Deploy' in subject:
        return "Revert to previous image tag; Restart containers; Verify service health; Check logs for errors"
    elif 'Redis' in subject:
        return "Restore Redis config; Flush corrupted data if needed; Restart Redis; Verify cache hit rates"
    elif 'API' in subject:
        return "Revert API code; Redeploy previous version; Test critical endpoints; Monitor error rates"
    elif 'Security' in subject:
        return "Disable new security control; Restore previous config; Verify access; Document issues"
    else:
        return "Revert code changes; Redeploy previous version; Run smoke tests; Monitor for issues"

def generate_ai_instructions(row):
    """Generate detailed AI agent instructions"""
    subject = row['Subject']
    description = row['Description']
    
    # Base instruction
    instruction = f"{description}\n\nAI Agent Instructions:\n"
    
    # Add specific guidance based on type
    if 'HLD' in subject:
        instruction += "Create architecture document with: (1) System overview (2) Component diagram (3) Data flow (4) Technology stack (5) Security considerations (6) Scalability approach. "
    elif 'LLD' in subject:
        instruction += "Create detailed design with: (1) Class diagrams (2) API specifications (3) Database schemas (4) Sequence diagrams (5) Error handling. "
    elif 'QA' in subject or 'Test' in subject:
        instruction += "Create comprehensive test suite: Use REAL services (no mocks). Test happy path + edge cases + error scenarios. "
    elif 'Security' in subject:
        instruction += "Implement security controls following OWASP guidelines. Enable audit logging. Document security decisions. "
    elif 'Docs' in subject:
        instruction += "Create user-friendly documentation with examples, screenshots, troubleshooting section. "
    
    # Add testing requirement
    instruction += "Test with REAL services - NO MOCKS. "
    
    # Add file references if applicable
    if 'Docker' in subject:
        instruction += "Files: Dockerfile, docker-compose.yml"
    elif 'Database' in subject:
        instruction += "Files: db/migrations/*.sql, db/schemas/*.sql"
    elif 'Backend' in subject or 'API' in subject:
        instruction += "Files: packages/backend/src/**/*.ts"
    elif 'Frontend' in subject:
        instruction += "Files: packages/web/src/**/*.tsx"
    elif 'Redis' in subject:
        instruction += "Files: packages/backend/src/redis/**/*.ts"
    
    return instruction

# Read input CSV
print(f"Reading {input_file}...")
with open(input_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print(f"Processing {len(rows)} work items...")

# Define enhanced fields
enhanced_fields = [
    'Subject',
    'Type',
    'Project',
    'Parent',
    'Priority',
    'Status',
    'Start date',
    'Due date',
    'Assignee',
    'Estimated time',
    'Labels',
    'Version',
    'Story Points',
    'Risk Level',
    'Definition of Ready',
    'Definition of Done',
    'Acceptance Criteria',
    'Success Metrics',
    'External Dependencies',
    'Rollback Plan',
    'Description',
    '% Complete',
]

# Process each row
enhanced_rows = []
for idx, row in enumerate(rows):
    work_type = row['Type']
    subject = row['Subject']
    estimated = row.get('Estimated time', '')
    
    # Calculate dates
    start_date = get_start_date(idx, work_type)
    due_date = get_due_date(start_date, work_type, estimated)
    
    # Build enhanced row
    enhanced_row = {
        'Subject': subject,
        'Type': work_type,
        'Project': row['Project'],
        'Parent': row.get('Parent', ''),
        'Priority': row.get('Priority', 'Medium'),
        'Status': row.get('Status', 'New'),
        'Start date': start_date,
        'Due date': due_date,
        'Assignee': get_assignee(work_type, subject),
        'Estimated time': estimated,
        'Labels': get_labels(subject),
        'Version': get_version(idx),
        'Story Points': get_story_points(work_type, estimated),
        'Risk Level': get_risk_level(work_type, subject),
        'Definition of Ready': get_definition_of_ready(work_type, subject),
        'Definition of Done': get_definition_of_done(work_type, subject),
        'Acceptance Criteria': get_acceptance_criteria(work_type, subject),
        'Success Metrics': get_success_metrics(work_type, subject),
        'External Dependencies': get_external_dependencies(subject),
        'Rollback Plan': get_rollback_plan(work_type, subject),
        'Description': generate_ai_instructions(row),
        '% Complete': '0',
    }
    
    enhanced_rows.append(enhanced_row)

# Write output CSV
print(f"Writing {output_file}...")
with open(output_file, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=enhanced_fields)
    writer.writeheader()
    writer.writerows(enhanced_rows)

print(f"✅ Complete! Generated {len(enhanced_rows)} work items with all standard fields")
print(f"Output: {output_file}")
print(f"\nEnhanced fields added:")
print(f"  - Start date, Due date (Q1-Q2 2026 timeline)")
print(f"  - Labels (technical area + work type)")
print(f"  - Version (v1.0.0-MVP/Beta/GA)")
print(f"  - Story Points (Fibonacci scale)")
print(f"  - Risk Level (High/Medium/Low)")
print(f"  - Acceptance Criteria (explicit checklist)")
print(f"  - Success Metrics (KPIs)")
print(f"  - External Dependencies")
print(f"  - Rollback Plan")
print(f"  - % Complete (tracking field)")

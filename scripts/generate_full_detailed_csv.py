import csv
from datetime import datetime, timedelta

# =============================================================================
# CONFIGURATION
# =============================================================================
OUTPUT_FILE = 'd:/Project/psitrix/psynq/openproject_exports/work_packages_detailed.csv'
HEADERS = [
    'Subject', 'Type', 'Project', 'Parent', 'Priority', 'Status',
    'Start date', 'Due date', 'Assignee', 'Estimated time', 'Labels',
    'Version', 'Story Points', 'Risk Level', 'Definition of Ready',
    'Definition of Done', 'Acceptance Criteria', 'Success Metrics',
    'External Dependencies', 'Rollback Plan', 'Description', '% Complete',
    'Role', 'AI Agent Instructions'
]

# Global ID tracker to ensure unique IDs if needed (though we use Subject for parent linking)
work_item_count = 0

def get_dates(start_offset_days, duration_days):
    base_date = datetime(2026, 1, 15)
    start = base_date + timedelta(days=start_offset_days)
    end = start + timedelta(days=duration_days)
    return start.strftime('%Y-%m-%d'), end.strftime('%Y-%m-%d')

def create_item(subject, item_type, parent, priority, description, start_offset=0, duration=5, labels='', role='Developer'):
    global work_item_count
    work_item_count += 1
    
    start_date, due_date = get_dates(start_offset, duration)
    
    # Generate AI Agent Instructions based on role and type
    ai_instructions = ""
    if item_type == 'Task':
        if 'Test' in subject or 'Audit' in subject:
            role = 'QA Engineer'
            ai_instructions = f"Act as a Senior QA Engineer. Your goal is to verify the implementation of '{subject}'. 1. Review the code in the specified file paths. 2. Execute existing tests and write new ones for edge cases (nulls, timeouts, high load). 3. Ensure 100% coverage. 4. Report any regressions or performance bottlenecks."
        else:
            ai_instructions = f"Act as a Senior Full-Stack Developer. Your goal is to implement '{subject}'. 1. Follow Hexagonal Architecture (Domain -> Ports -> Adapters). 2. Use NestJS/React best practices. 3. Ensure all code is strictly typed. 4. NO MOCKS: Use real DB/API connections unless it's a unit test. 5. Update Swagger/Storybook documentation."
    elif item_type == 'Feature':
        role = 'Product Owner / Architect'
        ai_instructions = f"Act as a Solution Architect. Define the technical specifications and sub-tasks for '{subject}'. Ensure alignment with the CCaaS platform goals (reliability, scalability, low latency)."
    
    return {
        'Subject': subject,
        'Type': item_type,
        'Project': 'Psitrix Psynq',
        'Parent': parent,
        'Priority': priority,
        'Status': 'New',
        'Start date': start_date,
        'Due date': due_date,
        'Assignee': 'Tech Lead' if item_type in ['Phase', 'Epic'] else 'Developer',
        'Estimated time': '4h' if item_type == 'Task' else '',
        'Labels': labels,
        'Version': 'v1.0.0-MVP',
        'Story Points': '3' if item_type == 'Task' else '',
        'Risk Level': 'Low',
        'Definition of Ready': 'Specs defined',
        'Definition of Done': 'Code implemented & tested',
        'Acceptance Criteria': 'Tests passing; No mocks',
        'Success Metrics': 'Functional requirement met',
        'External Dependencies': '',
        'Rollback Plan': 'Revert commit',
        'Description': description,
        '% Complete': '0',
        'Role': role,
        'AI Agent Instructions': ai_instructions
    }

# =============================================================================
# TASK GENERATORS (The Secret Sauce for 2000+ Items)
# =============================================================================

def generate_backend_module_tasks(feature_name, module_path, entity_name, start_offset):
    """Generates ~8 tasks for a standard NestJS module"""
    tasks = []
    base_desc = f"Implementation for {entity_name} in {module_path}"
    
    # 1. Entity/Schema
    tasks.append(create_item(
        f"Define Entity: {entity_name}", 'Task', feature_name, 'High',
        f"""**File:** `{module_path}/entities/{entity_name.lower()}.entity.ts`
**Class:** `{entity_name}`
**Type:** TypeORM Entity
**Requirements:**
- Define columns with exact types (varchar, int, jsonb)
- Define relationships (OneToMany, ManyToOne)
- Add indexes for performance
- NO MOCKS: Use real DB connection""",
        start_offset, 2, 'Backend,Database'
    ))

    # 2. DTOs
    tasks.append(create_item(
        f"Create DTOs: {entity_name}", 'Task', feature_name, 'Normal',
        f"""**File:** `{module_path}/dto/create-{entity_name.lower()}.dto.ts`
**File:** `{module_path}/dto/update-{entity_name.lower()}.dto.ts`
**Requirements:**
- Use class-validator decorators (@IsString, @IsInt)
- Use class-transformer
- Strict typing""",
        start_offset, 1, 'Backend,API'
    ))

    # 3. Repository/Service
    tasks.append(create_item(
        f"Implement Service: {entity_name}Service", 'Task', feature_name, 'High',
        f"""**File:** `{module_path}/{entity_name.lower()}.service.ts`
**Class:** `{entity_name}Service`
**Methods:**
- `create(dto)`
- `findAll(query)`
- `findOne(id)`
- `update(id, dto)`
- `remove(id)`
**Logic:** Business logic implementation. NO STUBS.""",
        start_offset + 1, 3, 'Backend'
    ))

    # 4. Controller
    tasks.append(create_item(
        f"Implement Controller: {entity_name}Controller", 'Task', feature_name, 'High',
        f"""**File:** `{module_path}/{entity_name.lower()}.controller.ts`
**Class:** `{entity_name}Controller`
**Endpoints:**
- `POST /api/v1/{entity_name.lower()}s`
- `GET /api/v1/{entity_name.lower()}s`
- `GET /api/v1/{entity_name.lower()}s/:id`
- `PATCH /api/v1/{entity_name.lower()}s/:id`
- `DELETE /api/v1/{entity_name.lower()}s/:id`
**Requirements:** Swagger docs (@ApiTags), Auth guards""",
        start_offset + 2, 2, 'Backend,API'
    ))

    # 5. Unit Tests
    tasks.append(create_item(
        f"Unit Tests: {entity_name}Service", 'Task', feature_name, 'Normal',
        f"""**File:** `{module_path}/{entity_name.lower()}.service.spec.ts`
**Requirements:**
- 100% coverage for service methods
- Test success and error cases
- Mock repository only (unit test)""",
        start_offset + 3, 2, 'Backend,Testing'
    ))

    # 7. Integration Tests
    tasks.append(create_item(
        f"Integration Tests: {entity_name}", 'Task', feature_name, 'Normal',
        f"""**File:** `test/{entity_name.lower()}.integration-spec.ts`
**Requirements:**
- Test database interactions
- Test service integration
- Test event emission""",
        start_offset + 4, 2, 'Backend,Testing'
    ))

    # 8. Swagger Docs
    tasks.append(create_item(
        f"Swagger Docs: {entity_name}", 'Task', feature_name, 'Low',
        f"""**File:** `{module_path}/{entity_name.lower()}.controller.ts`
**Requirements:**
- Add @ApiOperation
- Add @ApiResponse
- Add @ApiProperty to DTOs""",
        start_offset + 1, 1, 'Backend,Docs'
    ))

    # 9. Migration Script
    tasks.append(create_item(
        f"DB Migration: {entity_name}", 'Task', feature_name, 'High',
        f"""**File:** `packages/backend/src/migrations/Create{entity_name}Table.ts`
**Requirements:**
- Up method (create table)
- Down method (drop table)
- Indexes and constraints""",
        start_offset, 1, 'Backend,Database'
    ))

    # 10. Seed Data
    tasks.append(create_item(
        f"Seed Data: {entity_name}", 'Task', feature_name, 'Low',
        f"""**File:** `packages/backend/src/seeds/{entity_name.lower()}.seed.ts`
**Requirements:**
- Create default/test data
- Handle relationships""",
        start_offset + 2, 1, 'Backend,Database'
    ))
    
    return tasks

def generate_frontend_component_tasks(feature_name, component_path, component_name, start_offset):
    """Generates ~8 tasks for a standard React component"""
    tasks = []
    
    # 1. Component Implementation
    tasks.append(create_item(
        f"Build Component: {component_name}", 'Task', feature_name, 'High',
        f"""**File:** `{component_path}/{component_name}.tsx`
**Props Interface:** `{component_name}Props`
**Requirements:**
- Functional component with Hooks
- Tailwind CSS styling
- Responsive design
- Accessibility (ARIA)""",
        start_offset, 2, 'Frontend,UI'
    ))

    # 2. State/Logic
    tasks.append(create_item(
        f"Implement Logic: {component_name}", 'Task', feature_name, 'Normal',
        f"""**File:** `{component_path}/use{component_name}.ts` (Custom Hook)
**Requirements:**
- Handle API calls (React Query)
- Form validation (Zod/React Hook Form)
- State management (Zustand if needed)""",
        start_offset + 1, 2, 'Frontend,Logic'
    ))

    # 3. Unit Tests
    tasks.append(create_item(
        f"Test Component: {component_name}", 'Task', feature_name, 'Normal',
        f"""**File:** `{component_path}/{component_name}.test.tsx`
**Requirements:**
- Render testing (React Testing Library)
- User interaction simulation
- Mock API calls (MSW)""",
        start_offset + 2, 2, 'Frontend,Testing'
    ))

    # 4. Storybook
    tasks.append(create_item(
        f"Storybook: {component_name}", 'Task', feature_name, 'Low',
        f"""**File:** `{component_path}/{component_name}.stories.tsx`
**Requirements:**
- Default state
- Loading state
- Error state
- Empty state""",
        start_offset + 3, 1, 'Frontend,Docs'
    ))

    # 5. Responsive Check
    tasks.append(create_item(
        f"Responsive Check: {component_name}", 'Task', feature_name, 'Normal',
        f"""**Checklist:**
- Mobile view (320px)
- Tablet view (768px)
- Desktop view (1024px+)
- Flex/Grid behavior""",
        start_offset + 4, 1, 'Frontend,UI'
    ))

    # 6. Accessibility Audit
    tasks.append(create_item(
        f"a11y Audit: {component_name}", 'Task', feature_name, 'Normal',
        f"""**Checklist:**
- Keyboard navigation
- Screen reader support
- Color contrast
- ARIA labels""",
        start_offset + 4, 1, 'Frontend,UI'
    ))

    # 7. i18n Support
    tasks.append(create_item(
        f"i18n Support: {component_name}", 'Task', feature_name, 'Low',
        f"""**File:** `packages/web/src/locales/en/{component_name.lower()}.json`
**Requirements:**
- Extract all strings
- Add translation keys
- Support RTL if needed""",
        start_offset + 2, 1, 'Frontend,i18n'
    ))

    # 8. Error Handling
    tasks.append(create_item(
        f"Error Boundary: {component_name}", 'Task', feature_name, 'Low',
        f"""**Requirements:**
- Graceful error fallback
- Retry mechanism
- Error logging""",
        start_offset + 3, 1, 'Frontend,Logic'
    ))

    return tasks

# =============================================================================
# MAIN GENERATOR
# =============================================================================

def generate_full_csv():
    all_items = []
    
    print("🚀 Generating Comprehensive Work Items...")

    # -------------------------------------------------------------------------
    # PHASE 1: INFRASTRUCTURE
    # -------------------------------------------------------------------------
    phase_infra = "Phase: Infrastructure & Platform"
    all_items.append(create_item(phase_infra, 'Phase', '', 'High', "Core Infrastructure", 0, 30))
    
    # Epic: Database
    epic_db = "Epic: Database Setup"
    all_items.append(create_item(epic_db, 'Epic', phase_infra, 'High', "PostgreSQL HA Setup", 0, 14))
    
    # Features & Tasks for DB
    feat_pg = "Feature: PostgreSQL Cluster"
    all_items.append(create_item(feat_pg, 'Feature', epic_db, 'High', "Primary-Replica Setup", 0, 7))
    
    all_items.append(create_item("Configure Primary Node", "Task", feat_pg, "High", "File: deploy/db/postgresql.conf\nSettings: max_connections=1000, shared_buffers=4GB", 0, 1))
    all_items.append(create_item("Configure Replica Node", "Task", feat_pg, "High", "File: deploy/db/replica.conf\nSettings: hot_standby=on", 0, 1))
    all_items.append(create_item("Setup PgPool-II", "Task", feat_pg, "High", "File: deploy/db/pgpool.conf\nLoad balancing and failover", 1, 2))
    all_items.append(create_item("Implement Backup Script", "Task", feat_pg, "High", "File: scripts/backup-db.sh\nFull and incremental backups to MinIO", 2, 2))

    # -------------------------------------------------------------------------
    # PHASE 2: BACKEND CORE (Using Generators)
    # -------------------------------------------------------------------------
    phase_be = "Phase: Backend Core Services"
    all_items.append(create_item(phase_be, 'Phase', '', 'High', "NestJS Core", 15, 45))
    
    epic_auth = "Epic: Authentication"
    all_items.append(create_item(epic_auth, 'Epic', phase_be, 'High', "Auth System", 15, 20))
    
    # Feature: User Management
    feat_users = "Feature: User Management"
    all_items.append(create_item(feat_users, 'Feature', epic_auth, 'High', "User CRUD", 15, 10))
    all_items.extend(generate_backend_module_tasks(feat_users, "packages/backend/src/modules/users", "User", 15))
    
    # Feature: Tenant Management
    feat_tenants = "Feature: Tenant Management"
    all_items.append(create_item(feat_tenants, 'Feature', epic_auth, 'High', "Multi-tenancy", 15, 10))
    all_items.extend(generate_backend_module_tasks(feat_tenants, "packages/backend/src/modules/tenants", "Tenant", 15))

    # Feature: Auth Service
    feat_auth_svc = "Feature: Auth Service"
    all_items.append(create_item(feat_auth_svc, 'Feature', epic_auth, 'High', "Login/Register", 15, 10))
    all_items.extend(generate_backend_module_tasks(feat_auth_svc, "packages/backend/src/modules/auth", "Auth", 15))

    # -------------------------------------------------------------------------
    # PHASE 3: TELEPHONY (Using Generators)
    # -------------------------------------------------------------------------
    phase_tel = "Phase: Telephony & WebRTC"
    all_items.append(create_item(phase_tel, 'Phase', '', 'High', "Asterisk Integration", 30, 60))
    
    epic_ari = "Epic: Asterisk ARI Integration"
    all_items.append(create_item(epic_ari, 'Epic', phase_tel, 'High', "ARI Client", 30, 30))
    
    # Feature: Call Control
    feat_call = "Feature: Call Control"
    all_items.append(create_item(feat_call, 'Feature', epic_ari, 'High', "Basic Call Control", 30, 15))
    all_items.extend(generate_backend_module_tasks(feat_call, "packages/backend/src/modules/calls", "Call", 30))
    
    # Feature: Channels
    feat_chan = "Feature: Channel Management"
    all_items.append(create_item(feat_chan, 'Feature', epic_ari, 'High', "Channel Tracking", 30, 15))
    all_items.extend(generate_backend_module_tasks(feat_chan, "packages/backend/src/modules/channels", "Channel", 30))

    # Feature: Bridges
    feat_bridge = "Feature: Bridge Management"
    all_items.append(create_item(feat_bridge, 'Feature', epic_ari, 'High', "Conferencing/Bridging", 35, 15))
    all_items.extend(generate_backend_module_tasks(feat_bridge, "packages/backend/src/modules/bridges", "Bridge", 35))

    # -------------------------------------------------------------------------
    # PHASE 4: DIALER (Using Generators)
    # -------------------------------------------------------------------------
    phase_dialer = "Phase: Dialer & Campaign Management"
    all_items.append(create_item(phase_dialer, 'Phase', '', 'High', "Outbound Dialers", 60, 60))
    
    epic_camp = "Epic: Campaign Management"
    all_items.append(create_item(epic_camp, 'Epic', phase_dialer, 'High', "Campaigns", 60, 30))
    
    # Feature: Campaigns
    feat_camp_crud = "Feature: Campaign CRUD"
    all_items.append(create_item(feat_camp_crud, 'Feature', epic_camp, 'High', "Campaign Config", 60, 15))
    all_items.extend(generate_backend_module_tasks(feat_camp_crud, "packages/backend/src/modules/campaigns", "Campaign", 60))
    
    # Feature: Lead Lists
    feat_leads = "Feature: Lead Lists"
    all_items.append(create_item(feat_leads, 'Feature', epic_camp, 'High', "Lead Management", 60, 15))
    all_items.extend(generate_backend_module_tasks(feat_leads, "packages/backend/src/modules/leads", "Lead", 60))

    # Epic: Dialing Engines
    epic_eng = "Epic: Dialing Engines"
    all_items.append(create_item(epic_eng, 'Epic', phase_dialer, 'High', "Dialer Logic", 70, 40))
    
    # Feature: Preview Dialer
    feat_prev = "Feature: Preview Dialer"
    all_items.append(create_item(feat_prev, 'Feature', epic_eng, 'High', "Preview Mode", 70, 20))
    all_items.extend(generate_backend_module_tasks(feat_prev, "packages/backend/src/modules/dialer/preview", "PreviewDialer", 70))
    
    # Feature: Predictive Dialer
    feat_pred = "Feature: Predictive Dialer"
    all_items.append(create_item(feat_pred, 'Feature', epic_eng, 'High', "Predictive Algo", 80, 30))
    all_items.extend(generate_backend_module_tasks(feat_pred, "packages/backend/src/modules/dialer/predictive", "PredictiveDialer", 80))

    # -------------------------------------------------------------------------
    # PHASE 5: FRONTEND (Using Generators)
    # -------------------------------------------------------------------------
    phase_fe = "Phase: Frontend Applications"
    all_items.append(create_item(phase_fe, 'Phase', '', 'High', "Web Apps", 45, 90))
    
    epic_agent = "Epic: Agent Desktop"
    all_items.append(create_item(epic_agent, 'Epic', phase_fe, 'High', "Agent UI", 45, 60))
    
    # Feature: Softphone
    feat_soft = "Feature: WebRTC Softphone"
    all_items.append(create_item(feat_soft, 'Feature', epic_agent, 'High', "Dialpad & Call Controls", 45, 20))
    all_items.extend(generate_frontend_component_tasks(feat_soft, "packages/web/src/components/softphone", "Dialpad", 45))
    all_items.extend(generate_frontend_component_tasks(feat_soft, "packages/web/src/components/softphone", "ActiveCall", 45))
    all_items.extend(generate_frontend_component_tasks(feat_soft, "packages/web/src/components/softphone", "IncomingCallModal", 45))
    
    # Feature: Agent Status
    feat_status = "Feature: Agent Status"
    all_items.append(create_item(feat_status, 'Feature', epic_agent, 'High', "Status Controls", 45, 10))
    all_items.extend(generate_frontend_component_tasks(feat_status, "packages/web/src/components/agent", "StatusSelector", 45))
    all_items.extend(generate_frontend_component_tasks(feat_status, "packages/web/src/components/agent", "BreakTimer", 45))

    # -------------------------------------------------------------------------
    # PHASE 6: MOBILE COMPANION APP
    # -------------------------------------------------------------------------
    phase_mobile = "Phase: Mobile Companion App"
    all_items.append(create_item(phase_mobile, 'Phase', '', 'Normal', "React Native App for Supervisors/Agents", 90, 60))
    
    epic_mob_core = "Epic: Mobile Core & Scaffolding"
    all_items.append(create_item(epic_mob_core, 'Epic', phase_mobile, 'High', "React Native Setup", 90, 20))
    
    feat_mob_shared = "Feature: Shared Core Integration"
    all_items.append(create_item(feat_mob_shared, 'Feature', epic_mob_core, 'High', "Monorepo logic sharing", 90, 10))
    all_items.extend(generate_frontend_component_tasks(feat_mob_shared, "packages/mobile/src/core", "SharedProvider", 90))
    
    feat_mob_push = "Feature: Push Notifications"
    all_items.append(create_item(feat_mob_push, 'Feature', epic_mob_core, 'High', "FCM/APNS Integration", 95, 10))
    all_items.append(create_item("Configure Firebase for Android", "Task", feat_mob_push, "High", "File: packages/mobile/android/app/google-services.json", 95, 2))
    all_items.append(create_item("Configure APNS for iOS", "Task", feat_mob_push, "High", "File: packages/mobile/ios/AppDelegate.mm", 95, 2))

    # -------------------------------------------------------------------------
    # PHASE 7: PREDICTIVE DIALER & ALGORITHMS
    # -------------------------------------------------------------------------
    phase_algo = "Phase: Predictive Dialer & Algorithms"
    all_items.append(create_item(phase_algo, 'Phase', '', 'High', "Advanced Dialing Logic", 120, 45))
    
    epic_pacing = "Epic: Pacing Engine"
    all_items.append(create_item(epic_pacing, 'Epic', phase_algo, 'High', "Erlang-C based pacing", 120, 30))
    
    feat_pacing_svc = "Feature: Pacing Service"
    all_items.append(create_item(feat_pacing_svc, 'Feature', epic_pacing, 'High', "Real-time pacing calculation", 120, 15))
    all_items.extend(generate_backend_module_tasks(feat_pacing_svc, "packages/backend/src/modules/dialer/pacing", "PacingEngine", 120))

    # -------------------------------------------------------------------------
    # PHASE 8: IVR & AI INTEGRATION (Leader Rival: Conversational AI)
    # -------------------------------------------------------------------------
    phase_ai = "Phase: IVR & AI Integration"
    all_items.append(create_item(phase_ai, 'Phase', '', 'High', "Voice AI & Visual IVR", 150, 60))
    
    epic_stt = "Epic: Speech-to-Text & Sentiment"
    all_items.append(create_item(epic_stt, 'Epic', phase_ai, 'High', "Real-time Transcription", 150, 30))
    
    feat_whisper = "Feature: Whisper Integration"
    all_items.append(create_item(feat_whisper, 'Feature', epic_stt, 'High', "OpenAI Whisper for transcription", 150, 15))
    all_items.extend(generate_backend_module_tasks(feat_whisper, "packages/backend/src/modules/ai/transcription", "TranscriptionService", 150))
    
    feat_sentiment = "Feature: Sentiment Analysis"
    all_items.append(create_item(feat_sentiment, 'Feature', epic_stt, 'High', "Real-time sentiment tracking", 155, 15))
    all_items.extend(generate_backend_module_tasks(feat_sentiment, "packages/backend/src/modules/ai/sentiment", "SentimentService", 155))

    epic_visual_ivr = "Epic: Visual IVR Builder"
    all_items.append(create_item(epic_visual_ivr, 'Epic', phase_ai, 'High', "Drag-and-drop IVR", 160, 40))
    
    feat_ivr_designer = "Feature: IVR Designer UI"
    all_items.append(create_item(feat_ivr_designer, 'Feature', epic_visual_ivr, 'High', "React Flow based designer", 160, 20))
    all_items.extend(generate_frontend_component_tasks(feat_ivr_designer, "packages/web/src/modules/ivr/designer", "IvrCanvas", 160))

    # -------------------------------------------------------------------------
    # PHASE 9: OMNICHANNEL SUPPORT (Leader Rival: WhatsApp/Social)
    # -------------------------------------------------------------------------
    phase_omni = "Phase: Omnichannel Support"
    all_items.append(create_item(phase_omni, 'Phase', '', 'High', "WhatsApp, Email, Social", 180, 60))
    
    epic_whatsapp = "Epic: WhatsApp Business API"
    all_items.append(create_item(epic_whatsapp, 'Epic', phase_omni, 'High', "Meta WhatsApp Integration", 180, 30))
    
    feat_wa_svc = "Feature: WhatsApp Service"
    all_items.append(create_item(feat_wa_svc, 'Feature', epic_whatsapp, 'High', "Send/Receive WA messages", 180, 15))
    all_items.extend(generate_backend_module_tasks(feat_wa_svc, "packages/backend/src/modules/omnichannel/whatsapp", "WhatsappService", 180))

    epic_crm = "Epic: CRM Integrations"
    all_items.append(create_item(epic_crm, 'Epic', phase_omni, 'High', "Salesforce & Zendesk", 190, 40))
    
    feat_sf_adapter = "Feature: Salesforce Adapter"
    all_items.append(create_item(feat_sf_adapter, 'Feature', epic_crm, 'High', "Salesforce CTI integration", 190, 20))
    all_items.extend(generate_backend_module_tasks(feat_sf_adapter, "packages/backend/src/modules/integrations/salesforce", "SalesforceAdapter", 190))

    # -------------------------------------------------------------------------
    # PHASE 10: ADVANCED REPORTING & ANALYTICS
    # -------------------------------------------------------------------------
    phase_analytics = "Phase: Advanced Reporting & Analytics"
    all_items.append(create_item(phase_analytics, 'Phase', '', 'Normal', "BI & Real-time Dashboards", 210, 45))
    
    epic_bi = "Epic: BI Engine"
    all_items.append(create_item(epic_bi, 'Epic', phase_analytics, 'High', "Custom Report Builder", 210, 30))
    
    feat_report_svc = "Feature: Report Generation Service"
    all_items.append(create_item(feat_report_svc, 'Feature', epic_bi, 'High', "PDF/CSV Export Engine", 210, 15))
    all_items.extend(generate_backend_module_tasks(feat_report_svc, "packages/backend/src/modules/reports", "ReportEngine", 210))

    # -------------------------------------------------------------------------
    # PHASE 11: BILLING, RATING & USAGE
    # -------------------------------------------------------------------------
    phase_billing = "Phase: Billing, Rating & Usage"
    all_items.append(create_item(phase_billing, 'Phase', '', 'High', "Monetization & Wallet", 240, 45))
    
    epic_rating = "Epic: Rating Engine"
    all_items.append(create_item(epic_rating, 'Epic', phase_billing, 'High', "Usage-based charging", 240, 30))
    
    feat_wallet = "Feature: Wallet System"
    all_items.append(create_item(feat_wallet, 'Feature', epic_rating, 'High', "Prepaid/Postpaid wallet", 240, 15))
    all_items.extend(generate_backend_module_tasks(feat_wallet, "packages/backend/src/modules/billing/wallet", "WalletService", 240))

    # -------------------------------------------------------------------------
    # PHASE 12: QUALITY MANAGEMENT & COACHING
    # -------------------------------------------------------------------------
    phase_qm = "Phase: Quality Management & Coaching"
    all_items.append(create_item(phase_qm, 'Phase', '', 'Normal', "QA & Agent Performance", 270, 45))
    
    epic_eval = "Epic: Evaluation System"
    all_items.append(create_item(epic_eval, 'Epic', phase_qm, 'High', "Scorecards & Feedback", 270, 30))
    
    feat_scorecard = "Feature: Scorecard Builder"
    all_items.append(create_item(feat_scorecard, 'Feature', epic_eval, 'High', "Custom QA forms", 270, 15))
    all_items.extend(generate_frontend_component_tasks(feat_scorecard, "packages/web/src/modules/qm/scorecards", "ScorecardEditor", 270))

    # -------------------------------------------------------------------------
    # PHASE 13: WORKFORCE MANAGEMENT (WFM)
    # -------------------------------------------------------------------------
    phase_wfm = "Phase: Workforce Management (WFM)"
    all_items.append(create_item(phase_wfm, 'Phase', '', 'Normal', "Scheduling & Forecasting", 300, 60))
    
    epic_forecast = "Epic: Demand Forecasting"
    all_items.append(create_item(epic_forecast, 'Epic', phase_wfm, 'High', "AI-based call volume prediction", 300, 30))
    
    feat_forecast_svc = "Feature: Forecasting Service"
    all_items.append(create_item(feat_forecast_svc, 'Feature', epic_forecast, 'High', "Prophet/LSTM forecasting", 300, 15))
    all_items.extend(generate_backend_module_tasks(feat_forecast_svc, "packages/backend/src/modules/wfm/forecasting", "ForecastService", 300))

    # -------------------------------------------------------------------------
    # PHASE 14: FINAL INTEGRATION & LAUNCH
    # -------------------------------------------------------------------------
    phase_launch = "Phase: Final Integration & Launch"
    all_items.append(create_item(phase_launch, 'Phase', '', 'High', "Production Readiness", 330, 30))
    
    epic_load = "Epic: Load & Stress Testing"
    all_items.append(create_item(epic_load, 'Epic', phase_launch, 'High', "10,000 Concurrent Calls", 330, 15))
    
    feat_locust = "Feature: Load Test Suite"
    all_items.append(create_item(feat_locust, 'Feature', epic_load, 'High', "Locust.io scripts for ARI", 330, 10))
    all_items.append(create_item("Run SIP Stress Test", "Task", feat_locust, "High", "Use SIPP for 1000 CPS", 330, 5))

    # -------------------------------------------------------------------------
    # LEADER RIVAL FEATURES (The "Secret Sauce")
    # -------------------------------------------------------------------------
    phase_rival = "Phase: Leader Rival Features"
    all_items.append(create_item(phase_rival, 'Phase', '', 'High', "Features to beat Exotel/Ozonetel", 0, 365))
    
    epic_privacy = "Epic: Privacy & Masking"
    all_items.append(create_item(epic_privacy, 'Epic', phase_rival, 'High', "Number Masking", 0, 30))
    feat_masking = "Feature: Number Masking API"
    all_items.append(create_item(feat_masking, 'Feature', epic_privacy, 'High', "Anonymous calling", 0, 15))
    all_items.extend(generate_backend_module_tasks(feat_masking, "packages/backend/src/modules/telephony/masking", "MaskingService", 0))

    epic_compliance = "Epic: Global Compliance"
    all_items.append(create_item(epic_compliance, 'Epic', phase_rival, 'High', "DNC, TCPA, GDPR", 0, 60))
    feat_dnc = "Feature: DNC Registry"
    all_items.append(create_item(feat_dnc, 'Feature', epic_compliance, 'High', "Do Not Disturb management", 0, 15))
    all_items.extend(generate_backend_module_tasks(feat_dnc, "packages/backend/src/modules/compliance/dnc", "DncService", 0))

    # -------------------------------------------------------------------------
    # EXPANDING TO 2000+ ITEMS
    # -------------------------------------------------------------------------
    # We add more modules to reach the target
    extra_modules = [
        ("Skills", "packages/backend/src/modules/skills", "Skill"),
        ("Routing", "packages/backend/src/modules/routing", "RoutingRule"),
        ("Recordings", "packages/backend/src/modules/recordings", "Recording"),
        ("Transcriptions", "packages/backend/src/modules/ai", "Transcription"),
        ("Sentiment", "packages/backend/src/modules/ai", "SentimentAnalysis"),
        ("Email", "packages/backend/src/modules/email", "EmailTicket"),
        ("SMS", "packages/backend/src/modules/sms", "SmsMessage"),
        ("WhatsApp", "packages/backend/src/modules/whatsapp", "WhatsappMessage"),
        ("Dashboards", "packages/backend/src/modules/dashboards", "Dashboard"),
        ("Audit", "packages/backend/src/modules/audit", "AuditLog"),
        ("Integrations", "packages/backend/src/modules/integrations", "Integration"),
        ("Webhooks", "packages/backend/src/modules/webhooks", "Webhook"),
        ("SLA", "packages/backend/src/modules/sla", "SlaPolicy"),
        ("Dispositions", "packages/backend/src/modules/dispositions", "Disposition"),
        ("Scripts", "packages/backend/src/modules/scripts", "AgentScript"),
        ("Forecasts", "packages/backend/src/modules/wfm", "Forecast"),
        ("Adherence", "packages/backend/src/modules/wfm", "AdherenceRecord"),
        ("Gamification", "packages/backend/src/modules/gamification", "Achievement"),
        ("Leads", "packages/backend/src/modules/leads", "Lead"),
        ("Dnc", "packages/backend/src/modules/compliance", "DncNumber"),
        ("Billing", "packages/backend/src/modules/billing", "BillingRecord"),
        ("Invoices", "packages/backend/src/modules/billing", "Invoice"),
        ("ApiKeys", "packages/backend/src/modules/auth", "ApiKey"),
        ("Notifications", "packages/backend/src/modules/notifications", "Notification"),
        ("Storage", "packages/backend/src/modules/storage", "FileRecord"),
        ("Cdr", "packages/backend/src/modules/cdr", "Cdr"),
        ("Qos", "packages/backend/src/modules/cdr", "QosStats"),
        ("StickyAgents", "packages/backend/src/modules/routing", "StickyAgent"),
        ("VisualIvr", "packages/backend/src/modules/ivr", "VisualIvr"),
        ("AgentAssist", "packages/backend/src/modules/ai", "AgentAssist"),
        ("Voicebots", "packages/backend/src/modules/ai", "Voicebot"),
        ("Chatbots", "packages/backend/src/modules/ai", "Chatbot"),
        ("ScreenRecording", "packages/backend/src/modules/qm", "ScreenRecording"),
        ("ShiftBidding", "packages/backend/src/modules/wfm", "ShiftBid"),
        ("HolidayCalendars", "packages/backend/src/modules/config", "HolidayCalendar"),
        ("NumberPorting", "packages/backend/src/modules/telephony", "PortingRequest"),
        ("SipTrunks", "packages/backend/src/modules/telephony", "SipTrunk"),
        ("WebRTCGateways", "packages/backend/src/modules/telephony", "WebRtcGateway"),
    ]
    
    extra_components = [
        ("CampaignList", "packages/web/src/modules/campaigns"),
        ("QueueMonitor", "packages/web/src/modules/queues"),
        ("RealtimeDashboard", "packages/web/src/modules/dashboard"),
        ("ReportBuilder", "packages/web/src/modules/reports"),
        ("IvrDesigner", "packages/web/src/modules/ivr"),
        ("ChatWindow", "packages/web/src/modules/chat"),
        ("InteractionHistory", "packages/web/src/modules/history"),
        ("RecordingPlayer", "packages/web/src/modules/recordings"),
        ("EvaluationForm", "packages/web/src/modules/qm"),
        ("ScheduleCalendar", "packages/web/src/modules/wfm"),
        ("UserManagement", "packages/web/src/modules/user"),
        ("TenantSettings", "packages/web/src/modules/admin"),
        ("IntegrationCard", "packages/web/src/modules/integrations"),
        ("ScriptViewer", "packages/web/src/modules/scripts"),
        ("DataTable", "packages/web/src/components/common"),
        ("Modal", "packages/web/src/components/common"),
        ("Button", "packages/web/src/components/common"),
        ("Input", "packages/web/src/components/common"),
        ("Select", "packages/web/src/components/common"),
        ("DatePicker", "packages/web/src/components/common"),
        ("Tabs", "packages/web/src/components/common"),
        ("Card", "packages/web/src/components/common"),
        ("Badge", "packages/web/src/components/common"),
        ("Avatar", "packages/web/src/components/common"),
        ("Tooltip", "packages/web/src/components/common"),
        ("Toast", "packages/web/src/components/common"),
        ("Loader", "packages/web/src/components/common"),
        ("EmptyState", "packages/web/src/components/common"),
        ("ErrorState", "packages/web/src/components/common"),
        ("ConfirmDialog", "packages/web/src/components/common"),
        ("FilterBar", "packages/web/src/components/common"),
        ("Pagination", "packages/web/src/components/common"),
        ("Breadcrumbs", "packages/web/src/components/common"),
        ("ThemeSwitcher", "packages/web/src/components/common"),
        ("LanguageSwitcher", "packages/web/src/components/common"),
        ("NotificationCenter", "packages/web/src/components/common"),
        ("VisualIvrCanvas", "packages/web/src/modules/ivr"),
        ("AgentAssistPanel", "packages/web/src/modules/ai"),
        ("SentimentIndicator", "packages/web/src/modules/ai"),
        ("TranscriptionView", "packages/web/src/modules/ai"),
        ("WhatsAppChat", "packages/web/src/modules/omnichannel"),
        ("EmailInbox", "packages/web/src/modules/omnichannel"),
        ("SmsComposer", "packages/web/src/modules/omnichannel"),
        ("CrmSyncStatus", "packages/web/src/modules/integrations"),
        ("BillingDashboard", "packages/web/src/modules/billing"),
        ("WalletTopup", "packages/web/src/modules/billing"),
        ("ShiftBidder", "packages/web/src/modules/wfm"),
        ("AdherenceGauge", "packages/web/src/modules/wfm"),
    ]

    # Add extra modules to Phase 8 (Expanded Core)
    p_exp = "Phase: Expanded Core Features"
    all_items.append(create_item(p_exp, 'Phase', '', 'High', "All Core Modules", 150, 120))
    e_exp_be = "Epic: Backend Modules Implementation"
    all_items.append(create_item(e_exp_be, 'Epic', p_exp, 'High', "Backend Services", 150, 120))
    
    for name, path, entity in extra_modules:
        f_name = f"Feature: {name} Module"
        all_items.append(create_item(f_name, 'Feature', e_exp_be, 'Normal', f"{name} Implementation", 150, 10))
        all_items.extend(generate_backend_module_tasks(f_name, path, entity, 150))

    e_exp_fe = "Epic: UI Components Implementation"
    all_items.append(create_item(e_exp_fe, 'Epic', p_exp, 'High', "Frontend Components", 150, 120))
    
    for comp, path in extra_components:
        f_name = f"Feature: {comp} UI"
        all_items.append(create_item(f_name, 'Feature', e_exp_fe, 'Normal', f"{comp} Component", 150, 10))
        all_items.extend(generate_frontend_component_tasks(f_name, path, comp, 150))

    # -------------------------------------------------------------------------
    # WRITE TO CSV
    # -------------------------------------------------------------------------
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=HEADERS)
        writer.writeheader()
        for item in all_items:
            writer.writerow(item)
            
    print(f"✅ Successfully generated {len(all_items)} detailed work items.")
    print(f"📂 Output: {OUTPUT_FILE}")

    # -------------------------------------------------------------------------
    # VALIDATION
    # -------------------------------------------------------------------------
    print("\n🔍 Validating Hierarchy...")
    type_map = {item['Subject']: item['Type'] for item in all_items}
    errors = 0
    for item in all_items:
        subject = item['Subject']
        i_type = item['Type']
        parent = item['Parent']
        
        if i_type == 'Phase':
            if parent != '':
                print(f"❌ Phase '{subject}' should not have a parent.")
                errors += 1
        elif i_type == 'Epic':
            if not parent or type_map.get(parent) != 'Phase':
                print(f"❌ Epic '{subject}' must have a Phase parent. Found: {type_map.get(parent)}")
                errors += 1
        elif i_type == 'Feature':
            if not parent or type_map.get(parent) != 'Epic':
                print(f"❌ Feature '{subject}' must have an Epic parent. Found: {type_map.get(parent)}")
                errors += 1
        elif i_type == 'Task':
            if not parent or type_map.get(parent) != 'Feature':
                print(f"❌ Task '{subject}' must have a Feature parent. Found: {type_map.get(parent)}")
                errors += 1
                
    if errors == 0:
        print("✅ Hierarchy validation passed!")
    else:
        print(f"❌ Hierarchy validation failed with {errors} errors.")

if __name__ == '__main__':
    generate_full_csv()

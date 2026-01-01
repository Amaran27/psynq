"""
Generate COMPLETE CCaaS Work Packages CSV
Includes ALL industry-standard features from Ozonetel, Exotel, Genesys, Five9, NICE, Talkdesk
Total: 500+ work items for full-fledged CCaaS platform
"""
import csv
from datetime import datetime, timedelta

# Output file
output_file = 'openproject_exports/work_packages_ccaas_complete.csv'

# Work item categories with ALL industry features
ccaas_work_items = []

# Helper to add work items
def add_phase(subject, description, start_offset=0, duration=75):
    return {
        'Subject': f'Phase: {subject}',
        'Type': 'Phase',
        'Parent': '',
        'Priority': '',
        'Description': description,
        'start_offset': start_offset,
        'duration': duration
    }

def add_epic(subject, parent_phase, description, start_offset=0, duration=45):
    return {
        'Subject': f'Epic: {subject}',
        'Type': 'Epic',
        'Parent': f'Phase: {parent_phase}',
        'Priority': 'High',
        'Description': description,
        'start_offset': start_offset,
        'duration': duration
    }

def add_feature(subject, parent_epic, description, start_offset=0, duration=14):
    return {
        'Subject': f'Feature: {subject}',
        'Type': 'Feature',
        'Parent': f'Epic: {parent_epic}',
        'Priority': 'High',
        'Description': description,
        'start_offset': start_offset,
        'duration': duration
    }

def add_story(subject, parent_feature, description, hours='2h', story_type='HLD'):
    return {
        'Subject': f'{story_type}: {subject}',
        'Type': 'User story',
        'Parent': f'Feature: {parent_feature}',
        'Priority': 'High',
        'Description': description,
        'hours': hours,
        'start_offset': 0,
        'duration': 1
    }

def add_task(subject, parent, description, hours='2h', task_type='Task'):
    prefix = task_type + ': ' if task_type in ['QA', 'Security', 'Docs', 'UI'] else ''
    return {
        'Subject': f'{prefix}{subject}',
        'Type': 'Task',
        'Parent': parent,
        'Priority': 'High',
        'Description': description,
        'hours': hours,
        'start_offset': 0,
        'duration': 1
    }

# ============================================
# PHASE 1: INFRASTRUCTURE & PLATFORM (EXISTING - ENHANCED)
# ============================================
ccaas_work_items.append(add_phase('Infrastructure & Platform', 
    'Docker Database Redis NGINX MinIO core platform observability. Foundation for all CCaaS services. Must support multi-tenant, high availability, and horizontal scaling.'))

# Core Platform (keep existing)
ccaas_work_items.append(add_epic('Core Platform Setup', 'Infrastructure & Platform',
    'Docker PostgreSQL Redis MinIO NGINX. Production-ready infrastructure with HA support.'))

# Add existing features briefly
for feature in ['Docker & Compose Setup', 'PostgreSQL Database Setup', 'Redis Cache & PubSub', 
                'MinIO Object Storage', 'NGINX Reverse Proxy']:
    ccaas_work_items.append(add_feature(feature, 'Core Platform Setup', f'{feature} - configurable via admin UI'))

# Add NEW: Admin Configuration Infrastructure
ccaas_work_items.append(add_epic('Admin Configuration Infrastructure', 'Infrastructure & Platform',
    'UI configuration system for all features. No-code/low-code management. Dynamic configuration without code deployment.'))

ccaas_work_items.append(add_feature('Dynamic Configuration Service', 'Admin Configuration Infrastructure',
    'Centralized configuration management with hot-reload. UI-configurable settings for all modules.'))
ccaas_work_items.append(add_task('Create Configuration Store', 'Feature: Dynamic Configuration Service',
    'Redis/PostgreSQL backed config store with versioning and audit trail. Support tenant-level overrides.', '4h'))
ccaas_work_items.append(add_task('Implement Config Hot-Reload', 'Feature: Dynamic Configuration Service',
    'Event-driven config reload without service restart. Pub/sub for config change notifications.', '3h'))
ccaas_work_items.append(add_task('UI: System Configuration Panel', 'Feature: Dynamic Configuration Service',
    'Admin UI for global system settings. Categories: General, Security, Telephony, AI, Integrations.', '6h', 'UI'))

ccaas_work_items.append(add_feature('Feature Toggle System', 'Admin Configuration Infrastructure',
    'Enable/disable features per tenant via UI. Gradual rollout support. A/B testing capability.'))
ccaas_work_items.append(add_task('Create Feature Flag Service', 'Feature: Feature Toggle System',
    'Feature flags with tenant/user targeting. Support percentage rollouts and A/B variants.', '4h'))
ccaas_work_items.append(add_task('UI: Feature Management Dashboard', 'Feature: Feature Toggle System',
    'Admin UI to toggle features, set rollout percentages, define targeting rules.', '5h', 'UI'))

# ============================================
# PHASE 2: TELEPHONY & WEBRTC (EXISTING - ENHANCED)
# ============================================
ccaas_work_items.append(add_phase('Telephony & WebRTC', 
    'Asterisk SIP ARI WebRTC call handling. Real telephony with ARI control. Support for all call types and advanced routing.'))

ccaas_work_items.append(add_epic('Asterisk Core Integration', 'Telephony & WebRTC',
    'Asterisk with PJSIP ARI realtime. Production telephony infrastructure.'))

# Existing features
for feature in ['Asterisk Docker Setup', 'PJSIP Configuration', 'ARI Client', 'Call Recording', 'CDR Logging']:
    ccaas_work_items.append(add_feature(feature, 'Asterisk Core Integration', f'{feature} with admin UI configuration'))

# NEW: Advanced Routing Epic
ccaas_work_items.append(add_epic('Advanced Call Routing', 'Telephony & WebRTC',
    'Sophisticated ACD with skills-based, AI-predictive, priority, and custom routing algorithms.'))

routing_features = [
    ('Skills-Based Routing', 'Route calls to agents based on skill proficiency levels. UI-configurable skill definitions.'),
    ('Priority Routing', 'VIP customer routing with priority queues. CRM-integrated customer value scoring.'),
    ('AI Predictive Routing', 'ML-based routing using historical data. Predict best agent for optimal outcomes.'),
    ('Time-Based Routing', 'Business hours, holidays, timezone-aware routing rules.'),
    ('Geographic Routing', 'Route based on caller location. Regional agent assignment.'),
    ('Last Agent Routing', 'Connect returning customers to their previous agent when available.'),
    ('Overflow & Failover Routing', 'Automatic overflow to backup queues/groups. Disaster recovery routing.'),
    ('Data-Driven Routing', 'Route based on CRM data, purchase history, account status.'),
]

for name, desc in routing_features:
    ccaas_work_items.append(add_feature(name, 'Advanced Call Routing', desc))
    ccaas_work_items.append(add_task(f'Implement {name} Backend', f'Feature: {name}',
        f'Backend logic for {name}. Asterisk dialplan + ARI integration.', '4h'))
    ccaas_work_items.append(add_task(f'UI: {name} Configuration', f'Feature: {name}',
        f'Admin UI to configure {name} rules. Visual rule builder with drag-drop.', '5h', 'UI'))
    ccaas_work_items.append(add_task(f'QA: {name} Tests', f'Feature: {name}',
        f'Test {name} with real calls. Edge cases, failover scenarios.', '3h', 'QA'))

# NEW: Advanced IVR Epic
ccaas_work_items.append(add_epic('Visual IVR Builder', 'Telephony & WebRTC',
    'Drag-and-drop IVR designer. No-code IVR creation with templates, speech recognition, personalization.'))

ivr_features = [
    ('Drag-and-Drop IVR Designer', 'Visual canvas for IVR flow creation. Nodes: Menu, Input, Route, API, Play.'),
    ('Speech Recognition IVR', 'Voice-enabled IVR with ASR. Natural language menu navigation.'),
    ('Personalized IVR', 'Dynamic IVR based on caller data. CRM integration for personalized greetings.'),
    ('Multi-language IVR', 'Support multiple languages. Language detection and selection.'),
    ('IVR Templates Library', 'Pre-built IVR templates for common use cases. Clone and customize.'),
    ('IVR Analytics Dashboard', 'Track IVR performance. Drop-off points, path analysis, optimization suggestions.'),
    ('IVR A/B Testing', 'Test different IVR flows. Compare performance metrics.'),
    ('Callback from IVR', 'Offer callback option when wait time exceeds threshold.'),
]

for name, desc in ivr_features:
    ccaas_work_items.append(add_feature(name, 'Visual IVR Builder', desc))
    ccaas_work_items.append(add_story(f'{name} Design', name, f'High-level design for {name}.', '2h', 'HLD'))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'Backend implementation for {name}. Asterisk AGI/ARI integration.', '6h'))
    ccaas_work_items.append(add_task(f'UI: {name} Interface', f'Feature: {name}',
        f'React component for {name}. Drag-drop canvas with node palette.', '8h', 'UI'))

# ============================================
# PHASE 3: DIALER & CAMPAIGN MANAGEMENT (NEW)
# ============================================
ccaas_work_items.append(add_phase('Dialer & Campaign Management', 
    'Auto dialers (Preview, Progressive, Predictive, Power), Campaign management, Lead lists, Voice broadcast. TCPA/DNC compliance.'))

# Auto Dialer Epic
ccaas_work_items.append(add_epic('Auto Dialer System', 'Dialer & Campaign Management',
    'Multiple dialer modes for outbound campaigns. Asterisk-based with pacing algorithms.'))

dialer_types = [
    ('Preview Dialer', 'Agent reviews contact info before call. Manual dial control. Best for high-value calls.'),
    ('Progressive Dialer', 'Auto-dial when agent becomes available. 1:1 ratio. No abandoned calls.'),
    ('Predictive Dialer', 'ML-based pacing algorithm. Predict agent availability. Maximize talk time.'),
    ('Power Dialer', 'Aggressive dialing with configurable ratio. Drop less-valuable calls.'),
    ('Click-to-Call', 'One-click dialing from CRM/web interface. Screen pop integration.'),
]

for name, desc in dialer_types:
    ccaas_work_items.append(add_feature(name, 'Auto Dialer System', desc))
    ccaas_work_items.append(add_story(f'{name} Architecture', name, f'Design {name} with Asterisk ARI.', '3h', 'HLD'))
    ccaas_work_items.append(add_story(f'{name} Data Model', name, f'Database schema for {name} campaigns.', '2h', 'LLD'))
    ccaas_work_items.append(add_task(f'Implement {name} Engine', f'Feature: {name}',
        f'Core {name} logic. Call pacing, agent matching, state management.', '8h'))
    ccaas_work_items.append(add_task(f'{name} ARI Integration', f'Feature: {name}',
        f'Asterisk ARI integration for {name}. Originate calls, monitor, handle events.', '6h'))
    ccaas_work_items.append(add_task(f'UI: {name} Configuration', f'Feature: {name}',
        f'Admin UI for {name} settings. Pacing rules, retry logic, call hours.', '5h', 'UI'))
    ccaas_work_items.append(add_task(f'UI: {name} Agent Interface', f'Feature: {name}',
        f'Agent UI for {name}. Contact preview, disposition, notes.', '5h', 'UI'))
    ccaas_work_items.append(add_task(f'QA: {name} Testing', f'Feature: {name}',
        f'Test {name} with real calls. Pacing accuracy, agent matching, error handling.', '4h', 'QA'))

# Dialer Compliance
ccaas_work_items.append(add_feature('AMD Detection', 'Auto Dialer System',
    'Answering Machine Detection. Detect VM/IVR. Leave message or retry.'))
ccaas_work_items.append(add_task('Implement AMD Algorithm', 'Feature: AMD Detection',
    'Audio analysis for AMD. Energy patterns, silence detection. Configurable thresholds.', '6h'))

ccaas_work_items.append(add_feature('DNC List Management', 'Auto Dialer System',
    'Do Not Call list management. Federal/state DNC, internal DNC. Real-time scrubbing.'))
ccaas_work_items.append(add_task('DNC Database Schema', 'Feature: DNC List Management',
    'PostgreSQL schema for DNC lists. Federal, state, internal, campaign-level.', '3h'))
ccaas_work_items.append(add_task('DNC Scrubbing Service', 'Feature: DNC List Management',
    'Real-time DNC check before dialing. Batch import. API for external DNC services.', '5h'))
ccaas_work_items.append(add_task('UI: DNC Management', 'Feature: DNC List Management',
    'Admin UI for DNC lists. Upload, search, add/remove numbers, expiration.', '4h', 'UI'))

ccaas_work_items.append(add_feature('TCPA Compliance', 'Auto Dialer System',
    'TCPA compliance features. Consent management, calling hours, abandoned call limits.'))
ccaas_work_items.append(add_task('TCPA Rules Engine', 'Feature: TCPA Compliance',
    'Configurable TCPA rules. Calling windows, consent types, max attempts.', '5h'))
ccaas_work_items.append(add_task('UI: TCPA Configuration', 'Feature: TCPA Compliance',
    'Admin UI for TCPA settings. Per-state rules, consent management, audit reports.', '4h', 'UI'))

# Campaign Management Epic
ccaas_work_items.append(add_epic('Campaign Management', 'Dialer & Campaign Management',
    'Create, manage, and analyze outbound campaigns. Lead list management, scheduling, analytics.'))

campaign_features = [
    ('Campaign Builder', 'Visual campaign creation. Select dialer type, set rules, assign agents.'),
    ('Lead List Management', 'Upload, segment, prioritize lead lists. Deduplication, validation.'),
    ('Campaign Scheduling', 'Schedule campaigns with timezone support. Recurring, one-time.'),
    ('Campaign Analytics', 'Real-time and historical campaign metrics. Conversion, contact rate, ROI.'),
    ('Disposition Management', 'Configurable call outcomes. Auto-actions on disposition.'),
    ('Callback Scheduling', 'Agent-scheduled and system callbacks. Personal and shared queues.'),
    ('Lead Recycling', 'Automatic retry rules. Lead aging, priority recalculation.'),
]

for name, desc in campaign_features:
    ccaas_work_items.append(add_feature(name, 'Campaign Management', desc))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'Backend service for {name}. API endpoints, business logic.', '6h'))
    ccaas_work_items.append(add_task(f'UI: {name} Interface', f'Feature: {name}',
        f'React UI for {name}. Form wizard or dashboard view.', '6h', 'UI'))

# Voice Broadcast Epic
ccaas_work_items.append(add_epic('Voice Broadcast', 'Dialer & Campaign Management',
    'Mass voice messaging. Pre-recorded messages, IVR integration, scheduling.'))

broadcast_features = [
    ('Voice Broadcast Engine', 'Mass dial with pre-recorded message. Press-1 transfer to agent.'),
    ('Broadcast Recording Studio', 'Record, upload, manage voice messages. TTS option.'),
    ('Broadcast Scheduling', 'Schedule broadcasts with optimal timing. Timezone handling.'),
    ('Broadcast Analytics', 'Track delivery, listen rate, transfers, opt-outs.'),
]

for name, desc in broadcast_features:
    ccaas_work_items.append(add_feature(name, 'Voice Broadcast', desc))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'Backend for {name}. Asterisk mass originate integration.', '5h'))
    ccaas_work_items.append(add_task(f'UI: {name}', f'Feature: {name}',
        f'Admin UI for {name}.', '4h', 'UI'))

# ============================================
# PHASE 4: WORKFORCE ENGAGEMENT (NEW)
# ============================================
ccaas_work_items.append(add_phase('Workforce Engagement Management', 
    'WFM (Forecasting, Scheduling), Quality Management, Performance Management, Gamification. AI-powered workforce optimization.'))

# Workforce Management Epic
ccaas_work_items.append(add_epic('Workforce Management', 'Workforce Engagement Management',
    'Forecasting, scheduling, intraday management. Optimize staffing for service levels.'))

wfm_features = [
    ('Forecasting Engine', 'ML-based volume forecasting. Historical patterns, trend analysis, event adjustments.'),
    ('Agent Scheduling', 'Automatic schedule generation. Shift patterns, skills, preferences.'),
    ('Shift Bidding', 'Agent self-scheduling. Bid on preferred shifts, vacation requests.'),
    ('Intraday Management', 'Real-time adjustments. Reforecasting, schedule changes, overtime.'),
    ('Adherence Monitoring', 'Track schedule adherence in real-time. Alerts for deviations.'),
    ('Time-Off Management', 'Leave requests, approvals, coverage verification.'),
    ('Overtime Management', 'Automatic OT recommendations. Fair distribution rules.'),
    ('What-If Scenarios', 'Simulate staffing changes. Impact analysis before decisions.'),
]

for name, desc in wfm_features:
    ccaas_work_items.append(add_feature(name, 'Workforce Management', desc))
    ccaas_work_items.append(add_story(f'{name} Design', name, f'Architecture for {name}.', '3h', 'HLD'))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'Backend service for {name}. Algorithms, data processing, APIs.', '8h'))
    ccaas_work_items.append(add_task(f'UI: {name} Dashboard', f'Feature: {name}',
        f'React UI for {name}. Interactive charts, grids, controls.', '8h', 'UI'))

# Quality Management Epic
ccaas_work_items.append(add_epic('Quality Management', 'Workforce Engagement Management',
    'QA scoring, evaluation forms, coaching workflows. 100% call audit capability.'))

qm_features = [
    ('Evaluation Forms Builder', 'Visual form designer. Scoring criteria, weights, sections.'),
    ('Automated QA Scoring', 'AI-powered call scoring. Speech analytics integration.'),
    ('Agent Scorecards', 'Performance metrics dashboard. Trends, comparisons, goals.'),
    ('Screen Recording', 'Capture agent desktop during calls. Sync with audio.'),
    ('Calibration Sessions', 'QA calibration tools. Multiple evaluators, variance analysis.'),
    ('Coaching Workflows', 'Triggered coaching based on scores. Scheduled sessions, tracking.'),
    ('QA Analytics', 'Quality trends, team comparisons, improvement tracking.'),
]

for name, desc in qm_features:
    ccaas_work_items.append(add_feature(name, 'Quality Management', desc))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'Backend for {name}. Data models, business logic.', '6h'))
    ccaas_work_items.append(add_task(f'UI: {name}', f'Feature: {name}',
        f'React UI for {name}. Forms, dashboards, workflows.', '6h', 'UI'))

# Gamification Epic
ccaas_work_items.append(add_epic('Gamification & Performance', 'Workforce Engagement Management',
    'Drive engagement with gamification. Leaderboards, badges, contests, rewards.'))

gamification_features = [
    ('Points System', 'Earn points for KPIs. Configurable point values per metric.'),
    ('Leaderboards', 'Real-time leaderboards. Daily, weekly, monthly. Teams and individuals.'),
    ('Badges & Achievements', 'Unlockable badges for milestones. Display on profile.'),
    ('Contests & Challenges', 'Time-limited competitions. Manager-created challenges.'),
    ('Recognition Wall', 'Public kudos and recognition. Peer-to-peer appreciation.'),
    ('Rewards Catalog', 'Redeem points for rewards. Gift cards, time off, prizes.'),
    ('Team Competitions', 'Team-based contests. Foster collaboration.'),
]

for name, desc in gamification_features:
    ccaas_work_items.append(add_feature(name, 'Gamification & Performance', desc))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'Backend for {name}. Game mechanics, calculations.', '5h'))
    ccaas_work_items.append(add_task(f'UI: {name}', f'Feature: {name}',
        f'Engaging UI for {name}. Animations, real-time updates.', '5h', 'UI'))

# ============================================
# PHASE 5: AI & CONVERSATIONAL INTELLIGENCE (NEW)
# ============================================
ccaas_work_items.append(add_phase('AI & Conversational Intelligence', 
    'AI Voicebot, Chatbot, Agent Assist, Sentiment Analysis, Speech Analytics, Auto Summary, NLU. Gen-AI powered.'))

# Conversational AI Epic
ccaas_work_items.append(add_epic('Conversational AI', 'AI & Conversational Intelligence',
    'AI-powered voicebots and chatbots. Visual builder, NLU, intent detection.'))

conv_ai_features = [
    ('AI Voicebot Builder', 'Visual voicebot designer. Intents, entities, dialog flows.'),
    ('AI Chatbot Builder', 'Chatbot for web/mobile. Same NLU engine as voicebot.'),
    ('NLU Engine', 'Natural Language Understanding. Intent classification, entity extraction.'),
    ('Intent Management', 'Define and train intents. Test utterances, accuracy metrics.'),
    ('Dialog Flow Designer', 'Visual conversation flow builder. Branching, loops, handoff.'),
    ('Bot Analytics', 'Track bot performance. Containment, handoff rate, user satisfaction.'),
    ('Human Handoff', 'Seamless transfer from bot to agent. Full context preserved.'),
]

for name, desc in conv_ai_features:
    ccaas_work_items.append(add_feature(name, 'Conversational AI', desc))
    ccaas_work_items.append(add_story(f'{name} Architecture', name, f'Design for {name} with LLM integration.', '4h', 'HLD'))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'Backend service for {name}. LLM integration, dialog management.', '10h'))
    ccaas_work_items.append(add_task(f'UI: {name}', f'Feature: {name}',
        f'Visual builder UI for {name}.', '8h', 'UI'))

# Real-time Intelligence Epic
ccaas_work_items.append(add_epic('Real-time Intelligence', 'AI & Conversational Intelligence',
    'Agent Assist, real-time transcription, sentiment analysis, next best action.'))

realtime_ai_features = [
    ('Agent Assist', 'Real-time AI suggestions during calls. Knowledge lookup, script guidance.'),
    ('Real-time Transcription', 'Live speech-to-text. Display transcription to agent.'),
    ('Sentiment Analysis', 'Real-time sentiment scoring. Alerts for negative sentiment.'),
    ('Emotion Detection', 'Detect caller emotions. Anger, frustration, satisfaction.'),
    ('Next Best Action', 'AI-recommended actions. Upsell, retention, escalation suggestions.'),
    ('Real-time Translation', 'Live translation for multilingual support.'),
    ('Compliance Monitoring', 'Real-time script compliance checking. Alerts for deviations.'),
]

for name, desc in realtime_ai_features:
    ccaas_work_items.append(add_feature(name, 'Real-time Intelligence', desc))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'Real-time processing for {name}. WebSocket streaming, ML inference.', '8h'))
    ccaas_work_items.append(add_task(f'UI: {name} Widget', f'Feature: {name}',
        f'Agent-facing widget for {name}. Real-time updates.', '5h', 'UI'))

# Speech Analytics Epic
ccaas_work_items.append(add_epic('Speech Analytics', 'AI & Conversational Intelligence',
    'Post-call analytics. Topic detection, call summary, Voice of Customer.'))

speech_analytics_features = [
    ('Auto Call Summary', 'AI-generated call summaries. Key points, action items, outcomes.'),
    ('Topic Detection', 'Identify discussion topics. Trend analysis across calls.'),
    ('Voice of Customer', 'Aggregate customer feedback. Themes, pain points, opportunities.'),
    ('Keyword Spotting', 'Detect specific keywords/phrases. Compliance, competitive mentions.'),
    ('Call Categorization', 'Auto-categorize calls. Reason codes, issue types.'),
    ('Speech Analytics Dashboard', 'Visualize speech analytics insights. Trends, alerts, reports.'),
]

for name, desc in speech_analytics_features:
    ccaas_work_items.append(add_feature(name, 'Speech Analytics', desc))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'Batch processing for {name}. ASR + NLP pipeline.', '8h'))
    ccaas_work_items.append(add_task(f'UI: {name}', f'Feature: {name}',
        f'Analytics UI for {name}.', '6h', 'UI'))

# ============================================
# PHASE 6: OMNICHANNEL ENGAGEMENT (NEW)
# ============================================
ccaas_work_items.append(add_phase('Omnichannel Engagement', 
    'WhatsApp, SMS, Email, Chat, Social Media, Video. Unified inbox, channel switching, consistent experience.'))

# Messaging Channels Epic
ccaas_work_items.append(add_epic('Messaging Channels', 'Omnichannel Engagement',
    'WhatsApp Business, SMS/MMS, Telegram, Facebook Messenger, Instagram.'))

messaging_channels = [
    ('WhatsApp Business Integration', 'Official WhatsApp Business API. Templates, media, interactive messages.'),
    ('SMS/MMS Gateway', 'Two-way SMS. MMS support. Short codes, long codes.'),
    ('Facebook Messenger', 'Facebook page integration. Chatbot + human handoff.'),
    ('Instagram Direct Messages', 'Instagram DM integration. Story mentions, comments.'),
    ('Telegram Integration', 'Telegram bot integration. Inline keyboards, commands.'),
]

for name, desc in messaging_channels:
    ccaas_work_items.append(add_feature(name, 'Messaging Channels', desc))
    ccaas_work_items.append(add_story(f'{name} Architecture', name, f'Integration design for {name}.', '3h', 'HLD'))
    ccaas_work_items.append(add_task(f'Implement {name} Adapter', f'Feature: {name}',
        f'Channel adapter for {name}. Webhooks, API integration.', '8h'))
    ccaas_work_items.append(add_task(f'{name} Message Routing', f'Feature: {name}',
        f'Route {name} messages to agents. Queue integration.', '4h'))
    ccaas_work_items.append(add_task(f'UI: {name} Configuration', f'Feature: {name}',
        f'Admin UI to configure {name}. API keys, templates, settings.', '4h', 'UI'))

# Digital Channels Epic
ccaas_work_items.append(add_epic('Digital Channels', 'Omnichannel Engagement',
    'Email, Live Chat, Video Call, Co-browse, Social Media Monitoring.'))

digital_channels = [
    ('Email Channel', 'Email integration. Thread management, auto-response, templates.'),
    ('Live Chat Widget', 'Embeddable chat widget. Customizable, proactive triggers.'),
    ('Video Call', 'WebRTC video calling. Agent-customer video support.'),
    ('Co-browse', 'Real-time screen sharing. Guide customers through web pages.'),
    ('Social Media Monitoring', 'Monitor brand mentions. Twitter, Facebook, Instagram.'),
]

for name, desc in digital_channels:
    ccaas_work_items.append(add_feature(name, 'Digital Channels', desc))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'Backend for {name}.', '8h'))
    ccaas_work_items.append(add_task(f'UI: {name}', f'Feature: {name}',
        f'UI components for {name}.', '6h', 'UI'))

# Unified Experience Epic
ccaas_work_items.append(add_epic('Unified Omnichannel Experience', 'Omnichannel Engagement',
    'Unified agent desktop, conversation history, channel switching, customer context.'))

unified_features = [
    ('Unified Agent Desktop', 'Single interface for all channels. Voice, chat, email, social.'),
    ('Unified Inbox', 'All conversations in one view. Prioritization, filtering, search.'),
    ('Channel Switching', 'Seamless handoff between channels. Context preserved.'),
    ('Conversation History', '360-degree customer view. All interactions across channels.'),
    ('Customer Context Panel', 'CRM data, interaction history, notes in agent view.'),
    ('Omnichannel Routing', 'Route any channel based on skills, priority, load.'),
]

for name, desc in unified_features:
    ccaas_work_items.append(add_feature(name, 'Unified Omnichannel Experience', desc))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'Backend for {name}. Event aggregation, state management.', '8h'))
    ccaas_work_items.append(add_task(f'UI: {name}', f'Feature: {name}',
        f'React component for {name}.', '8h', 'UI'))

# ============================================
# PHASE 7: ANALYTICS & REPORTING (ENHANCED)
# ============================================
ccaas_work_items.append(add_phase('Analytics & Reporting', 
    'Real-time dashboards, historical reports, custom report builder, KPI tracking. AI-powered insights.'))

ccaas_work_items.append(add_epic('Real-time Analytics', 'Analytics & Reporting',
    'Live dashboards for supervisors. Queue status, agent state, call metrics.'))

realtime_analytics_features = [
    ('Supervisor Dashboard', 'Real-time overview. Active calls, queues, agents, SLA.'),
    ('Queue Performance Monitor', 'Live queue metrics. Wait time, abandon rate, service level.'),
    ('Agent State Dashboard', 'Real-time agent status. Available, on-call, break, offline.'),
    ('Wallboard Display', 'Large-screen dashboards. KPIs, alerts, motivational content.'),
    ('Real-time Alerts', 'Configurable alerts. Threshold-based notifications.'),
]

for name, desc in realtime_analytics_features:
    ccaas_work_items.append(add_feature(name, 'Real-time Analytics', desc))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'WebSocket-based real-time data for {name}.', '6h'))
    ccaas_work_items.append(add_task(f'UI: {name}', f'Feature: {name}',
        f'Real-time React dashboard for {name}.', '6h', 'UI'))

ccaas_work_items.append(add_epic('Historical Reporting', 'Analytics & Reporting',
    'Comprehensive historical reports. Pre-built and custom reports.'))

historical_reports = [
    ('Agent Performance Reports', 'Individual agent metrics. Handle time, CSAT, QA scores.'),
    ('Queue Performance Reports', 'Queue-level metrics. Volume, wait time, abandonment.'),
    ('Campaign Reports', 'Outbound campaign metrics. Contact rate, conversion, ROI.'),
    ('SLA Reports', 'Service level analysis. Target vs actual, trends.'),
    ('Call Detail Reports', 'Detailed CDR analysis. Filters, exports, drill-down.'),
    ('Custom Report Builder', 'Drag-and-drop report designer. Any metric combination.'),
    ('Scheduled Reports', 'Automated report delivery. Email, SFTP, portal.'),
]

for name, desc in historical_reports:
    ccaas_work_items.append(add_feature(name, 'Historical Reporting', desc))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'Report logic, queries, aggregations for {name}.', '5h'))
    ccaas_work_items.append(add_task(f'UI: {name}', f'Feature: {name}',
        f'Report viewer UI for {name}. Charts, tables, export.', '5h', 'UI'))

# ============================================
# PHASE 8: INTEGRATIONS (NEW)
# ============================================
ccaas_work_items.append(add_phase('Integrations & APIs', 
    'CRM integrations (Salesforce, Zoho, HubSpot), CTI adapters, webhooks, REST APIs, SDK.'))

ccaas_work_items.append(add_epic('CRM Integrations', 'Integrations & APIs',
    'Native integrations with major CRM platforms.'))

crm_integrations = [
    ('Salesforce Integration', 'Deep Salesforce integration. CTI, screen pop, activity logging.'),
    ('Zoho CRM Integration', 'Zoho integration. Click-to-call, contact sync, activities.'),
    ('HubSpot Integration', 'HubSpot integration. Calls, contacts, tickets, deals.'),
    ('Freshdesk Integration', 'Freshdesk integration. Tickets, contacts, call widget.'),
    ('Zendesk Integration', 'Zendesk integration. Tickets, contacts, CTI bar.'),
    ('Microsoft Dynamics Integration', 'Dynamics 365 integration. Full CTI capability.'),
    ('ServiceNow Integration', 'ServiceNow integration. Cases, incidents, CTI.'),
]

for name, desc in crm_integrations:
    ccaas_work_items.append(add_feature(name, 'CRM Integrations', desc))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'Integration adapter for {name}. OAuth, sync, events.', '10h'))
    ccaas_work_items.append(add_task(f'UI: {name} Setup Wizard', f'Feature: {name}',
        f'Configuration wizard for {name}.', '4h', 'UI'))

ccaas_work_items.append(add_epic('API & Developer Platform', 'Integrations & APIs',
    'REST APIs, webhooks, SDK for custom integrations.'))

api_features = [
    ('REST API', 'Comprehensive REST API. All platform features accessible via API.'),
    ('Webhook System', 'Configurable webhooks. Call events, agent events, custom triggers.'),
    ('JavaScript SDK', 'Browser SDK for embedding. Call widget, agent bar.'),
    ('Python SDK', 'Python SDK for backend integrations.'),
    ('CTI Adapter Framework', 'Pluggable CTI adapter framework. Custom CRM integration.'),
    ('API Developer Portal', 'Documentation, sandbox, API keys, usage analytics.'),
]

for name, desc in api_features:
    ccaas_work_items.append(add_feature(name, 'API & Developer Platform', desc))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'Development for {name}.', '8h'))
    ccaas_work_items.append(add_task(f'Docs: {name}', f'Feature: {name}',
        f'Documentation for {name}.', '3h', 'Docs'))

# ============================================
# PHASE 9: SUPERVISOR & MONITORING (ENHANCED)
# ============================================
ccaas_work_items.append(add_phase('Supervisor & Monitoring Tools', 
    'Live monitoring, whisper coaching, barge-in, agent management. Real-time control.'))

ccaas_work_items.append(add_epic('Live Monitoring Tools', 'Supervisor & Monitoring Tools',
    'Real-time call monitoring with intervention capabilities.'))

monitoring_features = [
    ('Silent Monitoring', 'Listen to live calls without agent/caller awareness.'),
    ('Whisper Coaching', 'Speak to agent during call. Caller cannot hear.'),
    ('Barge-In', 'Join live call. Three-way conversation or takeover.'),
    ('Agent State Control', 'Change agent state remotely. Force logout, break.'),
    ('Call Takeover', 'Transfer call from agent to supervisor instantly.'),
    ('Recording Controls', 'Start/stop/pause recording during live calls.'),
]

for name, desc in monitoring_features:
    ccaas_work_items.append(add_feature(name, 'Live Monitoring Tools', desc))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'Asterisk/ARI implementation for {name}.', '6h'))
    ccaas_work_items.append(add_task(f'UI: {name}', f'Feature: {name}',
        f'Supervisor UI for {name}.', '4h', 'UI'))

# ============================================
# PHASE 10: ADMIN & CONFIGURATION UI (NEW)
# ============================================
ccaas_work_items.append(add_phase('Admin & Configuration UI', 
    'No-code administration. Visual builders, wizards, templates. Complete UI configurability.'))

ccaas_work_items.append(add_epic('Admin Panels', 'Admin & Configuration UI',
    'Comprehensive admin interfaces for all platform features.'))

admin_panels = [
    ('Tenant Management UI', 'Multi-tenant administration. Create, configure, suspend tenants.'),
    ('User Management UI', 'Users, roles, permissions. SSO configuration.'),
    ('Agent Management UI', 'Agent profiles, skills, queues, schedules.'),
    ('Queue Configuration UI', 'Visual queue setup. Music, announcements, SLA.'),
    ('SIP Endpoint Management', 'Manage SIP devices. Extensions, registrations.'),
    ('Recording Settings UI', 'Recording rules, storage, retention policies.'),
    ('Number Management UI', 'DID numbers, caller ID, number pools.'),
]

for name, desc in admin_panels:
    ccaas_work_items.append(add_feature(name, 'Admin Panels', desc))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'Backend APIs for {name}.', '5h'))
    ccaas_work_items.append(add_task(f'UI: {name}', f'Feature: {name}',
        f'React admin panel for {name}. CRUD, validation, bulk ops.', '8h', 'UI'))

ccaas_work_items.append(add_epic('Visual Builders', 'Admin & Configuration UI',
    'Drag-and-drop builders for complex configurations.'))

visual_builders = [
    ('Workflow Builder', 'Visual workflow designer. Automations, triggers, actions.'),
    ('Dashboard Builder', 'Create custom dashboards. Drag-drop widgets.'),
    ('Form Builder', 'Build custom forms. Disposition forms, surveys.'),
    ('Template Manager', 'Manage all templates. IVR, email, SMS, scripts.'),
]

for name, desc in visual_builders:
    ccaas_work_items.append(add_feature(name, 'Visual Builders', desc))
    ccaas_work_items.append(add_task(f'Implement {name}', f'Feature: {name}',
        f'Builder backend for {name}.', '10h'))
    ccaas_work_items.append(add_task(f'UI: {name}', f'Feature: {name}',
        f'Drag-drop UI for {name}. Canvas, toolbox, properties.', '12h', 'UI'))

# Now add existing phases with tasks (abbreviated)
# Phase: Backend Core Services
ccaas_work_items.append(add_phase('Backend Core Services', 
    'NestJS APIs, authentication, multi-tenancy, domain services.'))

ccaas_work_items.append(add_epic('Authentication & Authorization', 'Backend Core Services',
    'JWT, RBAC, multi-tenant security.'))
ccaas_work_items.append(add_epic('Core Domain Services', 'Backend Core Services',
    'User, Tenant, Agent, Queue domain services.'))
ccaas_work_items.append(add_epic('API Layer', 'Backend Core Services',
    'REST APIs, WebSocket, GraphQL.'))

# Phase: Frontend Applications
ccaas_work_items.append(add_phase('Frontend Applications', 
    'Agent Desktop, Supervisor Console, Admin Portal, Customer Widgets.'))

ccaas_work_items.append(add_epic('Agent Desktop Application', 'Frontend Applications',
    'WebRTC softphone, omnichannel inbox, CRM integration.'))
ccaas_work_items.append(add_epic('Supervisor Console', 'Frontend Applications',
    'Real-time dashboards, monitoring, team management.'))
ccaas_work_items.append(add_epic('Admin Portal', 'Frontend Applications',
    'System configuration, tenant management, reporting.'))
ccaas_work_items.append(add_epic('Customer-Facing Widgets', 'Frontend Applications',
    'Chat widget, click-to-call, callback widget.'))

# Phase: Security & Compliance
ccaas_work_items.append(add_phase('Security & Compliance', 
    'HIPAA, GDPR, SOC2, PCI-DSS compliance. Encryption, audit, access controls.'))

ccaas_work_items.append(add_epic('Compliance Framework', 'Security & Compliance',
    'HIPAA, GDPR, SOC2, PCI-DSS implementation.'))
ccaas_work_items.append(add_epic('Security Controls', 'Security & Compliance',
    'Encryption, access controls, audit logging.'))
ccaas_work_items.append(add_epic('Data Privacy', 'Security & Compliance',
    'Consent management, data retention, anonymization.'))

# Phase: Operations & DevOps
ccaas_work_items.append(add_phase('Operations & DevOps', 
    'CI/CD, monitoring, logging, backup, disaster recovery.'))

ccaas_work_items.append(add_epic('CI/CD Pipeline', 'Operations & DevOps',
    'Automated build, test, deploy pipelines.'))
ccaas_work_items.append(add_epic('Monitoring & Observability', 'Operations & DevOps',
    'Prometheus, Grafana, ELK stack.'))
ccaas_work_items.append(add_epic('Disaster Recovery', 'Operations & DevOps',
    'Backup, restore, failover procedures.'))

# ============================================
# Generate the CSV
# ============================================

print(f"Processing {len(ccaas_work_items)} work items...")

# Enhanced fields
fields = [
    'Subject', 'Type', 'Project', 'Parent', 'Priority', 'Status',
    'Start date', 'Due date', 'Assignee', 'Estimated time',
    'Labels', 'Version', 'Story Points', 'Risk Level',
    'Definition of Ready', 'Definition of Done', 'Acceptance Criteria',
    'Success Metrics', 'External Dependencies', 'Rollback Plan',
    'Description', '% Complete'
]

base_date = datetime(2026, 1, 15)
row_idx = 0

def get_assignee(work_type, subject):
    if 'UI:' in subject or 'Frontend' in subject:
        return 'Frontend Developer'
    elif 'QA:' in subject or 'Test' in subject:
        return 'QA Engineer'
    elif 'Security' in subject:
        return 'Security Engineer'
    elif 'Docs:' in subject:
        return 'Technical Writer'
    elif 'HLD:' in subject:
        return 'Solutions Architect'
    elif 'LLD:' in subject or 'Database' in subject:
        return 'Database Engineer'
    elif 'Phase' in work_type:
        return 'Project Manager'
    elif 'Epic' in work_type:
        return 'Tech Lead'
    elif 'Feature' in work_type:
        return 'Engineering Manager'
    elif 'Asterisk' in subject or 'ARI' in subject or 'SIP' in subject:
        return 'Asterisk Engineer'
    elif 'AI' in subject or 'ML' in subject or 'NLU' in subject:
        return 'AI Engineer'
    else:
        return 'Backend Developer'

def get_labels(subject):
    labels = []
    if any(x in subject for x in ['Dialer', 'Campaign', 'Outbound']):
        labels.append('Dialer')
    if any(x in subject for x in ['IVR', 'Routing', 'ACD', 'Queue']):
        labels.append('Routing')
    if any(x in subject for x in ['WFM', 'Forecast', 'Schedule', 'Workforce']):
        labels.append('WFM')
    if any(x in subject for x in ['QA', 'Quality', 'Evaluation', 'Coaching']):
        labels.append('QualityManagement')
    if any(x in subject for x in ['Gamification', 'Leaderboard', 'Badge', 'Points']):
        labels.append('Gamification')
    if any(x in subject for x in ['AI', 'Bot', 'NLU', 'Sentiment', 'ML']):
        labels.append('AI')
    if any(x in subject for x in ['WhatsApp', 'SMS', 'Email', 'Chat', 'Omnichannel']):
        labels.append('Omnichannel')
    if any(x in subject for x in ['Dashboard', 'Report', 'Analytics']):
        labels.append('Analytics')
    if any(x in subject for x in ['Salesforce', 'CRM', 'Integration', 'API']):
        labels.append('Integration')
    if any(x in subject for x in ['Admin', 'Config', 'Management']):
        labels.append('Admin')
    if 'UI:' in subject:
        labels.append('UI')
    if 'Security' in subject:
        labels.append('Security')
    return ','.join(labels) if labels else 'General'

def get_dor(work_type, subject):
    if 'Phase' in work_type:
        return "Phase scope defined; all Epics planned; budget approved; team assigned; dependencies identified"
    elif 'Epic' in work_type:
        return "Epic scope defined; Features identified; team capacity confirmed; technical approach approved"
    elif 'Feature' in work_type:
        return "Feature requirements documented; UI/UX design approved; API contract defined; team trained"
    elif 'HLD' in subject:
        return "Business requirements documented; architecture principles defined; stakeholders identified"
    elif 'LLD' in subject:
        return "HLD completed; technical stack confirmed; data models approved"
    elif 'UI:' in subject:
        return "API endpoints available; UI/UX mockups approved; component library ready"
    elif 'QA:' in subject:
        return "Feature implementation complete; test strategy approved; test environment ready"
    else:
        return "Requirements clear; dependencies resolved; design approved; acceptance criteria defined"

def get_dod(work_type, subject):
    base = "Implementation complete; code reviewed; tests passing with REAL services; documentation updated; CI/CD passing"
    if 'Phase' in work_type:
        return "All Epics completed; phase deliverables met; documentation published; stakeholder signoff"
    elif 'Epic' in work_type:
        return "All Features completed; integration tested; performance benchmarked; runbook created"
    elif 'Feature' in work_type:
        return "All tasks completed; feature tested end-to-end; UI configurable; deployed to staging"
    elif 'UI:' in subject:
        return base + "; UI responsive; accessibility checked; cross-browser tested"
    elif 'QA:' in subject:
        return "All tests written; 100% passing; coverage >80%; uses REAL services; integrated into CI"
    else:
        return base

def get_acceptance_criteria(subject):
    if 'Dialer' in subject:
        return "✓ Calls originated correctly\n✓ Pacing algorithm working\n✓ Agent matching accurate\n✓ Stats tracked\n✓ UI configurable"
    elif 'IVR' in subject:
        return "✓ Flow executes correctly\n✓ DTMF/speech input works\n✓ Routing correct\n✓ Analytics tracked\n✓ Builder UI functional"
    elif 'AI' in subject or 'Bot' in subject:
        return "✓ Intent recognition >90%\n✓ Response time <500ms\n✓ Handoff working\n✓ Analytics tracked\n✓ Training UI functional"
    elif 'WhatsApp' in subject or 'SMS' in subject:
        return "✓ Messages sent/received\n✓ Templates approved\n✓ Media supported\n✓ Queuing working\n✓ Admin config via UI"
    elif 'Dashboard' in subject or 'Report' in subject:
        return "✓ Data accurate\n✓ Real-time updates\n✓ Export working\n✓ Filters functional\n✓ Customizable"
    elif 'UI:' in subject:
        return "✓ All CRUD operations\n✓ Validation working\n✓ Error handling\n✓ Responsive design\n✓ Accessibility compliant"
    else:
        return "✓ Feature functional\n✓ Code reviewed\n✓ Tests passing\n✓ UI configurable\n✓ Documentation complete"

# Process and write
output_rows = []
for idx, item in enumerate(ccaas_work_items):
    work_type = item['Type']
    subject = item['Subject']
    
    # Calculate dates
    start_offset = item.get('start_offset', idx // 10)
    duration = item.get('duration', 1)
    start_date = (base_date + timedelta(days=start_offset)).strftime('%Y-%m-%d')
    due_date = (base_date + timedelta(days=start_offset + duration)).strftime('%Y-%m-%d')
    
    # Story points
    sp_map = {'Phase': '89', 'Epic': '34', 'Feature': '13', 'User story': '5', 'Task': '3'}
    story_points = sp_map.get(work_type, '3')
    
    # Version
    if idx < 150:
        version = 'v1.0.0-MVP'
    elif idx < 350:
        version = 'v1.0.0-Beta'
    else:
        version = 'v1.0.0-GA'
    
    # Risk level
    high_risk = ['Security', 'AI', 'Predictive', 'Compliance', 'Payment', 'Asterisk']
    if any(x in subject for x in high_risk):
        risk = 'High'
    elif any(x in subject for x in ['Integration', 'Migration', 'Database']):
        risk = 'Medium'
    else:
        risk = 'Low'
    
    row = {
        'Subject': subject,
        'Type': work_type,
        'Project': 'Psitrix Psynq',
        'Parent': item.get('Parent', ''),
        'Priority': item.get('Priority', 'Medium'),
        'Status': 'New',
        'Start date': start_date,
        'Due date': due_date,
        'Assignee': get_assignee(work_type, subject),
        'Estimated time': item.get('hours', ''),
        'Labels': get_labels(subject),
        'Version': version,
        'Story Points': story_points,
        'Risk Level': risk,
        'Definition of Ready': get_dor(work_type, subject),
        'Definition of Done': get_dod(work_type, subject),
        'Acceptance Criteria': get_acceptance_criteria(subject),
        'Success Metrics': 'Feature functional; performance acceptable; user adoption >80%; no critical bugs',
        'External Dependencies': 'None',
        'Rollback Plan': 'Revert code changes; redeploy previous version; verify functionality',
        'Description': f"{item['Description']}\n\nAI Agent Instructions:\nImplement with UI configurability. All settings manageable via admin panel. No hardcoded values. Test with REAL services - NO MOCKS.",
        '% Complete': '0'
    }
    output_rows.append(row)

# Write CSV
print(f"Writing {len(output_rows)} work items to {output_file}...")
with open(output_file, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(output_rows)

print(f"✅ Complete! Generated {len(output_rows)} CCaaS work items")
print(f"Output: {output_file}")

# Summary
from collections import Counter
types = Counter(r['Type'] for r in output_rows)
print(f"\nBreakdown by Type:")
for t, c in types.most_common():
    print(f"  {t}: {c}")

labels_all = [l for r in output_rows for l in r['Labels'].split(',') if l]
label_counts = Counter(labels_all)
print(f"\nTop Labels:")
for l, c in label_counts.most_common(15):
    print(f"  {l}: {c}")

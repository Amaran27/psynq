#!/usr/bin/env python3
"""
Part 5: Dialer & Campaign Management - Detailed implementation specs
"""
import sys
sys.path.insert(0, 'd:/Project/psitrix/psynq/scripts')
from generate_detailed_workitems import create_item, write_items

def generate_dialer():
    """Generate Dialer & Campaign detailed work items"""
    print("\nGenerating Dialer & Campaign Management...")
    items = []
    phase = 'Phase: Dialer & Campaign Management'
    
    # Epic: Preview Dialer
    epic1 = 'Epic: Preview Dialer'
    items.append(create_item(epic1, 'Epic', phase, 'High',
        '''Preview dialer - agent sees lead info before dialing.

Flow:
1. Agent requests next lead
2. System presents lead info (name, history, notes)
3. Agent reviews for configurable preview time
4. Agent clicks dial or skip
5. Call initiated to lead
6. Call outcome recorded

Database Tables:
- campaigns
- campaign_leads
- campaign_dispositions
- dialer_sessions

NO MOCKS - Real campaigns, real leads, real calls.''', 75, 21, labels='Dialer,Campaign'))

    # Task: Campaign Entity
    items.append(create_item(
        'Task: Create Campaign database schema and entity',
        'Task', epic1, 'High',
        '''File: deploy/db/05-campaign-schema.sql

```sql
-- Campaign table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('preview', 'progressive', 'predictive', 'power')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
    caller_id VARCHAR(50) NOT NULL,
    caller_id_name VARCHAR(100),
    queue_id UUID REFERENCES queues(id),
    
    -- Dialer settings
    preview_time_sec INTEGER DEFAULT 15,
    max_attempts INTEGER DEFAULT 3,
    retry_delay_minutes INTEGER DEFAULT 60,
    wrap_up_time_sec INTEGER DEFAULT 30,
    dial_timeout_sec INTEGER DEFAULT 30,
    
    -- Schedule
    start_date DATE,
    end_date DATE,
    start_time TIME DEFAULT '09:00',
    end_time TIME DEFAULT '18:00',
    timezone VARCHAR(50) DEFAULT 'UTC',
    days_of_week INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- Mon-Fri
    
    -- Stats (denormalized for performance)
    total_leads INTEGER DEFAULT 0,
    leads_dialed INTEGER DEFAULT 0,
    leads_contacted INTEGER DEFAULT 0,
    leads_remaining INTEGER DEFAULT 0,
    
    -- Compliance
    dnc_check_enabled BOOLEAN DEFAULT true,
    tcpa_compliant BOOLEAN DEFAULT true,
    recording_enabled BOOLEAN DEFAULT true,
    
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- Campaign leads table
CREATE TABLE campaign_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Lead info
    phone_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    company VARCHAR(255),
    
    -- Custom fields (flexible)
    custom_fields JSONB DEFAULT '{}',
    
    -- Status
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN 
        ('pending', 'in_progress', 'contacted', 'no_answer', 'busy', 'failed', 
         'callback', 'dnc', 'completed', 'skipped', 'invalid')),
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    
    -- Attempts
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ,
    last_disposition VARCHAR(100),
    
    -- Assignment
    assigned_agent_id UUID REFERENCES users(id),
    locked_until TIMESTAMPTZ, -- Prevents concurrent access
    
    -- Callback
    callback_at TIMESTAMPTZ,
    callback_agent_id UUID REFERENCES users(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_leads_campaign ON campaign_leads(campaign_id);
CREATE INDEX idx_campaign_leads_status ON campaign_leads(status);
CREATE INDEX idx_campaign_leads_phone ON campaign_leads(phone_number);
CREATE INDEX idx_campaign_leads_next_attempt ON campaign_leads(next_attempt_at) 
    WHERE status IN ('pending', 'callback', 'no_answer');

-- Dispositions (call outcomes)
CREATE TABLE campaign_dispositions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('success', 'callback', 'dnc', 'no_contact', 'failed')),
    is_final BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- Dialer sessions (agent dialing sessions)
CREATE TABLE dialer_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    agent_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    leads_processed INTEGER DEFAULT 0,
    calls_made INTEGER DEFAULT 0,
    contacts_made INTEGER DEFAULT 0,
    talk_time_sec INTEGER DEFAULT 0
);

CREATE INDEX idx_dialer_sessions_campaign ON dialer_sessions(campaign_id);
CREATE INDEX idx_dialer_sessions_agent ON dialer_sessions(agent_id);

-- Seed default dispositions
INSERT INTO campaign_dispositions (tenant_id, name, code, category, is_final, sort_order) VALUES
    ((SELECT id FROM tenants LIMIT 1), 'Interested', 'interested', 'success', true, 1),
    ((SELECT id FROM tenants LIMIT 1), 'Not Interested', 'not_interested', 'success', true, 2),
    ((SELECT id FROM tenants LIMIT 1), 'Callback Requested', 'callback', 'callback', false, 3),
    ((SELECT id FROM tenants LIMIT 1), 'No Answer', 'no_answer', 'no_contact', false, 4),
    ((SELECT id FROM tenants LIMIT 1), 'Busy', 'busy', 'no_contact', false, 5),
    ((SELECT id FROM tenants LIMIT 1), 'Voicemail', 'voicemail', 'no_contact', false, 6),
    ((SELECT id FROM tenants LIMIT 1), 'Wrong Number', 'wrong_number', 'failed', true, 7),
    ((SELECT id FROM tenants LIMIT 1), 'Do Not Call', 'dnc', 'dnc', true, 8),
    ((SELECT id FROM tenants LIMIT 1), 'Disconnected', 'disconnected', 'failed', true, 9);
```

File: packages/backend/src/modules/campaign/entities/campaign.entity.ts

```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Queue } from '../../queue/entities/queue.entity';
import { CampaignLead } from './campaign-lead.entity';

export type CampaignType = 'preview' | 'progressive' | 'predictive' | 'power';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  tenant: Tenant;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  type: CampaignType;

  @Column({ default: 'draft' })
  status: CampaignStatus;

  @Column({ name: 'caller_id' })
  callerId: string;

  @Column({ name: 'caller_id_name', nullable: true })
  callerIdName: string;

  @Column({ name: 'queue_id', nullable: true })
  queueId: string;

  @ManyToOne(() => Queue, { nullable: true })
  queue: Queue;

  // Dialer settings
  @Column({ name: 'preview_time_sec', default: 15 })
  previewTimeSec: number;

  @Column({ name: 'max_attempts', default: 3 })
  maxAttempts: number;

  @Column({ name: 'retry_delay_minutes', default: 60 })
  retryDelayMinutes: number;

  @Column({ name: 'wrap_up_time_sec', default: 30 })
  wrapUpTimeSec: number;

  @Column({ name: 'dial_timeout_sec', default: 30 })
  dialTimeoutSec: number;

  // Schedule
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @Column({ name: 'start_time', type: 'time', default: '09:00' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time', default: '18:00' })
  endTime: string;

  @Column({ default: 'UTC' })
  timezone: string;

  @Column({ name: 'days_of_week', type: 'int', array: true, default: [1,2,3,4,5] })
  daysOfWeek: number[];

  // Stats
  @Column({ name: 'total_leads', default: 0 })
  totalLeads: number;

  @Column({ name: 'leads_dialed', default: 0 })
  leadsDialed: number;

  @Column({ name: 'leads_contacted', default: 0 })
  leadsContacted: number;

  @Column({ name: 'leads_remaining', default: 0 })
  leadsRemaining: number;

  // Compliance
  @Column({ name: 'dnc_check_enabled', default: true })
  dncCheckEnabled: boolean;

  @Column({ name: 'tcpa_compliant', default: true })
  tcpaCompliant: boolean;

  @Column({ name: 'recording_enabled', default: true })
  recordingEnabled: boolean;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  creator: User;

  @OneToMany(() => CampaignLead, lead => lead.campaign)
  leads: CampaignLead[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

Acceptance Criteria:
- All tables created with proper constraints
- Entity matches database schema exactly
- Indexes for common queries
- Default dispositions seeded
- Multi-tenant isolation enforced
- NO HARDCODED tenant IDs''',
        75, 4, 8, 'Database,Campaign,Entity'))

    # Task: Preview Dialer Service
    items.append(create_item(
        'Task: Implement PreviewDialerService',
        'Task', epic1, 'High',
        '''File: packages/backend/src/modules/dialer/services/preview-dialer.service.ts

```typescript
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { Campaign } from '../../campaign/entities/campaign.entity';
import { CampaignLead } from '../../campaign/entities/campaign-lead.entity';
import { DialerSession } from '../entities/dialer-session.entity';
import { CallService } from '../../telephony/services/call.service';

export interface PreviewLeadResponse {
  lead: CampaignLead;
  previewTimeSec: number;
  campaign: {
    id: string;
    name: string;
    callerId: string;
  };
}

export interface DialResult {
  callId: string;
  leadId: string;
  status: 'dialing' | 'failed';
}

export interface DispositionResult {
  leadId: string;
  disposition: string;
  nextAction: 'next_lead' | 'callback_scheduled' | 'session_complete';
}

@Injectable()
export class PreviewDialerService {
  private readonly logger = new Logger(PreviewDialerService.name);
  private readonly leadLockDurationSec: number;

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignLead)
    private readonly leadRepository: Repository<CampaignLead>,
    @InjectRepository(DialerSession)
    private readonly sessionRepository: Repository<DialerSession>,
    private readonly callService: CallService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.leadLockDurationSec = this.configService.get<number>('DIALER_LEAD_LOCK_SEC', 300);
  }

  async startSession(campaignId: string, agentId: string): Promise<DialerSession> {
    // Validate campaign
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId, status: 'active' },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found or not active');
    }

    if (campaign.type !== 'preview') {
      throw new BadRequestException('Campaign is not a preview dialer campaign');
    }

    // Check if agent already has active session
    const existingSession = await this.sessionRepository.findOne({
      where: { agentId, status: 'active' },
    });

    if (existingSession) {
      throw new BadRequestException('Agent already has an active dialer session');
    }

    // Check schedule
    if (!this.isWithinSchedule(campaign)) {
      throw new BadRequestException('Campaign is outside scheduled hours');
    }

    // Create session
    const session = this.sessionRepository.create({
      campaignId,
      agentId,
      status: 'active',
      startedAt: new Date(),
    });

    await this.sessionRepository.save(session);

    this.eventEmitter.emit('dialer.session.started', {
      sessionId: session.id,
      campaignId,
      agentId,
    });

    this.logger.log(`Dialer session ${session.id} started for agent ${agentId}`);

    return session;
  }

  async getNextLead(sessionId: string): Promise<PreviewLeadResponse | null> {
    const session = await this.getActiveSession(sessionId);
    const campaign = await this.campaignRepository.findOneBy({ id: session.campaignId });

    // Find next available lead
    const now = new Date();
    const lead = await this.leadRepository
      .createQueryBuilder('lead')
      .where('lead.campaign_id = :campaignId', { campaignId: session.campaignId })
      .andWhere('lead.status IN (:...statuses)', { 
        statuses: ['pending', 'no_answer', 'busy', 'callback'] 
      })
      .andWhere('lead.attempt_count < :maxAttempts', { maxAttempts: campaign.maxAttempts })
      .andWhere('(lead.next_attempt_at IS NULL OR lead.next_attempt_at <= :now)', { now })
      .andWhere('(lead.locked_until IS NULL OR lead.locked_until <= :now)', { now })
      .orderBy('lead.priority', 'DESC')
      .addOrderBy('lead.callback_at', 'ASC', 'NULLS LAST')
      .addOrderBy('lead.created_at', 'ASC')
      .getOne();

    if (!lead) {
      // No leads available
      return null;
    }

    // Lock the lead
    const lockUntil = new Date(now.getTime() + this.leadLockDurationSec * 1000);
    await this.leadRepository.update(lead.id, {
      status: 'in_progress',
      assignedAgentId: session.agentId,
      lockedUntil: lockUntil,
    });

    this.eventEmitter.emit('dialer.lead.presented', {
      sessionId,
      leadId: lead.id,
      agentId: session.agentId,
    });

    return {
      lead,
      previewTimeSec: campaign.previewTimeSec,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        callerId: campaign.callerId,
      },
    };
  }

  async dialLead(sessionId: string, leadId: string): Promise<DialResult> {
    const session = await this.getActiveSession(sessionId);
    const lead = await this.getLockedLead(leadId, session.agentId);
    const campaign = await this.campaignRepository.findOneBy({ id: session.campaignId });

    try {
      // DNC check
      if (campaign.dncCheckEnabled) {
        const isDnc = await this.checkDnc(lead.phoneNumber, lead.tenantId);
        if (isDnc) {
          await this.leadRepository.update(leadId, { status: 'dnc' });
          throw new BadRequestException('Number is on Do Not Call list');
        }
      }

      // Originate call
      const call = await this.callService.originate({
        endpoint: `PJSIP/${lead.phoneNumber}@trunk`,
        callerId: campaign.callerId,
        callerName: campaign.callerIdName || campaign.name,
        destination: lead.phoneNumber,
        timeout: campaign.dialTimeoutSec,
      }, lead.tenantId);

      // Update lead
      await this.leadRepository.update(leadId, {
        attemptCount: () => 'attempt_count + 1',
        lastAttemptAt: new Date(),
      });

      // Update session stats
      await this.sessionRepository.increment({ id: sessionId }, 'callsMade', 1);

      this.eventEmitter.emit('dialer.call.started', {
        sessionId,
        leadId,
        callId: call.id,
      });

      return {
        callId: call.id,
        leadId,
        status: 'dialing',
      };

    } catch (error) {
      this.logger.error(`Dial failed for lead ${leadId}: ${error.message}`);
      return {
        callId: null,
        leadId,
        status: 'failed',
      };
    }
  }

  async skipLead(sessionId: string, leadId: string, reason: string): Promise<void> {
    const session = await this.getActiveSession(sessionId);
    const lead = await this.getLockedLead(leadId, session.agentId);

    await this.leadRepository.update(leadId, {
      status: 'skipped',
      notes: lead.notes ? `${lead.notes}\\nSkipped: ${reason}` : `Skipped: ${reason}`,
      lockedUntil: null,
      assignedAgentId: null,
    });

    this.eventEmitter.emit('dialer.lead.skipped', {
      sessionId,
      leadId,
      reason,
    });
  }

  async dispositionLead(
    sessionId: string, 
    leadId: string, 
    dispositionCode: string,
    notes?: string,
    callbackAt?: Date,
  ): Promise<DispositionResult> {
    const session = await this.getActiveSession(sessionId);
    const lead = await this.leadRepository.findOneBy({ id: leadId });

    // Get disposition config
    const disposition = await this.getDisposition(dispositionCode, lead.tenantId);

    // Determine new status based on disposition
    let newStatus = lead.status;
    let nextAttemptAt = null;

    if (disposition.isFinal) {
      newStatus = 'completed';
    } else if (disposition.category === 'callback') {
      newStatus = 'callback';
      nextAttemptAt = callbackAt;
    } else if (disposition.category === 'no_contact') {
      const campaign = await this.campaignRepository.findOneBy({ id: session.campaignId });
      nextAttemptAt = new Date(Date.now() + campaign.retryDelayMinutes * 60 * 1000);
      newStatus = dispositionCode as any;
    } else if (disposition.category === 'dnc') {
      newStatus = 'dnc';
      // Add to DNC list
      await this.addToDnc(lead.phoneNumber, lead.tenantId);
    }

    // Update lead
    await this.leadRepository.update(leadId, {
      status: newStatus,
      lastDisposition: dispositionCode,
      notes: notes ? (lead.notes ? `${lead.notes}\\n${notes}` : notes) : lead.notes,
      nextAttemptAt,
      callbackAt: disposition.category === 'callback' ? callbackAt : null,
      callbackAgentId: disposition.category === 'callback' ? session.agentId : null,
      lockedUntil: null,
      assignedAgentId: null,
    });

    // Update session stats
    await this.sessionRepository.increment({ id: sessionId }, 'leadsProcessed', 1);
    if (disposition.category === 'success') {
      await this.sessionRepository.increment({ id: sessionId }, 'contactsMade', 1);
    }

    // Update campaign stats
    await this.updateCampaignStats(session.campaignId);

    this.eventEmitter.emit('dialer.lead.dispositioned', {
      sessionId,
      leadId,
      dispositionCode,
    });

    // Check if campaign is complete
    const remainingLeads = await this.getRemainingLeadsCount(session.campaignId);
    if (remainingLeads === 0) {
      return {
        leadId,
        disposition: dispositionCode,
        nextAction: 'session_complete',
      };
    }

    return {
      leadId,
      disposition: dispositionCode,
      nextAction: disposition.category === 'callback' ? 'callback_scheduled' : 'next_lead',
    };
  }

  async pauseSession(sessionId: string): Promise<void> {
    const session = await this.getActiveSession(sessionId);
    
    await this.sessionRepository.update(sessionId, { status: 'paused' });
    
    // Release any locked leads
    await this.leadRepository.update(
      { assignedAgentId: session.agentId, status: 'in_progress' },
      { status: 'pending', lockedUntil: null, assignedAgentId: null },
    );

    this.eventEmitter.emit('dialer.session.paused', { sessionId });
  }

  async resumeSession(sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, status: 'paused' },
    });

    if (!session) {
      throw new NotFoundException('Paused session not found');
    }

    await this.sessionRepository.update(sessionId, { status: 'active' });

    this.eventEmitter.emit('dialer.session.resumed', { sessionId });
  }

  async endSession(sessionId: string): Promise<DialerSession> {
    const session = await this.sessionRepository.findOneBy({ id: sessionId });
    
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Release any locked leads
    await this.leadRepository.update(
      { assignedAgentId: session.agentId, status: 'in_progress' },
      { status: 'pending', lockedUntil: null, assignedAgentId: null },
    );

    // Update session
    session.status = 'ended';
    session.endedAt = new Date();
    await this.sessionRepository.save(session);

    this.eventEmitter.emit('dialer.session.ended', {
      sessionId,
      stats: {
        leadsProcessed: session.leadsProcessed,
        callsMade: session.callsMade,
        contactsMade: session.contactsMade,
        duration: session.endedAt.getTime() - session.startedAt.getTime(),
      },
    });

    return session;
  }

  // Helper methods
  private async getActiveSession(sessionId: string): Promise<DialerSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, status: In(['active', 'paused']) },
    });

    if (!session) {
      throw new NotFoundException('Active session not found');
    }

    return session;
  }

  private async getLockedLead(leadId: string, agentId: string): Promise<CampaignLead> {
    const lead = await this.leadRepository.findOne({
      where: { id: leadId, assignedAgentId: agentId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found or not assigned to agent');
    }

    return lead;
  }

  private isWithinSchedule(campaign: Campaign): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay() || 7; // Convert Sunday (0) to 7
    
    if (!campaign.daysOfWeek.includes(dayOfWeek)) {
      return false;
    }

    // TODO: Check time with timezone
    return true;
  }

  private async checkDnc(phoneNumber: string, tenantId: string): Promise<boolean> {
    // Implement DNC check against database
    return false;
  }

  private async addToDnc(phoneNumber: string, tenantId: string): Promise<void> {
    // Implement DNC addition
  }

  private async getDisposition(code: string, tenantId: string): Promise<any> {
    // Get disposition from database
    return { code, category: 'success', isFinal: true };
  }

  private async updateCampaignStats(campaignId: string): Promise<void> {
    // Update denormalized stats
  }

  private async getRemainingLeadsCount(campaignId: string): Promise<number> {
    return this.leadRepository.count({
      where: {
        campaignId,
        status: In(['pending', 'no_answer', 'busy', 'callback']),
      },
    });
  }
}
```

API Endpoints:
- POST /dialer/sessions - Start dialer session
- GET /dialer/sessions/:id/next-lead - Get next lead for preview
- POST /dialer/sessions/:id/dial - Dial current lead
- POST /dialer/sessions/:id/skip - Skip current lead
- POST /dialer/sessions/:id/disposition - Disposition lead
- POST /dialer/sessions/:id/pause - Pause session
- POST /dialer/sessions/:id/resume - Resume session
- DELETE /dialer/sessions/:id - End session

Acceptance Criteria:
- Agent can start/pause/resume/end dialer session
- Leads presented in priority order
- Lead locking prevents concurrent access
- DNC check before dialing
- Schedule enforcement
- Proper disposition handling
- Campaign stats updated
- REAL calls made to REAL numbers''',
        78, 6, 14, 'Dialer,Service,Preview'))

    write_items(items)
    print(f"  Dialer items: {len(items)}")

if __name__ == '__main__':
    generate_dialer()

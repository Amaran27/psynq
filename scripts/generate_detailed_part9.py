#!/usr/bin/env python3
"""
Part 9: Analytics & Reporting Implementation
"""
import sys
sys.path.insert(0, 'd:/Project/psitrix/psynq/scripts')
from generate_detailed_workitems import create_item, write_items

def generate_analytics():
    """Generate Analytics & Reporting detailed work items"""
    print("\nGenerating Analytics & Reporting...")
    items = []
    phase = 'Phase: Analytics & Reporting'
    
    # Epic: Real-time Dashboard
    epic1 = 'Epic: Real-time Analytics Dashboard'
    items.append(create_item(epic1, 'Epic', phase, 'High',
        '''Live wallboard and supervisor dashboard.

Features:
- Real-time queue stats
- Agent status board
- Call volume charts
- SLA monitoring
- Alert thresholds

Updates via WebSocket - no polling.''', 90, 21, labels='Analytics,Dashboard'))

    # Task: Dashboard WebSocket Gateway
    items.append(create_item(
        'Task: Implement Dashboard WebSocket Gateway',
        'Task', epic1, 'High',
        '''File: packages/backend/src/modules/analytics/gateways/dashboard.gateway.ts

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';
import { WsUser } from '../../auth/decorators/ws-user.decorator';
import { User } from '../../users/entities/user.entity';
import { AnalyticsService } from '../services/analytics.service';

interface DashboardMetrics {
  timestamp: Date;
  queues: QueueMetrics[];
  agents: AgentMetrics[];
  calls: CallMetrics;
  sla: SlaMetrics;
}

interface QueueMetrics {
  queueId: string;
  queueName: string;
  callsWaiting: number;
  callsInProgress: number;
  agentsAvailable: number;
  agentsBusy: number;
  agentsPaused: number;
  longestWaitTime: number;
  avgWaitTime: number;
  slaPercentage: number;
}

interface AgentMetrics {
  agentId: string;
  agentName: string;
  status: string;
  statusDuration: number;
  callsHandled: number;
  avgHandleTime: number;
  currentCallId?: string;
  currentCallDuration?: number;
}

interface CallMetrics {
  active: number;
  inbound: number;
  outbound: number;
  internal: number;
  todayTotal: number;
  todayAnswered: number;
  todayAbandoned: number;
}

interface SlaMetrics {
  target: number;
  current: number;
  trend: 'up' | 'down' | 'stable';
  breaches: number;
}

@WebSocketGateway({
  namespace: '/dashboard',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
export class DashboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(DashboardGateway.name);
  private subscriptions = new Map<string, Set<string>>(); // socketId -> Set<queueId>

  @WebSocketServer()
  server: Server;

  constructor(private readonly analyticsService: AnalyticsService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Dashboard client connected: ${client.id}`);
    this.subscriptions.set(client.id, new Set());
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Dashboard client disconnected: ${client.id}`);
    this.subscriptions.delete(client.id);
  }

  @SubscribeMessage('subscribe:queues')
  async handleSubscribeQueues(
    @ConnectedSocket() client: Socket,
    @WsUser() user: User,
    @MessageBody() data: { queueIds: string[] },
  ) {
    const subs = this.subscriptions.get(client.id) || new Set();
    
    data.queueIds.forEach(queueId => {
      subs.add(queueId);
      client.join(`queue:${queueId}`);
    });

    this.subscriptions.set(client.id, subs);

    // Send initial metrics
    const metrics = await this.analyticsService.getQueueMetrics(
      user.tenantId,
      data.queueIds,
    );
    
    client.emit('metrics:queues', metrics);
  }

  @SubscribeMessage('subscribe:agents')
  async handleSubscribeAgents(
    @ConnectedSocket() client: Socket,
    @WsUser() user: User,
    @MessageBody() data: { teamId?: string },
  ) {
    client.join(`team:${data.teamId || 'all'}`);

    // Send initial agent metrics
    const metrics = await this.analyticsService.getAgentMetrics(
      user.tenantId,
      data.teamId,
    );

    client.emit('metrics:agents', metrics);
  }

  @SubscribeMessage('subscribe:overview')
  async handleSubscribeOverview(
    @ConnectedSocket() client: Socket,
    @WsUser() user: User,
  ) {
    client.join(`tenant:${user.tenantId}:overview`);

    // Send initial overview
    const overview = await this.analyticsService.getDashboardOverview(user.tenantId);
    client.emit('metrics:overview', overview);
  }

  // Event handlers - push updates when events occur

  @OnEvent('call.queued')
  async handleCallQueued(event: any) {
    const { queueId, tenantId } = event;
    await this.broadcastQueueUpdate(tenantId, queueId);
  }

  @OnEvent('call.answered')
  async handleCallAnswered(event: any) {
    const { queueId, agentId, tenantId } = event;
    await this.broadcastQueueUpdate(tenantId, queueId);
    await this.broadcastAgentUpdate(tenantId, agentId);
  }

  @OnEvent('call.ended')
  async handleCallEnded(event: any) {
    const { queueId, agentId, tenantId } = event;
    if (queueId) {
      await this.broadcastQueueUpdate(tenantId, queueId);
    }
    if (agentId) {
      await this.broadcastAgentUpdate(tenantId, agentId);
    }
    await this.broadcastOverviewUpdate(tenantId);
  }

  @OnEvent('agent.status.changed')
  async handleAgentStatusChanged(event: any) {
    const { agentId, tenantId, queueIds } = event;
    await this.broadcastAgentUpdate(tenantId, agentId);
    
    // Update all queues the agent belongs to
    for (const queueId of queueIds || []) {
      await this.broadcastQueueUpdate(tenantId, queueId);
    }
  }

  private async broadcastQueueUpdate(tenantId: string, queueId: string) {
    const metrics = await this.analyticsService.getQueueMetrics(
      tenantId,
      [queueId],
    );

    this.server.to(`queue:${queueId}`).emit('metrics:queue', metrics[0]);
  }

  private async broadcastAgentUpdate(tenantId: string, agentId: string) {
    const agent = await this.analyticsService.getAgentMetric(tenantId, agentId);
    
    // Broadcast to all team rooms
    this.server.to(`team:all`).emit('metrics:agent', agent);
  }

  private async broadcastOverviewUpdate(tenantId: string) {
    const overview = await this.analyticsService.getDashboardOverview(tenantId);
    this.server.to(`tenant:${tenantId}:overview`).emit('metrics:overview', overview);
  }

  // Periodic updates for time-based metrics (call duration, status duration)
  async broadcastTimerUpdates() {
    // Called every second from a scheduled task
    // Updates call durations and status durations without full recalculation
    // Implementation uses Redis for performance
  }
}
```

File: packages/web/src/hooks/useDashboardSocket.ts

```typescript
import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { useDashboardStore } from '@/store/dashboard.store';

interface UseDashboardSocketOptions {
  queueIds?: string[];
  teamId?: string;
  autoReconnect?: boolean;
}

export function useDashboardSocket(options: UseDashboardSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const { token } = useAuthStore();
  const { 
    setQueueMetrics, 
    setAgentMetrics, 
    setOverview,
    updateQueue,
    updateAgent,
  } = useDashboardStore();

  useEffect(() => {
    if (!token) return;

    const socket = io(`${process.env.NEXT_PUBLIC_WS_URL}/dashboard`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: options.autoReconnect ?? true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Dashboard socket connected');

      // Subscribe to queues
      if (options.queueIds?.length) {
        socket.emit('subscribe:queues', { queueIds: options.queueIds });
      }

      // Subscribe to agents
      socket.emit('subscribe:agents', { teamId: options.teamId });

      // Subscribe to overview
      socket.emit('subscribe:overview');
    });

    socket.on('metrics:queues', (data) => {
      setQueueMetrics(data);
    });

    socket.on('metrics:queue', (data) => {
      updateQueue(data);
    });

    socket.on('metrics:agents', (data) => {
      setAgentMetrics(data);
    });

    socket.on('metrics:agent', (data) => {
      updateAgent(data);
    });

    socket.on('metrics:overview', (data) => {
      setOverview(data);
    });

    socket.on('disconnect', (reason) => {
      console.log('Dashboard socket disconnected:', reason);
    });

    socket.on('error', (error) => {
      console.error('Dashboard socket error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, options.queueIds, options.teamId]);

  const subscribeToQueues = useCallback((queueIds: string[]) => {
    socketRef.current?.emit('subscribe:queues', { queueIds });
  }, []);

  return {
    socket: socketRef.current,
    subscribeToQueues,
  };
}
```

Events Consumed:
- call.queued
- call.answered
- call.ended
- agent.status.changed

Client Events Emitted:
- metrics:queues (initial)
- metrics:queue (update)
- metrics:agents (initial)
- metrics:agent (update)
- metrics:overview

Features:
- Room-based subscriptions
- Real-time push updates
- No polling needed
- Automatic reconnection

Acceptance Criteria:
- WebSocket connection with JWT auth
- Subscribe to specific queues
- Real-time updates on events
- Client-side reconnection
- No data loss on reconnect''',
        96, 4, 8, 'Backend,WebSocket,Analytics'))

    # Task: Dashboard Store
    items.append(create_item(
        'Task: Implement Dashboard Zustand Store',
        'Task', epic1, 'Normal',
        '''File: packages/web/src/store/dashboard.store.ts

```typescript
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface QueueMetrics {
  queueId: string;
  queueName: string;
  callsWaiting: number;
  callsInProgress: number;
  agentsAvailable: number;
  agentsBusy: number;
  agentsPaused: number;
  longestWaitTime: number;
  avgWaitTime: number;
  slaPercentage: number;
}

interface AgentMetrics {
  agentId: string;
  agentName: string;
  status: string;
  statusDuration: number;
  callsHandled: number;
  avgHandleTime: number;
  currentCallId?: string;
  currentCallDuration?: number;
}

interface Overview {
  activeCalls: number;
  callsToday: number;
  answeredToday: number;
  abandonedToday: number;
  avgWaitTime: number;
  avgHandleTime: number;
  slaPercentage: number;
  agentsOnline: number;
  agentsAvailable: number;
  agentsBusy: number;
}

interface Alert {
  id: string;
  type: 'warning' | 'critical';
  message: string;
  queueId?: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface DashboardState {
  // Data
  queues: Map<string, QueueMetrics>;
  agents: Map<string, AgentMetrics>;
  overview: Overview | null;
  alerts: Alert[];
  
  // UI State
  selectedQueueIds: string[];
  selectedTeamId: string | null;
  refreshInterval: number;
  
  // Actions
  setQueueMetrics: (metrics: QueueMetrics[]) => void;
  updateQueue: (metrics: QueueMetrics) => void;
  setAgentMetrics: (metrics: AgentMetrics[]) => void;
  updateAgent: (metrics: AgentMetrics) => void;
  setOverview: (overview: Overview) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>) => void;
  acknowledgeAlert: (alertId: string) => void;
  clearAlerts: () => void;
  setSelectedQueues: (queueIds: string[]) => void;
  setSelectedTeam: (teamId: string | null) => void;
  
  // Computed
  getQueuesSorted: (sortBy: 'name' | 'calls' | 'sla') => QueueMetrics[];
  getAgentsSorted: (sortBy: 'name' | 'status' | 'calls') => AgentMetrics[];
  getUnacknowledgedAlerts: () => Alert[];
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        queues: new Map(),
        agents: new Map(),
        overview: null,
        alerts: [],
        selectedQueueIds: [],
        selectedTeamId: null,
        refreshInterval: 1000,

        // Actions
        setQueueMetrics: (metrics) => {
          set((state) => {
            state.queues = new Map(metrics.map(m => [m.queueId, m]));
            
            // Check for SLA breaches
            metrics.forEach(queue => {
              if (queue.slaPercentage < 80) {
                get().addAlert({
                  type: queue.slaPercentage < 60 ? 'critical' : 'warning',
                  message: `SLA at ${queue.slaPercentage.toFixed(1)}% for ${queue.queueName}`,
                  queueId: queue.queueId,
                });
              }
              
              // Check for long wait times
              if (queue.longestWaitTime > 120) {
                get().addAlert({
                  type: 'critical',
                  message: `Call waiting ${Math.floor(queue.longestWaitTime / 60)}+ min in ${queue.queueName}`,
                  queueId: queue.queueId,
                });
              }
            });
          });
        },

        updateQueue: (metrics) => {
          set((state) => {
            state.queues.set(metrics.queueId, metrics);
          });
        },

        setAgentMetrics: (metrics) => {
          set((state) => {
            state.agents = new Map(metrics.map(m => [m.agentId, m]));
          });
        },

        updateAgent: (metrics) => {
          set((state) => {
            state.agents.set(metrics.agentId, metrics);
          });
        },

        setOverview: (overview) => {
          set((state) => {
            state.overview = overview;
          });
        },

        addAlert: (alertData) => {
          set((state) => {
            // Avoid duplicate alerts
            const exists = state.alerts.some(
              a => a.message === alertData.message && !a.acknowledged
            );
            
            if (!exists) {
              state.alerts.unshift({
                id: `alert-${Date.now()}`,
                ...alertData,
                timestamp: new Date(),
                acknowledged: false,
              });
              
              // Keep only last 50 alerts
              if (state.alerts.length > 50) {
                state.alerts = state.alerts.slice(0, 50);
              }
            }
          });
        },

        acknowledgeAlert: (alertId) => {
          set((state) => {
            const alert = state.alerts.find(a => a.id === alertId);
            if (alert) {
              alert.acknowledged = true;
            }
          });
        },

        clearAlerts: () => {
          set((state) => {
            state.alerts = [];
          });
        },

        setSelectedQueues: (queueIds) => {
          set((state) => {
            state.selectedQueueIds = queueIds;
          });
        },

        setSelectedTeam: (teamId) => {
          set((state) => {
            state.selectedTeamId = teamId;
          });
        },

        // Computed getters
        getQueuesSorted: (sortBy) => {
          const queues = Array.from(get().queues.values());
          
          switch (sortBy) {
            case 'name':
              return queues.sort((a, b) => a.queueName.localeCompare(b.queueName));
            case 'calls':
              return queues.sort((a, b) => b.callsWaiting - a.callsWaiting);
            case 'sla':
              return queues.sort((a, b) => a.slaPercentage - b.slaPercentage);
            default:
              return queues;
          }
        },

        getAgentsSorted: (sortBy) => {
          const agents = Array.from(get().agents.values());
          
          switch (sortBy) {
            case 'name':
              return agents.sort((a, b) => a.agentName.localeCompare(b.agentName));
            case 'status':
              return agents.sort((a, b) => a.status.localeCompare(b.status));
            case 'calls':
              return agents.sort((a, b) => b.callsHandled - a.callsHandled);
            default:
              return agents;
          }
        },

        getUnacknowledgedAlerts: () => {
          return get().alerts.filter(a => !a.acknowledged);
        },
      }))
    ),
    { name: 'dashboard-store' }
  )
);

// Selectors for optimized re-renders
export const selectOverview = (state: DashboardState) => state.overview;
export const selectAlerts = (state: DashboardState) => state.alerts;
export const selectQueues = (state: DashboardState) => state.queues;
export const selectAgents = (state: DashboardState) => state.agents;
```

Dependencies:
```json
{
  "dependencies": {
    "zustand": "^4.4.0",
    "immer": "^10.0.0"
  }
}
```

Features:
- Real-time metrics storage
- Automatic alert generation
- Sorted views (name, calls, SLA)
- Alert acknowledgment
- DevTools integration
- Optimized selectors

Alert Thresholds (configurable via Admin UI):
- SLA < 80%: Warning
- SLA < 60%: Critical
- Wait time > 2 min: Critical

Acceptance Criteria:
- Updates without full re-render
- Alerts deduplicated
- Sorted views work correctly
- State persists during reconnection
- DevTools shows all state changes''',
        90, 3, 6, 'Frontend,State,Analytics'))

    # Epic: Historical Reports
    epic2 = 'Epic: Historical Reports'
    items.append(create_item(epic2, 'Epic', phase, 'Normal',
        '''Report builder and scheduled reports.

Reports:
- Call Detail Records (CDR)
- Agent Performance
- Queue Performance
- Campaign Results
- SLA Compliance

Features:
- Date range selection
- Filter by queue/agent/campaign
- Export to CSV/PDF
- Schedule email delivery
- Custom report builder''', 85, 21, labels='Analytics,Reports'))

    # Task: Report Service
    items.append(create_item(
        'Task: Implement Report Generation Service',
        'Task', epic2, 'High',
        '''File: packages/backend/src/modules/reports/services/report.service.ts

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Report, ReportType, ReportStatus } from '../entities/report.entity';
import { ScheduledReport } from '../entities/scheduled-report.entity';
import { CdrReportGenerator } from './generators/cdr-report.generator';
import { AgentReportGenerator } from './generators/agent-report.generator';
import { QueueReportGenerator } from './generators/queue-report.generator';
import { CampaignReportGenerator } from './generators/campaign-report.generator';
import { StorageService } from '../../storage/storage.service';
import { EmailService } from '../../notifications/email.service';
import { GenerateReportDto } from '../dto/generate-report.dto';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    @InjectRepository(ScheduledReport)
    private readonly scheduledRepo: Repository<ScheduledReport>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly cdrGenerator: CdrReportGenerator,
    private readonly agentGenerator: AgentReportGenerator,
    private readonly queueGenerator: QueueReportGenerator,
    private readonly campaignGenerator: CampaignReportGenerator,
    private readonly storage: StorageService,
    private readonly email: EmailService,
  ) {}

  async generate(tenantId: string, userId: string, dto: GenerateReportDto): Promise<Report> {
    // Create report record
    const report = this.reportRepo.create({
      tenantId,
      createdBy: userId,
      type: dto.type,
      name: dto.name || this.getDefaultReportName(dto.type),
      status: ReportStatus.PENDING,
      parameters: {
        startDate: dto.startDate,
        endDate: dto.endDate,
        filters: dto.filters,
        groupBy: dto.groupBy,
        format: dto.format || 'csv',
      },
    });

    const savedReport = await this.reportRepo.save(report);

    // Generate async
    this.generateAsync(savedReport).catch(error => {
      this.logger.error(`Report generation failed: ${error.message}`, error.stack);
    });

    return savedReport;
  }

  private async generateAsync(report: Report): Promise<void> {
    try {
      // Update status
      await this.reportRepo.update(report.id, { 
        status: ReportStatus.GENERATING,
        startedAt: new Date(),
      });

      // Get generator
      const generator = this.getGenerator(report.type);

      // Generate data
      const data = await generator.generate(
        report.tenantId,
        report.parameters.startDate,
        report.parameters.endDate,
        report.parameters.filters,
        report.parameters.groupBy,
      );

      // Format output
      let content: Buffer;
      let contentType: string;
      let filename: string;

      switch (report.parameters.format) {
        case 'csv':
          content = Buffer.from(generator.toCsv(data));
          contentType = 'text/csv';
          filename = `${report.id}.csv`;
          break;
        case 'pdf':
          content = await generator.toPdf(data);
          contentType = 'application/pdf';
          filename = `${report.id}.pdf`;
          break;
        case 'xlsx':
          content = await generator.toXlsx(data);
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          filename = `${report.id}.xlsx`;
          break;
        default:
          content = Buffer.from(JSON.stringify(data, null, 2));
          contentType = 'application/json';
          filename = `${report.id}.json`;
      }

      // Upload to storage
      const fileUrl = await this.storage.upload(
        `reports/${report.tenantId}/${filename}`,
        content,
        contentType,
      );

      // Update report
      await this.reportRepo.update(report.id, {
        status: ReportStatus.COMPLETED,
        completedAt: new Date(),
        fileUrl,
        fileSize: content.length,
        rowCount: data.length,
      });

      // Emit event
      this.eventEmitter.emit('report.completed', {
        reportId: report.id,
        tenantId: report.tenantId,
        userId: report.createdBy,
        fileUrl,
      });

      this.logger.log(`Report ${report.id} completed: ${data.length} rows`);

    } catch (error) {
      await this.reportRepo.update(report.id, {
        status: ReportStatus.FAILED,
        error: error.message,
        completedAt: new Date(),
      });

      this.eventEmitter.emit('report.failed', {
        reportId: report.id,
        error: error.message,
      });

      throw error;
    }
  }

  async getDownloadUrl(tenantId: string, reportId: string): Promise<string> {
    const report = await this.reportRepo.findOne({
      where: { id: reportId, tenantId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== ReportStatus.COMPLETED) {
      throw new Error('Report not ready for download');
    }

    // Generate signed URL (expires in 1 hour)
    return this.storage.getSignedUrl(report.fileUrl, 3600);
  }

  // Scheduled reports

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledReports() {
    const now = new Date();
    
    const dueReports = await this.scheduledRepo.find({
      where: {
        enabled: true,
        nextRunAt: Between(new Date(0), now),
      },
    });

    for (const scheduled of dueReports) {
      try {
        await this.runScheduledReport(scheduled);
      } catch (error) {
        this.logger.error(
          `Scheduled report ${scheduled.id} failed: ${error.message}`,
        );
      }
    }
  }

  private async runScheduledReport(scheduled: ScheduledReport): Promise<void> {
    // Calculate date range based on schedule
    const { startDate, endDate } = this.calculateDateRange(scheduled.schedule);

    // Generate report
    const report = await this.generate(
      scheduled.tenantId,
      scheduled.createdBy,
      {
        type: scheduled.type,
        name: scheduled.name,
        startDate,
        endDate,
        filters: scheduled.filters,
        groupBy: scheduled.groupBy,
        format: scheduled.format,
      },
    );

    // Wait for completion (with timeout)
    const completed = await this.waitForCompletion(report.id, 300000); // 5 min timeout

    if (completed) {
      // Send email with report
      await this.email.sendReport(
        scheduled.recipients,
        scheduled.name,
        await this.getDownloadUrl(scheduled.tenantId, report.id),
      );
    }

    // Update next run time
    await this.scheduledRepo.update(scheduled.id, {
      lastRunAt: now,
      nextRunAt: this.calculateNextRun(scheduled.schedule),
    });
  }

  private getGenerator(type: ReportType): any {
    switch (type) {
      case ReportType.CDR:
        return this.cdrGenerator;
      case ReportType.AGENT_PERFORMANCE:
        return this.agentGenerator;
      case ReportType.QUEUE_PERFORMANCE:
        return this.queueGenerator;
      case ReportType.CAMPAIGN:
        return this.campaignGenerator;
      default:
        throw new Error(`Unknown report type: ${type}`);
    }
  }

  private getDefaultReportName(type: ReportType): string {
    const date = new Date().toISOString().split('T')[0];
    return `${type.replace(/_/g, ' ')}_${date}`;
  }

  private calculateDateRange(schedule: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(0, 0, 0, 0);

    const startDate = new Date(endDate);

    switch (schedule) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 1);
    }

    return { startDate, endDate };
  }

  private calculateNextRun(schedule: string): Date {
    const next = new Date();

    switch (schedule) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        next.setHours(6, 0, 0, 0); // 6 AM
        break;
      case 'weekly':
        next.setDate(next.getDate() + (7 - next.getDay() + 1) % 7 || 7); // Next Monday
        next.setHours(6, 0, 0, 0);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        next.setHours(6, 0, 0, 0);
        break;
      default:
        next.setDate(next.getDate() + 1);
        next.setHours(6, 0, 0, 0);
    }

    return next;
  }

  private async waitForCompletion(reportId: string, timeout: number): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const report = await this.reportRepo.findOne({ where: { id: reportId } });

      if (report?.status === ReportStatus.COMPLETED) {
        return true;
      }

      if (report?.status === ReportStatus.FAILED) {
        return false;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return false;
  }
}
```

Report Types:
- CDR (Call Detail Records)
- Agent Performance
- Queue Performance
- Campaign Results

Export Formats:
- CSV
- PDF
- XLSX
- JSON

Scheduled Reports:
- Daily (6 AM)
- Weekly (Monday 6 AM)
- Monthly (1st of month 6 AM)
- Email delivery to recipients

Storage:
- MinIO for generated reports
- Signed URLs for downloads
- 90-day retention

Acceptance Criteria:
- All report types generate correctly
- Export to all formats
- Scheduled reports run on time
- Email delivery works
- Large reports don't timeout
- No hardcoded credentials''',
        95, 5, 10, 'Backend,Reports'))

    return items

if __name__ == '__main__':
    generate_analytics()

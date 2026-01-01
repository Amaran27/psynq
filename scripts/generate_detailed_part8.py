#!/usr/bin/env python3
"""
Part 8: Queue Management & Routing Configuration
"""
import sys
sys.path.insert(0, 'd:/Project/psitrix/psynq/scripts')
from generate_detailed_workitems import create_item, write_items

def generate_queue_config():
    """Generate Queue & Routing configuration detailed work items"""
    print("\nGenerating Queue & Routing Configuration...")
    items = []
    phase = 'Phase: Admin & Configuration UI'
    
    # Epic: Queue Management
    epic = 'Epic: Queue Management'
    items.append(create_item(epic, 'Epic', phase, 'High',
        '''Queue configuration and management.

Features:
- Create/Edit/Delete queues
- Skills-based routing setup
- Agent assignment
- Priority rules
- Overflow settings
- Queue statistics

All configurable via Admin UI.''', 85, 14, labels='Admin,Queue'))

    # Task: Queue Configuration Service
    items.append(create_item(
        'Task: Implement Queue Configuration Service',
        'Task', epic, 'High',
        '''File: packages/backend/src/modules/queues/services/queue-config.service.ts

```typescript
import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue, QueueStatus } from '../entities/queue.entity';
import { QueueSkill } from '../entities/queue-skill.entity';
import { QueueMember } from '../entities/queue-member.entity';
import { Skill } from '../entities/skill.entity';
import { User } from '../../users/entities/user.entity';
import { CreateQueueDto, UpdateQueueDto } from '../dto';
import { QueueCreatedEvent, QueueUpdatedEvent, QueueDeletedEvent } from '../events';
import { AsteriskQueueSyncService } from './asterisk-queue-sync.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class QueueConfigService {
  private readonly logger = new Logger(QueueConfigService.name);

  constructor(
    @InjectRepository(Queue)
    private readonly queueRepo: Repository<Queue>,
    @InjectRepository(QueueSkill)
    private readonly queueSkillRepo: Repository<QueueSkill>,
    @InjectRepository(QueueMember)
    private readonly queueMemberRepo: Repository<QueueMember>,
    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly asteriskSync: AsteriskQueueSyncService,
    private readonly redis: RedisService,
  ) {}

  async findAll(tenantId: string): Promise<Queue[]> {
    return this.queueRepo.find({
      where: { tenantId },
      relations: ['skills', 'skills.skill', 'members', 'members.agent'],
      order: { name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Queue> {
    const queue = await this.queueRepo.findOne({
      where: { id, tenantId },
      relations: ['skills', 'skills.skill', 'members', 'members.agent'],
    });

    if (!queue) {
      throw new NotFoundException(`Queue ${id} not found`);
    }

    return queue;
  }

  async create(tenantId: string, dto: CreateQueueDto): Promise<Queue> {
    // Check for duplicate name
    const existing = await this.queueRepo.findOne({
      where: { tenantId, name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Queue with name "${dto.name}" already exists`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create queue
      const queue = this.queueRepo.create({
        ...dto,
        tenantId,
        status: QueueStatus.ACTIVE,
        asteriskQueueId: this.generateAsteriskQueueId(dto.name),
      });

      const savedQueue = await queryRunner.manager.save(queue);

      // Add skills
      if (dto.skills?.length) {
        const queueSkills = await this.createQueueSkills(
          queryRunner.manager,
          savedQueue.id,
          dto.skills,
        );
        savedQueue.skills = queueSkills;
      }

      // Add members
      if (dto.memberIds?.length) {
        const members = await this.createQueueMembers(
          queryRunner.manager,
          savedQueue.id,
          dto.memberIds,
        );
        savedQueue.members = members;
      }

      await queryRunner.commitTransaction();

      // Sync to Asterisk
      await this.asteriskSync.createQueue(savedQueue);

      // Cache queue config
      await this.cacheQueueConfig(savedQueue);

      // Emit event
      this.eventEmitter.emit(
        'queue.created',
        new QueueCreatedEvent(savedQueue),
      );

      this.logger.log(`Queue created: ${savedQueue.id} - ${savedQueue.name}`);

      return savedQueue;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(tenantId: string, id: string, dto: UpdateQueueDto): Promise<Queue> {
    const queue = await this.findOne(tenantId, id);

    // Check name conflict
    if (dto.name && dto.name !== queue.name) {
      const existing = await this.queueRepo.findOne({
        where: { tenantId, name: dto.name },
      });
      if (existing) {
        throw new ConflictException(`Queue with name "${dto.name}" already exists`);
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update basic fields
      const updatedFields = {
        ...dto,
        updatedAt: new Date(),
      };
      delete updatedFields.skills;
      delete updatedFields.memberIds;

      await queryRunner.manager.update(Queue, id, updatedFields);

      // Update skills
      if (dto.skills !== undefined) {
        await queryRunner.manager.delete(QueueSkill, { queueId: id });
        if (dto.skills.length) {
          await this.createQueueSkills(queryRunner.manager, id, dto.skills);
        }
      }

      // Update members
      if (dto.memberIds !== undefined) {
        await queryRunner.manager.delete(QueueMember, { queueId: id });
        if (dto.memberIds.length) {
          await this.createQueueMembers(queryRunner.manager, id, dto.memberIds);
        }
      }

      await queryRunner.commitTransaction();

      // Fetch updated queue
      const updatedQueue = await this.findOne(tenantId, id);

      // Sync to Asterisk
      await this.asteriskSync.updateQueue(updatedQueue);

      // Update cache
      await this.cacheQueueConfig(updatedQueue);

      // Emit event
      this.eventEmitter.emit(
        'queue.updated',
        new QueueUpdatedEvent(updatedQueue, queue),
      );

      this.logger.log(`Queue updated: ${id}`);

      return updatedQueue;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const queue = await this.findOne(tenantId, id);

    // Check for active calls
    const activeCalls = await this.getActiveCallsInQueue(id);
    if (activeCalls > 0) {
      throw new ConflictException(
        `Cannot delete queue with ${activeCalls} active calls`,
      );
    }

    // Soft delete
    await this.queueRepo.update(id, {
      status: QueueStatus.DELETED,
      deletedAt: new Date(),
    });

    // Remove from Asterisk
    await this.asteriskSync.deleteQueue(queue);

    // Remove from cache
    await this.redis.del(`queue:config:${id}`);

    // Emit event
    this.eventEmitter.emit('queue.deleted', new QueueDeletedEvent(queue));

    this.logger.log(`Queue deleted: ${id}`);
  }

  async getQueueStats(tenantId: string, queueId: string): Promise<QueueStats> {
    const queue = await this.findOne(tenantId, queueId);

    // Get real-time stats from Asterisk
    const asteriskStats = await this.asteriskSync.getQueueStats(queue.asteriskQueueId);

    // Get historical stats from database
    const historicalStats = await this.getHistoricalStats(queueId);

    return {
      queueId,
      queueName: queue.name,
      // Real-time
      callsWaiting: asteriskStats.callsWaiting,
      agentsAvailable: asteriskStats.agentsAvailable,
      agentsBusy: asteriskStats.agentsBusy,
      agentsPaused: asteriskStats.agentsPaused,
      longestWaitTime: asteriskStats.longestWaitTime,
      // Today's stats
      callsOffered: historicalStats.callsOffered,
      callsAnswered: historicalStats.callsAnswered,
      callsAbandoned: historicalStats.callsAbandoned,
      avgWaitTime: historicalStats.avgWaitTime,
      avgHandleTime: historicalStats.avgHandleTime,
      serviceLevel: historicalStats.serviceLevel,
    };
  }

  private async createQueueSkills(
    manager: any,
    queueId: string,
    skills: { skillId: string; minLevel: number; required: boolean }[],
  ): Promise<QueueSkill[]> {
    const queueSkills = skills.map(skill =>
      this.queueSkillRepo.create({
        queueId,
        skillId: skill.skillId,
        minLevel: skill.minLevel,
        required: skill.required,
      }),
    );

    return manager.save(queueSkills);
  }

  private async createQueueMembers(
    manager: any,
    queueId: string,
    memberIds: string[],
  ): Promise<QueueMember[]> {
    const members = memberIds.map((userId, index) =>
      this.queueMemberRepo.create({
        queueId,
        agentId: userId,
        priority: index + 1,
        penalty: 0,
      }),
    );

    return manager.save(members);
  }

  private async cacheQueueConfig(queue: Queue): Promise<void> {
    const config = {
      id: queue.id,
      name: queue.name,
      asteriskQueueId: queue.asteriskQueueId,
      strategy: queue.strategy,
      timeout: queue.timeout,
      wrapupTime: queue.wrapupTime,
      maxWaitTime: queue.maxWaitTime,
      skills: queue.skills?.map(qs => ({
        skillId: qs.skillId,
        minLevel: qs.minLevel,
        required: qs.required,
      })),
      memberIds: queue.members?.map(m => m.agentId),
    };

    await this.redis.set(
      `queue:config:${queue.id}`,
      JSON.stringify(config),
      'EX',
      3600, // 1 hour cache
    );
  }

  private generateAsteriskQueueId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  private async getActiveCallsInQueue(queueId: string): Promise<number> {
    const count = await this.redis.scard(`queue:${queueId}:waiting`);
    return count || 0;
  }

  private async getHistoricalStats(queueId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.dataSource.query(`
      SELECT 
        COUNT(*) as calls_offered,
        COUNT(CASE WHEN answered_at IS NOT NULL THEN 1 END) as calls_answered,
        COUNT(CASE WHEN abandoned_at IS NOT NULL THEN 1 END) as calls_abandoned,
        AVG(EXTRACT(EPOCH FROM (answered_at - queued_at))) as avg_wait_time,
        AVG(EXTRACT(EPOCH FROM (ended_at - answered_at))) as avg_handle_time
      FROM calls
      WHERE queue_id = $1 AND created_at >= $2
    `, [queueId, today]);

    const stats = result[0] || {};
    const answered = stats.calls_answered || 0;
    const offered = stats.calls_offered || 1;

    return {
      callsOffered: parseInt(stats.calls_offered) || 0,
      callsAnswered: answered,
      callsAbandoned: parseInt(stats.calls_abandoned) || 0,
      avgWaitTime: parseFloat(stats.avg_wait_time) || 0,
      avgHandleTime: parseFloat(stats.avg_handle_time) || 0,
      serviceLevel: (answered / offered) * 100,
    };
  }
}

interface QueueStats {
  queueId: string;
  queueName: string;
  callsWaiting: number;
  agentsAvailable: number;
  agentsBusy: number;
  agentsPaused: number;
  longestWaitTime: number;
  callsOffered: number;
  callsAnswered: number;
  callsAbandoned: number;
  avgWaitTime: number;
  avgHandleTime: number;
  serviceLevel: number;
}
```

Database Schema (already defined):
- queues table
- queue_skills table
- queue_members table

Events Emitted:
- queue.created
- queue.updated
- queue.deleted

Dependencies:
- AsteriskQueueSyncService (syncs to Asterisk)
- RedisService (caching)
- EventEmitter2

Acceptance Criteria:
- CRUD operations for queues
- Skills-based configuration
- Member assignment with priority
- Asterisk sync on all changes
- Real-time stats from Asterisk
- Historical stats from database
- Cache invalidation on updates
- No hardcoded values''',
        95, 4, 8, 'Backend,Queue'))

    # Task: Skill Management
    items.append(create_item(
        'Task: Implement Skills Management with Agent Assignment',
        'Task', epic, 'High',
        '''File: packages/backend/src/modules/queues/services/skill.service.ts

```typescript
import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Skill } from '../entities/skill.entity';
import { AgentSkill } from '../entities/agent-skill.entity';
import { CreateSkillDto, UpdateSkillDto, AssignSkillDto } from '../dto';

@Injectable()
export class SkillService {
  private readonly logger = new Logger(SkillService.name);

  constructor(
    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
    @InjectRepository(AgentSkill)
    private readonly agentSkillRepo: Repository<AgentSkill>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(tenantId: string): Promise<Skill[]> {
    return this.skillRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Skill> {
    const skill = await this.skillRepo.findOne({
      where: { id, tenantId },
    });

    if (!skill) {
      throw new NotFoundException(`Skill ${id} not found`);
    }

    return skill;
  }

  async create(tenantId: string, dto: CreateSkillDto): Promise<Skill> {
    const existing = await this.skillRepo.findOne({
      where: { tenantId, name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Skill "${dto.name}" already exists`);
    }

    const skill = this.skillRepo.create({
      ...dto,
      tenantId,
    });

    return this.skillRepo.save(skill);
  }

  async update(tenantId: string, id: string, dto: UpdateSkillDto): Promise<Skill> {
    const skill = await this.findOne(tenantId, id);

    if (dto.name && dto.name !== skill.name) {
      const existing = await this.skillRepo.findOne({
        where: { tenantId, name: dto.name },
      });
      if (existing) {
        throw new ConflictException(`Skill "${dto.name}" already exists`);
      }
    }

    Object.assign(skill, dto);
    return this.skillRepo.save(skill);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const skill = await this.findOne(tenantId, id);

    // Check if skill is in use
    const usageCount = await this.dataSource.query(`
      SELECT 
        (SELECT COUNT(*) FROM agent_skills WHERE skill_id = $1) +
        (SELECT COUNT(*) FROM queue_skills WHERE skill_id = $1) as usage_count
    `, [id]);

    if (usageCount[0]?.usage_count > 0) {
      throw new ConflictException(
        'Cannot delete skill that is assigned to agents or queues',
      );
    }

    await this.skillRepo.delete(id);
  }

  async assignToAgent(
    tenantId: string,
    agentId: string,
    dto: AssignSkillDto,
  ): Promise<AgentSkill> {
    // Verify skill exists
    await this.findOne(tenantId, dto.skillId);

    // Check for existing assignment
    const existing = await this.agentSkillRepo.findOne({
      where: { agentId, skillId: dto.skillId },
    });

    if (existing) {
      // Update level
      existing.level = dto.level;
      return this.agentSkillRepo.save(existing);
    }

    // Create new assignment
    const agentSkill = this.agentSkillRepo.create({
      agentId,
      skillId: dto.skillId,
      level: dto.level,
    });

    return this.agentSkillRepo.save(agentSkill);
  }

  async removeFromAgent(
    tenantId: string,
    agentId: string,
    skillId: string,
  ): Promise<void> {
    await this.findOne(tenantId, skillId);
    await this.agentSkillRepo.delete({ agentId, skillId });
  }

  async getAgentSkills(agentId: string): Promise<AgentSkill[]> {
    return this.agentSkillRepo.find({
      where: { agentId },
      relations: ['skill'],
    });
  }

  async getAgentsWithSkill(
    tenantId: string,
    skillId: string,
    minLevel?: number,
  ): Promise<AgentSkill[]> {
    await this.findOne(tenantId, skillId);

    const query = this.agentSkillRepo
      .createQueryBuilder('as')
      .innerJoinAndSelect('as.agent', 'agent')
      .where('as.skillId = :skillId', { skillId })
      .andWhere('agent.tenantId = :tenantId', { tenantId });

    if (minLevel !== undefined) {
      query.andWhere('as.level >= :minLevel', { minLevel });
    }

    return query.orderBy('as.level', 'DESC').getMany();
  }
}
```

File: packages/backend/src/modules/queues/dto/skill.dto.ts

```typescript
import { IsString, IsInt, IsOptional, Min, Max, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSkillDto {
  @ApiProperty({ example: 'Spanish', description: 'Skill name' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: 'Spanish language proficiency' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;
}

export class UpdateSkillDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;
}

export class AssignSkillDto {
  @ApiProperty({ description: 'Skill ID to assign' })
  @IsString()
  skillId: string;

  @ApiProperty({ example: 5, description: 'Proficiency level 1-10' })
  @IsInt()
  @Min(1)
  @Max(10)
  level: number;
}
```

File: packages/backend/src/modules/queues/entities/skill.entity.ts

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('skills')
@Index(['tenantId', 'name'], { unique: true })
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 200, nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

File: packages/backend/src/modules/queues/entities/agent-skill.entity.ts

```typescript
import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Skill } from './skill.entity';
import { User } from '../../users/entities/user.entity';

@Entity('agent_skills')
export class AgentSkill {
  @PrimaryColumn({ name: 'agent_id' })
  agentId: string;

  @PrimaryColumn({ name: 'skill_id' })
  skillId: string;

  @Column({ type: 'int', default: 5 })
  level: number; // 1-10 proficiency

  @ManyToOne(() => User)
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @ManyToOne(() => Skill)
  @JoinColumn({ name: 'skill_id' })
  skill: Skill;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;
}
```

API Endpoints:
- GET /skills - List all skills
- POST /skills - Create skill
- PATCH /skills/:id - Update skill
- DELETE /skills/:id - Delete skill
- POST /agents/:id/skills - Assign skill to agent
- DELETE /agents/:id/skills/:skillId - Remove skill
- GET /agents/:id/skills - Get agent skills

Acceptance Criteria:
- Skills CRUD with unique name per tenant
- Agent skill assignment with proficiency level (1-10)
- Cannot delete skill in use
- Skills used for queue routing
- All via Admin UI''',
        92, 3, 6, 'Backend,Skills'))

    # Task: Queue Routing Engine
    items.append(create_item(
        'Task: Implement Skills-Based Routing Engine',
        'Task', epic, 'High',
        '''File: packages/backend/src/modules/queues/services/routing-engine.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../redis/redis.service';
import { Queue } from '../entities/queue.entity';
import { QueueSkill } from '../entities/queue-skill.entity';
import { AgentSkill } from '../entities/agent-skill.entity';
import { AgentState, AgentStatus } from '../entities/agent-state.entity';
import { Call } from '../../calls/entities/call.entity';

export enum RoutingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_RECENT = 'least_recent',
  FEWEST_CALLS = 'fewest_calls',
  RANDOM = 'random',
  SKILLS_BASED = 'skills_based',
  PRIORITY = 'priority',
}

interface RoutingContext {
  call: Call;
  queue: Queue;
  requiredSkills: QueueSkill[];
  callerPriority?: number;
}

interface AgentScore {
  agentId: string;
  score: number;
  skillMatch: number;
  waitTime: number;
  callCount: number;
}

@Injectable()
export class RoutingEngineService {
  private readonly logger = new Logger(RoutingEngineService.name);

  constructor(
    @InjectRepository(AgentState)
    private readonly agentStateRepo: Repository<AgentState>,
    @InjectRepository(AgentSkill)
    private readonly agentSkillRepo: Repository<AgentSkill>,
    private readonly redis: RedisService,
  ) {}

  async findBestAgent(context: RoutingContext): Promise<string | null> {
    const { queue, requiredSkills } = context;

    // Get available agents in queue
    const availableAgents = await this.getAvailableAgentsInQueue(queue.id);

    if (availableAgents.length === 0) {
      this.logger.debug(`No available agents in queue ${queue.id}`);
      return null;
    }

    // Filter by skills if required
    let eligibleAgents = availableAgents;
    if (requiredSkills.length > 0) {
      eligibleAgents = await this.filterBySkills(availableAgents, requiredSkills);
      
      if (eligibleAgents.length === 0) {
        this.logger.debug(`No agents with required skills in queue ${queue.id}`);
        return null;
      }
    }

    // Apply routing strategy
    const selectedAgent = await this.applyStrategy(
      queue.strategy as RoutingStrategy,
      eligibleAgents,
      context,
    );

    if (selectedAgent) {
      this.logger.log(`Selected agent ${selectedAgent} for queue ${queue.name}`);
    }

    return selectedAgent;
  }

  private async getAvailableAgentsInQueue(queueId: string): Promise<AgentState[]> {
    return this.agentStateRepo
      .createQueryBuilder('state')
      .innerJoin('queue_members', 'qm', 'qm.agent_id = state.agent_id')
      .where('qm.queue_id = :queueId', { queueId })
      .andWhere('state.status = :status', { status: AgentStatus.AVAILABLE })
      .orderBy('qm.priority', 'ASC')
      .addOrderBy('qm.penalty', 'ASC')
      .getMany();
  }

  private async filterBySkills(
    agents: AgentState[],
    requiredSkills: QueueSkill[],
  ): Promise<AgentState[]> {
    const agentIds = agents.map(a => a.agentId);
    
    // Get agent skills
    const agentSkills = await this.agentSkillRepo
      .createQueryBuilder('as')
      .where('as.agentId IN (:...agentIds)', { agentIds })
      .getMany();

    // Group skills by agent
    const skillsByAgent = new Map<string, AgentSkill[]>();
    agentSkills.forEach(skill => {
      const existing = skillsByAgent.get(skill.agentId) || [];
      existing.push(skill);
      skillsByAgent.set(skill.agentId, existing);
    });

    // Filter agents who meet all required skills
    return agents.filter(agent => {
      const skills = skillsByAgent.get(agent.agentId) || [];
      
      return requiredSkills
        .filter(rs => rs.required)
        .every(required => {
          const agentSkill = skills.find(s => s.skillId === required.skillId);
          return agentSkill && agentSkill.level >= required.minLevel;
        });
    });
  }

  private async applyStrategy(
    strategy: RoutingStrategy,
    agents: AgentState[],
    context: RoutingContext,
  ): Promise<string | null> {
    switch (strategy) {
      case RoutingStrategy.ROUND_ROBIN:
        return this.roundRobin(agents, context.queue.id);

      case RoutingStrategy.LEAST_RECENT:
        return this.leastRecent(agents);

      case RoutingStrategy.FEWEST_CALLS:
        return this.fewestCalls(agents);

      case RoutingStrategy.RANDOM:
        return this.random(agents);

      case RoutingStrategy.SKILLS_BASED:
        return this.skillsBased(agents, context.requiredSkills);

      case RoutingStrategy.PRIORITY:
        return this.priority(agents);

      default:
        return this.roundRobin(agents, context.queue.id);
    }
  }

  private async roundRobin(agents: AgentState[], queueId: string): Promise<string | null> {
    const key = `queue:${queueId}:last_agent`;
    const lastAgentId = await this.redis.get(key);

    let selectedIndex = 0;
    if (lastAgentId) {
      const lastIndex = agents.findIndex(a => a.agentId === lastAgentId);
      selectedIndex = (lastIndex + 1) % agents.length;
    }

    const selected = agents[selectedIndex];
    await this.redis.set(key, selected.agentId, 'EX', 3600);

    return selected.agentId;
  }

  private leastRecent(agents: AgentState[]): string | null {
    // Sort by last call time (oldest first)
    const sorted = [...agents].sort((a, b) => {
      const aTime = a.lastCallAt?.getTime() || 0;
      const bTime = b.lastCallAt?.getTime() || 0;
      return aTime - bTime;
    });

    return sorted[0]?.agentId || null;
  }

  private async fewestCalls(agents: AgentState[]): Promise<string | null> {
    // Sort by call count today (fewest first)
    const sorted = [...agents].sort((a, b) => 
      (a.callsToday || 0) - (b.callsToday || 0)
    );

    return sorted[0]?.agentId || null;
  }

  private random(agents: AgentState[]): string | null {
    const index = Math.floor(Math.random() * agents.length);
    return agents[index]?.agentId || null;
  }

  private async skillsBased(
    agents: AgentState[],
    requiredSkills: QueueSkill[],
  ): Promise<string | null> {
    if (requiredSkills.length === 0) {
      return this.random(agents);
    }

    const agentIds = agents.map(a => a.agentId);
    
    // Get agent skills with levels
    const agentSkills = await this.agentSkillRepo
      .createQueryBuilder('as')
      .where('as.agentId IN (:...agentIds)', { agentIds })
      .andWhere('as.skillId IN (:...skillIds)', { 
        skillIds: requiredSkills.map(s => s.skillId) 
      })
      .getMany();

    // Calculate skill score for each agent
    const scores = agents.map(agent => {
      const skills = agentSkills.filter(s => s.agentId === agent.agentId);
      let totalScore = 0;

      requiredSkills.forEach(required => {
        const agentSkill = skills.find(s => s.skillId === required.skillId);
        if (agentSkill) {
          // Score = level * weight (required skills weighted higher)
          const weight = required.required ? 2 : 1;
          totalScore += agentSkill.level * weight;
        }
      });

      return { agentId: agent.agentId, score: totalScore };
    });

    // Sort by score (highest first)
    scores.sort((a, b) => b.score - a.score);

    return scores[0]?.agentId || null;
  }

  private priority(agents: AgentState[]): string | null {
    // Already sorted by priority from query
    return agents[0]?.agentId || null;
  }

  async reserveAgent(agentId: string, callId: string): Promise<boolean> {
    const lockKey = `agent:${agentId}:lock`;
    
    // Try to acquire lock
    const acquired = await this.redis.set(
      lockKey,
      callId,
      'EX', 30, // 30 second lock
      'NX', // Only if not exists
    );

    if (!acquired) {
      this.logger.debug(`Agent ${agentId} already reserved`);
      return false;
    }

    // Update agent state
    await this.agentStateRepo.update(
      { agentId },
      { 
        status: AgentStatus.RINGING,
        currentCallId: callId,
      },
    );

    return true;
  }

  async releaseAgent(agentId: string): Promise<void> {
    const lockKey = `agent:${agentId}:lock`;
    await this.redis.del(lockKey);
  }
}
```

Routing Strategies:
1. Round Robin - Rotate through agents
2. Least Recent - Agent with oldest last call
3. Fewest Calls - Agent with fewest calls today
4. Random - Random selection
5. Skills Based - Best skill match
6. Priority - By queue member priority

Features:
- Skills-based filtering with minimum levels
- Required vs optional skills
- Agent reservation with Redis locks
- Configurable per queue via Admin UI

Acceptance Criteria:
- All strategies work correctly
- Skills filtering respects min levels
- Agent reservation prevents double-assignment
- Strategy configurable per queue
- No hardcoded routing logic''',
        98, 5, 10, 'Backend,Routing,Skills'))

    return items

if __name__ == '__main__':
    generate_queue_config()

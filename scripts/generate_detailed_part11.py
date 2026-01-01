#!/usr/bin/env python3
"""
Part 11: Security & Multi-tenancy Implementation
"""
import sys
sys.path.insert(0, 'd:/Project/psitrix/psynq/scripts')
from generate_detailed_workitems import create_item, write_items

def generate_security():
    """Generate Security & Multi-tenancy detailed work items"""
    print("\nGenerating Security & Multi-tenancy...")
    items = []
    phase = 'Phase: Security & Compliance'
    
    # Epic: Multi-tenancy
    epic1 = 'Epic: Multi-tenant Architecture'
    items.append(create_item(epic1, 'Epic', phase, 'Immediate',
        '''Complete tenant isolation at all layers.

Isolation:
- Database: Row-level security with tenant_id
- API: Tenant context in JWT claims
- Storage: Separate paths per tenant
- Caching: Tenant-prefixed Redis keys
- Asterisk: Tenant-specific contexts

NO cross-tenant data leakage.''', 100, 28, labels='Security,Multi-tenant'))

    # Task: Tenant Guard
    items.append(create_item(
        'Task: Implement Tenant Context Guard and Decorator',
        'Task', epic1, 'Immediate',
        '''File: packages/backend/src/modules/auth/guards/tenant.guard.ts

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from '../../tenants/entities/tenant.entity';
import { SKIP_TENANT_CHECK } from '../decorators/skip-tenant.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if tenant check should be skipped
    const skipTenant = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_CHECK,
      [context.getHandler(), context.getClass()],
    );

    if (skipTenant) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!user.tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    // Verify tenant exists and is active
    const tenant = await this.tenantRepo.findOne({
      where: { id: user.tenantId },
      cache: { id: `tenant:${user.tenantId}`, milliseconds: 60000 },
    });

    if (!tenant) {
      this.logger.warn(`Tenant not found: ${user.tenantId}`);
      throw new ForbiddenException('Invalid tenant');
    }

    if (tenant.status !== TenantStatus.ACTIVE) {
      this.logger.warn(`Tenant not active: ${user.tenantId} (${tenant.status})`);
      throw new ForbiddenException(`Tenant is ${tenant.status}`);
    }

    // Check tenant suspension
    if (tenant.suspendedAt && tenant.suspendedAt <= new Date()) {
      throw new ForbiddenException('Tenant account is suspended');
    }

    // Add tenant to request for later use
    request.tenant = tenant;

    return true;
  }
}
```

File: packages/backend/src/modules/auth/decorators/tenant.decorator.ts

```typescript
import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Tenant } from '../../tenants/entities/tenant.entity';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Tenant => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenantId;
  },
);

export const SKIP_TENANT_CHECK = 'skipTenantCheck';
export const SkipTenantCheck = () => SetMetadata(SKIP_TENANT_CHECK, true);
```

File: packages/backend/src/modules/auth/interceptors/tenant-scope.interceptor.ts

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { DataSource } from 'typeorm';

@Injectable()
export class TenantScopeInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;

    if (tenantId) {
      // Set tenant context for row-level security
      await this.dataSource.query(
        `SET LOCAL app.current_tenant_id = '${tenantId}'`,
      );
    }

    return next.handle();
  }
}
```

File: deploy/db/10-row-level-security.sql

```sql
-- Enable Row Level Security on all tenant tables

-- Users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_users ON users
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_users_insert ON users
    FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Calls table
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_calls ON calls
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Queues table
ALTER TABLE queues ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_queues ON queues
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Campaigns table
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_campaigns ON campaigns
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Recordings table
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_recordings ON recordings
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Agent states table
ALTER TABLE agent_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_agent_states ON agent_states
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Skills table
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_skills ON skills
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Create function to automatically set tenant_id on insert
CREATE OR REPLACE FUNCTION set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := current_setting('app.current_tenant_id')::uuid;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tenant tables
CREATE TRIGGER set_tenant_users BEFORE INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER set_tenant_calls BEFORE INSERT ON calls
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER set_tenant_queues BEFORE INSERT ON queues
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER set_tenant_campaigns BEFORE INSERT ON campaigns
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER set_tenant_recordings BEFORE INSERT ON recordings
    FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
```

Usage in Controllers:
```typescript
@Controller('queues')
@UseGuards(JwtAuthGuard, TenantGuard)
@UseInterceptors(TenantScopeInterceptor)
export class QueuesController {
  @Get()
  findAll(@TenantId() tenantId: string) {
    // Automatically scoped to tenant
    return this.queuesService.findAll(tenantId);
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateQueueDto,
  ) {
    return this.queuesService.create(tenantId, dto);
  }
}
```

Security Layers:
1. JWT contains tenantId claim
2. TenantGuard verifies tenant is active
3. TenantScopeInterceptor sets PostgreSQL session variable
4. Row Level Security policies filter all queries
5. Insert triggers auto-set tenant_id

Acceptance Criteria:
- JWT includes tenantId claim
- All API endpoints validate tenant
- RLS policies on all tenant tables
- No cross-tenant data access possible
- Suspended tenants blocked
- No hardcoded tenant IDs''',
        100, 5, 10, 'Backend,Security,Multi-tenant'))

    # Epic: Role-Based Access Control
    epic2 = 'Epic: Role-Based Access Control (RBAC)'
    items.append(create_item(epic2, 'Epic', phase, 'High',
        '''Fine-grained permission system.

Roles:
- Super Admin (system-wide)
- Tenant Admin
- Supervisor
- Agent

Permissions:
- Resource-based (queues, campaigns, users)
- Action-based (read, create, update, delete)
- Scope-based (own, team, all)

Configurable per tenant via Admin UI.''', 95, 21, labels='Security,RBAC'))

    # Task: RBAC Implementation
    items.append(create_item(
        'Task: Implement Permission-Based RBAC System',
        'Task', epic2, 'High',
        '''File: packages/backend/src/modules/auth/guards/permissions.guard.ts

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { REQUIRED_PERMISSIONS } from '../decorators/permissions.decorator';
import { RedisService } from '../../redis/redis.service';

export interface RequiredPermission {
  resource: string;
  action: 'read' | 'create' | 'update' | 'delete' | 'manage';
  scope?: 'own' | 'team' | 'all';
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
      REQUIRED_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Super admin bypasses all checks
    if (user.isSuperAdmin) {
      return true;
    }

    // Get user's permissions (cached)
    const userPermissions = await this.getUserPermissions(user.id, user.roleIds);

    // Check each required permission
    for (const required of requiredPermissions) {
      const hasPermission = this.checkPermission(userPermissions, required, user, request);
      
      if (!hasPermission) {
        this.logger.warn(
          `Permission denied for user ${user.id}: ${required.resource}:${required.action}`,
        );
        throw new ForbiddenException(
          `Missing permission: ${required.resource}:${required.action}`,
        );
      }
    }

    return true;
  }

  private async getUserPermissions(
    userId: string,
    roleIds: string[],
  ): Promise<Permission[]> {
    const cacheKey = `user:${userId}:permissions`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const roles = await this.roleRepo.find({
      where: { id: In(roleIds) },
      relations: ['permissions'],
    });

    const permissions = roles.flatMap(role => role.permissions);
    
    // Deduplicate
    const unique = Array.from(
      new Map(permissions.map(p => [p.id, p])).values()
    );

    // Cache for 5 minutes
    await this.redis.set(cacheKey, JSON.stringify(unique), 'EX', 300);

    return unique;
  }

  private checkPermission(
    userPermissions: Permission[],
    required: RequiredPermission,
    user: any,
    request: any,
  ): boolean {
    // Find matching permission
    const permission = userPermissions.find(
      p => p.resource === required.resource && 
           (p.action === required.action || p.action === 'manage'),
    );

    if (!permission) {
      return false;
    }

    // Check scope if specified
    if (required.scope && permission.scope !== 'all') {
      if (required.scope === 'all' && permission.scope !== 'all') {
        return false;
      }

      if (required.scope === 'team' && permission.scope === 'own') {
        return false;
      }

      // For 'own' scope, verify ownership
      if (permission.scope === 'own') {
        const resourceId = request.params.id;
        const ownerId = request.body?.createdBy || request.params.userId;
        
        if (ownerId && ownerId !== user.id) {
          return false;
        }
      }

      // For 'team' scope, verify team membership
      if (permission.scope === 'team') {
        const resourceTeamId = request.body?.teamId || request.params.teamId;
        
        if (resourceTeamId && !user.teamIds?.includes(resourceTeamId)) {
          return false;
        }
      }
    }

    return true;
  }
}
```

File: packages/backend/src/modules/auth/decorators/permissions.decorator.ts

```typescript
import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { RequiredPermission, PermissionsGuard } from '../guards/permissions.guard';

export const REQUIRED_PERMISSIONS = 'requiredPermissions';

export const RequirePermissions = (...permissions: RequiredPermission[]) =>
  applyDecorators(
    SetMetadata(REQUIRED_PERMISSIONS, permissions),
    UseGuards(PermissionsGuard),
  );

// Convenience decorators for common permissions
export const CanRead = (resource: string) =>
  RequirePermissions({ resource, action: 'read' });

export const CanCreate = (resource: string) =>
  RequirePermissions({ resource, action: 'create' });

export const CanUpdate = (resource: string) =>
  RequirePermissions({ resource, action: 'update' });

export const CanDelete = (resource: string) =>
  RequirePermissions({ resource, action: 'delete' });

export const CanManage = (resource: string) =>
  RequirePermissions({ resource, action: 'manage' });

// Scope-aware decorators
export const CanReadOwn = (resource: string) =>
  RequirePermissions({ resource, action: 'read', scope: 'own' });

export const CanReadTeam = (resource: string) =>
  RequirePermissions({ resource, action: 'read', scope: 'team' });

export const CanReadAll = (resource: string) =>
  RequirePermissions({ resource, action: 'read', scope: 'all' });
```

File: packages/backend/src/modules/auth/entities/role.entity.ts

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { Permission } from './permission.entity';

@Entity('roles')
@Index(['tenantId', 'name'], { unique: true })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string; // null = system role

  @Column({ length: 50 })
  name: string;

  @Column({ length: 200, nullable: true })
  description: string;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean; // System roles cannot be modified

  @ManyToMany(() => Permission, { eager: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id' },
    inverseJoinColumn: { name: 'permission_id' },
  })
  permissions: Permission[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

File: packages/backend/src/modules/auth/entities/permission.entity.ts

```typescript
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('permissions')
@Index(['resource', 'action', 'scope'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  resource: string; // e.g., 'queues', 'campaigns', 'users'

  @Column({ length: 20 })
  action: string; // 'read', 'create', 'update', 'delete', 'manage'

  @Column({ length: 20, default: 'all' })
  scope: string; // 'own', 'team', 'all'

  @Column({ length: 100, nullable: true })
  description: string;
}
```

Seed Data:
```sql
-- System permissions
INSERT INTO permissions (id, resource, action, scope, description) VALUES
  (gen_random_uuid(), 'users', 'read', 'all', 'View all users'),
  (gen_random_uuid(), 'users', 'read', 'team', 'View team users'),
  (gen_random_uuid(), 'users', 'create', 'all', 'Create users'),
  (gen_random_uuid(), 'users', 'update', 'all', 'Update users'),
  (gen_random_uuid(), 'users', 'delete', 'all', 'Delete users'),
  (gen_random_uuid(), 'queues', 'manage', 'all', 'Full queue access'),
  (gen_random_uuid(), 'queues', 'read', 'all', 'View queues'),
  (gen_random_uuid(), 'campaigns', 'manage', 'all', 'Full campaign access'),
  (gen_random_uuid(), 'campaigns', 'read', 'all', 'View campaigns'),
  (gen_random_uuid(), 'recordings', 'read', 'all', 'Listen to recordings'),
  (gen_random_uuid(), 'recordings', 'read', 'team', 'Listen to team recordings'),
  (gen_random_uuid(), 'recordings', 'read', 'own', 'Listen to own recordings'),
  (gen_random_uuid(), 'reports', 'read', 'all', 'View all reports'),
  (gen_random_uuid(), 'reports', 'create', 'all', 'Generate reports'),
  (gen_random_uuid(), 'settings', 'manage', 'all', 'Manage settings');

-- System roles
INSERT INTO roles (id, name, description, is_system) VALUES
  (gen_random_uuid(), 'Admin', 'Full system access', true),
  (gen_random_uuid(), 'Supervisor', 'Team management access', true),
  (gen_random_uuid(), 'Agent', 'Basic agent access', true);
```

Usage in Controllers:
```typescript
@Controller('campaigns')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CampaignsController {
  @Get()
  @CanRead('campaigns')
  findAll(@TenantId() tenantId: string) {
    return this.campaignsService.findAll(tenantId);
  }

  @Post()
  @CanCreate('campaigns')
  create(@TenantId() tenantId: string, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(tenantId, dto);
  }

  @Delete(':id')
  @CanDelete('campaigns')
  delete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.campaignsService.delete(tenantId, id);
  }
}
```

Acceptance Criteria:
- All endpoints protected by permissions
- Permission caching for performance
- Scope-based filtering works
- Custom roles can be created per tenant
- System roles cannot be modified
- No hardcoded role checks''',
        97, 5, 10, 'Backend,Security,RBAC'))

    # Epic: Audit Logging
    epic3 = 'Epic: Audit Logging'
    items.append(create_item(epic3, 'Epic', phase, 'High',
        '''Complete audit trail for compliance.

Logged Events:
- Authentication (login, logout, failed)
- Data access (view sensitive data)
- Data changes (create, update, delete)
- Admin actions (config changes)
- Recording access

Features:
- Immutable log storage
- Searchable audit viewer
- Export for compliance
- Retention policies''', 90, 14, labels='Security,Audit'))

    # Task: Audit Service
    items.append(create_item(
        'Task: Implement Audit Logging Service',
        'Task', epic3, 'High',
        '''File: packages/backend/src/modules/audit/audit.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AuditLog, AuditAction, AuditResource } from './entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditRepo.create({
      ...dto,
      timestamp: new Date(),
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
    });

    // Use raw query to bypass RLS (audit logs should always be written)
    const result = await this.dataSource.query(
      `INSERT INTO audit_logs 
        (tenant_id, user_id, action, resource, resource_id, details, ip_address, user_agent, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        dto.tenantId,
        dto.userId,
        dto.action,
        dto.resource,
        dto.resourceId,
        JSON.stringify(dto.details || {}),
        dto.ipAddress,
        dto.userAgent,
        new Date(),
      ],
    );

    return result[0];
  }

  // Convenience methods for common audit events

  async logLogin(
    tenantId: string,
    userId: string,
    success: boolean,
    ipAddress: string,
    userAgent: string,
    details?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: success ? AuditAction.LOGIN : AuditAction.LOGIN_FAILED,
      resource: AuditResource.AUTH,
      details: {
        success,
        ...details,
      },
      ipAddress,
      userAgent,
    });
  }

  async logLogout(
    tenantId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: AuditAction.LOGOUT,
      resource: AuditResource.AUTH,
      ipAddress,
      userAgent,
    });
  }

  async logCreate(
    tenantId: string,
    userId: string,
    resource: AuditResource,
    resourceId: string,
    details: Record<string, any>,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: AuditAction.CREATE,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
    });
  }

  async logUpdate(
    tenantId: string,
    userId: string,
    resource: AuditResource,
    resourceId: string,
    before: Record<string, any>,
    after: Record<string, any>,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: AuditAction.UPDATE,
      resource,
      resourceId,
      details: {
        before,
        after,
        changes: this.computeChanges(before, after),
      },
      ipAddress,
      userAgent,
    });
  }

  async logDelete(
    tenantId: string,
    userId: string,
    resource: AuditResource,
    resourceId: string,
    deletedData: Record<string, any>,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: AuditAction.DELETE,
      resource,
      resourceId,
      details: { deletedData },
      ipAddress,
      userAgent,
    });
  }

  async logRecordingAccess(
    tenantId: string,
    userId: string,
    recordingId: string,
    action: 'playback' | 'download',
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: AuditAction.ACCESS,
      resource: AuditResource.RECORDING,
      resourceId: recordingId,
      details: { accessType: action },
      ipAddress,
      userAgent,
    });
  }

  async logConfigChange(
    tenantId: string,
    userId: string,
    configKey: string,
    before: any,
    after: any,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: AuditAction.CONFIG_CHANGE,
      resource: AuditResource.SETTINGS,
      details: {
        key: configKey,
        before,
        after,
      },
      ipAddress,
      userAgent,
    });
  }

  // Query methods

  async findAll(
    tenantId: string,
    filters: {
      userId?: string;
      action?: AuditAction;
      resource?: AuditResource;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: AuditLog[]; total: number }> {
    const query = this.auditRepo
      .createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId })
      .orderBy('log.timestamp', 'DESC');

    if (filters.userId) {
      query.andWhere('log.userId = :userId', { userId: filters.userId });
    }

    if (filters.action) {
      query.andWhere('log.action = :action', { action: filters.action });
    }

    if (filters.resource) {
      query.andWhere('log.resource = :resource', { resource: filters.resource });
    }

    if (filters.startDate) {
      query.andWhere('log.timestamp >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('log.timestamp <= :endDate', { endDate: filters.endDate });
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const [data, total] = await query
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  private computeChanges(
    before: Record<string, any>,
    after: Record<string, any>,
  ): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {};

    const allKeys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ]);

    for (const key of allKeys) {
      if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) {
        changes[key] = {
          from: before?.[key],
          to: after?.[key],
        };
      }
    }

    return changes;
  }
}
```

File: packages/backend/src/modules/audit/entities/audit-log.entity.ts

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  LOGIN = 'login',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  ACCESS = 'access',
  CONFIG_CHANGE = 'config_change',
  EXPORT = 'export',
}

export enum AuditResource {
  AUTH = 'auth',
  USER = 'user',
  QUEUE = 'queue',
  CAMPAIGN = 'campaign',
  CALL = 'call',
  RECORDING = 'recording',
  REPORT = 'report',
  SETTINGS = 'settings',
  ROLE = 'role',
}

@Entity('audit_logs')
@Index(['tenantId', 'timestamp'])
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'resource', 'resourceId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'enum', enum: AuditResource })
  resource: AuditResource;

  @Column({ name: 'resource_id', nullable: true })
  resourceId: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ type: 'timestamp with time zone' })
  timestamp: Date;
}
```

Database Schema:
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX idx_audit_tenant_time ON audit_logs(tenant_id, timestamp DESC);
CREATE INDEX idx_audit_tenant_user ON audit_logs(tenant_id, user_id);
CREATE INDEX idx_audit_tenant_resource ON audit_logs(tenant_id, resource, resource_id);

-- Partitioning by month for large installations
CREATE TABLE audit_logs_partitioned (
    LIKE audit_logs INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Auto-create monthly partitions
CREATE OR REPLACE FUNCTION create_audit_partition()
RETURNS void AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
BEGIN
    partition_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
    partition_name := 'audit_logs_' || TO_CHAR(partition_date, 'YYYY_MM');
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs_partitioned
         FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        partition_date,
        partition_date + INTERVAL '1 month'
    );
END;
$$ LANGUAGE plpgsql;
```

Features:
- Immutable (INSERT only, no UPDATE/DELETE)
- Bypass RLS for system writes
- Change tracking (before/after diff)
- IP and user agent capture
- Searchable by all fields
- Monthly partitioning for scale

Acceptance Criteria:
- All CRUD operations logged
- Authentication events logged
- Recording access logged
- Config changes logged
- Logs cannot be modified
- Export for compliance audits
- 1+ year retention''',
        95, 4, 8, 'Backend,Security,Audit'))

    return items

if __name__ == '__main__':
    generate_security()

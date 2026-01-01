# Canonical Security & Permission Matrix - Psynq CPaaS Platform

**Version**: 1.0.0
**Last Updated**: December 31, 2025
**Status**: SINGLE SOURCE OF TRUTH
**Purpose**: Complete RBAC model with all permissions

---

## Role Definitions

### 1. SuperAdmin
- **Scope**: System-wide access
- **Can**: Create/delete organizations, manage all users, view all data, system configuration
- **Restrictions**: None

### 2. Admin
- **Scope**: Single organization
- **Can**: Manage organization settings, users, queues, phone numbers, billing
- **Restrictions**: Cannot delete organization, cannot access other organizations

### 3. Supervisor
- **Scope**: Team/queue level
- **Can**: Monitor team calls, view team analytics, manage queue members, assign tasks
- **Restrictions**: Cannot modify organization settings, cannot access billing

### 4. Agent
- **Scope**: Individual user
- **Can**: Handle assigned calls, view own recordings, update own preferences
- **Restrictions**: Cannot view other agents' data, cannot modify system settings

---

## Permission Matrix

### Resource: Organizations
| Permission | SuperAdmin | Admin | Supervisor | Agent |
|------------|------------|-------|------------|-------|
| organizations:view_own | ✅ | ✅ | ✅ | ✅ |
| organizations:view_all | ✅ | ❌ | ❌ | ❌ |
| organizations:create | ✅ | ❌ | ❌ | ❌ |
| organizations:update | ✅ | ✅ (own) | ❌ | ❌ |
| organizations:delete | ✅ | ❌ | ❌ | ❌ |
| organizations:manage_settings | ✅ | ✅ (own) | ❌ | ❌ |
| organizations:manage_wallet | ✅ | ✅ (own) | ❌ | ❌ |

### Resource: Users
| Permission | SuperAdmin | Admin | Supervisor | Agent |
|------------|------------|-------|------------|-------|
| users:view_own | ✅ | ✅ | ✅ | ✅ |
| users:view_team | ✅ | ✅ | ✅ | ❌ |
| users:view_all | ✅ | ✅ (own org) | ❌ | ❌ |
| users:create | ✅ | ✅ (own org) | ❌ | ❌ |
| users:update | ✅ | ✅ (own org) | ✅ (team) | ✅ (own) |
| users:delete | ✅ | ✅ (own org) | ❌ | ❌ |
| users:manage_permissions | ✅ | ✅ (own org) | ❌ | ❌ |

### Resource: Calls
| Permission | SuperAdmin | Admin | Supervisor | Agent |
|------------|------------|-------|------------|-------|
| calls:view_own | ✅ | ✅ | ✅ | ✅ |
| calls:view_team | ✅ | ✅ | ✅ | ❌ |
| calls:view_all | ✅ | ✅ (own org) | ❌ | ❌ |
| calls:create | ✅ | ✅ | ✅ | ✅ |
| calls:answer | ✅ | ✅ | ✅ | ✅ |
| calls:hangup | ✅ | ✅ | ✅ | ✅ |
| calls:hold | ✅ | ✅ | ✅ | ✅ |
| calls:transfer | ✅ | ✅ | ✅ | ✅ |
| calls:monitor | ✅ | ✅ | ✅ (team) | ❌ |
| calls:barge_in | ✅ | ❌ | ✅ (team) | ❌ |

### Resource: Recordings
| Permission | SuperAdmin | Admin | Supervisor | Agent |
|------------|------------|-------|------------|-------|
| recordings:view_own | ✅ | ✅ | ✅ | ✅ |
| recordings:view_team | ✅ | ✅ | ✅ | ❌ |
| recordings:view_all | ✅ | ✅ (own org) | ❌ | ❌ |
| recordings:delete | ✅ | ✅ (own org) | ❌ | ❌ |
| recordings:download | ✅ | ✅ | ✅ | ✅ |
| recordings:transcribe | ✅ | ✅ | ✅ | ✅ |

### Resource: Queues
| Permission | SuperAdmin | Admin | Supervisor | Agent |
|------------|------------|-------|------------|-------|
| queues:view_own | ✅ | ✅ | ✅ | ✅ |
| queues:create | ✅ | ✅ | ❌ | ❌ |
| queues:update | ✅ | ✅ | ✅ (assigned) | ❌ |
| queues:delete | ✅ | ✅ | ❌ | ❌ |
| queues:manage_members | ✅ | ✅ | ✅ (assigned) | ❌ |
| queues:view_stats | ✅ | ✅ | ✅ (assigned) | ✅ (own) |

### Resource: Phone Numbers
| Permission | SuperAdmin | Admin | Supervisor | Agent |
|------------|------------|-------|------------|-------|
| phone_numbers:view | ✅ | ✅ | ✅ | ✅ |
| phone_numbers:purchase | ✅ | ✅ | ❌ | ❌ |
| phone_numbers:update_routing | ✅ | ✅ | ❌ | ❌ |
| phone_numbers:release | ✅ | ✅ | ❌ | ❌ |

### Resource: SMS
| Permission | SuperAdmin | Admin | Supervisor | Agent |
|------------|------------|-------|------------|-------|
| sms:view_own | ✅ | ✅ | ✅ | ✅ |
| sms:view_team | ✅ | ✅ | ✅ | ❌ |
| sms:view_all | ✅ | ✅ (own org) | ❌ | ❌ |
| sms:create | ✅ | ✅ | ✅ | ✅ |
| sms:delete | ✅ | ✅ | ❌ | ❌ |

### Resource: CDR & Billing
| Permission | SuperAdmin | Admin | Supervisor | Agent |
|------------|------------|-------|------------|-------|
| cdr:export | ✅ | ✅ (own org) | ❌ | ❌ |
| cdr:view_own | ✅ | ✅ | ✅ | ✅ |
| cdr:view_team | ✅ | ✅ | ✅ | ❌ |
| cdr:view_all | ✅ | ✅ (own org) | ❌ | ❌ |
| billing:view | ✅ | ✅ (own org) | ❌ | ❌ |
| billing:topup | ✅ | ✅ (own org) | ❌ | ❌ |
| billing:refund | ✅ | ❌ | ❌ | ❌ |

### Resource: Analytics
| Permission | SuperAdmin | Admin | Supervisor | Agent |
|------------|------------|-------|------------|-------|
| analytics:view_own | ✅ | ✅ | ✅ | ✅ |
| analytics:view_team | ✅ | ✅ | ✅ | ❌ |
| analytics:view_all | ✅ | ✅ (own org) | ❌ | ❌ |

### Resource: System
| Permission | SuperAdmin | Admin | Supervisor | Agent |
|------------|------------|-------|------------|-------|
| system:configure | ✅ | ❌ | ❌ | ❌ |
| system:view_logs | ✅ | ❌ | ❌ | ❌ |
| system:manage_webhooks | ✅ | ✅ (own org) | ❌ | ❌ |

---

## Total Permission Count: 67

---

## Implementation Guide

### Check Permission Pattern
```typescript
async function hasPermission(
  userId: string,
  permission: string,
  resourceType?: string,
  resourceId?: string
): Promise<boolean> {
  const user = await this.usersRepo.findById(userId);
  
  // 1. Check role-based permission
  const rolePermissions = ROLE_PERMISSIONS[user.role];
  if (!rolePermissions.includes(permission)) {
    return false;
  }
  
  // 2. Check resource ownership
  if (resourceType && resourceId) {
    const hasAccess = await this.checkResourceAccess(
      userId,
      resourceType,
      resourceId
    );
    if (!hasAccess) {
      return false;
    }
  }
  
  // 3. Check explicit user permissions (overrides)
  const explicitPermission = await this.userPermissionsRepo.findOne({
    user_id: userId,
    permission,
    resource_type: resourceType,
    resource_id: resourceId,
    expires_at: MoreThan(new Date()),
  });
  
  return !!explicitPermission;
}
```

### Decorator Pattern
```typescript
@RequirePermission('calls:create')
async createCall(@CurrentUser() user: User, @Body() dto: CreateCallDto) {
  // Controller logic
}
```

---

**See OpenProject Work Package**: #Security Model (complete 67 permission definitions)

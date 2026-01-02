/**
 * Authentication Entity Documentation
 * 
 * The authentication system uses the UserEntity from src/entities/user.entity.ts
 * as its primary entity. There is no separate "Auth" entity because user
 * authentication and authorization are properties of the User itself.
 * 
 * ## Entity Mapping
 * 
 * - **Database Entity**: UserEntity (src/entities/user.entity.ts)
 * - **Database Table**: `users` (PostgreSQL)
 * - **Domain Model**: AuthUser interface (src/auth/domain/authentication.entity.ts)
 * - **Repository Adapter**: TypeOrmAuthRepository (src/auth/adapters/typeorm-auth-repository.adapter.ts)
 * 
 * ## Database Schema (users table)
 * 
 * ```sql
 * Table "public.users"
 * 
 * Column               | Type                            | Nullable | Default
 * ---------------------+---------------------------------+----------+-------------------
 * id                   | uuid                            | NOT NULL | uuid_generate_v4()
 * username             | character varying               | NOT NULL | 
 * email                | character varying               | NULL     | 
 * password             | character varying               | NOT NULL | (bcrypt hashed)
 * firstName            | character varying               | NULL     | 
 * lastName             | character varying               | NULL     | 
 * phone                | character varying               | NULL     | 
 * organizationId       | uuid                            | NULL     | 
 * roles                | text                            | NOT NULL | '["agent"]'
 * primaryRole          | users_primaryrole_enum          | NULL     | 
 * status               | users_status_enum               | NOT NULL | 'offline'
 * skills               | text                            | NULL     | 
 * lastStatusChangedAt  | timestamp without time zone     | NOT NULL | now()
 * createdAt            | timestamp without time zone     | NOT NULL | now()
 * updatedAt            | timestamp without time zone     | NOT NULL | now()
 * 
 * Indexes:
 *   "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id)
 *   "UQ_97672ac88f789774dd47f7c8be3" UNIQUE CONSTRAINT (email)
 *   "UQ_fe0bb3f6520ee0469504521e710" UNIQUE CONSTRAINT (username)
 * 
 * Foreign Keys:
 *   "FK_f3d6aea8fcca58182b2e80ce979" FOREIGN KEY (organizationId) REFERENCES organizations(id)
 * ```
 * 
 * ## Authentication Fields
 * 
 * | Field | Type | Purpose | Constraints |
 * |-------|------|---------|-------------|
 * | id | UUID | Primary key, used in JWT payload | NOT NULL, PK |
 * | username | string | Unique login identifier | NOT NULL, UNIQUE |
 * | password | string | Bcrypt-hashed password (cost=10) | NOT NULL |
 * | email | string | Optional contact (for password reset) | NULLABLE, UNIQUE |
 * | roles | text | JSON array: ['agent', 'supervisor', 'admin', 'system_admin'] | NOT NULL, default: ['agent'] |
 * | status | enum | Agent status (available, busy, offline, break, etc.) | NOT NULL, default: 'offline' |
 * | organizationId | UUID | Tenant isolation (multi-tenancy) | NULLABLE, FK to organizations |
 * 
 * ## Hexagonal Architecture Mapping
 * 
 * ```
 * Domain Layer (Pure TypeScript)
 * ├── AuthUser interface - domain representation of authenticated user
 * ├── AuthTokens interface - JWT token pair (access + refresh)
 * └── Authentication entity - business rules & validation
 * 
 * Ports Layer (Contracts)
 * ├── IAuthRepository - data access contract
 * ├── IPasswordService - password hashing/verification contract
 * └── ITokenService - JWT generation/verification contract
 * 
 * Adapters Layer (Framework Integration)
 * ├── TypeOrmAuthRepository - converts UserEntity ↔ AuthUser
 * │   ├── Maps UserEntity to AuthUser domain model
 * │   └── Handles TypeORM-specific operations
 * ├── BcryptPasswordService - bcrypt password hashing
 * └── JwtTokenService - JWT token operations
 * 
 * Infrastructure (Database)
 * └── UserEntity - TypeORM entity mapping to 'users' table
 * ```
 * 
 * ## Design Rationale
 * 
 * We deliberately **do not** create a separate AuthEntity because:
 * 
 * 1. **Single Responsibility**: A user IS an authenticatable entity
 * 2. **Avoid Duplication**: Auth fields (username, password, roles) belong to User
 * 3. **KISS Principle**: Adding AuthEntity creates unnecessary complexity
 * 4. **Standard Practice**: Most frameworks use User as the auth entity
 * 5. **Database Normalization**: Auth data is inherent to user identity
 * 
 * ## Role-Based Access Control (RBAC)
 * 
 * ### Available Roles (UserRole enum)
 * 
 * - `agent` - Basic call agent (default role)
 * - `supervisor` - Can monitor and manage agents
 * - `admin` - Organization-level admin (manage users, settings)
 * - `system_admin` - Platform-level admin (all organizations)
 * 
 * ### Authorization Flow
 * 
 * 1. User logs in → JWT issued with `roles` claim
 * 2. Request arrives → JwtAuthGuard validates token
 * 3. Controller/Service → RolesGuard checks required roles
 * 4. Access granted/denied based on role match
 * 
 * ## Status Management (AgentStatus enum from @psynq/core)
 * 
 * Agent status values:
 * - `offline` - Not logged in or unavailable
 * - `available` - Ready to receive calls
 * - `busy` - On active call
 * - `break` - Temporary break
 * - `away` - Away from desk
 * - `training` - In training session
 * 
 * ## Related Files
 * 
 * - **Domain**: `src/auth/domain/authentication.entity.ts`
 * - **Database Entity**: `src/entities/user.entity.ts`
 * - **Repository Adapter**: `src/auth/adapters/typeorm-auth-repository.adapter.ts`
 * - **Use Cases**: `src/auth/application/*.usecase.ts`
 * - **Controller**: `src/auth/auth.controller.ts`
 * - **DTOs**: `src/auth/dto/*.dto.ts`
 * 
 * ## Migration Reference
 * 
 * The users table was created by TypeORM synchronization.
 * For schema changes, use:
 * 
 * ```bash
 * npm run migration:generate -- src/migrations/UpdateUserAuth
 * npm run migration:run
 * ```
 * 
 * Migration location: `src/migrations/`
 * Migration command: `migration:generate`, `migration:run`, `migration:revert`
 */

export {}; // Make this a module

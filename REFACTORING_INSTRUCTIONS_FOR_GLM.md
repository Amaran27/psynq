# Refactoring Instructions for GLM: Bridge & Channel Modules

**Date**: January 3, 2026  
**Target**: Bridge and Channel modules  
**Objective**: Refactor to proper hexagonal architecture following Auth/Campaign patterns  
**Priority**: HIGH - Technical debt cleanup before building new features

---

## 🎯 Executive Summary

The Bridge and Channel modules currently violate hexagonal architecture principles. They use the service-repository pattern with direct entity manipulation, which creates tight coupling, reduces testability, and makes the codebase unmaintainable.

**Your task**: Refactor Bridge and Channel modules to match the Architecture established in Authentication and Campaign modules.

---

## 📚 Required Reading: Reference Implementations

Before starting, study these COMPLETED implementations:

### ✅ Authentication Module (Perfect Example)
```
packages/backend/src/auth/
├── domain/
│   ├── authentication.entity.ts         # Pure TypeScript, NO imports
│   ├── password-reset-token.domain.ts   # Rich domain model with business logic
│   ├── email-verification-token.domain.ts
│   ├── session.domain.ts
│   └── failed-login-attempt.domain.ts
├── ports/
│   └── auth-repository.port.ts          # Interfaces using domain types ONLY
├── adapters/
│   └── typeorm-auth-repository.adapter.ts  # Entity↔Domain conversions
├── application/
│   ├── login.usecase.ts                 # Use cases orchestrate domain logic
│   ├── forgot-password.usecase.ts
│   ├── reset-password.usecase.ts
│   └── ...
└── auth.controller.ts                   # Thin HTTP layer
```

### ✅ Campaign Module (Perfect Example)
```
packages/backend/src/modules/campaign/
├── domain/
│   └── campaign.domain.ts               # 245 lines of pure TypeScript business logic
├── ports/
│   └── campaign-repository.port.ts
├── adapters/
│   └── typeorm-campaign-repository.adapter.ts
├── application/
│   ├── create-campaign.usecase.ts
│   ├── get-campaign.usecase.ts
│   ├── list-campaigns.usecase.ts
│   ├── update-campaign.usecase.ts
│   ├── delete-campaign.usecase.ts
│   └── start-campaign.usecase.ts
├── campaign.controller.ts               # Uses use cases, NOT service
└── campaign.module.ts                   # Proper DI configuration
```

**CRITICAL**: Read `AUTHENTICATION_HEXAGONAL_REFACTORING_CODE_REVIEW.md` for detailed review criteria.

---

## ❌ Current Implementation (VIOLATIONS)

### Bridge Service (packages/backend/src/modules/bridge/bridge.service.ts)

```typescript
// ❌ CURRENT - VIOLATES HEXAGONAL ARCHITECTURE
@Injectable()
export class BridgeService {
  constructor(
    @InjectRepository(BridgeEntity)           // ❌ Direct entity injection
    private readonly bridgeRepository: Repository<BridgeEntity>,  // ❌ TypeORM in service
    @Inject('TELEPHONY_PROVIDER')
    private readonly telephonyProvider: TelephonyPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async createBridge(dto: CreateBridgeDto): Promise<BridgeEntity> {
    // ❌ Business logic in service
    const bridgeId = `bridge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // ❌ Direct entity manipulation
    const bridge = this.bridgeRepository.create({
      id: bridgeId,
      name: dto.name,
      bridgeType: dto.bridgeType || BridgeType.MIXING,
      technology: dto.technology || BridgeTechnology.SOFTMIX,
      organizationId: dto.organizationId,
      channelIds: [],
      isRecording: false,
    });

    return await this.bridgeRepository.save(bridge);  // ❌ Infrastructure in domain layer
  }
}
```

**Violations**:
1. ❌ Service knows about TypeORM (infrastructure leakage)
2. ❌ Business logic in service (should be in domain)
3. ❌ Returns entities (should return domain models)
4. ❌ No separation of concerns
5. ❌ Not testable without database

---

## ✅ Target Implementation (HEXAGONAL ARCHITECTURE)

### Step 1: Create Bridge Domain Model

**File**: `packages/backend/src/modules/bridge/domain/bridge.domain.ts`

```typescript
/**
 * Bridge Domain Entity (Hexagonal Architecture)
 * 
 * Pure TypeScript - NO framework dependencies
 * Contains business logic and domain rules
 * 
 * CRITICAL RULES:
 * - NO NestJS imports
 * - NO TypeORM imports
 * - NO infrastructure imports
 * - Pure business logic ONLY
 */

export enum BridgeType {
  MIXING = 'mixing',
  HOLDING = 'holding',
  DTMF_EVENTS = 'dtmf_events',
  PROXY_MEDIA = 'proxy_media',
}

export enum BridgeTechnology {
  SIMPLE_BRIDGE = 'simple_bridge',
  SOFTMIX = 'softmix',
  HOLDING_BRIDGE = 'holding_bridge',
}

export enum BridgeStatus {
  ACTIVE = 'active',
  DESTROYED = 'destroyed',
}

/**
 * Domain Exception for Bridge business rule violations
 */
export class BridgeDomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BridgeDomainException';
  }
}

/**
 * Bridge Domain Entity
 * 
 * Rich domain model with business logic
 * Independent of infrastructure (database, framework)
 */
export class Bridge {
  constructor(
    public readonly id: string,
    public name: string,
    public bridgeType: BridgeType,
    public technology: BridgeTechnology,
    public organizationId: string | undefined,
    public channelIds: string[],
    public isRecording: boolean,
    public recordingName: string | undefined,
    public status: BridgeStatus,
    public readonly createdAt: Date,
    public destroyedAt: Date | undefined,
  ) {}

  /**
   * Business Logic: Add channel to bridge
   */
  addChannel(channelId: string): void {
    if (this.status === BridgeStatus.DESTROYED) {
      throw new BridgeDomainException('Cannot add channel to destroyed bridge');
    }

    if (this.channelIds.includes(channelId)) {
      // Idempotent: already added, do nothing
      return;
    }

    this.channelIds.push(channelId);
  }

  /**
   * Business Logic: Remove channel from bridge
   */
  removeChannel(channelId: string): void {
    const index = this.channelIds.indexOf(channelId);
    if (index > -1) {
      this.channelIds.splice(index, 1);
    }
  }

  /**
   * Business Logic: Start recording
   */
  startRecording(recordingName: string): void {
    if (this.status === BridgeStatus.DESTROYED) {
      throw new BridgeDomainException('Cannot record destroyed bridge');
    }

    if (this.isRecording) {
      throw new BridgeDomainException('Bridge is already recording');
    }

    this.isRecording = true;
    this.recordingName = recordingName;
  }

  /**
   * Business Logic: Stop recording
   */
  stopRecording(): void {
    if (!this.isRecording) {
      throw new BridgeDomainException('Bridge is not recording');
    }

    this.isRecording = false;
    // Keep recordingName for history
  }

  /**
   * Business Logic: Destroy bridge
   */
  destroy(): void {
    if (this.status === BridgeStatus.DESTROYED) {
      throw new BridgeDomainException('Bridge already destroyed');
    }

    this.status = BridgeStatus.DESTROYED;
    this.destroyedAt = new Date();
    this.isRecording = false;
  }

  /**
   * Business Logic: Check if bridge is active
   */
  isActive(): boolean {
    return this.status === BridgeStatus.ACTIVE;
  }

  /**
   * Business Logic: Get channel count
   */
  getChannelCount(): number {
    return this.channelIds.length;
  }

  /**
   * Factory Method: Create new bridge
   */
  static create(
    name: string,
    bridgeType: BridgeType,
    technology: BridgeTechnology,
    organizationId?: string,
  ): Bridge {
    const id = `bridge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return new Bridge(
      id,
      name,
      bridgeType,
      technology,
      organizationId,
      [], // empty channelIds
      false, // not recording
      undefined, // no recording name
      BridgeStatus.ACTIVE,
      new Date(),
      undefined, // not destroyed
    );
  }

  /**
   * Factory Method: Reconstitute from persistence
   */
  static fromPersistence(data: {
    id: string;
    name: string;
    bridgeType: BridgeType;
    technology: BridgeTechnology;
    organizationId?: string;
    channelIds: string[];
    isRecording: boolean;
    recordingName?: string;
    status: BridgeStatus;
    createdAt: Date;
    destroyedAt?: Date;
  }): Bridge {
    return new Bridge(
      data.id,
      data.name,
      data.bridgeType,
      data.technology,
      data.organizationId,
      data.channelIds || [],
      data.isRecording,
      data.recordingName,
      data.status,
      data.createdAt,
      data.destroyedAt,
    );
  }
}
```

---

### Step 2: Create Bridge Repository Port

**File**: `packages/backend/src/modules/bridge/ports/bridge-repository.port.ts`

```typescript
/**
 * Bridge Repository Port (Interface)
 * 
 * This is a PORT in hexagonal architecture.
 * Defines the contract for bridge data operations without implementation details.
 * 
 * CRITICAL RULES:
 * - Interface only (no implementation)
 * - NO framework imports
 * - Uses DOMAIN types only (Bridge, NOT BridgeEntity)
 */

import { Bridge } from '../domain/bridge.domain';

export const BRIDGE_REPOSITORY_PORT = Symbol('BRIDGE_REPOSITORY_PORT');

export interface BridgeRepositoryPort {
  /**
   * Save bridge (create or update)
   */
  save(bridge: Bridge): Promise<void>;

  /**
   * Find bridge by ID
   * Returns null if not found
   */
  findById(bridgeId: string): Promise<Bridge | null>;

  /**
   * Find active bridges (not destroyed)
   */
  findActiveBridges(organizationId?: string): Promise<Bridge[]>;

  /**
   * Find bridges by organization
   */
  findByOrganization(organizationId: string): Promise<Bridge[]>;

  /**
   * Delete bridge (hard delete)
   */
  delete(bridgeId: string): Promise<void>;

  /**
   * Check if bridge exists
   */
  exists(bridgeId: string): Promise<boolean>;
}
```

---

### Step 3: Create TypeORM Bridge Repository Adapter

**File**: `packages/backend/src/modules/bridge/adapters/typeorm-bridge-repository.adapter.ts`

```typescript
/**
 * TypeORM Bridge Repository Adapter
 * 
 * This is an ADAPTER in hexagonal architecture.
 * Implements the BridgeRepositoryPort interface using TypeORM.
 * 
 * CRITICAL RULES:
 * - Implements port interface
 * - Converts between Entity (infrastructure) and Domain (business logic)
 * - All TypeORM/NestJS imports allowed here (adapter layer)
 * - Must handle null/undefined conversions properly
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { BridgeEntity } from '../../../entities/bridge.entity';
import { BridgeRepositoryPort } from '../ports/bridge-repository.port';
import { Bridge, BridgeType, BridgeTechnology, BridgeStatus } from '../domain/bridge.domain';

@Injectable()
export class TypeOrmBridgeRepositoryAdapter implements BridgeRepositoryPort {
  constructor(
    @InjectRepository(BridgeEntity)
    private readonly repository: Repository<BridgeEntity>,
  ) {}

  async save(bridge: Bridge): Promise<void> {
    const entity = await this.repository.findOne({ where: { id: bridge.id } });

    if (entity) {
      // Update existing
      entity.name = bridge.name;
      entity.bridgeType = bridge.bridgeType as any;
      entity.technology = bridge.technology as any;
      entity.organizationId = bridge.organizationId;
      entity.channelIds = bridge.channelIds;
      entity.isRecording = bridge.isRecording;
      entity.recordingName = bridge.recordingName;
      entity.destroyedAt = bridge.destroyedAt;
      
      await this.repository.save(entity);
    } else {
      // Create new
      const newEntity = this.repository.create({
        id: bridge.id,
        name: bridge.name,
        bridgeType: bridge.bridgeType as any,
        technology: bridge.technology as any,
        organizationId: bridge.organizationId,
        channelIds: bridge.channelIds,
        isRecording: bridge.isRecording,
        recordingName: bridge.recordingName,
        createdAt: bridge.createdAt,
        destroyedAt: bridge.destroyedAt,
      });
      
      await this.repository.save(newEntity);
    }
  }

  async findById(bridgeId: string): Promise<Bridge | null> {
    const entity = await this.repository.findOne({
      where: { id: bridgeId },
    });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  async findActiveBridges(organizationId?: string): Promise<Bridge[]> {
    const query = this.repository.createQueryBuilder('bridge')
      .where('bridge.destroyedAt IS NULL');

    if (organizationId) {
      query.andWhere('bridge.organizationId = :organizationId', { organizationId });
    }

    const entities = await query.getMany();
    return entities.map(e => this.toDomain(e));
  }

  async findByOrganization(organizationId: string): Promise<Bridge[]> {
    const entities = await this.repository.find({
      where: { organizationId },
    });

    return entities.map(e => this.toDomain(e));
  }

  async delete(bridgeId: string): Promise<void> {
    await this.repository.delete(bridgeId);
  }

  async exists(bridgeId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id: bridgeId } });
    return count > 0;
  }

  /**
   * Convert TypeORM Entity to Domain Model
   * Handle null/undefined conversions properly
   */
  private toDomain(entity: BridgeEntity): Bridge {
    return Bridge.fromPersistence({
      id: entity.id,
      name: entity.name,
      bridgeType: entity.bridgeType as BridgeType,
      technology: entity.technology as BridgeTechnology,
      organizationId: entity.organizationId,
      channelIds: entity.channelIds || [],
      isRecording: entity.isRecording,
      recordingName: entity.recordingName,
      status: entity.destroyedAt ? BridgeStatus.DESTROYED : BridgeStatus.ACTIVE,
      createdAt: entity.createdAt,
      destroyedAt: entity.destroyedAt,
    });
  }
}
```

---

### Step 4: Create Use Cases

**File**: `packages/backend/src/modules/bridge/application/create-bridge.usecase.ts`

```typescript
/**
 * Create Bridge Use Case (Application Layer)
 * 
 * This is the APPLICATION layer in hexagonal architecture.
 * Orchestrates domain logic and infrastructure.
 * 
 * CRITICAL RULES:
 * - Depends on PORTS (interfaces), not adapters
 * - Uses DOMAIN models, not entities
 * - Business logic delegated to domain
 */

import { Injectable, Inject } from '@nestjs/common';
import { BRIDGE_REPOSITORY_PORT, BridgeRepositoryPort } from '../ports/bridge-repository.port';
import { Bridge, BridgeType, BridgeTechnology } from '../domain/bridge.domain';
import { EventBusPort } from '../../../ports/event-bus.port';

export interface CreateBridgeInput {
  name: string;
  bridgeType?: BridgeType;
  technology?: BridgeTechnology;
  organizationId?: string;
}

@Injectable()
export class CreateBridgeUseCase {
  constructor(
    @Inject(BRIDGE_REPOSITORY_PORT)
    private readonly repository: BridgeRepositoryPort,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(input: CreateBridgeInput): Promise<Bridge> {
    // Domain logic creates the bridge
    const bridge = Bridge.create(
      input.name,
      input.bridgeType || BridgeType.MIXING,
      input.technology || BridgeTechnology.SOFTMIX,
      input.organizationId,
    );

    // Persist via repository port
    await this.repository.save(bridge);

    // Publish event
    await this.eventBus.publish({
      type: 'bridge.created',
      timestamp: new Date(),
      organizationId: input.organizationId || 'system',
      payload: { bridgeId: bridge.id },
    });

    return bridge;
  }
}
```

**Additional Use Cases to Create**:
- `get-bridge.usecase.ts`
- `list-bridges.usecase.ts`
- `add-channel-to-bridge.usecase.ts`
- `remove-channel-from-bridge.usecase.ts`
- `start-recording.usecase.ts`
- `stop-recording.usecase.ts`
- `destroy-bridge.usecase.ts`

---

### Step 5: Update Bridge Controller

**File**: `packages/backend/src/modules/bridge/bridge.controller.ts`

```typescript
/**
 * Bridge Controller (Hexagonal Architecture)
 * 
 * THIN CONTROLLER - only HTTP concerns
 * Business logic lives in Use Cases and Domain
 * 
 * Flow: HTTP Request → Controller → Use Case → Domain/Repository → Response
 */

import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CreateBridgeUseCase } from './application/create-bridge.usecase';
import { GetBridgeUseCase } from './application/get-bridge.usecase';
import { ListBridgesUseCase } from './application/list-bridges.usecase';
import { AddChannelToBridgeUseCase } from './application/add-channel-to-bridge.usecase';
import { DestroyBridgeUseCase } from './application/destroy-bridge.usecase';
import { Bridge } from './domain/bridge.domain';
import { CreateBridgeDto, BridgeResponseDto } from '../../dtos/bridge.dto';

@ApiTags('Bridges')
@Controller('bridges')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BridgeController {
  constructor(
    private readonly createBridgeUseCase: CreateBridgeUseCase,
    private readonly getBridgeUseCase: GetBridgeUseCase,
    private readonly listBridgesUseCase: ListBridgesUseCase,
    private readonly addChannelUseCase: AddChannelToBridgeUseCase,
    private readonly destroyBridgeUseCase: DestroyBridgeUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bridge' })
  @ApiResponse({ status: 201, description: 'Bridge created', type: BridgeResponseDto })
  async createBridge(@Body() dto: CreateBridgeDto): Promise<BridgeResponseDto> {
    const bridge = await this.createBridgeUseCase.execute(dto);
    return this.toResponseDto(bridge);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bridge by ID' })
  @ApiResponse({ status: 200, description: 'Bridge details', type: BridgeResponseDto })
  async getBridge(@Param('id') id: string): Promise<BridgeResponseDto> {
    const bridge = await this.getBridgeUseCase.execute(id);
    return this.toResponseDto(bridge);
  }

  // ... other endpoints

  /**
   * Helper to convert domain Bridge to Response DTO
   */
  private toResponseDto(bridge: Bridge): BridgeResponseDto {
    return {
      id: bridge.id,
      name: bridge.name,
      bridgeType: bridge.bridgeType as any,
      technology: bridge.technology as any,
      organizationId: bridge.organizationId,
      channelIds: bridge.channelIds,
      channelCount: bridge.getChannelCount(),
      isRecording: bridge.isRecording,
      recordingName: bridge.recordingName,
      isActive: bridge.isActive(),
      createdAt: bridge.createdAt,
      destroyedAt: bridge.destroyedAt,
    };
  }
}
```

---

### Step 6: Update Bridge Module

**File**: `packages/backend/src/modules/bridge/bridge.module.ts`

```typescript
/**
 * Bridge Module (Hexagonal Architecture)
 * 
 * Wires together:
 * - Domain (pure TypeScript entities with business logic)
 * - Ports (interfaces)
 * - Adapters (TypeORM implementations)
 * - Application (use cases)
 * - Controller (HTTP layer)
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BridgeController } from './bridge.controller';
import { BridgeEntity } from '../../entities/bridge.entity';
import { EventBusModule } from '../event-bus/event-bus.module';
import { BRIDGE_REPOSITORY_PORT } from './ports/bridge-repository.port';
import { TypeOrmBridgeRepositoryAdapter } from './adapters/typeorm-bridge-repository.adapter';
import { CreateBridgeUseCase } from './application/create-bridge.usecase';
import { GetBridgeUseCase } from './application/get-bridge.usecase';
import { ListBridgesUseCase } from './application/list-bridges.usecase';
import { AddChannelToBridgeUseCase } from './application/add-channel-to-bridge.usecase';
import { DestroyBridgeUseCase } from './application/destroy-bridge.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([BridgeEntity]),
    EventBusModule,
  ],
  controllers: [BridgeController],
  providers: [
    // Bind port to adapter
    {
      provide: BRIDGE_REPOSITORY_PORT,
      useClass: TypeOrmBridgeRepositoryAdapter,
    },
    // Register use cases
    CreateBridgeUseCase,
    GetBridgeUseCase,
    ListBridgesUseCase,
    AddChannelToBridgeUseCase,
    DestroyBridgeUseCase,
  ],
  exports: [
    // Export use cases for other modules
    CreateBridgeUseCase,
    GetBridgeUseCase,
    ListBridgesUseCase,
  ],
})
export class BridgeModule {}
```

---

## 🧪 Testing Requirements

### Unit Tests for Domain Model

**File**: `packages/backend/src/modules/bridge/domain/bridge.domain.spec.ts`

```typescript
import { Bridge, BridgeType, BridgeTechnology, BridgeDomainException } from './bridge.domain';

describe('Bridge Domain Model', () => {
  describe('create', () => {
    it('should create a new bridge with default values', () => {
      const bridge = Bridge.create('Test Bridge', BridgeType.MIXING, BridgeTechnology.SOFTMIX);
      
      expect(bridge.name).toBe('Test Bridge');
      expect(bridge.channelIds).toEqual([]);
      expect(bridge.isRecording).toBe(false);
      expect(bridge.isActive()).toBe(true);
    });
  });

  describe('addChannel', () => {
    it('should add channel to bridge', () => {
      const bridge = Bridge.create('Test', BridgeType.MIXING, BridgeTechnology.SOFTMIX);
      bridge.addChannel('channel-1');
      
      expect(bridge.channelIds).toContain('channel-1');
      expect(bridge.getChannelCount()).toBe(1);
    });

    it('should be idempotent (adding same channel twice)', () => {
      const bridge = Bridge.create('Test', BridgeType.MIXING, BridgeTechnology.SOFTMIX);
      bridge.addChannel('channel-1');
      bridge.addChannel('channel-1');
      
      expect(bridge.getChannelCount()).toBe(1);
    });

    it('should throw error when adding to destroyed bridge', () => {
      const bridge = Bridge.create('Test', BridgeType.MIXING, BridgeTechnology.SOFTMIX);
      bridge.destroy();
      
      expect(() => bridge.addChannel('channel-1')).toThrow(BridgeDomainException);
    });
  });

  // ... more tests
});
```

---

## ✅ Acceptance Criteria

Your refactoring is **APPROVED** when:

### 1. Architecture Compliance ✅
- [ ] Domain layer has ZERO framework imports (no NestJS, TypeORM)
- [ ] All business logic is in domain models
- [ ] Ports are pure interfaces with domain types
- [ ] Adapters handle entity↔domain conversions
- [ ] Use cases depend on ports, not adapters
- [ ] Controller is thin (HTTP only)

### 2. Code Quality ✅
- [ ] TypeScript compiles with zero errors
- [ ] No `any` types (except in narrow conversions)
- [ ] Proper null/undefined handling
- [ ] Rich domain models (not anemic)
- [ ] Clear separation of concerns

### 3. Testing ✅
- [ ] Domain model unit tests (pure functions, no DB)
- [ ] Use case tests (with mocked repository)
- [ ] Integration tests (with real DB)
- [ ] 100% code coverage on domain logic

### 4. Documentation ✅
- [ ] JSDoc comments on all public methods
- [ ] Architecture notes in file headers
- [ ] README updated with new structure

### 5. Functionality ✅
- [ ] All existing API endpoints still work
- [ ] All tests pass
- [ ] Backend compiles and starts
- [ ] No regressions

---

## 🚫 Common Mistakes to Avoid

### ❌ DO NOT:
1. Import NestJS decorators in domain models
2. Import TypeORM in domain models
3. Use entities in use cases (use domain models)
4. Put business logic in adapters
5. Put infrastructure code in domain
6. Return entities from use cases
7. Use `any` type unnecessarily
8. Skip null/undefined conversions

### ✅ DO:
1. Keep domain models pure TypeScript
2. Encapsulate business logic in domain
3. Use factory methods (`create`, `fromPersistence`)
4. Handle errors with domain exceptions
5. Convert at adapter boundaries (entity↔domain)
6. Test domain models without database
7. Follow SOLID principles
8. Match Authentication/Campaign patterns EXACTLY

---

## 📋 Channel Module Refactoring (After Bridge)

Once Bridge is complete, apply the SAME PATTERN to Channel:

**Channel Domain Model Should Have**:
- `ChannelState` enum (DOWN, RINGING, UP, etc.)
- `Channel` class with business logic:
  - `answer()` - Answer the channel
  - `hangup()` - Hang up the channel
  - `hold()` - Put channel on hold
  - `unhold()` - Take off hold
  - `isActive()` - Check if channel is active
  - `getDuration()` - Get call duration
- Factory methods: `create()`, `fromPersistence()`
- Domain exceptions for business rule violations

**Same Structure**:
```
packages/backend/src/modules/channel/
├── domain/channel.domain.ts
├── ports/channel-repository.port.ts
├── adapters/typeorm-channel-repository.adapter.ts
├── application/*.usecase.ts
├── channel.controller.ts
└── channel.module.ts
```

---

## 🎯 Summary Checklist

### Bridge Module Refactoring
- [ ] Create `bridge.domain.ts` (pure TypeScript, rich business logic)
- [ ] Create `bridge-repository.port.ts` (interface with domain types)
- [ ] Create `typeorm-bridge-repository.adapter.ts` (entity↔domain conversion)
- [ ] Create 7 use cases (Create, Get, List, AddChannel, RemoveChannel, StartRecording, Destroy)
- [ ] Update `bridge.controller.ts` (use use cases, return DTOs)
- [ ] Update `bridge.module.ts` (proper DI configuration)
- [ ] Delete `bridge.service.ts` (replaced by use cases)
- [ ] Write unit tests for domain model
- [ ] Write integration tests
- [ ] Verify all API endpoints work
- [ ] Run full test suite
- [ ] Commit with proper message

### Channel Module Refactoring (After Bridge)
- [ ] Same steps as Bridge
- [ ] Focus on call state management business logic
- [ ] Test hold/unhold, answer, hangup flows

---

## 📊 Expected Results

### Before Refactoring:
```
Bridge/Channel Modules:
- ❌ Tight coupling to TypeORM
- ❌ Business logic scattered
- ❌ Not testable without DB
- ❌ Violates SOLID principles
- ❌ Inconsistent with Auth/Campaign
```

### After Refactoring:
```
Bridge/Channel Modules:
- ✅ Pure domain models
- ✅ Business logic encapsulated
- ✅ Fully testable
- ✅ Follows SOLID principles
- ✅ Consistent architecture across codebase
- ✅ Ready for Dialing Engines to build on top
```

---

## 🚀 Start Command

**Begin with**: Bridge Module, Task 1 - Create `bridge.domain.ts`

**Reference**: Study `packages/backend/src/auth/domain/password-reset-token.domain.ts` as a perfect example.

**Time Estimate**: 
- Bridge refactoring: 2-3 hours
- Channel refactoring: 3-4 hours
- Total: 5-7 hours

---

## ❓ Questions or Issues?

If you encounter any issues:
1. Review `AUTHENTICATION_HEXAGONAL_REFACTORING_CODE_REVIEW.md`
2. Study Campaign domain model implementation
3. Check that domain has ZERO framework imports
4. Verify adapter handles all entity↔domain conversions
5. Ensure use cases depend on ports, not adapters

**Good luck! 🎯**

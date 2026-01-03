# GLM Refactoring Evaluation Checklist

**Purpose**: Use this to evaluate if GLM successfully refactored Bridge & Channel modules

---

## 🎯 Quick Validation Checklist

### ✅ Architecture Validation (CRITICAL)

#### Domain Layer Purity
```bash
# Run this command - should return 0 matches
grep -r "import.*from.*@nestjs" packages/backend/src/modules/bridge/domain/
grep -r "import.*from.*typeorm" packages/backend/src/modules/bridge/domain/
grep -r "import.*from.*@nestjs" packages/backend/src/modules/channel/domain/
grep -r "import.*from.*typeorm" packages/backend/src/modules/channel/domain/
```

**Expected Result**: No imports from NestJS or TypeORM in domain files

#### File Structure Check
```bash
# Bridge module structure
ls packages/backend/src/modules/bridge/domain/
ls packages/backend/src/modules/bridge/ports/
ls packages/backend/src/modules/bridge/adapters/
ls packages/backend/src/modules/bridge/application/

# Channel module structure  
ls packages/backend/src/modules/channel/domain/
ls packages/backend/src/modules/channel/ports/
ls packages/backend/src/modules/channel/adapters/
ls packages/backend/src/modules/channel/application/
```

**Expected Files**:
- `domain/bridge.domain.ts` (or channel.domain.ts)
- `ports/bridge-repository.port.ts`
- `adapters/typeorm-bridge-repository.adapter.ts`
- `application/*.usecase.ts` (multiple use case files)

---

## 📋 Detailed Review Criteria

### 1. Domain Model (bridge.domain.ts or channel.domain.ts)

**Check for**:
- [ ] NO framework imports (NestJS, TypeORM, etc.)
- [ ] Business logic methods (addChannel, removeChannel, destroy, etc.)
- [ ] Factory methods (create(), fromPersistence())
- [ ] Domain exceptions (BridgeDomainException or ChannelDomainException)
- [ ] Enums for domain concepts (BridgeType, ChannelState, etc.)
- [ ] Rich behavior (not anemic entities)

**Red Flags**:
- ❌ `import { Injectable } from '@nestjs/common'`
- ❌ `import { Entity, Column } from 'typeorm'`
- ❌ No business logic methods
- ❌ Just a data container (anemic model)

---

### 2. Repository Port (bridge-repository.port.ts)

**Check for**:
- [ ] Pure interface (no implementation)
- [ ] Uses domain types (Bridge, NOT BridgeEntity)
- [ ] Symbol export for DI (`export const BRIDGE_REPOSITORY_PORT = Symbol(...)`)
- [ ] Methods return domain types

**Example**:
```typescript
export interface BridgeRepositoryPort {
  save(bridge: Bridge): Promise<void>;  // ✅ Domain type
  findById(id: string): Promise<Bridge | null>;  // ✅ Domain type
}
```

**Red Flags**:
- ❌ Returns `BridgeEntity` instead of `Bridge`
- ❌ Has implementation code (not just interface)
- ❌ Missing Symbol export

---

### 3. Repository Adapter (typeorm-bridge-repository.adapter.ts)

**Check for**:
- [ ] Implements port interface
- [ ] Converts entity to domain (`toDomain()` method)
- [ ] Converts domain to entity (in `save()` method)
- [ ] Uses `@Injectable()` decorator
- [ ] Injects TypeORM repository
- [ ] Proper null/undefined handling

**Example**:
```typescript
@Injectable()
export class TypeOrmBridgeRepositoryAdapter implements BridgeRepositoryPort {
  constructor(
    @InjectRepository(BridgeEntity)
    private readonly repository: Repository<BridgeEntity>,
  ) {}

  async findById(id: string): Promise<Bridge | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return null;
    return this.toDomain(entity);  // ✅ Converts entity to domain
  }

  private toDomain(entity: BridgeEntity): Bridge {
    return Bridge.fromPersistence({ ... });  // ✅ Uses factory method
  }
}
```

**Red Flags**:
- ❌ Returns entities instead of domain models
- ❌ No entity↔domain conversion
- ❌ Business logic in adapter

---

### 4. Use Cases (application/*.usecase.ts)

**Check for**:
- [ ] Multiple use case files (not one big service)
- [ ] Each use case has single responsibility
- [ ] Depends on port (interface), not adapter
- [ ] Uses domain models for business logic
- [ ] Returns domain models

**Example**:
```typescript
@Injectable()
export class CreateBridgeUseCase {
  constructor(
    @Inject(BRIDGE_REPOSITORY_PORT)  // ✅ Depends on port (interface)
    private readonly repository: BridgeRepositoryPort,
  ) {}

  async execute(input: CreateBridgeInput): Promise<Bridge> {
    const bridge = Bridge.create(...);  // ✅ Domain factory method
    await this.repository.save(bridge);  // ✅ Uses port interface
    return bridge;  // ✅ Returns domain model
  }
}
```

**Red Flags**:
- ❌ Still has `BridgeService` instead of use cases
- ❌ Injects TypeORM repository directly
- ❌ Business logic in use case (should be in domain)

---

### 5. Controller (bridge.controller.ts or channel.controller.ts)

**Check for**:
- [ ] Injects use cases (not service)
- [ ] Thin controller (no business logic)
- [ ] Converts domain models to DTOs
- [ ] All HTTP endpoints work

**Example**:
```typescript
@Controller('bridges')
export class BridgeController {
  constructor(
    private readonly createBridgeUseCase: CreateBridgeUseCase,  // ✅ Use case
    private readonly getBridgeUseCase: GetBridgeUseCase,        // ✅ Use case
  ) {}

  @Post()
  async createBridge(@Body() dto: CreateBridgeDto) {
    const bridge = await this.createBridgeUseCase.execute(dto);  // ✅ Calls use case
    return this.toResponseDto(bridge);  // ✅ Converts to DTO
  }

  private toResponseDto(bridge: Bridge): BridgeResponseDto {
    // ✅ Helper method for conversion
  }
}
```

**Red Flags**:
- ❌ Still injects `BridgeService`
- ❌ Business logic in controller
- ❌ Returns domain models directly (should convert to DTO)

---

### 6. Module (bridge.module.ts or channel.module.ts)

**Check for**:
- [ ] Proper dependency injection configuration
- [ ] Port bound to adapter
- [ ] Use cases registered as providers
- [ ] Use cases exported (if needed by other modules)

**Example**:
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([BridgeEntity])],
  controllers: [BridgeController],
  providers: [
    {
      provide: BRIDGE_REPOSITORY_PORT,  // ✅ Binds port to adapter
      useClass: TypeOrmBridgeRepositoryAdapter,
    },
    CreateBridgeUseCase,  // ✅ Use cases registered
    GetBridgeUseCase,
    // ...
  ],
  exports: [CreateBridgeUseCase, GetBridgeUseCase],  // ✅ Exports if needed
})
export class BridgeModule {}
```

**Red Flags**:
- ❌ Still registers `BridgeService`
- ❌ Missing port→adapter binding
- ❌ Use cases not registered

---

## 🧪 Testing Validation

### Build Test
```bash
cd packages/backend
npm run build
```
**Expected**: Zero TypeScript errors

### Unit Tests
```bash
npm run test bridge.domain.spec
npm run test channel.domain.spec
```
**Expected**: All domain tests pass, no database required

### Integration Tests
```bash
npm run test:e2e
```
**Expected**: All API endpoints still work

---

## 🚨 FAIL Criteria (Reject GLM's Work If...)

1. **❌ Domain has framework imports**
   - Any import from `@nestjs` or `typeorm` in domain files
   
2. **❌ Service still exists**
   - `bridge.service.ts` or `channel.service.ts` files still present
   
3. **❌ No domain models**
   - Missing `bridge.domain.ts` or `channel.domain.ts`
   
4. **❌ Anemic domain**
   - Domain model is just a data container with no methods
   
5. **❌ No ports/adapters**
   - Missing port interfaces or adapter implementations
   
6. **❌ Use cases inject TypeORM**
   - Use cases have `@InjectRepository()` instead of `@Inject(PORT)`
   
7. **❌ Build fails**
   - TypeScript compilation errors
   
8. **❌ Tests fail**
   - Broken API endpoints or failing tests

---

## ✅ PASS Criteria (Accept GLM's Work If...)

1. **✅ Domain is pure**
   - Zero framework imports in domain layer
   
2. **✅ Rich domain models**
   - Business logic methods in domain classes
   
3. **✅ Proper layering**
   - Domain → Ports → Adapters → Application → Controller
   
4. **✅ Use cases pattern**
   - Multiple focused use cases instead of one service
   
5. **✅ Conversions at boundaries**
   - Adapter converts entity↔domain
   - Controller converts domain→DTO
   
6. **✅ Build succeeds**
   - Zero compilation errors
   
7. **✅ Tests pass**
   - All existing functionality works
   
8. **✅ Consistent with Auth/Campaign**
   - Same architectural patterns as completed modules

---

## 📊 Quick Score Card

| Criteria | Bridge | Channel | Notes |
|----------|--------|---------|-------|
| Domain purity (no imports) | ⬜ | ⬜ | |
| Rich domain model | ⬜ | ⬜ | |
| Port interfaces | ⬜ | ⬜ | |
| Adapter conversions | ⬜ | ⬜ | |
| Use cases (not service) | ⬜ | ⬜ | |
| Thin controller | ⬜ | ⬜ | |
| Proper DI in module | ⬜ | ⬜ | |
| Build succeeds | ⬜ | ⬜ | |
| Tests pass | ⬜ | ⬜ | |

**Scoring**:
- 9/9 = ✅ PERFECT - Accept and commit
- 7-8/9 = ⚠️ GOOD - Minor fixes needed
- 5-6/9 = ❌ NEEDS WORK - Request revisions
- <5/9 = 🚫 REJECT - Start over

---

## 🎯 Final Validation Command

Run this to verify everything:
```bash
# 1. Check domain purity
echo "Checking domain purity..."
! grep -r "from '@nestjs" packages/backend/src/modules/bridge/domain/ packages/backend/src/modules/channel/domain/ && echo "✅ Domain is pure" || echo "❌ Domain has framework imports"

# 2. Verify structure
echo "Checking structure..."
test -f packages/backend/src/modules/bridge/domain/bridge.domain.ts && echo "✅ Bridge domain exists"
test -f packages/backend/src/modules/bridge/ports/bridge-repository.port.ts && echo "✅ Bridge port exists"
test -f packages/backend/src/modules/bridge/adapters/typeorm-bridge-repository.adapter.ts && echo "✅ Bridge adapter exists"

# 3. Build test
echo "Building..."
cd packages/backend && npm run build && echo "✅ Build succeeded" || echo "❌ Build failed"

# 4. Test
echo "Running tests..."
npm run test && echo "✅ Tests passed" || echo "❌ Tests failed"
```

---

**Use this checklist to quickly validate GLM's refactoring work!** ✅

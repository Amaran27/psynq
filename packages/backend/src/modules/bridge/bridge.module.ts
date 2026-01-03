/**
 * Bridge Module (Refactored to Hexagonal Architecture)
 * 
 * Module configuration following dependency inversion principle:
 * - Domain and Ports define interfaces
 * - Adapters implement interfaces
 * - Use cases depend on ports (via dependency injection tokens)
 * - Controller depends on use cases
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmBridgeRepositoryAdapter } from './adapters/typeorm-bridge-repository.adapter';
import { BridgeRepositoryPort } from './ports/bridge-repository.port';
import { CreateBridgeUseCase } from './application/create-bridge.usecase';
import { GetBridgeUseCase } from './application/get-bridge.usecase';
import { ListBridgesUseCase } from './application/list-bridges.usecase';
import { AddChannelToBridgeUseCase } from './application/add-channel-to-bridge.usecase';
import { RemoveChannelFromBridgeUseCase } from './application/remove-channel-from-bridge.usecase';
import { DestroyBridgeUseCase } from './application/destroy-bridge.usecase';
import { StartRecordingUseCase } from './application/start-recording.usecase';
import { StopRecordingUseCase } from './application/stop-recording.usecase';
import { BridgeController } from './bridge.controller';
import { BridgeEntity } from '../../entities/bridge.entity';

/**
 * Bridge Module with Hexagonal Architecture
 * 
 * Dependency Injection Setup:
 * 1. Adapter implements Port interface
 * 2. Adapter provided as Port token (DIP)
 * 3. Use cases inject Port token (depend on abstraction)
 * 4. Controller injects Use cases
 */
@Module({
  imports: [TypeOrmModule.forFeature([BridgeEntity])],
  controllers: [BridgeController],
  providers: [
    // Adapter implements Port (TypeORM implementation)
    TypeOrmBridgeRepositoryAdapter,

    // Port token bound to adapter implementation (Dependency Inversion)
    {
      provide: 'BRIDGE_REPOSITORY',
      useExisting: TypeOrmBridgeRepositoryAdapter,
    },

    // Use cases depend on Port (not adapter)
    CreateBridgeUseCase,
    GetBridgeUseCase,
    ListBridgesUseCase,
    AddChannelToBridgeUseCase,
    RemoveChannelFromBridgeUseCase,
    DestroyBridgeUseCase,
    StartRecordingUseCase,
    StopRecordingUseCase,
  ],
  exports: [
    // Export port token for other modules to use
    'BRIDGE_REPOSITORY',
  ],
})
export class BridgeModule {}

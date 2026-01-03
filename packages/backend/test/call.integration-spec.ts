import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { CallController } from '../src/modules/call/call.controller';
import { CallService } from '../src/modules/call/call.service';
import { CallEntity } from '../src/entities/call.entity';
import { CallParticipantEntity } from '../src/entities/call-participant.entity';
import { OrganizationEntity } from '../src/entities/organization.entity';
import { UserEntity } from '../src/entities/user.entity';
import { SettingEntity } from '../src/entities/setting.entity';
import { CallParticipantService } from '../src/services/call-participant.service';
import { StorageService } from '../src/modules/storage/storage.service';
import { AgentStateService } from '../src/services/agent-state.service';
import { BillingService } from '../src/services/billing.service';
import { EventBusPort, PsynqEvent } from '../src/ports/event-bus.port';
import { TelephonyPort } from '../src/ports/telephony.port';
import { TelephonyCapabilities } from '../src/interfaces/telephony-capabilities.interface';
import { Call, CallDirection } from '@psynq/core';
import { ConfigModule } from '@nestjs/config';

/**
 * Integration tests for Call module/service.
 *
 * Industry-standard scope for integration tests:
 * - Real DB (TypeORM -> Postgres)
 * - Real service + repository interaction
 * - Test adapters for external ports (telephony, event bus)
 */

describe('Call Integration Tests', () => {
  // Nest + TypeORM module boot can exceed Jest's default 5s timeout in containers.
  jest.setTimeout(30_000);

  let app: INestApplication;
  let callRepository: { findOneBy: Function; delete: Function };
  const publishedEvents: PsynqEvent[] = [];

  class AllowJwtGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      // Simulate authenticated user (CallController uses this to infer agentId)
      req.user = { id: 'integration-agent', userId: 'integration-agent' };
      return true;
    }
  }

  class RecordingEventBusAdapter implements EventBusPort {
    private handlers = new Map<string, Array<(event: PsynqEvent) => void>>();

    async publish(event: PsynqEvent): Promise<void> {
      publishedEvents.push(event);
      const callbacks = this.handlers.get(event.type) ?? [];
      for (const cb of callbacks) cb(event);
    }

    async subscribe(
      pattern: string,
      callback: (event: PsynqEvent) => void,
    ): Promise<void> {
      const existing = this.handlers.get(pattern) ?? [];
      existing.push(callback);
      this.handlers.set(pattern, existing);
    }
  }

  class TestTelephonyAdapter implements TelephonyPort {
    private readonly caps: TelephonyCapabilities = {
      supportsSupervisorInjection: false,
      supportsParticipantMute: false,
      supportsParticipantHold: true,
      supportsBridgeCall: false,
      supportsBarge: false,
      supportsWhisper: false,
    };

    getCapabilities(): TelephonyCapabilities {
      return this.caps;
    }

    async createCall(call: Call): Promise<string> {
      // Deterministic external id for assertions
      return `ext_${call.id}`;
    }

    async endCall(): Promise<void> {
      return;
    }

    // --- Unused in these integration tests (but required by the interface) ---
    async generateToken(): Promise<any> {
      throw new Error('Not implemented in integration test adapter');
    }
    async healthCheck(): Promise<boolean> {
      return true;
    }
    async bridgeParticipants(): Promise<any> {
      throw new Error('Not implemented in integration test adapter');
    }
    async injectSupervisor(): Promise<any> {
      throw new Error('Not implemented in integration test adapter');
    }
    async setParticipantMuted(): Promise<void> {
      throw new Error('Not implemented in integration test adapter');
    }
    async setParticipantOnHold(): Promise<void> {
      return;
    }
    async dialLegB(): Promise<void> {
      throw new Error('Not implemented in integration test adapter');
    }
    async joinBridge(): Promise<void> {
      throw new Error('Not implemented in integration test adapter');
    }
    async startBridgeRecording(): Promise<void> {
      throw new Error('Not implemented in integration test adapter');
    }
    async stopBridgeRecording(): Promise<void> {
      throw new Error('Not implemented in integration test adapter');
    }
    async playAudio(): Promise<void> {
      throw new Error('Not implemented in integration test adapter');
    }
    async sayText(): Promise<void> {
      throw new Error('Not implemented in integration test adapter');
    }
    async gatherDigits(): Promise<void> {
      throw new Error('Not implemented in integration test adapter');
    }
    async forkAudio(): Promise<void> {
      throw new Error('Not implemented in integration test adapter');
    }
    async getRecording(): Promise<any> {
      return null;
    }
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.development',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'psynq_user',
          password: process.env.DB_PASSWORD || 'mysecretpassword',
          database: process.env.DB_DATABASE || 'psynq',
          entities: [
            CallEntity,
            CallParticipantEntity,
            OrganizationEntity,
            UserEntity,
            SettingEntity,
          ],
          synchronize: false,
          dropSchema: false,
        }),
        TypeOrmModule.forFeature([CallEntity]),
      ],
      controllers: [CallController],
      providers: [
        CallService,
        // Ports
        { provide: 'EVENT_BUS', useClass: RecordingEventBusAdapter },
        { provide: 'TELEPHONY_PROVIDER', useClass: TestTelephonyAdapter },
        // Required deps (not exercised in these test paths)
        {
          provide: CallParticipantService,
          useValue: {
            addParticipant: async () => undefined,
            getSupervisorsByCallId: async () => [],
            updateParticipantMuteState: async () => undefined,
          },
        },
        { provide: StorageService, useValue: { uploadRecording: async () => undefined } },
        { provide: AgentStateService, useValue: { isAvailable: async () => true } },
        { provide: BillingService, useValue: { checkBalance: async () => undefined, getRate: async () => 0.001, chargeForCall: async () => undefined } },
      ],
    })
      .overrideGuard(require('../src/auth/jwt-auth.guard').JwtAuthGuard)
      .useClass(AllowJwtGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    callRepository = app.get('CallEntityRepository').manager.getRepository(CallEntity);
  });

  afterAll(async () => {
    if (callRepository) {
      // best-effort cleanup for test-created calls
      await callRepository.delete({ from: 'itest-from', to: 'itest-to' });
    }
    await app?.close();
  });

  it('POST /calls should persist call and emit call.new', async () => {
    publishedEvents.length = 0;

    const res = await request(app.getHttpServer())
      .post('/calls')
      .send({ from: 'itest-from', to: 'itest-to' })
      .expect(201);

    expect(res.body).toHaveProperty('id');

    const saved = await callRepository.findOneBy({ id: res.body.id });
    expect(saved).toBeTruthy();
    expect(saved.externalId).toBe(`ext_${res.body.id}`);

    const types = publishedEvents.map((e) => e.type);
    expect(types).toContain('call.new');
  });

  it('PUT /calls/:id/end should update DB and emit call.updated (idempotent)', async () => {
    publishedEvents.length = 0;

    // create a call first
    const createRes = await request(app.getHttpServer())
      .post('/calls')
      .send({ from: 'itest-from', to: 'itest-to' })
      .expect(201);

    const callId = createRes.body.id;

    await request(app.getHttpServer()).put(`/calls/${callId}/end`).expect(200);
    await request(app.getHttpServer()).put(`/calls/${callId}/end`).expect(200);

    const types = publishedEvents.map((e) => e.type);
    expect(types).toContain('call.updated');

    const ended = await callRepository.findOneBy({ id: callId });
    expect(ended).toBeTruthy();
    expect(ended.state).toBe('ended');
  });
});

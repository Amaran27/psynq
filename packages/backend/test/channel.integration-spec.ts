import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { ChannelController } from '../src/modules/channel/channel.controller';
import { ChannelService } from '../src/modules/channel/channel.service';
import { ChannelEntity, ChannelDirection, ChannelState } from '../src/entities/channel.entity';
import { CallEntity } from '../src/entities/call.entity';
import { CallParticipantEntity } from '../src/entities/call-participant.entity';
import { OrganizationEntity } from '../src/entities/organization.entity';
import { UserEntity } from '../src/entities/user.entity';
import { SettingEntity } from '../src/entities/setting.entity';
import { EventBusPort, PsynqEvent } from '../src/ports/event-bus.port';
import { TelephonyPort } from '../src/ports/telephony.port';
import { TelephonyCapabilities } from '../src/interfaces/telephony-capabilities.interface';
import { ConfigModule } from '@nestjs/config';

/**
 * Integration tests for Channel module/service.
 *
 * Industry-standard scope for integration tests:
 * - Real DB (TypeORM -> Postgres)
 * - Real service + repository interaction
 * - Test adapters for external ports (telephony, event bus)
 */

describe('Channel Integration Tests', () => {
  // Nest + TypeORM module boot can exceed Jest's default 5s timeout in containers.
  jest.setTimeout(30_000);

  let app: INestApplication;
  let channelRepository: any;
  const publishedEvents: PsynqEvent[] = [];

  class AllowJwtGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      // Simulate authenticated user
      req.user = { id: 'integration-agent', userId: 'integration-agent', organizationId: 'integration-org' };
      return true;
    }
  }

  beforeAll(async () => {
    const testEventBus: EventBusPort = {
      publish: jest.fn((event: PsynqEvent) => {
        publishedEvents.push(event);
      }),
      subscribe: jest.fn(),
    };

    const testTelephony: TelephonyPort = {
      originateCall: jest.fn().mockResolvedValue({ channelId: 'test-channel-123' }),
      playMedia: jest.fn().mockResolvedValue(undefined),
      speak: jest.fn().mockResolvedValue(undefined),
      getCapabilities: jest.fn().mockReturnValue({
        supportsTransfer: true,
        supportsConference: true,
        supportsRecording: true,
        supportsWhispering: true,
        supportsBarging: true,
      } as TelephonyCapabilities),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'psynq_user',
          password: process.env.DB_PASSWORD || 'mysecretpassword',
          database: process.env.DB_DATABASE || 'psynq',
          entities: [
            ChannelEntity,
            CallEntity,
            CallParticipantEntity,
            OrganizationEntity,
            UserEntity,
            SettingEntity,
          ],
          synchronize: false,
          dropSchema: false,
        }),
        TypeOrmModule.forFeature([ChannelEntity]),
      ],
      controllers: [ChannelController],
      providers: [
        ChannelService,
        {
          provide: 'EVENT_BUS',
          useValue: testEventBus,
        },
        {
          provide: 'TELEPHONY_PROVIDER',
          useValue: testTelephony,
        },
      ],
    })
      .overrideGuard('JwtAuthGuard' as any)
      .useClass(AllowJwtGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    channelRepository = moduleFixture.get('ChannelEntityRepository');
  });

  afterAll(async () => {
    // Clean up test data
    if (channelRepository) {
      await channelRepository.delete({});
    }
    await app.close();
  });

  describe('POST /channels', () => {
    it('should create a new outbound channel', async () => {
      const createChannelDto = {
        destination: 'sip:test@example.com',
        organizationId: 'integration-org',
        callId: null,
      };

      const response = await request(app.getHttpServer())
        .post('/channels')
        .send(createChannelDto)
        .expect(201);

      expect(response.body).toMatchObject({
        destination: createChannelDto.destination,
        state: ChannelState.Down,
        direction: ChannelDirection.Outbound,
      });
      expect(response.body.id).toBeDefined();
    });
  });

  describe('GET /channels/:id', () => {
    it('should get channel details', async () => {
      // Create a test channel first
      const createDto = {
        destination: 'sip:test2@example.com',
        organizationId: 'integration-org',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/channels')
        .send(createDto)
        .expect(201);

      const channelId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/channels/${channelId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: channelId,
        destination: createDto.destination,
        state: ChannelState.Down,
      });
    });

    it('should return 404 for non-existent channel', async () => {
      await request(app.getHttpServer())
        .get('/channels/non-existent-id')
        .expect(404);
    });
  });

  describe('GET /channels', () => {
    it('should list active channels', async () => {
      const response = await request(app.getHttpServer())
        .get('/channels')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('PUT /channels/:id/answer', () => {
    it('should answer a ringing channel', async () => {
      // Create channel in Ringing state manually
      const channelRepo = app.get('ChannelEntityRepository');
      const channel = channelRepo.create({
        id: `test-channel-${Date.now()}`,
        destination: 'sip:test3@example.com',
        state: ChannelState.Ringing,
        direction: ChannelDirection.Inbound,
        organizationId: 'integration-org',
      });
      const savedChannel = await channelRepo.save(channel);

      const response = await request(app.getHttpServer())
        .put(`/channels/${savedChannel.id}/answer`)
        .expect(200);

      expect(response.body.state).toBe(ChannelState.Up);
    });
  });

  describe('POST /channels/:id/play', () => {
    it('should play media to answered channel', async () => {
      // Create channel in Up state
      const channelRepo = app.get('ChannelEntityRepository');
      const channel = channelRepo.create({
        id: `test-channel-${Date.now()}`,
        destination: 'sip:test4@example.com',
        state: ChannelState.Up,
        direction: ChannelDirection.Outbound,
        organizationId: 'integration-org',
      });
      const savedChannel = await channelRepo.save(channel);

      const response = await request(app.getHttpServer())
        .post(`/channels/${savedChannel.id}/play`)
        .send({ mediaUrl: 'sound:demo-congrats' })
        .expect(200);

      expect(response.body.message).toContain('Playing media');
    });
  });

  describe('POST /channels/:id/speak', () => {
    it('should initiate TTS to answered channel', async () => {
      // Create channel in Up state
      const channelRepo = app.get('ChannelEntityRepository');
      const channel = channelRepo.create({
        id: `test-channel-${Date.now()}`,
        destination: 'sip:test5@example.com',
        state: ChannelState.Up,
        direction: ChannelDirection.Outbound,
        organizationId: 'integration-org',
      });
      const savedChannel = await channelRepo.save(channel);

      const response = await request(app.getHttpServer())
        .post(`/channels/${savedChannel.id}/speak`)
        .send({ text: 'Hello from integration test' })
        .expect(200);

      expect(response.body.message).toContain('Speaking');
    });
  });

  describe('DELETE /channels/:id', () => {
    it('should hang up channel', async () => {
      // Create channel
      const channelRepo = app.get('ChannelEntityRepository');
      const channel = channelRepo.create({
        id: `test-channel-${Date.now()}`,
        destination: 'sip:test6@example.com',
        state: ChannelState.Up,
        direction: ChannelDirection.Outbound,
        organizationId: 'integration-org',
      });
      const savedChannel = await channelRepo.save(channel);

      const response = await request(app.getHttpServer())
        .delete(`/channels/${savedChannel.id}`)
        .expect(200);

      expect(response.body.state).toBe(ChannelState.Down);
    });
  });
});

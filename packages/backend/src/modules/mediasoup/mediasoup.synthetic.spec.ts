import puppeteer from 'puppeteer';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MediasoupModule } from './mediasoup.module';
import { ConfigModule } from '@nestjs/config';

describe('Synthetic WebRTC Tests', () => {
  let browser: puppeteer.Browser;
  let app: INestApplication;

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: ['.env', '../../.env'],
          isGlobal: true,
        }),
        MediasoupModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await browser.close();
    await app.close();
  });

  it('should support WebRTC in headless browser', async () => {
    const page = await browser.newPage();
    await page.goto('about:blank');

    const rtcSupport = await page.evaluate(() => {
      return typeof RTCPeerConnection !== 'undefined';
    });

    expect(rtcSupport).toBe(true);

    await page.close();
  });

  it('should create room and transport via signaling API', async () => {
    const roomId = 'test-room-synthetic';

    // Create room
    const roomResponse = await request(app.getHttpServer())
      .post(`/mediasoup/rooms/${roomId}`)
      .expect(201);

    expect(roomResponse.body).toHaveProperty('routerId');
    expect(roomResponse.body).toHaveProperty('rtpCapabilities');

    // Create transport
    const transportResponse = await request(app.getHttpServer())
      .post(`/mediasoup/rooms/${roomId}/transports`)
      .send({ listenIps: [{ ip: '127.0.0.1', announcedIp: '127.0.0.1' }] })
      .expect(201);

    expect(transportResponse.body).toHaveProperty('id');
    expect(transportResponse.body).toHaveProperty('iceParameters');
    expect(transportResponse.body).toHaveProperty('iceCandidates');
    expect(transportResponse.body).toHaveProperty('dtlsParameters');
  });

  // TODO: Add tests for TURN connectivity and SFU signaling once coturn is integrated in tests
});
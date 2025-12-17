import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mediasoup from 'mediasoup';
import { register, collectDefaultMetrics, Gauge } from 'prom-client';

// Production-grade mediasoup integration
// - Manage mediasoup workers lifecycle
// - Provide interfaces to create routers/transports/producers/consumers
// - Integrate with Prometheus client to expose metrics

@Injectable()
export class MediasoupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediasoupService.name);
  private workers: mediasoup.types.Worker[] = [];
  private routers: Map<string, mediasoup.types.Router> = new Map();
  private transports: Map<string, mediasoup.types.WebRtcTransport> = new Map();
  private producers: Map<string, mediasoup.types.Producer> = new Map();
  private consumers: Map<string, mediasoup.types.Consumer> = new Map();

  // Prometheus metrics
  private workersGauge = register.getSingleMetric('mediasoup_workers_total') as Gauge || new Gauge({
    name: 'mediasoup_workers_total',
    help: 'Total number of mediasoup workers',
  });
  private routersGauge = register.getSingleMetric('mediasoup_routers_total') as Gauge || new Gauge({
    name: 'mediasoup_routers_total',
    help: 'Total number of mediasoup routers',
  });

  constructor(private config: ConfigService) {
    // Enable default Node.js metrics only once
    if (!register.getSingleMetric('process_cpu_user_seconds_total')) {
      collectDefaultMetrics();
    }
  }

  async onModuleInit() {
    this.logger.log('Initializing MediasoupService');
    await this.spawnWorkers();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down MediasoupService');
    for (const consumer of this.consumers.values()) {
      consumer.close();
    }
    this.consumers.clear();
    for (const producer of this.producers.values()) {
      producer.close();
    }
    this.producers.clear();
    for (const transport of this.transports.values()) {
      transport.close();
    }
    this.transports.clear();
    for (const router of this.routers.values()) {
      router.close();
    }
    this.routers.clear();
    for (const worker of this.workers) {
      worker.close();
    }
    this.workers = [];
  }

  private async spawnWorkers() {
    const numWorkers = this.config.get<number>('MEDIASOUP_NUM_WORKERS') || 1;
    for (let i = 0; i < numWorkers; i++) {
      try {
        const worker = await mediasoup.createWorker({
          logLevel: 'warn',
          logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
          rtcMinPort: 10000 + i * 100,
          rtcMaxPort: 10099 + i * 100,
        });
        worker.on('died', () => {
          this.logger.error(`mediasoup Worker ${i} died`);
        });
        this.workers.push(worker);
        this.logger.log(`Spawned mediasoup worker ${i}`);
      } catch (error) {
        this.logger.error(`Failed to spawn worker ${i}:`, error);
      }
    }
    this.workersGauge.set(this.workers.length);
  }

  getWorkers(): mediasoup.types.Worker[] {
    return this.workers;
  }

  async createRouter(roomId: string): Promise<mediasoup.types.Router> {
    if (this.routers.has(roomId)) {
      return this.routers.get(roomId)!;
    }
    const worker = this.workers[0]; // Simple sharding: use first worker
    if (!worker) {
      throw new Error('No mediasoup workers available');
    }
    const router = await worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    });
    this.routers.set(roomId, router);
    this.logger.log(`Created router for room ${roomId}`);
    this.routersGauge.set(this.routers.size);
    return router;
  }

  async createWebRtcTransport(router: mediasoup.types.Router, options: { listenIps: mediasoup.types.TransportListenIp[]; initialAvailableOutgoingBitrate?: number }): Promise<mediasoup.types.WebRtcTransport> {
    const transport = await router.createWebRtcTransport(options);
    this.transports.set(transport.id, transport);
    return transport;
  }

  async createPlainTransport(router: mediasoup.types.Router, options: { listenIp: mediasoup.types.TransportListenIp; rtcpMux?: boolean; comedia?: boolean }): Promise<mediasoup.types.PlainTransport> {
    return await router.createPlainTransport(options);
  }

  async createProducer(transport: mediasoup.types.WebRtcTransport, options: { kind: mediasoup.types.MediaKind; rtpParameters: mediasoup.types.RtpParameters }): Promise<mediasoup.types.Producer> {
    const producer = await transport.produce(options);
    this.producers.set(producer.id, producer);
    return producer;
  }

  async createConsumer(transport: mediasoup.types.WebRtcTransport, producerId: string, rtpCapabilities: mediasoup.types.RtpCapabilities): Promise<mediasoup.types.Consumer> {
    const router = Array.from(this.routers.values()).find(r => r.canConsume({ producerId, rtpCapabilities }));
    if (!router) {
      throw new Error('No router can consume this producer');
    }
    const consumer = await transport.consume({ producerId, rtpCapabilities });
    this.consumers.set(consumer.id, consumer);
    return consumer;
  }

  getRouter(roomId: string): mediasoup.types.Router | undefined {
    return this.routers.get(roomId);
  }

  getTransport(transportId: string): mediasoup.types.WebRtcTransport | undefined {
    return this.transports.get(transportId);
  }

  // Additional methods can be added as needed
}

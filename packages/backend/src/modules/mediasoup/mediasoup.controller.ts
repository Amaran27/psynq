import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MediasoupService } from './mediasoup.service';
import { register } from 'prom-client';
import * as mediasoup from 'mediasoup';

@Controller('mediasoup')
export class MediasoupController {
  constructor(private mediasoupService: MediasoupService) {}

  @Get('health')
  async health() {
    const workers = this.mediasoupService.getWorkers();
    return {
      healthy: workers.length > 0,
      workers: workers.length,
    };
  }

  @Get('metrics')
  async metrics() {
    return register.metrics();
  }

  @Post('rooms/:roomId')
  async createRoom(@Param('roomId') roomId: string) {
    const router = await this.mediasoupService.createRouter(roomId);
    return { routerId: router.id, rtpCapabilities: router.rtpCapabilities };
  }

  @Post('rooms/:roomId/transports')
  async createTransport(@Param('roomId') roomId: string, @Body() body: { listenIps: mediasoup.types.TransportListenIp[] }) {
    const router = this.mediasoupService.getRouter(roomId);
    if (!router) {
      throw new Error('Room not found');
    }
    const transport = await this.mediasoupService.createWebRtcTransport(router, body);
    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  @Post('transports/:transportId/producers')
  async createProducer(@Param('transportId') transportId: string, @Body() body: { kind: mediasoup.types.MediaKind; rtpParameters: mediasoup.types.RtpParameters }) {
    const transport = this.mediasoupService.getTransport(transportId);
    if (!transport) {
      throw new Error('Transport not found');
    }
    const producer = await this.mediasoupService.createProducer(transport, body);
    return { id: producer.id };
  }

  @Post('transports/:transportId/consumers')
  async createConsumer(@Param('transportId') transportId: string, @Body() body: { producerId: string; rtpCapabilities: mediasoup.types.RtpCapabilities }) {
    const transport = this.mediasoupService.getTransport(transportId);
    if (!transport) {
      throw new Error('Transport not found');
    }
    const consumer = await this.mediasoupService.createConsumer(transport, body.producerId, body.rtpCapabilities);
    return {
      id: consumer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }
}
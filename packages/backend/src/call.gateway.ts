import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection } from '@nestjs/websockets';
import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Call, CallState, CallDirection } from '@psynq/core';
import { JwtService } from '@nestjs/jwt';
import { EventBusPort } from './ports/event-bus.port';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class CallGateway implements OnGatewayConnection, OnModuleInit {
  private readonly logger = new Logger(CallGateway.name);
  @WebSocketServer() server: Server;

  constructor(
    @Inject('EVENT_BUS') private readonly eventBus: EventBusPort,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    // Subscribe to call updates from the bus
    await this.eventBus.subscribe('call.updated', (event) => {
      this.emitCallUpdate(event.payload);
    });

    await this.eventBus.subscribe('call.new', (event) => {
      this.emitNewCall(event.payload);
    });
  }

  async handleConnection(client: Socket) {
    try {
      // Check auth object first (standard for socket.io), then fall back to headers
      const token = client.handshake.auth?.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) throw new Error('No token provided');
      
      const payload = this.jwtService.verify(token);
      const orgId = payload.orgId || payload.organizationId;

      if (orgId) {
        client.join(`org_${orgId}`);
        this.logger.debug(`Client ${client.id} joined room org_${orgId}`);
      }
    } catch (e) {
      this.logger.warn(`Client ${client.id} connection rejected: ${e.message}`);
      client.disconnect();
    }
  }

  emitCallUpdate(call: any) {
    const orgId = call.organizationId;
    if (orgId) {
      this.server.to(`org_${orgId}`).emit('callUpdate', call);
    } else {
      this.server.emit('callUpdate', call);
    }
  }

  emitNewCall(call: any) {
    const orgId = (call as any).organizationId;
    if (orgId) {
      this.server.to(`org_${orgId}`).emit('newCall', call);
    } else {
      this.server.emit('newCall', call);
    }
  }
}

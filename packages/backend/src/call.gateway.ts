import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Inject, forwardRef } from '@nestjs/common';
import { Server } from 'socket.io';
import { CallService } from './services/call.service';
import { Call, CallState, CallDirection } from '@psynq/core';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3001', // Allow frontend origin
  },
})
export class CallGateway {
  @WebSocketServer()
  server: Server;

  constructor(@Inject(forwardRef(() => CallService)) private readonly callService: CallService) {}

  // Emit call updates to all connected clients
  emitCallUpdate(call: Call) {
    this.server.emit('callUpdate', call);
  }

  emitNewCall(call: Call) {
    this.server.emit('newCall', call);
  }

  @SubscribeMessage('getActiveCalls')
  async handleGetActiveCalls(): Promise<Call[]> {
    const dtos = await this.callService.getActiveCalls();
    return dtos.map(dto => {
      const call = new Call(dto.id, dto.from, dto.to, dto.direction as CallDirection);
      call.state = dto.state as CallState;
      call.agentId = dto.agentId;
      call.startedAt = dto.startedAt;
      call.answeredAt = dto.answeredAt;
      call.endedAt = dto.endedAt;
      return call;
    });
  }
}
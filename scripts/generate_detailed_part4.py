#!/usr/bin/env python3
"""
Part 4: Telephony & Asterisk Integration - exact ARI implementation
"""
import sys
sys.path.insert(0, 'd:/Project/psitrix/psynq/scripts')
from generate_detailed_workitems import create_item, write_items

def generate_telephony():
    """Generate Telephony & Asterisk detailed work items"""
    print("\nGenerating Telephony & Asterisk...")
    items = []
    phase = 'Phase: Telephony & WebRTC'
    
    # Epic: Asterisk ARI Integration
    epic1 = 'Epic: Asterisk ARI Integration'
    items.append(create_item(epic1, 'Epic', phase, 'High',
        '''Asterisk REST Interface (ARI) client for call control.
        
Directory:
packages/backend/src/modules/telephony/
├── telephony.module.ts
├── services/
│   ├── ari-client.service.ts
│   ├── call.service.ts
│   ├── channel.service.ts
│   └── bridge.service.ts
├── events/
│   ├── stasis-event.handler.ts
│   └── channel-event.handler.ts
├── interfaces/
│   ├── ari-config.interface.ts
│   └── call-state.interface.ts
└── dto/
    ├── originate-call.dto.ts
    └── transfer-call.dto.ts

NO MOCKS - Connect to REAL Asterisk instance.''', 30, 28, labels='Telephony,Asterisk'))

    # Feature: ARI Client
    feat1 = 'Feature: ARI Client Service'
    items.append(create_item(feat1, 'Feature', epic1, 'High',
        '''WebSocket-based ARI client for real-time events.

Capabilities:
- Connect to Asterisk ARI over HTTP/WebSocket
- Subscribe to Stasis application events
- Originate calls
- Control channels (answer, hangup, hold, unhold)
- Create and manage bridges
- Play media (prompts, recordings)
- Record calls
- DTMF detection and sending''', 30, 14, labels='Telephony,ARI'))

    # Task: ARI Client Service
    items.append(create_item(
        'Task: Implement AriClientService',
        'Task', feat1, 'High',
        '''File: packages/backend/src/modules/telephony/services/ari-client.service.ts

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as ari from 'ari-client';

export interface AriConfig {
  url: string;
  username: string;
  password: string;
  app: string;
}

export interface OriginateParams {
  endpoint: string;           // e.g., 'PJSIP/agent001'
  extension?: string;
  context?: string;
  callerId?: string;
  callerIdName?: string;
  timeout?: number;
  variables?: Record<string, string>;
  app?: string;
  appArgs?: string;
}

@Injectable()
export class AriClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AriClientService.name);
  private client: any;
  private connected = false;
  private readonly config: AriConfig;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelay = 5000;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.config = {
      url: this.configService.getOrThrow<string>('ASTERISK_ARI_URL'),
      username: this.configService.getOrThrow<string>('ASTERISK_ARI_USER'),
      password: this.configService.getOrThrow<string>('ASTERISK_ARI_PASSWORD'),
      app: this.configService.get<string>('ASTERISK_ARI_APP', 'psynq'),
    };
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    try {
      this.logger.log(`Connecting to ARI at ${this.config.url}...`);
      
      this.client = await ari.connect(
        this.config.url,
        this.config.username,
        this.config.password,
      );

      this.connected = true;
      this.reconnectAttempts = 0;
      this.logger.log('ARI connection established');

      this.setupEventHandlers();
      await this.startStasisApp();
      
    } catch (error) {
      this.logger.error(`ARI connection failed: ${error.message}`);
      await this.handleReconnect();
    }
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnect attempts reached. Giving up.');
      throw new Error('ARI connection failed after max attempts');
    }

    this.reconnectAttempts++;
    this.logger.log(`Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})...`);
    
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    await this.connect();
  }

  private setupEventHandlers(): void {
    this.client.on('StasisStart', (event: any, channel: any) => {
      this.logger.debug(`StasisStart: ${channel.id}`);
      this.eventEmitter.emit('ari.stasis.start', { event, channel });
    });

    this.client.on('StasisEnd', (event: any, channel: any) => {
      this.logger.debug(`StasisEnd: ${channel.id}`);
      this.eventEmitter.emit('ari.stasis.end', { event, channel });
    });

    this.client.on('ChannelStateChange', (event: any, channel: any) => {
      this.eventEmitter.emit('ari.channel.state', { event, channel });
    });

    this.client.on('ChannelDtmfReceived', (event: any, channel: any) => {
      this.eventEmitter.emit('ari.channel.dtmf', { 
        channelId: channel.id, 
        digit: event.digit 
      });
    });

    this.client.on('ChannelHangupRequest', (event: any, channel: any) => {
      this.eventEmitter.emit('ari.channel.hangup', { event, channel });
    });

    this.client.on('BridgeCreated', (event: any, bridge: any) => {
      this.eventEmitter.emit('ari.bridge.created', { event, bridge });
    });

    this.client.on('ChannelEnteredBridge', (event: any, bridge: any, channel: any) => {
      this.eventEmitter.emit('ari.bridge.entered', { bridge, channel });
    });

    this.client.on('ChannelLeftBridge', (event: any, bridge: any, channel: any) => {
      this.eventEmitter.emit('ari.bridge.left', { bridge, channel });
    });

    this.client.on('RecordingFinished', (event: any, recording: any) => {
      this.eventEmitter.emit('ari.recording.finished', { event, recording });
    });

    // Handle disconnection
    this.client.on('WebSocketReconnecting', () => {
      this.logger.warn('ARI WebSocket reconnecting...');
      this.connected = false;
    });

    this.client.on('WebSocketConnected', () => {
      this.logger.log('ARI WebSocket reconnected');
      this.connected = true;
    });
  }

  private async startStasisApp(): Promise<void> {
    await this.client.start(this.config.app);
    this.logger.log(`Stasis app '${this.config.app}' started`);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.stop();
      this.connected = false;
      this.logger.log('ARI disconnected');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClient(): any {
    if (!this.connected) {
      throw new Error('ARI client not connected');
    }
    return this.client;
  }

  // Channel operations
  async originate(params: OriginateParams): Promise<any> {
    const channel = this.client.Channel();
    
    const originateParams: any = {
      endpoint: params.endpoint,
      callerId: params.callerId || 'psynq',
      timeout: params.timeout || 30,
      app: params.app || this.config.app,
    };

    if (params.callerIdName) {
      originateParams.callerIdName = params.callerIdName;
    }

    if (params.appArgs) {
      originateParams.appArgs = params.appArgs;
    }

    if (params.variables) {
      originateParams.variables = params.variables;
    }

    await channel.originate(originateParams);
    return channel;
  }

  async answer(channelId: string): Promise<void> {
    const channel = await this.client.channels.get({ channelId });
    await channel.answer();
  }

  async hangup(channelId: string, reason?: string): Promise<void> {
    const channel = await this.client.channels.get({ channelId });
    await channel.hangup({ reason: reason || 'normal' });
  }

  async hold(channelId: string): Promise<void> {
    const channel = await this.client.channels.get({ channelId });
    await channel.hold();
  }

  async unhold(channelId: string): Promise<void> {
    const channel = await this.client.channels.get({ channelId });
    await channel.unhold();
  }

  async mute(channelId: string, direction: 'in' | 'out' | 'both' = 'in'): Promise<void> {
    const channel = await this.client.channels.get({ channelId });
    await channel.mute({ direction });
  }

  async unmute(channelId: string, direction: 'in' | 'out' | 'both' = 'in'): Promise<void> {
    const channel = await this.client.channels.get({ channelId });
    await channel.unmute({ direction });
  }

  async playMedia(channelId: string, media: string): Promise<any> {
    const channel = await this.client.channels.get({ channelId });
    const playback = this.client.Playback();
    await channel.play({ media }, playback);
    return playback;
  }

  async stopPlayback(playbackId: string): Promise<void> {
    const playback = await this.client.playbacks.get({ playbackId });
    await playback.stop();
  }

  async sendDtmf(channelId: string, dtmf: string): Promise<void> {
    const channel = await this.client.channels.get({ channelId });
    await channel.sendDTMF({ dtmf });
  }

  // Bridge operations
  async createBridge(type: string = 'mixing'): Promise<any> {
    const bridge = this.client.Bridge();
    await bridge.create({ type });
    return bridge;
  }

  async addToBridge(bridgeId: string, channelId: string): Promise<void> {
    const bridge = await this.client.bridges.get({ bridgeId });
    await bridge.addChannel({ channel: channelId });
  }

  async removeFromBridge(bridgeId: string, channelId: string): Promise<void> {
    const bridge = await this.client.bridges.get({ bridgeId });
    await bridge.removeChannel({ channel: channelId });
  }

  async destroyBridge(bridgeId: string): Promise<void> {
    const bridge = await this.client.bridges.get({ bridgeId });
    await bridge.destroy();
  }

  // Recording operations
  async startRecording(channelId: string, name: string): Promise<any> {
    const channel = await this.client.channels.get({ channelId });
    const recording = await channel.record({
      name,
      format: 'wav',
      maxDurationSeconds: 3600,
      ifExists: 'overwrite',
    });
    return recording;
  }

  async stopRecording(recordingName: string): Promise<void> {
    const recording = await this.client.recordings.getLive({ recordingName });
    await recording.stop();
  }
}
```

Dependencies (package.json):
```json
{
  "dependencies": {
    "ari-client": "^2.2.0"
  }
}
```

Config Keys:
- ASTERISK_ARI_URL=http://asterisk:8088
- ASTERISK_ARI_USER=psynq
- ASTERISK_ARI_PASSWORD=<secure>
- ASTERISK_ARI_APP=psynq

Tests Required:
- Connection to real Asterisk
- Reconnection after disconnect
- Channel originate
- Channel answer/hangup
- Bridge creation and channel join
- Recording start/stop
- DTMF sending
- Event handling

Acceptance Criteria:
- Connects to REAL Asterisk ARI (NO MOCKS)
- Automatic reconnection on disconnect
- All channel operations working
- All bridge operations working
- Events emitted via EventEmitter2
- Proper error handling with meaningful messages''',
        30, 5, 12, 'Telephony,ARI,Service'))

    # Task: Call Service
    items.append(create_item(
        'Task: Implement CallService for call management',
        'Task', feat1, 'High',
        '''File: packages/backend/src/modules/telephony/services/call.service.ts

```typescript
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { AriClientService } from './ari-client.service';
import { Call, CallStatus, CallDirection } from '../entities/call.entity';
import { OriginateCallDto } from '../dto/originate-call.dto';
import { TransferCallDto } from '../dto/transfer-call.dto';

export interface CallState {
  id: string;
  channelId: string;
  bridgeId?: string;
  status: CallStatus;
  direction: CallDirection;
  callerId: string;
  callerName?: string;
  calleeId: string;
  queueId?: string;
  agentId?: string;
  startTime: Date;
  answerTime?: Date;
  holdStartTime?: Date;
  recordingName?: string;
}

@Injectable()
export class CallService {
  private readonly logger = new Logger(CallService.name);
  private activeCalls = new Map<string, CallState>();

  constructor(
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    private readonly ariClient: AriClientService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async originate(dto: OriginateCallDto, tenantId: string): Promise<Call> {
    // Validate endpoint exists
    // Create call record
    const call = this.callRepository.create({
      tenantId,
      direction: 'outbound',
      callerId: dto.callerId,
      callerName: dto.callerName,
      calleeId: dto.destination,
      status: 'ringing',
      startTime: new Date(),
    });

    await this.callRepository.save(call);

    try {
      const channel = await this.ariClient.originate({
        endpoint: dto.endpoint,
        callerId: dto.callerId,
        callerIdName: dto.callerName,
        timeout: dto.timeout || 30,
        appArgs: call.id,
        variables: {
          PSYNQ_CALL_ID: call.id,
          PSYNQ_TENANT_ID: tenantId,
          PSYNQ_DIRECTION: 'outbound',
        },
      });

      // Track active call
      this.activeCalls.set(call.id, {
        id: call.id,
        channelId: channel.id,
        status: 'ringing',
        direction: 'outbound',
        callerId: dto.callerId,
        callerName: dto.callerName,
        calleeId: dto.destination,
        startTime: new Date(),
      });

      // Update call with channel ID
      call.uniqueId = channel.id;
      await this.callRepository.save(call);

      return call;

    } catch (error) {
      call.status = 'failed';
      call.hangupCause = error.message;
      await this.callRepository.save(call);
      throw error;
    }
  }

  async answer(callId: string): Promise<void> {
    const state = this.getCallState(callId);
    
    await this.ariClient.answer(state.channelId);
    
    state.status = 'answered';
    state.answerTime = new Date();
    
    await this.updateCallRecord(callId, {
      status: 'answered',
      answerTime: state.answerTime,
    });

    this.eventEmitter.emit('call.answered', { callId, state });
  }

  async hangup(callId: string, reason?: string): Promise<void> {
    const state = this.getCallState(callId);
    
    await this.ariClient.hangup(state.channelId, reason);
    
    // Call cleanup happens in event handler
  }

  async hold(callId: string): Promise<void> {
    const state = this.getCallState(callId);
    
    if (state.status !== 'answered') {
      throw new BadRequestException('Can only hold answered calls');
    }

    await this.ariClient.hold(state.channelId);
    
    state.status = 'on_hold';
    state.holdStartTime = new Date();
    
    await this.updateCallRecord(callId, { status: 'on_hold' });
    
    this.eventEmitter.emit('call.held', { callId, state });
  }

  async unhold(callId: string): Promise<void> {
    const state = this.getCallState(callId);
    
    if (state.status !== 'on_hold') {
      throw new BadRequestException('Call is not on hold');
    }

    await this.ariClient.unhold(state.channelId);
    
    state.status = 'answered';
    state.holdStartTime = undefined;
    
    await this.updateCallRecord(callId, { status: 'answered' });
    
    this.eventEmitter.emit('call.unheld', { callId, state });
  }

  async mute(callId: string): Promise<void> {
    const state = this.getCallState(callId);
    await this.ariClient.mute(state.channelId, 'in');
    this.eventEmitter.emit('call.muted', { callId });
  }

  async unmute(callId: string): Promise<void> {
    const state = this.getCallState(callId);
    await this.ariClient.unmute(state.channelId, 'in');
    this.eventEmitter.emit('call.unmuted', { callId });
  }

  async transfer(callId: string, dto: TransferCallDto): Promise<void> {
    const state = this.getCallState(callId);

    if (dto.type === 'blind') {
      // Blind transfer - redirect to new destination
      await this.ariClient.hangup(state.channelId);
      // Asterisk handles the transfer via dialplan
      
    } else {
      // Attended transfer - requires consultation first
      // Create new call leg, then bridge
      const consultChannel = await this.ariClient.originate({
        endpoint: dto.destination,
        callerId: state.callerId,
        appArgs: `consult:${callId}`,
      });
      
      // Track consultation
      state.status = 'transferred';
    }

    await this.updateCallRecord(callId, { status: 'transferred' });
    this.eventEmitter.emit('call.transferred', { callId, dto });
  }

  async startRecording(callId: string): Promise<string> {
    const state = this.getCallState(callId);
    
    const recordingName = `${callId}_${Date.now()}`;
    await this.ariClient.startRecording(state.channelId, recordingName);
    
    state.recordingName = recordingName;
    
    await this.updateCallRecord(callId, { 
      recordingPath: `/recordings/${recordingName}.wav` 
    });

    this.eventEmitter.emit('call.recording.started', { callId, recordingName });
    
    return recordingName;
  }

  async stopRecording(callId: string): Promise<void> {
    const state = this.getCallState(callId);
    
    if (state.recordingName) {
      await this.ariClient.stopRecording(state.recordingName);
      this.eventEmitter.emit('call.recording.stopped', { callId });
    }
  }

  async sendDtmf(callId: string, digits: string): Promise<void> {
    const state = this.getCallState(callId);
    await this.ariClient.sendDtmf(state.channelId, digits);
  }

  getActiveCall(callId: string): CallState | undefined {
    return this.activeCalls.get(callId);
  }

  getActiveCalls(): CallState[] {
    return Array.from(this.activeCalls.values());
  }

  getActiveCallsByAgent(agentId: string): CallState[] {
    return Array.from(this.activeCalls.values())
      .filter(call => call.agentId === agentId);
  }

  private getCallState(callId: string): CallState {
    const state = this.activeCalls.get(callId);
    if (!state) {
      throw new NotFoundException(`Call ${callId} not found`);
    }
    return state;
  }

  private async updateCallRecord(callId: string, updates: Partial<Call>): Promise<void> {
    await this.callRepository.update(callId, updates);
  }

  // Event handlers for ARI events
  @OnEvent('ari.stasis.end')
  async handleStasisEnd(payload: { channel: any }): Promise<void> {
    const channelId = payload.channel.id;
    
    // Find call by channel ID
    const call = Array.from(this.activeCalls.entries())
      .find(([_, state]) => state.channelId === channelId);

    if (call) {
      const [callId, state] = call;
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - state.startTime.getTime()) / 1000);
      const talkTime = state.answerTime 
        ? Math.floor((endTime.getTime() - state.answerTime.getTime()) / 1000)
        : 0;

      await this.updateCallRecord(callId, {
        status: 'completed',
        endTime,
        duration,
        talkTime,
        hangupCause: payload.channel.dialplan?.app_data || 'normal',
      });

      this.activeCalls.delete(callId);
      this.eventEmitter.emit('call.ended', { callId, duration, talkTime });
    }
  }

  @OnEvent('ari.channel.dtmf')
  handleDtmf(payload: { channelId: string; digit: string }): void {
    const call = Array.from(this.activeCalls.entries())
      .find(([_, state]) => state.channelId === payload.channelId);

    if (call) {
      this.eventEmitter.emit('call.dtmf', { 
        callId: call[0], 
        digit: payload.digit 
      });
    }
  }
}
```

Acceptance Criteria:
- Originate calls with tracking
- Answer/hangup working
- Hold/unhold working
- Mute/unmute working
- Transfer (blind and attended)
- Recording start/stop
- DTMF handling
- Call state tracked in memory
- CDR persisted to database
- Events emitted for all state changes
- NO MOCKS - REAL Asterisk calls''',
        35, 5, 12, 'Telephony,Service,Call'))

    # Task: WebRTC Gateway
    items.append(create_item(
        'Task: Implement WebRTC Gateway for browser clients',
        'Task', epic1, 'High',
        '''File: packages/backend/src/modules/telephony/gateways/webrtc.gateway.ts

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';
import { WsCurrentUser } from '../../auth/decorators/ws-current-user.decorator';
import { CallService } from '../services/call.service';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

interface WebRTCUser {
  id: string;
  tenantId: string;
  role: string;
  socketId: string;
  sipEndpoint: string;
  status: 'available' | 'busy' | 'offline';
}

@WebSocketGateway({
  namespace: '/webrtc',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
export class WebRTCGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebRTCGateway.name);
  private connectedUsers = new Map<string, WebRTCUser>();

  constructor(
    private readonly callService: CallService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Find and remove user
    for (const [userId, user] of this.connectedUsers.entries()) {
      if (user.socketId === client.id) {
        this.connectedUsers.delete(userId);
        this.eventEmitter.emit('agent.offline', { userId });
        break;
      }
    }
  }

  @SubscribeMessage('register')
  async handleRegister(
    @ConnectedSocket() client: Socket,
    @WsCurrentUser() user: any,
    @MessageBody() data: { sipEndpoint: string },
  ): Promise<{ success: boolean; message: string }> {
    this.connectedUsers.set(user.id, {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
      socketId: client.id,
      sipEndpoint: data.sipEndpoint,
      status: 'available',
    });

    // Join tenant room for broadcasts
    client.join(`tenant:${user.tenantId}`);
    
    // Join personal room for direct messages
    client.join(`user:${user.id}`);

    this.eventEmitter.emit('agent.online', { userId: user.id });

    return { success: true, message: 'Registered successfully' };
  }

  @SubscribeMessage('call:originate')
  async handleOriginate(
    @ConnectedSocket() client: Socket,
    @WsCurrentUser() user: any,
    @MessageBody() data: { destination: string; callerId?: string },
  ): Promise<{ success: boolean; callId?: string; error?: string }> {
    try {
      const call = await this.callService.originate({
        endpoint: data.destination,
        callerId: data.callerId || user.extension,
        callerName: `${user.firstName} ${user.lastName}`,
        destination: data.destination,
      }, user.tenantId);

      return { success: true, callId: call.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('call:answer')
  async handleAnswer(
    @WsCurrentUser() user: any,
    @MessageBody() data: { callId: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.callService.answer(data.callId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('call:hangup')
  async handleHangup(
    @MessageBody() data: { callId: string; reason?: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.callService.hangup(data.callId, data.reason);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('call:hold')
  async handleHold(
    @MessageBody() data: { callId: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.callService.hold(data.callId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('call:unhold')
  async handleUnhold(
    @MessageBody() data: { callId: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.callService.unhold(data.callId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('call:mute')
  async handleMute(
    @MessageBody() data: { callId: string },
  ): Promise<{ success: boolean }> {
    await this.callService.mute(data.callId);
    return { success: true };
  }

  @SubscribeMessage('call:unmute')
  async handleUnmute(
    @MessageBody() data: { callId: string },
  ): Promise<{ success: boolean }> {
    await this.callService.unmute(data.callId);
    return { success: true };
  }

  @SubscribeMessage('call:dtmf')
  async handleDtmf(
    @MessageBody() data: { callId: string; digits: string },
  ): Promise<{ success: boolean }> {
    await this.callService.sendDtmf(data.callId, data.digits);
    return { success: true };
  }

  @SubscribeMessage('call:transfer')
  async handleTransfer(
    @MessageBody() data: { callId: string; destination: string; type: 'blind' | 'attended' },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.callService.transfer(data.callId, {
        destination: data.destination,
        type: data.type,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Broadcast call events to relevant clients
  @OnEvent('call.ringing')
  handleCallRinging(payload: { callId: string; agentId: string; callerId: string }): void {
    this.server.to(`user:${payload.agentId}`).emit('call:ringing', payload);
  }

  @OnEvent('call.answered')
  handleCallAnswered(payload: { callId: string }): void {
    const call = this.callService.getActiveCall(payload.callId);
    if (call?.agentId) {
      this.server.to(`user:${call.agentId}`).emit('call:answered', payload);
    }
  }

  @OnEvent('call.ended')
  handleCallEnded(payload: { callId: string; duration: number }): void {
    // Broadcast to relevant users
    this.server.emit('call:ended', payload);
  }

  @OnEvent('call.dtmf')
  handleDtmfReceived(payload: { callId: string; digit: string }): void {
    const call = this.callService.getActiveCall(payload.callId);
    if (call?.agentId) {
      this.server.to(`user:${call.agentId}`).emit('call:dtmf', payload);
    }
  }

  // Utility methods
  getUserSocket(userId: string): string | undefined {
    return this.connectedUsers.get(userId)?.socketId;
  }

  sendToUser(userId: string, event: string, data: any): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  sendToTenant(tenantId: string, event: string, data: any): void {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }
}
```

Dependencies:
- @nestjs/websockets
- @nestjs/platform-socket.io
- socket.io

WebSocket Events (Client → Server):
- register: Register user with SIP endpoint
- call:originate: Start outbound call
- call:answer: Answer incoming call
- call:hangup: End call
- call:hold: Put call on hold
- call:unhold: Resume call
- call:mute: Mute microphone
- call:unmute: Unmute microphone
- call:dtmf: Send DTMF tones
- call:transfer: Transfer call

WebSocket Events (Server → Client):
- call:ringing: Incoming call notification
- call:answered: Call connected
- call:ended: Call terminated
- call:dtmf: DTMF received

Acceptance Criteria:
- WebSocket server running on /webrtc namespace
- JWT authentication via WsJwtGuard
- User registration and tracking
- All call control operations
- Real-time event broadcasting
- Multi-tenant isolation via rooms
- Works with REAL WebRTC clients''',
        40, 4, 10, 'Telephony,WebRTC,WebSocket'))

    return items

if __name__ == '__main__':
    generate_telephony()

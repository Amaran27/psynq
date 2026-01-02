import { Injectable } from '@nestjs/common';

@Injectable()
export class AppConfigService {
  get nodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  }

  get port(): number {
    return parseInt(process.env.PORT || '3001', 10);
  }

  get host(): string {
    return process.env.HOST || '0.0.0.0';
  }

  get corsOrigins(): any {
    const origins = process.env.CORS_ORIGINS;
    if (origins) {
      return origins.split(',');
    }
    if (this.nodeEnv !== 'production') {
      return true;
    }
    return [];
  }

  get databaseConfig() {
    return {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'psynq_user',
      password: process.env.DB_PASSWORD || 'mysecretpassword',
      database: process.env.DB_DATABASE || 'psynq_db',
    };
  }

  get asteriskWebRtcUri(): string {
    // Explicitly use 127.0.0.1 and remove any prefix
    if (this.nodeEnv === 'production') {
      return (
        process.env.ASTERISK_WEBRTC_URI || 'wss://asterisk.psynq.com:8089/ws'
      );
    }
    return process.env.ASTERISK_WEBRTC_URI || 'ws://127.0.0.1:8088/ws';
  }

  get asteriskConfig() {
    return {
      url: process.env.ASTERISK_ARI_URL || 'http://127.0.0.1:8088',
      username: process.env.ASTERISK_ARI_USERNAME || 'psynq-app',
      password: process.env.ASTERISK_ARI_PASSWORD || 'psynq-pass',
      domain: process.env.ASTERISK_WEBRTC_DOMAIN || '127.0.0.1',
      app: process.env.ASTERISK_APP || 'psynq-app',
      transport: process.env.ASTERISK_TRANSPORT || 'transport-ws',
      context: process.env.ASTERISK_CONTEXT || 'from-webrtc',
    };
  }

  get twilioConfig() {
    return {
      domain: process.env.TWILIO_DOMAIN || 'psynq-stage.pstn.twilio.com',
      user: process.env.TWILIO_USER || 'your_sip_username',
      pass: process.env.TWILIO_PASS || 'your_sip_password',
      trunkId: process.env.TWILIO_TRUNK_ID || 'twilio-trunk',
    };
  }
}

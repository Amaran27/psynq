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
    
    // In development, allow all to bypass CORS issues
    if (this.nodeEnv !== 'production') {
      return true; // NestJS CORS uses 'true' to allow all
    }
    
    return [];
  }

  get databaseConfig() {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'psynq_user',
      password: process.env.DB_PASSWORD || 'mysecretpassword',
      database: process.env.DB_DATABASE || 'psynq_db',
    };
  }

  get twilioConfig() {
    return {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      apiKey: process.env.TWILIO_API_KEY || '',
      apiSecret: process.env.TWILIO_API_SECRET || '',
      twimlAppSid: process.env.TWILIO_TWIML_APP_SID || '',
    };
  }
}
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallEntity } from '../entities/call.entity';

@Injectable()
export class HealthService {
  constructor(
    @InjectRepository(CallEntity)
    private readonly callRepository: Repository<CallEntity>,
  ) {}

  async checkAriConnection(): Promise<{ status: string; details?: any }> {
    try {
      // Try to access Asterisk ARI to verify it's reachable
      // The actual connection is managed by the asterisk-adapter library
      // This is a basic verification that the service is running
      const http = require('http');
      
      return new Promise((resolve) => {
        const options = {
          hostname: process.env.ARI_HOST || '127.0.0.1',
          port: process.env.ARI_PORT || 8088,
          path: '/ari/applications',
          method: 'GET',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(
              `${process.env.ARI_USER || 'test'}:${process.env.ARI_PASSWORD || 'test'}`
            ).toString('base64')
          },
          timeout: 3000
        };

        const req = http.request(options, (res) => {
          if (res.statusCode === 200) {
            resolve({
              status: 'connected',
              details: `ARI connection is working (${res.statusCode})`
            });
          } else {
            resolve({
              status: 'error',
              details: `ARI returned status code ${res.statusCode}`
            });
          }
        });

        req.on('error', (err) => {
          resolve({
            status: 'error',
            details: `ARI connection failed: ${err.message}`
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            status: 'error',
            details: 'ARI connection timeout'
          });
        });

        req.end();
      });
    } catch (error) {
      return {
        status: 'error',
        details: `ARI health check error: ${error.message}`
      };
    }
  }

  async checkDatabaseConnection(): Promise<{ status: string; details?: any }> {
    try {
      const count = await this.callRepository.count();
      return {
        status: 'connected',
        details: `Database connected, ${count} calls in database`,
      };
    } catch (error) {
      return {
        status: 'error',
        details: error.message,
      };
    }
  }
}
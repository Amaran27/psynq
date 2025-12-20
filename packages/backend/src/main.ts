import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app.config.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err?.stack || err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });

  const app = await NestFactory.create(AppModule, new ExpressAdapter());
  
  app.useGlobalFilters(new AllExceptionsFilter());
  
  const configService = app.get(AppConfigService);
  
  // Standardized CORS for production-readiness
  app.enableCors({
    origin: (origin, callback) => {
      // In development, allow all. In production, restrict.
      if (configService.nodeEnv !== 'production' || !origin) {
        callback(null, true);
      } else {
        const allowed = configService.corsOrigins;
        if (allowed === true || (Array.isArray(allowed) && allowed.includes(origin))) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
  });
  
  console.log(`Starting backend server in ${configService.nodeEnv} mode`);
  // Explicitly listen on both IPv4 and IPv6 if possible, or force 127.0.0.1 for local stability
  const host = '0.0.0.0'; 
  const port = configService.port;
  
  await app.listen(port, host);
  console.log(`Backend server is listening on http://localhost:${port}`);
}
bootstrap();
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
        if (
          allowed === true ||
          (Array.isArray(allowed) && allowed.includes(origin))
        ) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders:
      'Content-Type, Authorization, X-Requested-With, Accept, Origin',
  });

  // Swagger/OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('Psitrix Psynq API')
    .setDescription('Cloud Telephony CPaaS Platform API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name is used to reference the auth scheme in controllers
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('organizations', 'Organization management endpoints')
    .addTag('agents', 'Agent status and management endpoints')
    .addTag('calls', 'Call control and management endpoints')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  console.log(`Starting backend server in ${configService.nodeEnv} mode`);
  // Bind to all interfaces for maximum Windows/Docker compatibility
  const host = '0.0.0.0';
  const port = configService.port;

  await app.listen(port, host);
  console.log(`Backend server is listening on http://127.0.0.1:${port}`);
  console.log(
    `Swagger documentation available at http://127.0.0.1:${port}/api`,
  );
}
bootstrap();

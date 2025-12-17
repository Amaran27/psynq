import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter());
  app.enableCors();
  const port = process.env.PORT || 3001;
  console.log(`Starting backend server on port ${port}`);
  await app.listen(port);
  console.log(`Backend server is listening on http://localhost:${port}`);
}
bootstrap();

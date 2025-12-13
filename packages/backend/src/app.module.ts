import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AsteriskAdapter } from './adapters/asterisk.adapter';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, AsteriskAdapter],
})
export class AppModule {}

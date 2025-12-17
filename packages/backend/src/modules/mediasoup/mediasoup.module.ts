import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediasoupService } from './mediasoup.service';
import { MediasoupController } from './mediasoup.controller';

@Module({
  imports: [ConfigModule],
  providers: [MediasoupService],
  controllers: [MediasoupController],
  exports: [MediasoupService],
})
export class MediasoupModule {}

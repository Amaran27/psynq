import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { SettingEntity } from '../entities/setting.entity';
import { SettingsService } from '../services/settings.service';
import * as redisStore from 'cache-manager-ioredis';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([SettingEntity]),
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      ttl: 3600,
    }),
  ],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}

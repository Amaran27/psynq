import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LocalEventBusAdapter } from './local-event-bus.adapter';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
    }),
  ],
  providers: [
    {
      provide: 'EVENT_BUS',
      useClass: LocalEventBusAdapter,
    },
  ],
  exports: ['EVENT_BUS'],
})
export class EventBusModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { LeadEntity } from '../../entities/lead.entity';
import { EventBusModule } from '../event-bus/event-bus.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeadEntity]),
    EventBusModule,
  ],
  controllers: [LeadController],
  providers: [LeadService],
  exports: [LeadService],
})
export class LeadModule {}

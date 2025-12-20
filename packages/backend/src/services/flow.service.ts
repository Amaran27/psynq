import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlowEntity } from '../entities/flow.entity';

@Injectable()
export class FlowService {
  private readonly logger = new Logger(FlowService.name);

  constructor(
    @InjectRepository(FlowEntity)
    private readonly flowRepository: Repository<FlowEntity>,
  ) {}

  async getDefaultFlowForOrg(orgId: string): Promise<FlowEntity | null> {
    return await this.flowRepository.findOne({ where: { organizationId: orgId } });
  }

  async getFlowById(id: string): Promise<FlowEntity | null> {
    return await this.flowRepository.findOne({ where: { id } });
  }
}

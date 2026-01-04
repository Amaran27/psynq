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
    // Guard against null/undefined/empty org ID
    if (!orgId || orgId === 'null' || orgId === 'undefined') {
      this.logger.warn(
        `getDefaultFlowForOrg called with invalid orgId: ${orgId}`,
      );
      return null;
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orgId)) {
      this.logger.warn(
        `getDefaultFlowForOrg called with invalid UUID format: ${orgId}`,
      );
      return null;
    }

    return await this.flowRepository.findOne({
      where: { organizationId: orgId },
    });
  }

  async getFlowById(id: string): Promise<FlowEntity | null> {
    return await this.flowRepository.findOne({ where: { id } });
  }
}

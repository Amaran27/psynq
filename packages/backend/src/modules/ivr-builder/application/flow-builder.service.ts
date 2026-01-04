/**
 * Flow Builder Service
 */

import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { IVR_FLOW_REPOSITORY, IVRFlowRepository, FlowFilters } from '../domain/ports/ivr-flow.repository';
import { IVRFlow, FlowStatus } from '../domain/ivr-flow.domain';
import { IVRNode } from '../domain/ivr-node.domain';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FlowBuilderService {
  constructor(
    @Inject(IVR_FLOW_REPOSITORY)
    private readonly flowRepository: IVRFlowRepository,
  ) {}

  async createFlow(organizationId: string, dto: CreateFlowDto): Promise<IVRFlow> {
    // Convert DTOs to domain objects
    const nodes = dto.nodes.map(n => new IVRNode(
      n.id,
      n.type,
      n.label,
      n.config as any,
      n.position,
      n.metadata,
    ));

    const flow = new IVRFlow(
      uuidv4(),
      organizationId,
      dto.name,
      dto.description || '',
      FlowStatus.DRAFT,
      nodes,
      dto.connections,
      dto.variables || [],
      dto.startNodeId,
      1,
      dto.metadata,
    );

    return await this.flowRepository.create(flow);
  }

  async findById(id: string, organizationId: string): Promise<IVRFlow> {
    const flow = await this.flowRepository.findById(id, organizationId);
    if (!flow) {
      throw new NotFoundException(`Flow ${id} not found`);
    }
    return flow;
  }

  async findByOrganization(organizationId: string, filters?: FlowFilters): Promise<IVRFlow[]> {
    return await this.flowRepository.findByOrganization(organizationId, filters);
  }

  async updateFlow(id: string, organizationId: string, dto: UpdateFlowDto): Promise<IVRFlow> {
    const flow = await this.findById(id, organizationId);

    if (!flow.canBeModified()) {
      throw new BadRequestException('Cannot modify published flow. Clone it to create a new version.');
    }

    if (dto.name !== undefined || dto.description !== undefined) {
      flow.update({
        name: dto.name,
        description: dto.description,
      });
    }

    if (dto.nodes !== undefined) {
      flow.nodes = dto.nodes.map(n => new IVRNode(
        n.id,
        n.type,
        n.label,
        n.config as any,
        n.position,
        n.metadata,
      ));
    }

    if (dto.connections !== undefined) {
      flow.connections = dto.connections;
    }

    if (dto.variables !== undefined) {
      flow.variables = dto.variables;
    }

    if (dto.startNodeId !== undefined) {
      flow.startNodeId = dto.startNodeId;
    }

    return await this.flowRepository.update(flow);
  }

  async publishFlow(id: string, organizationId: string): Promise<IVRFlow> {
    const flow = await this.findById(id, organizationId);
    flow.publish();
    return await this.flowRepository.update(flow);
  }

  async archiveFlow(id: string, organizationId: string): Promise<IVRFlow> {
    const flow = await this.findById(id, organizationId);
    flow.archive();
    return await this.flowRepository.update(flow);
  }

  async cloneFlow(id: string, organizationId: string): Promise<IVRFlow> {
    const flow = await this.findById(id, organizationId);
    const cloned = flow.clone(uuidv4());
    return await this.flowRepository.create(cloned);
  }

  async deleteFlow(id: string, organizationId: string): Promise<void> {
    const flow = await this.findById(id, organizationId);
    
    if (flow.status === FlowStatus.PUBLISHED) {
      throw new BadRequestException('Cannot delete published flow. Archive it first.');
    }

    await this.flowRepository.delete(id, organizationId);
  }

  async getStatistics(organizationId: string): Promise<{
    total: number;
    draft: number;
    published: number;
    archived: number;
  }> {
    return await this.flowRepository.getStatistics(organizationId);
  }
}

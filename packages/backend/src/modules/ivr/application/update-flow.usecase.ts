/**
 * Update IVR Flow Use Case
 * 
 * Updates an existing IVR flow
 */

import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { IVRFlowRepositoryPort } from '../ports/ivr-flow-repository.port';
import { IVRFlow } from '../domain/ivr-flow.domain';

@Injectable()
export class UpdateFlowUseCase {
  constructor(
    @Inject('IVR_FLOW_REPOSITORY')
    private readonly flowRepository: IVRFlowRepositoryPort,
  ) {}

  async execute(params: {
    flowId: string;
    organizationId: string;
    name?: string;
    description?: string;
    nodes?: any[];
    entryNodeId?: string;
    variables?: Record<string, any>;
  }): Promise<IVRFlow> {
    // Find existing flow
    const flow = await this.flowRepository.findById(params.flowId);

    if (!flow) {
      throw new NotFoundException(`IVR flow with ID '${params.flowId}' not found`);
    }

    // Verify organization ownership
    if (flow.organizationId !== params.organizationId) {
      throw new NotFoundException(`IVR flow with ID '${params.flowId}' not found`);
    }

    // Check name uniqueness if changing name
    if (params.name && params.name !== flow.name) {
      const existing = await this.flowRepository.existsByName(
        params.organizationId,
        params.name,
      );

      if (existing) {
        throw new ConflictException(`IVR flow with name '${params.name}' already exists`);
      }
    }

    // Update fields
    if (params.name !== undefined) flow.name = params.name;
    if (params.description !== undefined) flow.description = params.description;
    if (params.nodes !== undefined) flow.nodes = params.nodes;
    if (params.entryNodeId !== undefined) flow.entryNodeId = params.entryNodeId;
    if (params.variables !== undefined) flow.variables = params.variables;

    flow.updatedAt = new Date();

    // Validate updated flow
    const validation = flow.validate();
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Invalid IVR flow',
        errors: validation.errors,
      });
    }

    // Save
    return await this.flowRepository.update(flow);
  }
}

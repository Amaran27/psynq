/**
 * Get IVR Flow Use Case
 * 
 * Retrieves an IVR flow by ID
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IVRFlowRepositoryPort } from '../ports/ivr-flow-repository.port';
import { IVRFlow } from '../domain/ivr-flow.domain';

@Injectable()
export class GetFlowUseCase {
  constructor(
    @Inject('IVR_FLOW_REPOSITORY')
    private readonly flowRepository: IVRFlowRepositoryPort,
  ) {}

  async execute(flowId: string, organizationId: string): Promise<IVRFlow> {
    const flow = await this.flowRepository.findById(flowId);

    if (!flow) {
      throw new NotFoundException(`IVR flow with ID '${flowId}' not found`);
    }

    // Verify organization ownership
    if (flow.organizationId !== organizationId) {
      throw new NotFoundException(`IVR flow with ID '${flowId}' not found`);
    }

    return flow;
  }
}

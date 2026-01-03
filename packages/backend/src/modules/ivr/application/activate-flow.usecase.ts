/**
 * Activate IVR Flow Use Case
 * 
 * Activates a draft IVR flow
 */

import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { IVRFlowRepositoryPort } from '../ports/ivr-flow-repository.port';
import { IVRFlow, IVRFlowStatus } from '../domain/ivr-flow.domain';

@Injectable()
export class ActivateFlowUseCase {
  constructor(
    @Inject('IVR_FLOW_REPOSITORY')
    private readonly flowRepository: IVRFlowRepositoryPort,
  ) {}

  async execute(flowId: string, organizationId: string): Promise<IVRFlow> {
    // Find existing flow
    const flow = await this.flowRepository.findById(flowId);

    if (!flow) {
      throw new NotFoundException(`IVR flow with ID '${flowId}' not found`);
    }

    // Verify organization ownership
    if (flow.organizationId !== organizationId) {
      throw new NotFoundException(`IVR flow with ID '${flowId}' not found`);
    }

    // Can only activate drafts
    if (flow.status !== IVRFlowStatus.DRAFT) {
      throw new BadRequestException(`Flow is already ${flow.status.toLowerCase()}`);
    }

    // Validate before activation
    const validation = flow.validate();
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Cannot activate invalid flow',
        errors: validation.errors,
      });
    }

    // Activate
    flow.activate();
    return await this.flowRepository.update(flow);
  }
}

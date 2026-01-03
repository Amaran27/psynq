/**
 * Delete IVR Flow Use Case
 * 
 * Archives active flows or hard deletes drafts
 */

import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { IVRFlowRepositoryPort } from '../ports/ivr-flow-repository.port';
import { IVRFlowStatus } from '../domain/ivr-flow.domain';

@Injectable()
export class DeleteFlowUseCase {
  constructor(
    @Inject('IVR_FLOW_REPOSITORY')
    private readonly flowRepository: IVRFlowRepositoryPort,
  ) {}

  async execute(flowId: string, organizationId: string, hardDelete: boolean = false): Promise<void> {
    // Find existing flow
    const flow = await this.flowRepository.findById(flowId);

    if (!flow) {
      throw new NotFoundException(`IVR flow with ID '${flowId}' not found`);
    }

    // Verify organization ownership
    if (flow.organizationId !== organizationId) {
      throw new NotFoundException(`IVR flow with ID '${flowId}' not found`);
    }

    // Hard delete only allowed for drafts
    if (hardDelete) {
      if (flow.status !== IVRFlowStatus.DRAFT) {
        throw new BadRequestException('Hard delete only allowed for draft flows');
      }
      await this.flowRepository.delete(flowId);
    } else {
      // Archive active flows
      if (flow.status === IVRFlowStatus.ACTIVE) {
        flow.archive();
        await this.flowRepository.update(flow);
      } else if (flow.status === IVRFlowStatus.DRAFT) {
        // Drafts can be hard deleted
        await this.flowRepository.delete(flowId);
      }
    }
  }
}

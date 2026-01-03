/**
 * List IVR Flows Use Case
 * 
 * Retrieves paginated list of IVR flows
 */

import { Injectable, Inject } from '@nestjs/common';
import { IVRFlowRepositoryPort } from '../ports/ivr-flow-repository.port';
import { IVRFlow, IVRFlowStatus } from '../domain/ivr-flow.domain';

@Injectable()
export class ListFlowsUseCase {
  constructor(
    @Inject('IVR_FLOW_REPOSITORY')
    private readonly flowRepository: IVRFlowRepositoryPort,
  ) {}

  async execute(params: {
    organizationId: string;
    status?: IVRFlowStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ flows: IVRFlow[]; total: number }> {
    return await this.flowRepository.list({
      organizationId: params.organizationId,
      status: params.status,
      limit: params.limit || 20,
      offset: params.offset || 0,
    });
  }
}

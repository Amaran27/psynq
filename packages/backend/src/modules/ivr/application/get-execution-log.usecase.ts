/**
 * Get IVR Execution Log Use Case
 * 
 * Retrieves execution log for a call
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IVRExecutionLogRepositoryPort } from '../ports/ivr-execution-log-repository.port';
import { IVRExecutionLog } from '../domain/ivr-execution-log.domain';

@Injectable()
export class GetExecutionLogUseCase {
  constructor(
    @Inject('IVR_EXECUTION_LOG_REPOSITORY')
    private readonly executionLogRepository: IVRExecutionLogRepositoryPort,
  ) {}

  async execute(callId: string, organizationId: string): Promise<IVRExecutionLog> {
    const log = await this.executionLogRepository.findByCallId(callId);

    if (!log) {
      throw new NotFoundException(`Execution log for call '${callId}' not found`);
    }

    // Verify organization ownership
    if (log.organizationId !== organizationId) {
      throw new NotFoundException(`Execution log for call '${callId}' not found`);
    }

    return log;
  }
}

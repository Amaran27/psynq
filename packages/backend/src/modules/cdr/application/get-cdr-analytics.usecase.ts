/**
 * Get CDR Analytics Use Case
 */

import { Injectable, Inject } from '@nestjs/common';
import { CDRRepositoryPort, CDRSearchFilters, CDRAnalytics } from '../ports/cdr-repository.port';

@Injectable()
export class GetCDRAnalyticsUseCase {
  constructor(
    @Inject('CDR_REPOSITORY')
    private readonly cdrRepository: CDRRepositoryPort,
  ) {}

  async execute(filters: CDRSearchFilters): Promise<CDRAnalytics> {
    return this.cdrRepository.getAnalytics(filters);
  }
}

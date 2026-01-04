/**
 * List CDR Use Case
 */

import { Injectable, Inject } from '@nestjs/common';
import { CDRRepositoryPort, CDRSearchFilters } from '../ports/cdr-repository.port';
import { CDR } from '../domain/cdr.entity';

export interface ListCDRResult {
  cdrs: CDR[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class ListCDRUseCase {
  constructor(
    @Inject('CDR_REPOSITORY')
    private readonly cdrRepository: CDRRepositoryPort,
  ) {}

  async execute(
    filters: CDRSearchFilters,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ListCDRResult> {
    const [cdrs, total] = await Promise.all([
      this.cdrRepository.find(filters, limit, offset),
      this.cdrRepository.count(filters),
    ]);

    return {
      cdrs,
      total,
      limit,
      offset,
    };
  }
}

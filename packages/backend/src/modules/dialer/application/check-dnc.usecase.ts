/**
 * Check DNC Use Case
 * 
 * Hexagonal Architecture - Application layer
 * Checks if a phone number is on the Do Not Call list
 */

import { Inject, Injectable } from '@nestjs/common';
import { DNCRepositoryPort, DNC_REPOSITORY_PORT } from '../ports/dnc-repository.port';
import { DNCEntry } from '../domain/dnc.domain';

export interface CheckDNCInput {
  phoneNumber: string;
  organizationId?: string;
}

export interface CheckDNCResult {
  isOnDNCList: boolean;
  entry?: DNCEntry;
}

@Injectable()
export class CheckDNCUseCase {
  constructor(
    @Inject(DNC_REPOSITORY_PORT)
    private readonly dncRepository: DNCRepositoryPort,
  ) {}

  async execute(input: CheckDNCInput): Promise<CheckDNCResult> {
    // Normalize phone number
    const normalized = DNCEntry.normalizePhoneNumber(input.phoneNumber);

    // Check if on DNC list
    const isOnList = await this.dncRepository.isOnDNCList(normalized, input.organizationId);

    if (isOnList) {
      const entry = await this.dncRepository.findByPhoneNumber(normalized, input.organizationId);
      return {
        isOnDNCList: true,
        entry: entry ?? undefined,
      };
    }

    return {
      isOnDNCList: false,
    };
  }
}

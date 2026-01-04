/**
 * TypeORM CDR Repository
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CDRRepositoryPort, CDRSearchFilters, CDRAnalytics } from '../ports/cdr-repository.port';
import { CDR } from '../domain/cdr.entity';
import { CDREntity } from '../entities/cdr.entity';

@Injectable()
export class TypeOrmCDRRepository implements CDRRepositoryPort {
  constructor(
    @InjectRepository(CDREntity)
    private readonly repository: Repository<CDREntity>,
  ) {}

  async find(
    filters: CDRSearchFilters,
    limit: number = 50,
    offset: number = 0,
  ): Promise<CDR[]> {
    const queryBuilder = this.repository.createQueryBuilder('cdr');

    if (filters.accountcode) {
      queryBuilder.andWhere('cdr.accountcode = :accountcode', {
        accountcode: filters.accountcode,
      });
    }

    if (filters.src) {
      queryBuilder.andWhere('cdr.src LIKE :src', { src: `%${filters.src}%` });
    }

    if (filters.dst) {
      queryBuilder.andWhere('cdr.dst LIKE :dst', { dst: `%${filters.dst}%` });
    }

    if (filters.disposition) {
      queryBuilder.andWhere('cdr.disposition = :disposition', {
        disposition: filters.disposition,
      });
    }

    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('cdr.start BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters.startDate) {
      queryBuilder.andWhere('cdr.start >= :startDate', {
        startDate: filters.startDate,
      });
    } else if (filters.endDate) {
      queryBuilder.andWhere('cdr.start <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.hasRecording !== undefined) {
      if (filters.hasRecording) {
        queryBuilder.andWhere('cdr.recording_path IS NOT NULL');
      } else {
        queryBuilder.andWhere('cdr.recording_path IS NULL');
      }
    }

    queryBuilder.orderBy('cdr.start', 'DESC');
    queryBuilder.skip(offset);
    queryBuilder.take(limit);

    const entities = await queryBuilder.getMany();
    return entities.map((e) => e.toDomain());
  }

  async count(filters: CDRSearchFilters): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder('cdr');

    if (filters.accountcode) {
      queryBuilder.andWhere('cdr.accountcode = :accountcode', {
        accountcode: filters.accountcode,
      });
    }

    if (filters.src) {
      queryBuilder.andWhere('cdr.src LIKE :src', { src: `%${filters.src}%` });
    }

    if (filters.dst) {
      queryBuilder.andWhere('cdr.dst LIKE :dst', { dst: `%${filters.dst}%` });
    }

    if (filters.disposition) {
      queryBuilder.andWhere('cdr.disposition = :disposition', {
        disposition: filters.disposition,
      });
    }

    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('cdr.start BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters.startDate) {
      queryBuilder.andWhere('cdr.start >= :startDate', {
        startDate: filters.startDate,
      });
    } else if (filters.endDate) {
      queryBuilder.andWhere('cdr.start <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.hasRecording !== undefined) {
      if (filters.hasRecording) {
        queryBuilder.andWhere('cdr.recording_path IS NOT NULL');
      } else {
        queryBuilder.andWhere('cdr.recording_path IS NULL');
      }
    }

    return queryBuilder.getCount();
  }

  async findByUniqueId(uniqueid: string): Promise<CDR | null> {
    const entity = await this.repository.findOne({ where: { uniqueid } });
    return entity ? entity.toDomain() : null;
  }

  async getAnalytics(filters: CDRSearchFilters): Promise<CDRAnalytics> {
    const queryBuilder = this.repository.createQueryBuilder('cdr');

    if (filters.accountcode) {
      queryBuilder.andWhere('cdr.accountcode = :accountcode', {
        accountcode: filters.accountcode,
      });
    }

    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('cdr.start BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters.startDate) {
      queryBuilder.andWhere('cdr.start >= :startDate', {
        startDate: filters.startDate,
      });
    } else if (filters.endDate) {
      queryBuilder.andWhere('cdr.start <= :endDate', {
        endDate: filters.endDate,
      });
    }

    const result = await queryBuilder
      .select('COUNT(*)', 'totalCalls')
      .addSelect(
        "SUM(CASE WHEN disposition = 'ANSWERED' THEN 1 ELSE 0 END)",
        'answeredCalls',
      )
      .addSelect(
        "SUM(CASE WHEN disposition != 'ANSWERED' THEN 1 ELSE 0 END)",
        'failedCalls',
      )
      .addSelect('SUM(duration)', 'totalDuration')
      .addSelect('SUM(billsec)', 'totalBillsec')
      .addSelect('AVG(duration)', 'avgDuration')
      .addSelect('AVG(billsec)', 'avgBillsec')
      .getRawOne();

    const totalCalls = parseInt(result.totalCalls || '0', 10);
    const answeredCalls = parseInt(result.answeredCalls || '0', 10);

    return {
      totalCalls,
      answeredCalls,
      failedCalls: parseInt(result.failedCalls || '0', 10),
      totalDuration: parseInt(result.totalDuration || '0', 10),
      totalBillsec: parseInt(result.totalBillsec || '0', 10),
      avgDuration: parseFloat(result.avgDuration || '0'),
      avgBillsec: parseFloat(result.avgBillsec || '0'),
      answerRate: totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0,
    };
  }
}

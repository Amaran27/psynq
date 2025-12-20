import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueEntity } from '../entities/queue.entity';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectRepository(QueueEntity)
    private readonly queueRepository: Repository<QueueEntity>,
  ) {}

  async findQueueForNumber(orgId: string, dialedNumber: string): Promise<QueueEntity | null> {
    // In a real system, we would have a 'PhoneNumbers' table mapping to Queues.
    // For now, we'll return the first queue for the organization.
    return await this.queueRepository.findOne({ where: { organizationId: orgId } });
  }

  async createQueue(orgId: string, name: string, skills: string[]): Promise<QueueEntity> {
    const queue = this.queueRepository.create({
      organizationId: orgId,
      name,
      requiredSkills: skills,
    });
    return await this.queueRepository.save(queue);
  }
}

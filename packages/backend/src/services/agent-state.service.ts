import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { AgentStatus } from '@psynq/core';
import { EventBusPort } from '../ports/event-bus.port';

@Injectable()
export class AgentStateService {
  private readonly logger = new Logger(AgentStateService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @Inject('EVENT_BUS')
    private readonly eventBus: EventBusPort,
  ) {}

  async setStatus(userId: string, status: AgentStatus): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new Error(`User ${userId} not found`);

    const oldStatus = user.status;
    user.status = status;
    user.lastStatusChangedAt = new Date();
    await this.userRepository.save(user);

    this.logger.log(
      `Agent ${user.username} changed status from ${oldStatus} to ${status}`,
    );

    await this.eventBus.publish({
      type: 'agent.status_changed',
      organizationId: user.organizationId,
      payload: { userId, oldStatus, newStatus: status },
      timestamp: new Date(),
    });
  }

  async isAvailable(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOneBy({ id: userId });
    return user?.status === AgentStatus.AVAILABLE;
  }

  async getBestAvailableAgent(
    orgId: string,
    requiredSkills: string[],
  ): Promise<UserEntity | null> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.organizationId = :orgId', { orgId })
      .andWhere('user.status = :status', { status: AgentStatus.AVAILABLE });

    if (requiredSkills.length > 0) {
      // Basic skill matching: must have all required skills
      requiredSkills.forEach((skill, index) => {
        query.andWhere(`user.skills LIKE :skill${index}`, {
          [`skill${index}`]: `%${skill}%`,
        });
      });
    }

    // Pick the one who has been idle the longest (industry standard LRU)
    return await query.orderBy('user.lastStatusChangedAt', 'ASC').getOne();
  }
}

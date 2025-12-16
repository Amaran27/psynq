import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CallParticipant } from '../interfaces/call-participant.interface';
import { CallParticipantEntity } from '../entities/call-participant.entity';
import { CallGateway } from '../call.gateway';

@Injectable()
export class CallParticipantService {
  constructor(
    @InjectRepository(CallParticipantEntity)
    private readonly participantRepository: Repository<CallParticipantEntity>,
    private readonly gateway: CallGateway
  ) {}

  /**
   * Gets all participants for a call
   */
  async getParticipantsByCallId(callId: string): Promise<CallParticipant[]> {
    return this.participantRepository.find({
      where: { callId },
      order: { joinedAt: 'ASC' }
    });
  }

  /**
   * Gets a specific participant by their ID
   */
  async getParticipantById(participantId: string): Promise<CallParticipant | null> {
    return this.participantRepository.findOne({ where: { id: participantId } });
  }

  /**
   * Adds a participant to a call
   */
  async addParticipant(participant: Omit<CallParticipant, 'id' | 'joinedAt'>): Promise<CallParticipant> {
    const newParticipant = this.participantRepository.create({
      ...participant,
      id: this.generateParticipantId(),
      joinedAt: new Date(),
      isMuted: participant.participantType === 'supervisor' ? true : participant.isMuted,
      isOnHold: false
    });
    
    const saved = await this.participantRepository.save(newParticipant);
    
    // Emit real-time update
    this.gateway.server.emit('participantAdded', saved);
    
    return saved;
  }

  /**
   * Updates a participant's mute state
   */
  async updateParticipantMuteState(participantId: string, isMuted: boolean): Promise<CallParticipant | null> {
    const participant = await this.getParticipantById(participantId);
    if (!participant) return null;

    const updated = await this.participantRepository.save({
      ...participant,
      isMuted,
      updatedAt: new Date()
    });

    // Emit real-time update
    this.gateway.server.emit('participantUpdated', updated);
    
    return updated;
  }

  /**
   * Updates a participant's hold state
   */
  async updateParticipantHoldState(participantId: string, isOnHold: boolean): Promise<CallParticipantEntity | null> {
    const participant = await this.getParticipantById(participantId);
    if (!participant) return null;

    const updated = await this.participantRepository.save({
      ...participant,
      isOnHold,
      updatedAt: new Date()
    });

    // Emit real-time update
    this.gateway.server.emit('participantUpdated', updated);
    
    return updated;
  }

  /**
   * Removes a participant from a call
   */
  async removeParticipant(participantId: string): Promise<void> {
    const participant = await this.getParticipantById(participantId);
    if (!participant) return;

    await this.participantRepository.save({
      ...participant,
      leftAt: new Date()
    });

    // Emit real-time update
    this.gateway.server.emit('participantRemoved', { participantId, callId: participant.callId });
  }

  /**
   * Gets all supervisors for a call
   */
  async getSupervisorsByCallId(callId: string): Promise<CallParticipantEntity[]> {
    return this.participantRepository.find({
      where: { callId, participantType: 'supervisor', leftAt: IsNull() }
    });
  }

  /**
   * Gets the agent for a call
   */
  async getAgentByCallId(callId: string): Promise<CallParticipantEntity | null> {
    return this.participantRepository.findOne({
      where: { callId, participantType: 'agent', leftAt: IsNull() }
    });
  }

  /**
   * Gets the customer for a call
   */
  async getCustomerByCallId(callId: string): Promise<CallParticipantEntity | null> {
    return this.participantRepository.findOne({
      where: { callId, participantType: 'customer', leftAt: IsNull() }
    });
  }

  /**
   * Generates a unique participant ID
   */
  private generateParticipantId(): string {
    return `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
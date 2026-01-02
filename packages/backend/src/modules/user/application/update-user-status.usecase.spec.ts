import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateUserStatusUseCase } from './update-user-status.usecase';
import { User, UserRole } from '../domain/user.domain';
import { IUserRepository } from '../ports/user-repository.port';
import { AgentStatus } from '@psynq/core';

describe('UpdateUserStatusUseCase', () => {
  let useCase: UpdateUserStatusUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  const mockAgent = new User(
    '123e4567-e89b-12d3-a456-426614174000',
    'agent1',
    'agent@example.com',
    'hashed_password',
    'Agent',
    'One',
    '+1234567890',
    null,
    [UserRole.AGENT],
    UserRole.AGENT,
    AgentStatus.AVAILABLE,
    ['sales'],
    null,
    new Date(),
    new Date(),
  );

  const mockSupervisor = new User(
    '223e4567-e89b-12d3-a456-426614174001',
    'supervisor1',
    'supervisor@example.com',
    'hashed_password',
    'Supervisor',
    'One',
    '+1234567890',
    null,
    [UserRole.SUPERVISOR],
    UserRole.SUPERVISOR,
    AgentStatus.OFFLINE,
    [],
    null,
    new Date(),
    new Date(),
  );

  beforeEach(async () => {
    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      findByRole: jest.fn(),
      findByStatus: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      existsByUsername: jest.fn(),
      existsByEmail: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserStatusUseCase,
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    useCase = module.get<UpdateUserStatusUseCase>(UpdateUserStatusUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should update agent status successfully', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockAgent);
      mockUserRepository.save.mockResolvedValue(mockAgent);

      // Act
      const result = await useCase.execute(
        '123e4567-e89b-12d3-a456-426614174000',
        AgentStatus.BUSY,
      );

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
      );
      expect(mockAgent.status).toBe(AgentStatus.BUSY);
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockAgent);
      expect(result).toEqual(mockAgent);
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute('non-existent-id', AgentStatus.BUSY),
      ).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user is not an agent', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockSupervisor);

      // Act & Assert
      await expect(
        useCase.execute(
          '223e4567-e89b-12d3-a456-426614174001',
          AgentStatus.BUSY,
        ),
      ).rejects.toThrow(
        new BadRequestException('Only agents can have status updates'),
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      // Arrange: Agent is AVAILABLE, cannot go directly to WRAP_UP (invalid in domain rules)
      const agentWithOfflineStatus = new User(
        '123e4567-e89b-12d3-a456-426614174000',
        'agent1',
        'agent@example.com',
        'hashed_password',
        'Agent',
        'One',
        '+1234567890',
        null,
        [UserRole.AGENT],
        UserRole.AGENT,
        AgentStatus.OFFLINE,
        ['sales'],
        null,
        new Date(),
        new Date(),
      );
      mockUserRepository.findById.mockResolvedValue(agentWithOfflineStatus);

      // Act & Assert
      await expect(
        useCase.execute(
          '123e4567-e89b-12d3-a456-426614174000',
          AgentStatus.BUSY, // Cannot go from OFFLINE to BUSY
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should allow valid status transitions', async () => {
      // Arrange
      const transitions = [
        { from: AgentStatus.OFFLINE, to: AgentStatus.AVAILABLE },
        { from: AgentStatus.AVAILABLE, to: AgentStatus.BUSY },
        { from: AgentStatus.BUSY, to: AgentStatus.WRAP_UP },
        { from: AgentStatus.WRAP_UP, to: AgentStatus.AVAILABLE },
        { from: AgentStatus.AVAILABLE, to: AgentStatus.BREAK },
        { from: AgentStatus.BREAK, to: AgentStatus.OFFLINE },
      ];

      for (const { from, to } of transitions) {
        const agent = new User(
          '123e4567-e89b-12d3-a456-426614174000',
          'agent1',
          'agent@example.com',
          'hashed_password',
          'Agent',
          'One',
          '+1234567890',
          null,
          [UserRole.AGENT],
          UserRole.AGENT,
          from,
          ['sales'],
          null,
          new Date(),
          new Date(),
        );
        mockUserRepository.findById.mockResolvedValue(agent);
        mockUserRepository.save.mockResolvedValue(agent);

        // Act
        await useCase.execute('123e4567-e89b-12d3-a456-426614174000', to);

        // Assert
        expect(agent.status).toBe(to);
        expect(mockUserRepository.save).toHaveBeenCalled();
      }
    });

    it('should update lastStatusChangedAt timestamp', async () => {
      // Arrange
      const oldTimestamp = mockAgent.lastStatusChangedAt;
      mockUserRepository.findById.mockResolvedValue(mockAgent);
      mockUserRepository.save.mockResolvedValue(mockAgent);

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      await useCase.execute(
        '123e4567-e89b-12d3-a456-426614174000',
        AgentStatus.BUSY,
      );

      // Assert
      expect(mockAgent.lastStatusChangedAt).not.toEqual(oldTimestamp);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });
  });
});

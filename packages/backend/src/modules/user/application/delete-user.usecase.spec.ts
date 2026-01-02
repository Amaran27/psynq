import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeleteUserUseCase } from './delete-user.usecase';
import { User, UserRole } from '../domain/user.domain';
import { IUserRepository } from '../ports/user-repository.port';
import { AgentStatus } from '@psynq/core';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  const mockUser = new User(
    '123e4567-e89b-12d3-a456-426614174000',
    'testuser',
    'test@example.com',
    'hashed_password',
    'Test',
    'User',
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
        DeleteUserUseCase,
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    useCase = module.get<DeleteUserUseCase>(DeleteUserUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should delete user successfully', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockResolvedValue(undefined);

      // Act
      await useCase.execute('123e4567-e89b-12d3-a456-426614174000');

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
      );
      expect(mockUserRepository.delete).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('should include user ID in error message', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(userId)).rejects.toThrow(
        `User with ID ${userId} not found`,
      );
    });

    it('should handle repository delete errors', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        useCase.execute('123e4567-e89b-12d3-a456-426614174000'),
      ).rejects.toThrow('Database error');
    });

    it('should check user existence before deletion', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockResolvedValue(undefined);

      // Act
      await useCase.execute('123e4567-e89b-12d3-a456-426614174000');

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledBefore(
        mockUserRepository.delete as jest.Mock,
      );
    });
  });
});

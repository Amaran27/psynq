import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetUserUseCase } from './get-user.usecase';
import { User, UserRole } from '../domain/user.domain';
import { IUserRepository } from '../ports/user-repository.port';
import { AgentStatus } from '@psynq/core';

describe('GetUserUseCase', () => {
  let useCase: GetUserUseCase;
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
    AgentStatus.AVAILABLE,
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
        GetUserUseCase,
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetUserUseCase>(GetUserUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return user when found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await useCase.execute('123e4567-e89b-12d3-a456-426614174000');

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('non-existent-id');
    });

    it('should include correct error message', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(userId)).rejects.toThrow(
        `User with ID ${userId} not found`,
      );
    });
  });

  describe('findByUsername', () => {
    it('should return user when found by username', async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);

      // Act
      const result = await useCase.findByUsername('testuser');

      // Assert
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by username', async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(null);

      // Act
      const result = await useCase.findByUsername('nonexistent');

      // Assert
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('nonexistent');
      expect(result).toBeNull();
    });
  });
});

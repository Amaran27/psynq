import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ChangePasswordUseCase } from './change-password.usecase';
import { User, UserRole } from '../domain/user.domain';
import { IUserRepository, IPasswordService } from '../ports/user-repository.port';
import { AgentStatus } from '@psynq/core';

describe('ChangePasswordUseCase', () => {
  let useCase: ChangePasswordUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockPasswordService: jest.Mocked<IPasswordService>;

  const mockUser = new User(
    '123e4567-e89b-12d3-a456-426614174000',
    'testuser',
    'test@example.com',
    'old_hashed_password',
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

    mockPasswordService = {
      hash: jest.fn(),
      compare: jest.fn(),
    } as jest.Mocked<IPasswordService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangePasswordUseCase,
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
        {
          provide: 'IPasswordService',
          useValue: mockPasswordService,
        },
      ],
    }).compile();

    useCase = module.get<ChangePasswordUseCase>(ChangePasswordUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should change password successfully', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(true);
      mockPasswordService.hash.mockResolvedValue('new_hashed_password');
      mockUserRepository.save.mockResolvedValue(mockUser);

      // Act
      await useCase.execute(
        '123e4567-e89b-12d3-a456-426614174000',
        'oldPassword123',
        'newPassword456',
      );

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
      );
      expect(mockPasswordService.compare).toHaveBeenCalledWith(
        'oldPassword123',
        'old_hashed_password',
      );
      expect(mockPasswordService.hash).toHaveBeenCalledWith('newPassword456');
      expect(mockUser.password).toBe('new_hashed_password');
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute('non-existent-id', 'oldPass', 'newPass'),
      ).rejects.toThrow(NotFoundException);
      expect(mockPasswordService.compare).not.toHaveBeenCalled();
      expect(mockPasswordService.hash).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if current password is incorrect', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(
        useCase.execute(
          '123e4567-e89b-12d3-a456-426614174000',
          'wrongPassword',
          'newPassword456',
        ),
      ).rejects.toThrow(new BadRequestException('Current password is incorrect'));
      expect(mockPasswordService.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should handle password hashing errors', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(true);
      mockPasswordService.hash.mockRejectedValue(new Error('Hashing failed'));

      // Act & Assert
      await expect(
        useCase.execute(
          '123e4567-e89b-12d3-a456-426614174000',
          'oldPassword123',
          'newPassword456',
        ),
      ).rejects.toThrow('Hashing failed');
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should handle repository save errors', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(true);
      mockPasswordService.hash.mockResolvedValue('new_hashed_password');
      mockUserRepository.save.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        useCase.execute(
          '123e4567-e89b-12d3-a456-426614174000',
          'oldPassword123',
          'newPassword456',
        ),
      ).rejects.toThrow('Database error');
    });
  });
});

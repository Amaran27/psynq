import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AssignRolesUseCase } from './assign-roles.usecase';
import { User, UserRole } from '../domain/user.domain';
import { IUserRepository } from '../ports/user-repository.port';
import { AgentStatus } from '@psynq/core';

describe('AssignRolesUseCase', () => {
  let useCase: AssignRolesUseCase;
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
        AssignRolesUseCase,
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    useCase = module.get<AssignRolesUseCase>(AssignRolesUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should assign roles successfully', async () => {
      // Arrange
      const newRoles = [UserRole.AGENT, UserRole.SUPERVISOR];
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      // Act
      const result = await useCase.execute(
        '123e4567-e89b-12d3-a456-426614174000',
        newRoles,
        UserRole.SUPERVISOR,
      );

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
      );
      expect(mockUser.roles).toEqual(newRoles);
      expect(mockUser.primaryRole).toBe(UserRole.SUPERVISOR);
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute('non-existent-id', [UserRole.AGENT]),
      ).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should set default primary role if not provided', async () => {
      // Arrange
      const newRoles = [UserRole.AGENT, UserRole.SUPERVISOR];
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      // Act
      await useCase.execute('123e4567-e89b-12d3-a456-426614174000', newRoles);

      // Assert
      expect(mockUser.roles).toEqual(newRoles);
      expect(mockUser.primaryRole).toBe(UserRole.AGENT); // First role becomes primary
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw error if empty roles array', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute('123e4567-e89b-12d3-a456-426614174000', []),
      ).rejects.toThrow('At least one role must be assigned');
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error if primary role not in roles array', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        useCase.execute(
          '123e4567-e89b-12d3-a456-426614174000',
          [UserRole.AGENT],
          UserRole.ADMIN, // Not in roles array
        ),
      ).rejects.toThrow('Primary role must be one of the assigned roles');
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should handle single role assignment', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      // Act
      await useCase.execute(
        '123e4567-e89b-12d3-a456-426614174000',
        [UserRole.ADMIN],
      );

      // Assert
      expect(mockUser.roles).toEqual([UserRole.ADMIN]);
      expect(mockUser.primaryRole).toBe(UserRole.ADMIN);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should handle all roles assignment', async () => {
      // Arrange
      const allRoles = [
        UserRole.AGENT,
        UserRole.SUPERVISOR,
        UserRole.ADMIN,
        UserRole.SYSTEM_ADMIN,
      ];
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      // Act
      await useCase.execute(
        '123e4567-e89b-12d3-a456-426614174000',
        allRoles,
        UserRole.SYSTEM_ADMIN,
      );

      // Assert
      expect(mockUser.roles).toEqual(allRoles);
      expect(mockUser.primaryRole).toBe(UserRole.SYSTEM_ADMIN);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });
  });
});

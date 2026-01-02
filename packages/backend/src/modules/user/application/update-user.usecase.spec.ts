import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateUserUseCase } from './update-user.usecase';
import { User, UserRole, UserUpdateData } from '../domain/user.domain';
import { IUserRepository } from '../ports/user-repository.port';
import { AgentStatus } from '@psynq/core';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
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
        UpdateUserUseCase,
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    useCase = module.get<UpdateUserUseCase>(UpdateUserUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should update user successfully', async () => {
      // Arrange
      const updateData: UserUpdateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+9876543210',
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      // Act
      const result = await useCase.execute(
        '123e4567-e89b-12d3-a456-426614174000',
        updateData,
      );

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
      );
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute('non-existent-id', { firstName: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update email if no conflict', async () => {
      // Arrange
      const updateData: UserUpdateData = {
        email: 'newemail@example.com',
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockUserRepository.save.mockResolvedValue(mockUser);

      // Act
      await useCase.execute('123e4567-e89b-12d3-a456-426614174000', updateData);

      // Assert
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith(
        'newemail@example.com',
      );
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already in use', async () => {
      // Arrange
      const updateData: UserUpdateData = {
        email: 'taken@example.com',
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.existsByEmail.mockResolvedValue(true);

      // Act & Assert
      await expect(
        useCase.execute('123e4567-e89b-12d3-a456-426614174000', updateData),
      ).rejects.toThrow(new BadRequestException('Email already in use'));
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should not check email conflict if email unchanged', async () => {
      // Arrange
      const updateData: UserUpdateData = {
        firstName: 'NewName',
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      // Act
      await useCase.execute('123e4567-e89b-12d3-a456-426614174000', updateData);

      // Assert
      expect(mockUserRepository.existsByEmail).not.toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should update skills array', async () => {
      // Arrange
      const updateData: UserUpdateData = {
        skills: ['technical', 'support', 'sales'],
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      // Act
      await useCase.execute('123e4567-e89b-12d3-a456-426614174000', updateData);

      // Assert
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockUser.skills).toEqual(['technical', 'support', 'sales']);
    });
  });
});

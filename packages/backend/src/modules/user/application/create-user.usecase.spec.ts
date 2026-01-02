import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CreateUserUseCase } from './create-user.usecase';
import { User, UserRole, CreateUserData } from '../domain/user.domain';
import { IUserRepository, IPasswordService } from '../ports/user-repository.port';
import { AgentStatus } from '@psynq/core';

/**
 * Unit Tests for CreateUserUseCase
 * 
 * Tests hexagonal architecture use case:
 * - Mocks ports (interfaces), not concrete implementations
 * - Verifies business logic orchestration
 * - Tests error handling and validation
 */
describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockPasswordService: jest.Mocked<IPasswordService>;

  // Test data
  const createUserData: CreateUserData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890',
    roles: [UserRole.AGENT],
    status: AgentStatus.OFFLINE,
    skills: ['sales', 'support'],
  };

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
    ['sales', 'support'],
    null,
    new Date(),
    new Date(),
  );

  beforeEach(async () => {
    // Create mock implementations of ports
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
        CreateUserUseCase,
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

    useCase = module.get<CreateUserUseCase>(CreateUserUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create a new user successfully', async () => {
      // Arrange
      mockUserRepository.existsByUsername.mockResolvedValue(false);
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockPasswordService.hash.mockResolvedValue('hashed_password');
      mockUserRepository.create.mockResolvedValue(mockUser);

      // Act
      const result = await useCase.execute(createUserData);

      // Assert
      expect(mockUserRepository.existsByUsername).toHaveBeenCalledWith('testuser');
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockPasswordService.hash).toHaveBeenCalledWith('password123');
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        createUserData,
        'hashed_password',
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if username already exists', async () => {
      // Arrange
      mockUserRepository.existsByUsername.mockResolvedValue(true);

      // Act & Assert
      await expect(useCase.execute(createUserData)).rejects.toThrow(
        new ConflictException('Username already exists'),
      );
      expect(mockUserRepository.existsByUsername).toHaveBeenCalledWith('testuser');
      expect(mockPasswordService.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      mockUserRepository.existsByUsername.mockResolvedValue(false);
      mockUserRepository.existsByEmail.mockResolvedValue(true);

      // Act & Assert
      await expect(useCase.execute(createUserData)).rejects.toThrow(
        new ConflictException('Email already exists'),
      );
      expect(mockUserRepository.existsByUsername).toHaveBeenCalledWith('testuser');
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockPasswordService.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should create user with default roles if not provided', async () => {
      // Arrange
      const dataWithoutRoles: CreateUserData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      };

      mockUserRepository.existsByUsername.mockResolvedValue(false);
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockPasswordService.hash.mockResolvedValue('hashed_password');
      mockUserRepository.create.mockResolvedValue(mockUser);

      // Act
      await useCase.execute(dataWithoutRoles);

      // Assert
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        dataWithoutRoles,
        'hashed_password',
      );
    });

    it('should handle password hashing errors', async () => {
      // Arrange
      mockUserRepository.existsByUsername.mockResolvedValue(false);
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockPasswordService.hash.mockRejectedValue(new Error('Hashing failed'));

      // Act & Assert
      await expect(useCase.execute(createUserData)).rejects.toThrow('Hashing failed');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      // Arrange
      mockUserRepository.existsByUsername.mockResolvedValue(false);
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockPasswordService.hash.mockResolvedValue('hashed_password');
      mockUserRepository.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(useCase.execute(createUserData)).rejects.toThrow('Database error');
    });
  });
});

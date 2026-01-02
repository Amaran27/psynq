import { Test, TestingModule } from '@nestjs/testing';
import { ListUsersUseCase } from './list-users.usecase';
import { User, UserRole } from '../domain/user.domain';
import { IUserRepository, UserFilters, PaginatedUsers } from '../ports/user-repository.port';
import { AgentStatus } from '@psynq/core';

describe('ListUsersUseCase', () => {
  let useCase: ListUsersUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  const mockAgent1 = new User(
    '123e4567-e89b-12d3-a456-426614174000',
    'agent1',
    'agent1@example.com',
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

  const mockAgent2 = new User(
    '223e4567-e89b-12d3-a456-426614174001',
    'agent2',
    'agent2@example.com',
    'hashed_password',
    'Agent',
    'Two',
    '+1234567891',
    null,
    [UserRole.AGENT],
    UserRole.AGENT,
    AgentStatus.BUSY,
    ['support'],
    null,
    new Date(),
    new Date(),
  );

  const mockSupervisor = new User(
    '323e4567-e89b-12d3-a456-426614174002',
    'supervisor1',
    'supervisor@example.com',
    'hashed_password',
    'Supervisor',
    'One',
    '+1234567892',
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
        ListUsersUseCase,
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    useCase = module.get<ListUsersUseCase>(ListUsersUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return paginated users', async () => {
      // Arrange
      const filters: UserFilters = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };

      const paginatedResult: PaginatedUsers = {
        data: [mockAgent1, mockAgent2, mockSupervisor],
        total: 3,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockUserRepository.findAll.mockResolvedValue(paginatedResult);

      // Act
      const result = await useCase.execute(filters);

      // Assert
      expect(mockUserRepository.findAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual(paginatedResult);
      expect(result.data).toHaveLength(3);
    });

    it('should filter by search term', async () => {
      // Arrange
      const filters: UserFilters = {
        search: 'agent',
        page: 1,
        limit: 20,
      };

      const paginatedResult: PaginatedUsers = {
        data: [mockAgent1, mockAgent2],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockUserRepository.findAll.mockResolvedValue(paginatedResult);

      // Act
      const result = await useCase.execute(filters);

      // Assert
      expect(mockUserRepository.findAll).toHaveBeenCalledWith(filters);
      expect(result.data).toHaveLength(2);
    });

    it('should filter by roles', async () => {
      // Arrange
      const filters: UserFilters = {
        roles: [UserRole.AGENT],
        page: 1,
        limit: 20,
      };

      const paginatedResult: PaginatedUsers = {
        data: [mockAgent1, mockAgent2],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockUserRepository.findAll.mockResolvedValue(paginatedResult);

      // Act
      const result = await useCase.execute(filters);

      // Assert
      expect(mockUserRepository.findAll).toHaveBeenCalledWith(filters);
      expect(result.data).toHaveLength(2);
      expect(result.data.every((u) => u.hasRole(UserRole.AGENT))).toBe(true);
    });

    it('should filter by status', async () => {
      // Arrange
      const filters: UserFilters = {
        status: AgentStatus.AVAILABLE,
        page: 1,
        limit: 20,
      };

      const paginatedResult: PaginatedUsers = {
        data: [mockAgent1],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockUserRepository.findAll.mockResolvedValue(paginatedResult);

      // Act
      const result = await useCase.execute(filters);

      // Assert
      expect(mockUserRepository.findAll).toHaveBeenCalledWith(filters);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe(AgentStatus.AVAILABLE);
    });

    it('should handle pagination', async () => {
      // Arrange
      const filters: UserFilters = {
        page: 2,
        limit: 10,
      };

      const paginatedResult: PaginatedUsers = {
        data: [mockAgent2],
        total: 11,
        page: 2,
        limit: 10,
        totalPages: 2,
      };

      mockUserRepository.findAll.mockResolvedValue(paginatedResult);

      // Act
      const result = await useCase.execute(filters);

      // Assert
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(2);
    });

    it('should handle empty results', async () => {
      // Arrange
      const filters: UserFilters = {
        search: 'nonexistent',
        page: 1,
        limit: 20,
      };

      const paginatedResult: PaginatedUsers = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      mockUserRepository.findAll.mockResolvedValue(paginatedResult);

      // Act
      const result = await useCase.execute(filters);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findByRole', () => {
    it('should return users with specific role', async () => {
      // Arrange
      mockUserRepository.findByRole.mockResolvedValue([mockAgent1, mockAgent2]);

      // Act
      const result = await useCase.findByRole(UserRole.AGENT);

      // Assert
      expect(mockUserRepository.findByRole).toHaveBeenCalledWith(UserRole.AGENT);
      expect(result).toHaveLength(2);
      expect(result.every((u) => u.hasRole(UserRole.AGENT))).toBe(true);
    });

    it('should return empty array if no users with role', async () => {
      // Arrange
      mockUserRepository.findByRole.mockResolvedValue([]);

      // Act
      const result = await useCase.findByRole(UserRole.SYSTEM_ADMIN);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findAvailableAgents', () => {
    it('should return only available agents', async () => {
      // Arrange
      mockUserRepository.findByRole.mockResolvedValue([
        mockAgent1, // AVAILABLE
        mockAgent2, // BUSY - should be filtered out
      ]);

      // Act
      const result = await useCase.findAvailableAgents();

      // Assert
      expect(mockUserRepository.findByRole).toHaveBeenCalledWith(UserRole.AGENT);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(AgentStatus.AVAILABLE);
    });

    it('should return empty array if no available agents', async () => {
      // Arrange
      mockUserRepository.findByRole.mockResolvedValue([
        mockAgent2, // BUSY
      ]);

      // Act
      const result = await useCase.findAvailableAgents();

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle empty agent list', async () => {
      // Arrange
      mockUserRepository.findByRole.mockResolvedValue([]);

      // Act
      const result = await useCase.findAvailableAgents();

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should only include agents with AVAILABLE status', async () => {
      // Arrange
      const offlineAgent = new User(
        '423e4567-e89b-12d3-a456-426614174003',
        'agent3',
        'agent3@example.com',
        'hashed_password',
        'Agent',
        'Three',
        null,
        null,
        [UserRole.AGENT],
        UserRole.AGENT,
        AgentStatus.OFFLINE,
        [],
        null,
        new Date(),
        new Date(),
      );

      mockUserRepository.findByRole.mockResolvedValue([
        mockAgent1, // AVAILABLE
        mockAgent2, // BUSY
        offlineAgent, // OFFLINE
      ]);

      // Act
      const result = await useCase.findAvailableAgents();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockAgent1.id);
      expect(result[0].status).toBe(AgentStatus.AVAILABLE);
    });
  });
});

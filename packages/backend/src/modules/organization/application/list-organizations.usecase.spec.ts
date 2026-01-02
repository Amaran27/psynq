import { Test, TestingModule } from '@nestjs/testing';
import { ListOrganizationsUseCase } from './list-organizations.usecase';
import { Organization } from '../domain/organization.domain';
import {
  ORGANIZATION_REPOSITORY_PORT,
  OrganizationRepositoryPort,
} from '../ports/organization-repository.port';

describe('ListOrganizationsUseCase', () => {
  let useCase: ListOrganizationsUseCase;
  let mockRepository: jest.Mocked<OrganizationRepositoryPort>;

  const mockOrg1 = new Organization(
    '123e4567-e89b-12d3-a456-426614174000',
    'Organization One',
    'org-one',
    'active',
    new Date('2025-01-01'),
    new Date('2025-01-01'),
  );

  const mockOrg2 = new Organization(
    '223e4567-e89b-12d3-a456-426614174001',
    'Organization Two',
    'org-two',
    'active',
    new Date('2025-01-02'),
    new Date('2025-01-02'),
  );

  const mockOrg3 = new Organization(
    '323e4567-e89b-12d3-a456-426614174002',
    'Organization Three',
    'org-three',
    'inactive',
    new Date('2025-01-03'),
    new Date('2025-01-03'),
  );

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<OrganizationRepositoryPort>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListOrganizationsUseCase,
        {
          provide: ORGANIZATION_REPOSITORY_PORT,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<ListOrganizationsUseCase>(ListOrganizationsUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return all organizations', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue([mockOrg1, mockOrg2, mockOrg3]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockOrg1, mockOrg2, mockOrg3]);
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no organizations exist', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return organizations with all properties', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue([mockOrg1]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('slug');
      expect(result[0]).toHaveProperty('status');
      expect(result[0]).toHaveProperty('createdAt');
      expect(result[0]).toHaveProperty('updatedAt');
    });

    it('should handle repository errors', async () => {
      // Arrange
      mockRepository.findAll.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(useCase.execute()).rejects.toThrow('Database error');
    });

    it('should return organizations with different statuses', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue([mockOrg1, mockOrg2, mockOrg3]);

      // Act
      const result = await useCase.execute();

      // Assert
      const activeOrgs = result.filter((org) => org.status === 'active');
      const inactiveOrgs = result.filter((org) => org.status === 'inactive');
      expect(activeOrgs).toHaveLength(2);
      expect(inactiveOrgs).toHaveLength(1);
    });

    it('should preserve organization order from repository', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue([mockOrg3, mockOrg1, mockOrg2]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result[0].name).toBe('Organization Three');
      expect(result[1].name).toBe('Organization One');
      expect(result[2].name).toBe('Organization Two');
    });
  });
});

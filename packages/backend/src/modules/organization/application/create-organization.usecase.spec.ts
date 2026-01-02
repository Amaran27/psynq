import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CreateOrganizationUseCase } from './create-organization.usecase';
import { Organization } from '../domain/organization.domain';
import {
  ORGANIZATION_REPOSITORY_PORT,
  OrganizationRepositoryPort,
} from '../ports/organization-repository.port';

describe('CreateOrganizationUseCase', () => {
  let useCase: CreateOrganizationUseCase;
  let mockRepository: jest.Mocked<OrganizationRepositoryPort>;

  const mockOrg = new Organization(
    '123e4567-e89b-12d3-a456-426614174000',
    'Test Organization',
    'test-org',
    'active',
    new Date(),
    new Date(),
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
        CreateOrganizationUseCase,
        {
          provide: ORGANIZATION_REPOSITORY_PORT,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<CreateOrganizationUseCase>(CreateOrganizationUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create organization successfully', async () => {
      // Arrange
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(mockOrg);

      // Act
      const result = await useCase.execute('Test Organization', 'test-org');

      // Assert
      expect(mockRepository.findByName).toHaveBeenCalledWith('Test Organization');
      expect(mockRepository.findBySlug).toHaveBeenCalledWith('test-org');
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockOrg);
    });

    it('should throw ConflictException if name already exists', async () => {
      // Arrange
      mockRepository.findByName.mockResolvedValue(mockOrg);
      mockRepository.findBySlug.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute('Test Organization', 'new-slug'),
      ).rejects.toThrow(
        new ConflictException('Organization name or slug already exists'),
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if slug already exists', async () => {
      // Arrange
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.findBySlug.mockResolvedValue(mockOrg);

      // Act & Assert
      await expect(
        useCase.execute('New Organization', 'test-org'),
      ).rejects.toThrow(
        new ConflictException('Organization name or slug already exists'),
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if both name and slug exist', async () => {
      // Arrange
      mockRepository.findByName.mockResolvedValue(mockOrg);
      mockRepository.findBySlug.mockResolvedValue(mockOrg);

      // Act & Assert
      await expect(
        useCase.execute('Test Organization', 'test-org'),
      ).rejects.toThrow(ConflictException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should create organization with UUID', async () => {
      // Arrange
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.save.mockImplementation(async (org) => org);

      // Act
      const result = await useCase.execute('New Org', 'new-org');

      // Assert
      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(result.name).toBe('New Org');
      expect(result.slug).toBe('new-org');
    });

    it('should handle repository save errors', async () => {
      // Arrange
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        useCase.execute('Test Organization', 'test-org'),
      ).rejects.toThrow('Database error');
    });
  });
});

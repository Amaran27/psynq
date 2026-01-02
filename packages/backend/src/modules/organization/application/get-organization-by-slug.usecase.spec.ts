import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetOrganizationBySlugUseCase } from './get-organization-by-slug.usecase';
import { Organization } from '../domain/organization.domain';
import {
  ORGANIZATION_REPOSITORY_PORT,
  OrganizationRepositoryPort,
} from '../ports/organization-repository.port';

describe('GetOrganizationBySlugUseCase', () => {
  let useCase: GetOrganizationBySlugUseCase;
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
        GetOrganizationBySlugUseCase,
        {
          provide: ORGANIZATION_REPOSITORY_PORT,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetOrganizationBySlugUseCase>(
      GetOrganizationBySlugUseCase,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return organization when found by slug', async () => {
      // Arrange
      mockRepository.findBySlug.mockResolvedValue(mockOrg);

      // Act
      const result = await useCase.execute('test-org');

      // Assert
      expect(mockRepository.findBySlug).toHaveBeenCalledWith('test-org');
      expect(result).toEqual(mockOrg);
    });

    it('should throw NotFoundException when organization not found', async () => {
      // Arrange
      mockRepository.findBySlug.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute('non-existent-slug')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.findBySlug).toHaveBeenCalledWith('non-existent-slug');
    });

    it('should include slug in error message', async () => {
      // Arrange
      const slug = 'test-org';
      mockRepository.findBySlug.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(slug)).rejects.toThrow(
        `Organization with slug ${slug} not found`,
      );
    });

    it('should handle repository errors', async () => {
      // Arrange
      mockRepository.findBySlug.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(useCase.execute('test-org')).rejects.toThrow('Database error');
    });

    it('should work with slug containing hyphens', async () => {
      // Arrange
      const orgWithHyphens = new Organization(
        '123e4567-e89b-12d3-a456-426614174001',
        'Multi Word Organization',
        'multi-word-org',
        'active',
        new Date(),
        new Date(),
      );
      mockRepository.findBySlug.mockResolvedValue(orgWithHyphens);

      // Act
      const result = await useCase.execute('multi-word-org');

      // Assert
      expect(result.slug).toBe('multi-word-org');
      expect(result.name).toBe('Multi Word Organization');
    });
  });
});

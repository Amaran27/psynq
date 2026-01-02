import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetOrganizationUseCase } from './get-organization.usecase';
import { Organization } from '../domain/organization.domain';
import {
  ORGANIZATION_REPOSITORY_PORT,
  OrganizationRepositoryPort,
} from '../ports/organization-repository.port';

describe('GetOrganizationUseCase', () => {
  let useCase: GetOrganizationUseCase;
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
        GetOrganizationUseCase,
        {
          provide: ORGANIZATION_REPOSITORY_PORT,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetOrganizationUseCase>(GetOrganizationUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return organization when found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockOrg);

      // Act
      const result = await useCase.execute('123e4567-e89b-12d3-a456-426614174000');

      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
      );
      expect(result).toEqual(mockOrg);
    });

    it('should throw NotFoundException when organization not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.findById).toHaveBeenCalledWith('non-existent-id');
    });

    it('should include organization ID in error message', async () => {
      // Arrange
      const orgId = '123e4567-e89b-12d3-a456-426614174000';
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(orgId)).rejects.toThrow(
        `Organization with ID ${orgId} not found`,
      );
    });

    it('should handle repository errors', async () => {
      // Arrange
      mockRepository.findById.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        useCase.execute('123e4567-e89b-12d3-a456-426614174000'),
      ).rejects.toThrow('Database error');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PacingEngineService } from './pacing-engine.service';
import { PACING_ENGINE_REPOSITORY_PORT } from '../ports/pacing-engine-repository.port';
import { PacingEngine } from '../domain/pacing-engine.domain';
import { PacingAlgorithm, PacingStatus } from '../../../entities/dialer/pacing-engine.entity';
import { CreatePacingEngineDto } from '../dto/create-pacing-engine.dto';
import { UpdatePacingEngineDto } from '../dto/update-pacing-engine.dto';

describe('PacingEngineService', () => {
  let service: PacingEngineService;
  let repository: any;

  const mockPacingEngineProps = {
    id: 'pacing-1',
    campaignId: 'campaign-1',
    sessionId: 'session-1',
    organizationId: 'org-1',
    algorithm: PacingAlgorithm.ERLANG_C,
    status: PacingStatus.IDLE,
    targetAbandonmentRate: 3.0,
    maxConcurrentCalls: 10,
    linesPerAgent: 1,
    dialTimeoutSeconds: 30,
    minAgentsRequired: 5,
    availableAgents: 0,
    busyAgents: 0,
    activeCalls: 0,
    queuedCalls: 0,
    avgAnswerTimeSeconds: 0,
    avgCallDurationSeconds: 0,
    contactRate: 0.5,
    actualAbandonmentRate: 0,
    totalCallsDialed: 0,
    totalCallsAnswered: 0,
    totalCallsAbandoned: 0,
    totalCallsConnected: 0,
    customParameters: { test: 'value' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByCampaignId: jest.fn(),
      findBySessionId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PacingEngineService,
        { provide: PACING_ENGINE_REPOSITORY_PORT, useValue: repository },
      ],
    }).compile();

    service = module.get<PacingEngineService>(PacingEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new pacing engine', async () => {
      // Arrange
      const createDto: CreatePacingEngineDto = {
        campaignId: 'campaign-1',
        algorithm: PacingAlgorithm.ERLANG_C,
        targetAbandonmentRate: 3.0,
        maxConcurrentCalls: 10,
        linesPerAgent: 1,
        dialTimeoutSeconds: 30,
        minAgentsRequired: 5,
      };

      const mockPacingEngine = new PacingEngine(mockPacingEngineProps);
      repository.create.mockResolvedValue(mockPacingEngine);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(repository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.algorithm).toBe(PacingAlgorithm.ERLANG_C);
      expect(result.status).toBe(PacingStatus.IDLE);
    });

    it('should throw error if invalid abandonment rate', async () => {
      // Arrange
      const createDto: CreatePacingEngineDto = {
        algorithm: PacingAlgorithm.ERLANG_C,
        targetAbandonmentRate: 150, // Invalid: > 100
        maxConcurrentCalls: 10,
        linesPerAgent: 1,
        dialTimeoutSeconds: 30,
        minAgentsRequired: 5,
      };

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow();
    });

    it('should throw error if invalid lines per agent', async () => {
      // Arrange
      const createDto: CreatePacingEngineDto = {
        algorithm: PacingAlgorithm.ERLANG_C,
        targetAbandonmentRate: 3.0,
        maxConcurrentCalls: 10,
        linesPerAgent: 0, // Invalid: < 1
        dialTimeoutSeconds: 30,
        minAgentsRequired: 5,
      };

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    it('should return a pacing engine by ID', async () => {
      // Arrange
      const mockPacingEngine = new PacingEngine(mockPacingEngineProps);
      repository.findById.mockResolvedValue(mockPacingEngine);

      // Act
      const result = await service.findOne('pacing-1');

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('pacing-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('pacing-1');
    });

    it('should throw NotFoundException if pacing engine not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all pacing engines', async () => {
      // Arrange
      const mockEngines = [
        new PacingEngine(mockPacingEngineProps),
        new PacingEngine({ ...mockPacingEngineProps, id: 'pacing-2' }),
      ];
      repository.findAll.mockResolvedValue(mockEngines);

      // Act
      const result = await service.findAll({});

      // Assert
      expect(repository.findAll).toHaveBeenCalledWith({});
      expect(result).toHaveLength(2);
    });

    it('should filter by campaign ID', async () => {
      // Arrange
      const mockEngine = new PacingEngine(mockPacingEngineProps);
      repository.findAll.mockResolvedValue([mockEngine]);

      // Act
      const result = await service.findAll({ campaignId: 'campaign-1' });

      // Assert
      expect(repository.findAll).toHaveBeenCalledWith({ campaignId: 'campaign-1' });
      expect(result).toHaveLength(1);
    });

    it('should filter by status', async () => {
      // Arrange
      const mockEngine = new PacingEngine({ ...mockPacingEngineProps, status: PacingStatus.RUNNING });
      repository.findAll.mockResolvedValue([mockEngine]);

      // Act
      const result = await service.findAll({ status: PacingStatus.RUNNING });

      // Assert
      expect(repository.findAll).toHaveBeenCalledWith({ status: PacingStatus.RUNNING });
      expect(result[0].status).toBe(PacingStatus.RUNNING);
    });
  });

  describe('findByCampaign', () => {
    it('should return pacing engine by campaign ID', async () => {
      // Arrange
      const mockEngine = new PacingEngine(mockPacingEngineProps);
      repository.findByCampaignId.mockResolvedValue(mockEngine);

      // Act
      const result = await service.findByCampaign('campaign-1');

      // Assert
      expect(repository.findByCampaignId).toHaveBeenCalledWith('campaign-1');
      expect(result?.campaignId).toBe('campaign-1');
    });

    it('should return null if not found', async () => {
      // Arrange
      repository.findByCampaignId.mockResolvedValue(null);

      // Act
      const result = await service.findByCampaign('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findBySession', () => {
    it('should return pacing engine by session ID', async () => {
      // Arrange
      const mockEngine = new PacingEngine(mockPacingEngineProps);
      repository.findBySessionId.mockResolvedValue(mockEngine);

      // Act
      const result = await service.findBySession('session-1');

      // Assert
      expect(repository.findBySessionId).toHaveBeenCalledWith('session-1');
      expect(result?.sessionId).toBe('session-1');
    });
  });

  describe('update', () => {
    it('should update a pacing engine', async () => {
      // Arrange
      const mockEngine = new PacingEngine(mockPacingEngineProps);
      repository.findById.mockResolvedValue(mockEngine);

      const updatedEngine = new PacingEngine({
        ...mockPacingEngineProps,
        targetAbandonmentRate: 5.0,
      });
      repository.update.mockResolvedValue(updatedEngine);

      const updateDto: UpdatePacingEngineDto = {
        targetAbandonmentRate: 5.0,
      };

      // Act
      const result = await service.update('pacing-1', updateDto);

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('pacing-1');
      expect(repository.update).toHaveBeenCalled();
      expect(result.targetAbandonmentRate).toBe(5.0);
    });

    it('should throw NotFoundException if pacing engine not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a stopped pacing engine', async () => {
      // Arrange
      const mockEngine = new PacingEngine({
        ...mockPacingEngineProps,
        status: PacingStatus.STOPPED,
      });
      repository.findById.mockResolvedValue(mockEngine);
      repository.delete.mockResolvedValue(undefined);

      // Act
      await service.remove('pacing-1');

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('pacing-1');
      expect(repository.delete).toHaveBeenCalledWith('pacing-1');
    });

    it('should throw BadRequestException if pacing engine is running', async () => {
      // Arrange
      const mockEngine = new PacingEngine({
        ...mockPacingEngineProps,
        status: PacingStatus.RUNNING,
      });
      repository.findById.mockResolvedValue(mockEngine);

      // Act & Assert
      await expect(service.remove('pacing-1')).rejects.toThrow(BadRequestException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('start', () => {
    it('should start a pacing engine with sufficient agents', async () => {
      // Arrange
      const mockEngine = new PacingEngine({
        ...mockPacingEngineProps,
        availableAgents: 5,
        minAgentsRequired: 5,
      });
      repository.findById.mockResolvedValue(mockEngine);

      const startedEngine = new PacingEngine({
        ...mockPacingEngineProps,
        availableAgents: 5,
        minAgentsRequired: 5,
        status: PacingStatus.RUNNING,
      });
      repository.update.mockResolvedValue(startedEngine);

      // Act
      const result = await service.start('pacing-1');

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('pacing-1');
      expect(repository.update).toHaveBeenCalled();
      expect(result.status).toBe(PacingStatus.RUNNING);
    });

    it('should throw error if insufficient agents', async () => {
      // Arrange
      const mockEngine = new PacingEngine({
        ...mockPacingEngineProps,
        availableAgents: 2,
        minAgentsRequired: 5,
      });
      repository.findById.mockResolvedValue(mockEngine);

      // Act & Assert
      await expect(service.start('pacing-1')).rejects.toThrow();
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('pause', () => {
    it('should pause a running pacing engine', async () => {
      // Arrange
      const mockEngine = new PacingEngine({
        ...mockPacingEngineProps,
        status: PacingStatus.RUNNING,
      });
      repository.findById.mockResolvedValue(mockEngine);

      const pausedEngine = new PacingEngine({
        ...mockPacingEngineProps,
        status: PacingStatus.PAUSED,
      });
      repository.update.mockResolvedValue(pausedEngine);

      // Act
      const result = await service.pause('pacing-1');

      // Assert
      expect(result.status).toBe(PacingStatus.PAUSED);
    });

    it('should throw error if not running', async () => {
      // Arrange
      const mockEngine = new PacingEngine({
        ...mockPacingEngineProps,
        status: PacingStatus.IDLE,
      });
      repository.findById.mockResolvedValue(mockEngine);

      // Act & Assert
      await expect(service.pause('pacing-1')).rejects.toThrow();
    });
  });

  describe('resume', () => {
    it('should resume a paused pacing engine', async () => {
      // Arrange
      const mockEngine = new PacingEngine({
        ...mockPacingEngineProps,
        status: PacingStatus.PAUSED,
      });
      repository.findById.mockResolvedValue(mockEngine);

      const resumedEngine = new PacingEngine({
        ...mockPacingEngineProps,
        status: PacingStatus.RUNNING,
      });
      repository.update.mockResolvedValue(resumedEngine);

      // Act
      const result = await service.resume('pacing-1');

      // Assert
      expect(result.status).toBe(PacingStatus.RUNNING);
    });

    it('should throw error if not paused', async () => {
      // Arrange
      const mockEngine = new PacingEngine({
        ...mockPacingEngineProps,
        status: PacingStatus.IDLE,
      });
      repository.findById.mockResolvedValue(mockEngine);

      // Act & Assert
      await expect(service.resume('pacing-1')).rejects.toThrow();
    });
  });

  describe('stop', () => {
    it('should stop a pacing engine', async () => {
      // Arrange
      const mockEngine = new PacingEngine({
        ...mockPacingEngineProps,
        status: PacingStatus.RUNNING,
      });
      repository.findById.mockResolvedValue(mockEngine);

      const stoppedEngine = new PacingEngine({
        ...mockPacingEngineProps,
        status: PacingStatus.STOPPED,
      });
      repository.update.mockResolvedValue(stoppedEngine);

      // Act
      const result = await service.stop('pacing-1');

      // Assert
      expect(result.status).toBe(PacingStatus.STOPPED);
    });
  });

  describe('updateMetrics', () => {
    it('should update real-time metrics', async () => {
      // Arrange
      const mockEngine = new PacingEngine(mockPacingEngineProps);
      repository.findById.mockResolvedValue(mockEngine);
      repository.update.mockResolvedValue(mockEngine);

      const metrics = {
        availableAgents: 10,
        busyAgents: 5,
        activeCalls: 8,
        actualAbandonmentRate: 0.025,
      };

      // Act
      const result = await service.updateMetrics('pacing-1', metrics);

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('pacing-1');
      expect(repository.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('recordCallOutcome', () => {
    it('should record call outcomes and update statistics', async () => {
      // Arrange
      const mockEngine = new PacingEngine(mockPacingEngineProps);
      repository.findById.mockResolvedValue(mockEngine);
      repository.update.mockResolvedValue(mockEngine);

      const outcome = {
        dialed: 10,
        answered: 7,
        abandoned: 1,
        connected: 6,
      };

      // Act
      const result = await service.recordCallOutcome('pacing-1', outcome);

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('pacing-1');
      expect(repository.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getStatistics', () => {
    it('should return aggregated statistics', async () => {
      // Arrange
      repository.count.mockResolvedValue(5);
      repository.count
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(1) // idle
        .mockResolvedValueOnce(2) // running
        .mockResolvedValueOnce(1) // paused
        .mockResolvedValueOnce(1); // stopped

      const mockEngines = [
        new PacingEngine({ ...mockPacingEngineProps, algorithm: PacingAlgorithm.ERLANG_C }),
        new PacingEngine({ ...mockPacingEngineProps, id: 'pacing-2', algorithm: PacingAlgorithm.ERLANG_C }),
        new PacingEngine({ ...mockPacingEngineProps, id: 'pacing-3', algorithm: PacingAlgorithm.FIXED_RATIO }),
      ];
      repository.findAll.mockResolvedValue(mockEngines);

      // Act
      const result = await service.getStatistics({});

      // Assert
      expect(result.total).toBe(5);
      expect(result.byStatus).toBeDefined();
      expect(result.byAlgorithm).toBeDefined();
      expect(result.byAlgorithm[PacingAlgorithm.ERLANG_C]).toBe(2);
      expect(result.byAlgorithm[PacingAlgorithm.FIXED_RATIO]).toBe(1);
    });
  });
});

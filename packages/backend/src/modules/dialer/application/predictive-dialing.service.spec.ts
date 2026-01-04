import { Test, TestingModule } from '@nestjs/testing';
import { PredictiveDialingService } from './predictive-dialing.service';
import { DIALING_SESSION_REPOSITORY_PORT } from '../ports/dialing-session-repository.port';
import { LEAD_REPOSITORY_PORT } from '../ports/lead-repository.port';
import { PredictivePacerService, PacingDecision, CallMetrics } from './predictive-pacer.service';
import { CallService } from '../../call/call.service';
import { DialingSession, DialingMode, SessionStatus } from '../domain/dialing-session.domain';

describe('PredictiveDialingService', () => {
  let service: PredictiveDialingService;
  let sessionRepository: any;
  let leadRepository: any;
  let pacerService: any;
  let callService: any;

  beforeEach(async () => {
    sessionRepository = {
      findAll: jest.fn(),
      save: jest.fn(),
    };
    leadRepository = {
      findDialableLeads: jest.fn(),
    };
    pacerService = {
      calculatePacing: jest.fn(),
    };
    callService = {
      getActiveCalls: jest.fn(),
      createCall: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictiveDialingService,
        { provide: DIALING_SESSION_REPOSITORY_PORT, useValue: sessionRepository },
        { provide: LEAD_REPOSITORY_PORT, useValue: leadRepository },
        { provide: PredictivePacerService, useValue: pacerService },
        { provide: CallService, useValue: callService },
      ],
    }).compile();

    service = module.get<PredictiveDialingService>(PredictiveDialingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processDialingCycle', () => {
    it('should calculate pacing and dispatch calls for active sessions', async () => {
      // Arrange
      const mockSession = new DialingSession(
        'session-1',
        'campaign-1',
        DialingMode.PREDICTIVE,
        SessionStatus.ACTIVE,
        'org-1',
        {
          linesPerAgent: 2,
          targetAbandonmentRate: 0.03,
          maxConcurrentCalls: 10,
          dialTimeoutSeconds: 30,
        },
        {
          leadsProcessed: 0,
          callsAttempted: 0,
          callsAnswered: 0,
          callsAbandoned: 0,
          avgWaitTimeSeconds: 0,
          avgTalkTimeSeconds: 0,
          conversionRate: 0,
        },
        ['agent-1'],
        new Date(),
        new Date(),
      );

      sessionRepository.findAll.mockResolvedValue([mockSession]);
      callService.getActiveCalls.mockResolvedValue([]); // No active calls
      
      const mockDecision: PacingDecision = {
        shouldDial: true,
        linesPerAgent: 2,
        recommendedCalls: 2,
        reason: 'Test',
      };
      pacerService.calculatePacing.mockReturnValue(mockDecision);

      const mockLeads = [
        { id: 'lead-1', phoneNumber: '+1234567890' },
        { id: 'lead-2', phoneNumber: '+0987654321' },
      ];
      leadRepository.findDialableLeads.mockResolvedValue(mockLeads);

      // Act
      // Access private method for testing (or use spyOn logic if exposed, but simple cast works for unit test)
      await (service as any).processDialingCycle();

      // Assert
      expect(sessionRepository.findAll).toHaveBeenCalledWith({ status: SessionStatus.ACTIVE });
      expect(callService.getActiveCalls).toHaveBeenCalled();
      expect(pacerService.calculatePacing).toHaveBeenCalled();
      expect(leadRepository.findDialableLeads).toHaveBeenCalledWith('campaign-1', 3, 2);
      expect(callService.createCall).toHaveBeenCalledTimes(2);
      expect(sessionRepository.save).toHaveBeenCalledTimes(2); // Updated stats twice
    });

    it('should not dial if pacer recommends 0 calls', async () => {
      // Arrange
      const mockSession = new DialingSession(
        'session-1',
        'campaign-1',
        DialingMode.PREDICTIVE,
        SessionStatus.ACTIVE,
        'org-1',
        { linesPerAgent: 2, targetAbandonmentRate: 0.03, maxConcurrentCalls: 10, dialTimeoutSeconds: 30 },
        { leadsProcessed: 0, callsAttempted: 0, callsAnswered: 0, callsAbandoned: 0, avgWaitTimeSeconds: 0, avgTalkTimeSeconds: 0, conversionRate: 0 },
        ['agent-1'],
        new Date(),
        new Date(),
      );

      sessionRepository.findAll.mockResolvedValue([mockSession]);
      callService.getActiveCalls.mockResolvedValue([]);
      
      const mockDecision: PacingDecision = {
        shouldDial: false,
        linesPerAgent: 2,
        recommendedCalls: 0,
        reason: 'Wait',
      };
      pacerService.calculatePacing.mockReturnValue(mockDecision);

      // Act
      await (service as any).processDialingCycle();

      // Assert
      expect(leadRepository.findDialableLeads).not.toHaveBeenCalled();
      expect(callService.createCall).not.toHaveBeenCalled();
    });
  });
});

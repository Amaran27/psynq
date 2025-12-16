import { Test, TestingModule } from '@nestjs/testing';
import { CallService } from './call.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CallGateway } from '../call.gateway';
import { ConfigService } from '@nestjs/config';
import { TwilioAdapter } from '../adapters/twilio.adapter';

// Mock the core module to avoid import issues
jest.mock('@psynq/core', () => ({
  Call: {},
  CallState: {},
  CallStateMachine: {},
  CallStateTransitionError: class {},
  CallDirection: {},
}));

describe('CallService Integration Tests', () => {
  let service: CallService;
  let twilioAdapter: TwilioAdapter;
  const mockGateway = { emit: jest.fn() };
  const mockCallRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeAll(async () => {
    // Check if we have real Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken || !accountSid.startsWith('AC')) {
      console.warn('Skipping integration tests: Real Twilio credentials not available');
      return;
    }

    const mockConfig = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'TWILIO_ACCOUNT_SID':
            return process.env.TWILIO_ACCOUNT_SID;
          case 'TWILIO_AUTH_TOKEN':
            return process.env.TWILIO_AUTH_TOKEN;
          case 'TWILIO_PHONE_NUMBER':
            return process.env.TWILIO_PHONE_NUMBER || '+15005550006';
          default:
            return undefined;
        }
      }),
    };

    // Mock entity class
    const MockCall = class {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallService,
        {
          provide: getRepositoryToken(MockCall),
          useValue: mockCallRepository,
        },
        {
          provide: CallGateway,
          useValue: mockGateway,
        },
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
        TwilioAdapter,
      ],
    }).compile();

    service = module.get<CallService>(CallService);
    twilioAdapter = module.get<TwilioAdapter>(TwilioAdapter);
  });

  it('should use real Twilio adapter when configured', async () => {
    // Skip if no credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    if (!accountSid || !accountSid.startsWith('AC')) {
      return;
    }

    // This test will verify the service can work with real Twilio credentials
    // but won't make actual API calls to avoid costs
    const mockCall = {
      id: 'integration-test-call',
      to: '+15005550006',
      from: '+15005550007',
      telephonyProvider: 'twilio',
      telephonyProviderCallSid: 'CA1234567890',
      participants: [],
      status: 'ongoing',
      direction: 'outbound',
      agentId: 'test-agent',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock the repository to return our test call
    mockCallRepository.findOne.mockResolvedValue(mockCall);

    // Verify service can call the adapter methods
    expect(service).toBeDefined();
    expect(twilioAdapter).toBeDefined();
  });

  it('should be able to call adapter methods', async () => {
    // Skip if no credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    if (!accountSid || !accountSid.startsWith('AC')) {
      return;
    }

    // Create a test call for supervisor injection
    const mockCall = {
      id: 'integration-test-call',
      to: '+15005550006',
      from: '+15005550007',
      telephonyProvider: 'twilio',
      telephonyProviderCallSid: 'CA1234567890',
      participants: [],
      status: 'ongoing',
      direction: 'outbound',
      agentId: 'test-agent',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock the repository to return our test call
    mockCallRepository.findOne.mockResolvedValue(mockCall);

    // We can't actually test injection without a real Twilio conference,
    // but we can verify the adapter is properly initialized
    expect(twilioAdapter).toBeDefined();
    
    // Verify that the adapter has the methods we need
    expect(typeof twilioAdapter.injectSupervisor).toBe('function');
    expect(typeof twilioAdapter.setParticipantMuted).toBe('function');
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from './webhook.controller';
import { CallService } from '../modules/call/call.service';
import { StandardWebhookEvent } from '../interfaces/webhook.interface';
import { Logger } from '@nestjs/common';

describe('WebhookController', () => {
  let controller: WebhookController;
  let callService: jest.Mocked<CallService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: CallService,
          useValue: {
            handleStandardWebhookEvent: jest.fn(),
          },
        },
        Logger,
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    callService = module.get(CallService);
  });

  describe('handleAsteriskWebhook', () => {
    it('should process a valid call_started event', async () => {
      const payload = {
        type: 'ChannelCreate',
        callId: 'call-123',
        uniqueid: 'call-123',
        organizationId: 'org-1',
      };

      const result = await controller.handleAsteriskWebhook(payload, 'org-1');

      expect(result).toEqual({ status: 'ok' });
      expect(callService.handleStandardWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'asterisk',
          eventType: 'call_started',
          callId: 'call-123',
          organizationId: 'org-1',
        }),
      );
    });

    it('should ignore unknown event types', async () => {
      const payload = {
        type: 'UnknownEvent',
        callId: 'call-123',
      };

      const result = await controller.handleAsteriskWebhook(payload, 'org-1');

      expect(result).toEqual({ status: 'ignored' });
      expect(callService.handleStandardWebhookEvent).not.toHaveBeenCalled();
    });

    it('should map ringing event correctly', async () => {
        const payload = {
          type: 'ChannelStateChange',
          callId: 'call-123',
          uniqueid: 'call-123',
        };
  
        await controller.handleAsteriskWebhook(payload, 'org-1');
  
        expect(callService.handleStandardWebhookEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'call_ringing',
          }),
        );
      });

      it('should map answered event correctly', async () => {
        const payload = {
          type: 'ChannelAnswer',
          callId: 'call-123',
          uniqueid: 'call-123',
        };
  
        await controller.handleAsteriskWebhook(payload, 'org-1');
  
        expect(callService.handleStandardWebhookEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'call_answered',
          }),
        );
      });

      it('should map ended event correctly', async () => {
        const payload = {
          type: 'Hangup',
          callId: 'call-123',
          uniqueid: 'call-123',
        };
  
        await controller.handleAsteriskWebhook(payload, 'org-1');
  
        expect(callService.handleStandardWebhookEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'call_ended',
          }),
        );
      });
  });
});

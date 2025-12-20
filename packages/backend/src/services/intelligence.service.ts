import { Injectable, Inject, Logger } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { PsynqEvent, EventBusPort } from '../ports/event-bus.port';
import { SettingsService } from './settings.service';

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    @Inject('EVENT_BUS') private readonly eventBus: EventBusPort,
    private readonly settingsService: SettingsService,
  ) {}

  async analyzeSnippet(orgId: string, callId: string, agentId: string, text: string) {
    try {
      const config = await this.settingsService.getSetting(orgId, 'intelligence.openai.config', true);
      if (!config?.apiKey) return;

      const chat = new ChatOpenAI({
        openAIApiKey: config.apiKey,
        modelName: 'gpt-4o-mini',
        temperature: 0,
      });

      // Industry Standard: Provide real-time coaching tips
      const response = await chat.invoke([
        ['system', 'You are a real-time call center coach. Analyze the customer transcript and provide a 1-sentence Next Best Action for the agent.'],
        ['user', text]
      ]);

      const tip = response.content.toString();

      await this.eventBus.publish({
        type: 'intelligence.coaching_tip',
        organizationId: orgId,
        payload: { callId, agentId, tip },
        timestamp: new Date(),
      });

    } catch (e) {
      this.logger.error(`AI Analysis failed: ${e.message}`);
    }
  }
}

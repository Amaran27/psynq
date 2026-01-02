import { Injectable, Logger } from '@nestjs/common';
import {
  TranscriptionPort,
  TranscriptionEvent,
} from '../../ports/transcription.port';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { SettingsService } from '../../services/settings.service';

@Injectable()
export class DeepgramAdapter implements TranscriptionPort {
  private readonly logger = new Logger(DeepgramAdapter.name);
  private activeConnections: Map<string, any> = new Map();

  constructor(private readonly settingsService: SettingsService) {}

  async startTranscription(
    orgId: string,
    callId: string,
    callback: (event: TranscriptionEvent) => void,
  ): Promise<void> {
    try {
      const config = await this.settingsService.getSetting(
        orgId,
        'intelligence.deepgram.config',
        true,
      );
      if (!config?.apiKey) throw new Error('Deepgram API Key missing');

      const deepgram = createClient(config.apiKey);
      const connection = deepgram.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const text = data.channel.alternatives[0].transcript;
        if (text) {
          callback({
            callId,
            text,
            isFinal: data.is_final,
            confidence: data.channel.alternatives[0].confidence,
          });
        }
      });

      this.activeConnections.set(callId, connection);
      this.logger.log(`Deepgram transcription started for call ${callId}`);
    } catch (e) {
      this.logger.error(`Failed to start transcription: ${e.message}`);
    }
  }

  async stopTranscription(callId: string): Promise<void> {
    const conn = this.activeConnections.get(callId);
    if (conn) {
      conn.finish();
      this.activeConnections.delete(callId);
    }
  }
}

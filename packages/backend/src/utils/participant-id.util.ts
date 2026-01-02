import { CallParticipant } from '../interfaces/call-participant.interface';

/**
 * Creates a standardized participant ID format for Asterisk
 */
export function createStandardParticipantId(
  providerType: 'asterisk',
  callId: string,
  participantSid: string,
): string {
  // We use a prefix to allow for future multi-provider expansion if ever needed,
  // but optimized for Asterisk as the primary engine.
  return `asterisk:${participantSid}`;
}

/**
 * Extracts provider-specific participant data from a standardized participant ID
 */
export function extractParticipantData(participantId: string): {
  providerType: 'asterisk' | 'unknown';
  participantSid: string;
} {
  if (participantId.startsWith('asterisk:')) {
    return {
      providerType: 'asterisk',
      participantSid: participantId.split(':')[1],
    };
  }

  return {
    providerType: 'unknown',
    participantSid: participantId,
  };
}

/**
 * Gets the appropriate provider participant ID for operations
 */
export function getProviderParticipantId(participant: CallParticipant): string {
  // For Asterisk, the providerCallSid is the ARI channel ID
  if (participant?.providerCallSid) return participant.providerCallSid;

  // Extract from ID if sid is missing
  const data = extractParticipantData(participant.id);
  return data.participantSid;
}

import { CallParticipant } from '../interfaces/call-participant.interface';

/**
 * Creates a standardized participant ID format that works across all providers
 */
export function createStandardParticipantId(
  providerType: 'twilio' | 'asterisk' | 'infobip',
  callId: string,
  participantSid: string,
  additionalData?: {
    conferenceName?: string;
    twilioParticipantSid?: string;
  }
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  
  switch (providerType) {
    case 'twilio':
      // For Twilio, use conference:participant format when available
      if (additionalData?.conferenceName && additionalData?.twilioParticipantSid) {
        return `${additionalData.conferenceName}:${additionalData.twilioParticipantSid}`;
      }
      // Fallback to participant SID
      return `twilio_${participantSid}_${timestamp}_${random}`;
      
    case 'asterisk':
      // For Asterisk, use channel ID
      return `asterisk_${participantSid}_${timestamp}_${random}`;
      
    case 'infobip':
      // For Infobip, use the call leg ID
      return `infobip_${participantSid}_${timestamp}_${random}`;
      
    default:
      // Generic format
      return `unknown_${participantSid}_${timestamp}_${random}`;
  }
}

/**
 * Extracts provider-specific participant data from a standardized participant ID
 */
export function extractParticipantData(participantId: string): {
  providerType: 'twilio' | 'asterisk' | 'infobip' | 'unknown';
  participantSid: string;
  conferenceName?: string;
  twilioParticipantSid?: string;
} {
  // Check for Twilio conference format
  if (participantId.includes(':')) {
    const [conferenceName, twilioParticipantSid] = participantId.split(':');
    return {
      providerType: 'twilio',
      participantSid: participantId,
      conferenceName,
      twilioParticipantSid
    };
  }
  
  // Check for provider-specific prefixes
  if (participantId.startsWith('twilio_')) {
    const parts = participantId.split('_');
    return {
      providerType: 'twilio',
      participantSid: parts[1]
    };
  }
  
  if (participantId.startsWith('asterisk_')) {
    const parts = participantId.split('_');
    return {
      providerType: 'asterisk',
      participantSid: parts[1]
    };
  }
  
  if (participantId.startsWith('infobip_')) {
    const parts = participantId.split('_');
    return {
      providerType: 'infobip',
      participantSid: parts[1]
    };
  }
  
  // Unknown format
  return {
    providerType: 'unknown',
    participantSid: participantId
  };
}

/**
 * Gets the appropriate provider participant ID for operations
 */
export function getProviderParticipantId(participant: CallParticipant): string {
  // If provider-specific data already contains conference+participant SID (Twilio), prefer that
  if (participant?.providerSpecificData?.conferenceName && participant?.providerSpecificData?.twilioParticipantSid) {
    return `${participant.providerSpecificData.conferenceName}:${participant.providerSpecificData.twilioParticipantSid}`;
  }

  // Fallback to providerCallSid if available
  if (participant?.providerCallSid) return participant.providerCallSid;

  // As a final fallback, use participant id
  return participant.id;
}
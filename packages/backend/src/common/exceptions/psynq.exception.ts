export class PsynqException extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class TelephonyProviderError extends PsynqException {
  constructor(
    message: string,
    public provider: string,
    public originalError?: any,
  ) {
    super(`Telephony Provider Error (${provider}): ${message}`, 502);
  }
}

export class ConfigurationMissingError extends PsynqException {
  constructor(key: string, orgId?: string | null) {
    super(
      `Configuration missing for key: ${key}${orgId ? ` (Organization: ${orgId})` : ''}`,
      400,
    );
  }
}

export class InsufficientCapabilitiesError extends PsynqException {
  constructor(capability: string, provider: string) {
    super(
      `Provider ${provider} does not support capability: ${capability}`,
      403,
    );
  }
}

export class CallStateTransitionError extends PsynqException {
  constructor(currentState: string, attemptedState: string) {
    super(
      `Cannot transition call from ${currentState} to ${attemptedState}`,
      400,
    );
  }
}

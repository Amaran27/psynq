export interface TelephonyConnection {
  parameters: Record<string, any>;
  accept(): void;
  reject(): void;
  disconnect(): void;
  mute(isMuted: boolean): void;
}

export interface TelephonyClient {
  initialize(token: string): Promise<void>;
  connect(params: Record<string, string>): Promise<TelephonyConnection>;
  disconnectAll(): void;
  on(event: string, handler: (data?: any) => void): void;
  destroy(): void;
}

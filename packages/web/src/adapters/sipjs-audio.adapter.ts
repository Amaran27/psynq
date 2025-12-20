import { UserAgent, UserAgentOptions, Invitation, Session, SessionState, Registerer } from 'sip.js';
import { AudioPort, AudioDeviceStatus } from '../ports/audio.port';

export class SipJsAdapter implements AudioPort {
  private userAgent?: UserAgent;
  private registerer?: Registerer;
  private currentSession?: Session;
  private statusCallback?: (status: AudioDeviceStatus) => void;
  private incomingCallCallback?: (callId: string, from: string) => void;
  private isMuted: boolean = false;

    async initialize(config: { server: string, user: string, password?: string, displayName?: string }): Promise<void> {

      if (!config || !config.server || !config.user) {

        throw new Error('Invalid telephony configuration: missing server or user');

      }

      const cleanServer = config.server.replace('wss://', '').replace('ws://', '').split('/')[0] || '';
      const uri = UserAgent.makeURI(`sip:${config.user.trim()}@${cleanServer.trim()}`);

      if (!uri) {
        console.error('Failed to create SIP URI from:', `sip:${config.user}@${cleanServer}`);
        throw new Error('Invalid SIP URI');
      }

    const userAgentOptions: UserAgentOptions = {
      uri,
      transportOptions: {
        server: config.server
      },
      displayName: config.displayName || config.user,
      authorizationUsername: config.user,
      authorizationPassword: config.password,
    };

    this.userAgent = new UserAgent(userAgentOptions);
    this.registerer = new Registerer(this.userAgent);

    this.userAgent.delegate = {
      onInvite: (invitation: Invitation) => {
        this.currentSession = invitation;
        this.setupSessionListeners(invitation);
        if (this.incomingCallCallback) {
          this.incomingCallCallback(invitation.request.callId, invitation.remoteIdentity.uri.user || 'Unknown');
        }
      }
    };

    await this.userAgent.start();
    await this.registerer.register();
    this.notifyStatus();
  }

  async connect(target: string): Promise<void> {
    if (!this.userAgent) throw new Error('UserAgent not initialized');
    const targetUri = UserAgent.makeURI(`sip:${target}@${this.userAgent.configuration.uri.host}`);
    if (!targetUri) throw new Error('Invalid Target URI');

    const inviter = new (require('sip.js').Inviter)(this.userAgent, targetUri);
    this.currentSession = inviter;
    this.setupSessionListeners(inviter);
    await inviter.invite();
  }

  async disconnect(): Promise<void> {
    if (this.currentSession) {
      if (this.currentSession.state === SessionState.Established) {
        await this.currentSession.bye();
      } else if ((this.currentSession as any).cancel) {
        await (this.currentSession as any).cancel();
      }
      this.currentSession = undefined;
      this.notifyStatus();
    }
  }

  async setMuted(muted: boolean): Promise<void> {
    this.isMuted = muted;
    if (this.currentSession && (this.currentSession as any).sessionDescriptionHandler) {
      const sdh = (this.currentSession as any).sessionDescriptionHandler;
      // Note: SIP.js audio control varies by version, usually involves track manipulation
      this.logger('Muting track logic goes here');
    }
    this.notifyStatus();
  }

  onIncomingCall(callback: (callId: string, from: string) => void): void {
    this.incomingCallCallback = callback;
  }

  onStatusChange(callback: (status: AudioDeviceStatus) => void): void {
    this.statusCallback = callback;
  }

  async destroy(): Promise<void> {
    await this.registerer?.unregister();
    await this.userAgent?.stop();
  }

  private setupSessionListeners(session: Session) {
    session.stateChange.addListener((newState: SessionState) => {
      if (newState === SessionState.Terminated) {
        this.currentSession = undefined;
        this.notifyStatus();
      }
    });
  }

  private notifyStatus() {
    if (this.statusCallback) {
      this.statusCallback({
        isReady: this.userAgent?.state === 'Started',
        isMuted: this.isMuted,
        activeCallId: (this.currentSession as any)?.request?.callId
      });
    }
  }

  private logger(msg: string) {
    console.log(`[SipJsAdapter] ${msg}`);
  }
}

import { UserAgent, UserAgentOptions, Invitation, Session, SessionState, Registerer } from 'sip.js';
import { AudioPort, AudioDeviceStatus } from '@/ports/audio.port';

export class SipJsAdapter implements AudioPort {
  private userAgent?: UserAgent;
  private registerer?: Registerer;
  private currentSession?: Session;
  private statusCallback?: (status: AudioDeviceStatus) => void;
  private incomingCallCallback?: (callId: string, from: string) => void;
  private isMuted: boolean = false;
  private domain: string = '127.0.0.1';

    async initialize(config: { server: string, user: string, password?: string, displayName?: string, sip_uri?: string }): Promise<void> {
      console.log('[SipJsAdapter] initialize called with config:', config);
      if (!config || !config.server || !config.user) {
        throw new Error('Invalid telephony configuration: missing server or user');
      }

      // 1. Extreme sanitization (Allow ONLY literal a-z, A-Z, 0-9)
      const user = config.user.toString().split('').filter(c => /[a-zA-Z0-9]/.test(c)).join('');
      const pass = config.password ? config.password.toString().trim() : '';
      
      // 2. Extract domain from sip_uri or default
      this.domain = config.sip_uri ? config.sip_uri.split('@')[1] : '127.0.0.1';
      
      // 3. Explicit URI construction (Zero template literals to avoid hidden chars)
      const uriStr = "sip:" + user + "@" + this.domain;
      console.log('[SipJsAdapter] FINAL CLEAN URI:', uriStr);
      const uri = UserAgent.makeURI(uriStr);

      if (!uri) {
        throw new Error('Failed to create SIP URI from: ' + uriStr);
      }

    const userAgentOptions: UserAgentOptions = {
      uri,
      transportOptions: {
        server: config.server.trim()
      },
      displayName: config.displayName?.trim() || user,
      authorizationUsername: user,
      authorizationPassword: pass,
    };

    console.log('[SipJsAdapter] UserAgent transport server:', userAgentOptions.transportOptions?.server);

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
    const sanitizedTarget = target.replace(/\s+/g, '');
    const targetUriStr = "sip:" + sanitizedTarget + "@" + this.domain;
    const targetUri = UserAgent.makeURI(targetUriStr);
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

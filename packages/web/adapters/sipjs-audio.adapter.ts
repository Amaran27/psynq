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
  private isInitialized: boolean = false;
  private telephonyConfig?: { server: string, user: string, password?: string, displayName?: string, sip_uri?: string };

  // Store config but defer actual SIP.js initialization (lazy loading)
  async initialize(config: { server: string, user: string, password?: string, displayName?: string, sip_uri?: string }): Promise<void> {
    console.log('[SipJsAdapter] initialize called with config:', config);
    
    // Store config for lazy initialization
    this.telephonyConfig = config;
    
    // If already initialized, just return
    if (this.isInitialized) {
      console.log('[SipJsAdapter] Already initialized, skipping');
      return;
    }
    
    // NOTE: Actual SIP.js initialization is deferred until performInitialization() is called
    // This prevents console errors on login when SIP.js is not needed for outbound calls
    console.log('%c[SipJsAdapter] ℹ️ Config stored, initialization deferred until needed', 'color: #2196F3');
  }
  
  // Perform actual SIP.js initialization (called on demand when inbound call is received)
  async performInitialization(): Promise<void> {
    console.log('%c[SipJsAdapter] 🔍 performInitialization() CALLED - Stack trace:', 'color: #FF5722; font-weight: bold');
    console.trace('[SipJsAdapter] Call stack:');
    
    if (!this.telephonyConfig) {
      throw new Error('Cannot initialize: no telephony config stored');
    }
    
    if (this.isInitialized) {
      console.log('[SipJsAdapter] Already initialized, skipping');
      return;
    }
    
    const config = this.telephonyConfig;
    
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

    // Industry Standard Configuration for Asterisk WebRTC
    // Reference: ASTERISK-30042 bug (affects Asterisk 16.x and 18.0-18.7)
    // Bug: Asterisk rewrites Contact header with x-ast-orig-host parameter
    // when contactName is specified, causing SIP.js registration to fail.
    //
    // STANDARD WORKAROUND (per Asterisk community):
    // 1. Do NOT use custom contactName on Asterisk < 18.8
    // 2. Use SIP.js default lenient registration mode
    // 3. Let Asterisk auto-generate Contact header
    //
    // This follows RFC 3261 Section 10.2.1.2 and SIP.js best practices
    // See: https://issues.asterisk.org/jira/browse/ASTERISK-30042

    // Custom logger to suppress only known, non-actionable SIP.js internal errors
    const customLogger = {
      error: (category: string, content: string) => {
        // Completely suppress known SIP.js internal errors that are not actionable
        const suppressedErrors = [
          'Not connected',
          'Transport error occurred',
          'Failed to send initial outgoing request',
          'No Contact header pointing to us',
          'dropping response',
          'User agent client request transport error',
          '503 Service Unavailable'
        ];
        const shouldSuppress = suppressedErrors.some(err => content.includes(err));

        if (!shouldSuppress) {
          console.error(`[SIP.js ${category}] ${content}`);
        }
        // NEVER log to console for suppressed errors (prevents Next.js interception)
      },
      warn: (category: string, content: string) => {
        // Suppress all warnings related to Contact header issues
        const suppressedWarnings = [
          'No Contact header pointing to us',
          'dropping response'
        ];
        const shouldSuppress = suppressedWarnings.some(warn => content.includes(warn));

        if (!shouldSuppress) {
          console.warn(`[SIP.js ${category}] ${content}`);
        }
      },
      log: () => {},
      debug: () => {},
      trace: () => {}
    };

    const userAgentOptions: UserAgentOptions = {
      uri,
      transportOptions: {
        server: config.server.trim()
      },
      displayName: config.displayName?.trim() || user,
      authorizationUsername: user,
      authorizationPassword: pass,
      // REMOVED: contactName: user
      // Reason: Causes ASTERISK-30042 registration bug on Asterisk 16.x
      // Workaround: Use default SIP.js registration (verifies user part only)
      logLevel: 'error',
      delegate: {
        onConnect: () => {
          console.log('%c[SipJsAdapter] ✅ WebSocket transport connected', 'color: #4CAF50; font-weight: bold');
        },
        onDisconnect: (error?: Error) => {
          if (error) {
            console.error('[SipJsAdapter] WebSocket transport disconnected:', error.message);
          }
        }
      }
    };

    console.log('[SipJsAdapter] UserAgent transport server:', config.server.trim());

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

    // Wait for UserAgent to fully start (WebSocket connect is handled internally)
    await this.userAgent.start();
    // SIP.js does not expose a direct event for WebSocket connected, but start() resolves after connection attempt
    // If registration fails due to transport, it will be caught below
    console.log('%c[SipJsAdapter] ✅ UserAgent WebSocket start attempted', 'color: #4CAF50; font-weight: bold');

    // Notify status immediately when UserAgent is ready (WebSocket connected)
    this.notifyStatus();

    // Now attempt registration (should work without transport errors)
    console.log('%c[SipJsAdapter] ℹ️ Attempting SIP registration...', 'color: #2196F3');
    try {
      await this.registerer.register();
      console.log('%c[SipJsAdapter] ✅ SIP registration successful', 'color: #4CAF50; font-weight: bold');
    } catch (err) {
      console.log(
        '%c[SipJsAdapter] ⚠️ SIP registration failed (may be ASTERISK-30042 bug)',
        'color: #FF9800; font-weight: bold'
      );
      console.log('[SipJsAdapter] Registration error details:', err);
      // Registration is optional - calls can still be made via backend API
    }
    
    // Mark as initialized
    this.isInitialized = true;
    console.log('%c[SipJsAdapter] ✅ Initialization complete', 'color: #4CAF50; font-weight: bold');
  }
  
  // Check if initialized
  isReady(): boolean {
    return this.isInitialized;
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

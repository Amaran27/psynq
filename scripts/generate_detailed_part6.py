#!/usr/bin/env python3
"""
Part 6: Frontend Applications - React components with exact props and state
"""
import sys
sys.path.insert(0, 'd:/Project/psitrix/psynq/scripts')
from generate_detailed_workitems import create_item, write_items

def generate_frontend():
    """Generate Frontend Applications detailed work items"""
    print("\nGenerating Frontend Applications...")
    items = []
    phase = 'Phase: Frontend Applications'
    
    # Epic: Agent Desktop
    epic1 = 'Epic: Agent Desktop Application'
    items.append(create_item(epic1, 'Epic', phase, 'High',
        '''React + Next.js Agent Desktop with WebRTC.

Directory Structure:
```
packages/web/src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── agent/
│   │   │   ├── page.tsx
│   │   │   ├── calls/page.tsx
│   │   │   └── dialer/page.tsx
│   │   └── layout.tsx
│   ├── layout.tsx
│   └── providers.tsx
├── components/
│   ├── agent/
│   │   ├── AgentStatusBar.tsx
│   │   ├── CallControls.tsx
│   │   ├── Dialpad.tsx
│   │   └── ActiveCallPanel.tsx
│   ├── dialer/
│   │   ├── LeadPreview.tsx
│   │   ├── DispositionForm.tsx
│   │   └── DialerControls.tsx
│   └── ui/
├── hooks/
│   ├── useWebRTC.ts
│   ├── useCall.ts
│   └── useAgentState.ts
├── store/
│   ├── agent.store.ts
│   ├── call.store.ts
│   └── dialer.store.ts
└── lib/
    ├── api.ts
    ├── socket.ts
    └── webrtc.ts
```''', 60, 45, labels='Frontend,Agent'))

    # Feature: Call Controls
    feat1 = 'Feature: Call Controls Component'
    items.append(create_item(feat1, 'Feature', epic1, 'High',
        '''Real-time call control UI with WebRTC integration.

Components:
- CallControls - Main control bar
- Dialpad - DTMF input
- ActiveCallPanel - Call info display
- CallTimer - Duration display
- VolumeControl - Audio levels''', 60, 14, labels='Frontend,Call,UI'))

    # Task: CallControls Component
    items.append(create_item(
        'Task: Implement CallControls React component',
        'Task', feat1, 'High',
        '''File: packages/web/src/components/agent/CallControls.tsx

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useCallStore } from '@/store/call.store';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Button } from '@/components/ui/button';
import { Dialpad } from './Dialpad';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Pause, 
  Play,
  PhoneForwarded,
  Grid3X3,
  Volume2
} from 'lucide-react';

interface CallControlsProps {
  callId: string;
  onTransfer?: () => void;
  className?: string;
}

export function CallControls({ callId, onTransfer, className }: CallControlsProps) {
  const [showDialpad, setShowDialpad] = useState(false);
  const { 
    activeCall, 
    isMuted, 
    isOnHold,
    answer,
    hangup,
    hold,
    unhold,
    mute,
    unmute,
    sendDtmf
  } = useCallStore();
  
  const { localStream } = useWebRTC();

  const handleAnswer = useCallback(async () => {
    if (!activeCall) return;
    try {
      await answer(callId);
    } catch (error) {
      console.error('Failed to answer call:', error);
    }
  }, [callId, answer, activeCall]);

  const handleHangup = useCallback(async () => {
    try {
      await hangup(callId);
    } catch (error) {
      console.error('Failed to hangup:', error);
    }
  }, [callId, hangup]);

  const handleHold = useCallback(async () => {
    try {
      if (isOnHold) {
        await unhold(callId);
      } else {
        await hold(callId);
      }
    } catch (error) {
      console.error('Failed to toggle hold:', error);
    }
  }, [callId, isOnHold, hold, unhold]);

  const handleMute = useCallback(async () => {
    try {
      if (isMuted) {
        await unmute(callId);
      } else {
        await mute(callId);
      }
    } catch (error) {
      console.error('Failed to toggle mute:', error);
    }
  }, [callId, isMuted, mute, unmute]);

  const handleDtmf = useCallback((digit: string) => {
    sendDtmf(callId, digit);
    // Play local DTMF tone feedback
    const audio = new Audio(`/sounds/dtmf-${digit}.wav`);
    audio.play().catch(() => {});
  }, [callId, sendDtmf]);

  if (!activeCall) {
    return null;
  }

  const isRinging = activeCall.status === 'ringing';
  const isActive = activeCall.status === 'answered';

  return (
    <div className={`flex items-center gap-2 p-4 bg-background border rounded-lg ${className}`}>
      {/* Answer/Hangup */}
      {isRinging && activeCall.direction === 'inbound' && (
        <Button
          variant="default"
          size="lg"
          className="bg-green-600 hover:bg-green-700"
          onClick={handleAnswer}
          aria-label="Answer call"
        >
          <Phone className="w-5 h-5 mr-2" />
          Answer
        </Button>
      )}

      <Button
        variant="destructive"
        size="lg"
        onClick={handleHangup}
        aria-label="Hangup call"
      >
        <PhoneOff className="w-5 h-5 mr-2" />
        Hangup
      </Button>

      {/* Active call controls */}
      {isActive && (
        <>
          {/* Mute */}
          <Button
            variant={isMuted ? 'secondary' : 'outline'}
            size="icon"
            onClick={handleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            aria-pressed={isMuted}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          {/* Hold */}
          <Button
            variant={isOnHold ? 'secondary' : 'outline'}
            size="icon"
            onClick={handleHold}
            aria-label={isOnHold ? 'Resume' : 'Hold'}
            aria-pressed={isOnHold}
          >
            {isOnHold ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </Button>

          {/* Dialpad Toggle */}
          <Button
            variant={showDialpad ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => setShowDialpad(!showDialpad)}
            aria-label="Toggle dialpad"
            aria-expanded={showDialpad}
          >
            <Grid3X3 className="w-5 h-5" />
          </Button>

          {/* Transfer */}
          {onTransfer && (
            <Button
              variant="outline"
              size="icon"
              onClick={onTransfer}
              aria-label="Transfer call"
            >
              <PhoneForwarded className="w-5 h-5" />
            </Button>
          )}
        </>
      )}

      {/* Dialpad Popover */}
      {showDialpad && isActive && (
        <div className="absolute bottom-full mb-2 left-0">
          <Dialpad onDigit={handleDtmf} />
        </div>
      )}
    </div>
  );
}
```

Props Interface:
```typescript
interface CallControlsProps {
  callId: string;              // Active call ID
  onTransfer?: () => void;     // Transfer button callback
  className?: string;          // Additional CSS classes
}
```

State:
- showDialpad: boolean - Dialpad visibility toggle

Store Dependencies (from call.store.ts):
- activeCall: Call | null
- isMuted: boolean
- isOnHold: boolean
- answer(callId): Promise<void>
- hangup(callId): Promise<void>
- hold(callId): Promise<void>
- unhold(callId): Promise<void>
- mute(callId): Promise<void>
- unmute(callId): Promise<void>
- sendDtmf(callId, digit): void

Accessibility:
- All buttons have aria-label
- Toggle states use aria-pressed
- Expandable elements use aria-expanded
- Keyboard navigation supported

Tests Required:
- Render with ringing inbound call (shows Answer button)
- Render with active call (shows all controls)
- Click Answer calls answer action
- Click Hangup calls hangup action
- Click Mute toggles mute state
- Click Hold toggles hold state
- Dialpad toggle shows/hides dialpad
- DTMF digits sent correctly

Acceptance Criteria:
- All call control actions working
- Visual feedback for toggle states
- Accessible to screen readers
- Keyboard navigable
- Works with REAL WebRTC calls''',
        62, 3, 8, 'Frontend,Component,Call'))

    # Task: Call Store
    items.append(create_item(
        'Task: Implement Call Store with Zustand',
        'Task', feat1, 'High',
        '''File: packages/web/src/store/call.store.ts

```typescript
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { apiClient } from '@/lib/api';
import { socketClient } from '@/lib/socket';

export type CallStatus = 'ringing' | 'answered' | 'on_hold' | 'ended';
export type CallDirection = 'inbound' | 'outbound';

export interface Call {
  id: string;
  channelId: string;
  status: CallStatus;
  direction: CallDirection;
  callerId: string;
  callerName?: string;
  calleeId: string;
  startTime: Date;
  answerTime?: Date;
  endTime?: Date;
  duration: number;
  queueId?: string;
  queueName?: string;
}

export interface CallHistoryItem extends Call {
  recordingUrl?: string;
  notes?: string;
  disposition?: string;
}

interface CallState {
  // State
  activeCall: Call | null;
  callHistory: CallHistoryItem[];
  isMuted: boolean;
  isOnHold: boolean;
  isRecording: boolean;
  callDuration: number;
  
  // Actions
  setActiveCall: (call: Call | null) => void;
  updateCallStatus: (status: CallStatus) => void;
  
  // Call operations
  originate: (destination: string, callerId?: string) => Promise<string>;
  answer: (callId: string) => Promise<void>;
  hangup: (callId: string, reason?: string) => Promise<void>;
  hold: (callId: string) => Promise<void>;
  unhold: (callId: string) => Promise<void>;
  mute: (callId: string) => Promise<void>;
  unmute: (callId: string) => Promise<void>;
  sendDtmf: (callId: string, digits: string) => void;
  transfer: (callId: string, destination: string, type: 'blind' | 'attended') => Promise<void>;
  startRecording: (callId: string) => Promise<void>;
  stopRecording: (callId: string) => Promise<void>;
  
  // History
  loadCallHistory: (limit?: number) => Promise<void>;
  
  // Timer
  startDurationTimer: () => void;
  stopDurationTimer: () => void;
  
  // Socket handlers
  handleCallRinging: (data: any) => void;
  handleCallAnswered: (data: any) => void;
  handleCallEnded: (data: any) => void;
  handleCallDtmf: (data: any) => void;
}

let durationInterval: NodeJS.Timeout | null = null;

export const useCallStore = create<CallState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      activeCall: null,
      callHistory: [],
      isMuted: false,
      isOnHold: false,
      isRecording: false,
      callDuration: 0,

      setActiveCall: (call) => set({ activeCall: call }),
      
      updateCallStatus: (status) => set((state) => ({
        activeCall: state.activeCall 
          ? { ...state.activeCall, status } 
          : null
      })),

      originate: async (destination, callerId) => {
        const response = await apiClient.post<{ callId: string }>('/calls/originate', {
          destination,
          callerId,
        });
        
        const call: Call = {
          id: response.data.callId,
          channelId: '',
          status: 'ringing',
          direction: 'outbound',
          callerId: callerId || '',
          calleeId: destination,
          startTime: new Date(),
          duration: 0,
        };
        
        set({ activeCall: call });
        return response.data.callId;
      },

      answer: async (callId) => {
        await socketClient.emit('call:answer', { callId });
        set((state) => ({
          activeCall: state.activeCall 
            ? { ...state.activeCall, status: 'answered', answerTime: new Date() }
            : null
        }));
        get().startDurationTimer();
      },

      hangup: async (callId, reason) => {
        get().stopDurationTimer();
        await socketClient.emit('call:hangup', { callId, reason });
        
        const activeCall = get().activeCall;
        if (activeCall) {
          // Add to history
          set((state) => ({
            activeCall: null,
            isMuted: false,
            isOnHold: false,
            isRecording: false,
            callDuration: 0,
            callHistory: [
              { ...activeCall, endTime: new Date(), status: 'ended' },
              ...state.callHistory.slice(0, 99), // Keep last 100
            ],
          }));
        }
      },

      hold: async (callId) => {
        await socketClient.emit('call:hold', { callId });
        set({ isOnHold: true });
      },

      unhold: async (callId) => {
        await socketClient.emit('call:unhold', { callId });
        set({ isOnHold: false });
      },

      mute: async (callId) => {
        await socketClient.emit('call:mute', { callId });
        set({ isMuted: true });
      },

      unmute: async (callId) => {
        await socketClient.emit('call:unmute', { callId });
        set({ isMuted: false });
      },

      sendDtmf: (callId, digits) => {
        socketClient.emit('call:dtmf', { callId, digits });
      },

      transfer: async (callId, destination, type) => {
        await socketClient.emit('call:transfer', { callId, destination, type });
      },

      startRecording: async (callId) => {
        await apiClient.post(`/calls/${callId}/recording/start`);
        set({ isRecording: true });
      },

      stopRecording: async (callId) => {
        await apiClient.post(`/calls/${callId}/recording/stop`);
        set({ isRecording: false });
      },

      loadCallHistory: async (limit = 50) => {
        const response = await apiClient.get<{ data: CallHistoryItem[] }>(
          `/calls/history?limit=${limit}`
        );
        set({ callHistory: response.data.data });
      },

      startDurationTimer: () => {
        if (durationInterval) clearInterval(durationInterval);
        durationInterval = setInterval(() => {
          set((state) => ({ callDuration: state.callDuration + 1 }));
        }, 1000);
      },

      stopDurationTimer: () => {
        if (durationInterval) {
          clearInterval(durationInterval);
          durationInterval = null;
        }
      },

      // Socket event handlers
      handleCallRinging: (data) => {
        const call: Call = {
          id: data.callId,
          channelId: data.channelId,
          status: 'ringing',
          direction: data.direction || 'inbound',
          callerId: data.callerId,
          callerName: data.callerName,
          calleeId: data.calleeId,
          startTime: new Date(),
          duration: 0,
          queueId: data.queueId,
          queueName: data.queueName,
        };
        set({ activeCall: call });
      },

      handleCallAnswered: (data) => {
        set((state) => ({
          activeCall: state.activeCall
            ? { ...state.activeCall, status: 'answered', answerTime: new Date() }
            : null
        }));
        get().startDurationTimer();
      },

      handleCallEnded: (data) => {
        get().stopDurationTimer();
        const activeCall = get().activeCall;
        if (activeCall && activeCall.id === data.callId) {
          set((state) => ({
            activeCall: null,
            isMuted: false,
            isOnHold: false,
            isRecording: false,
            callDuration: 0,
            callHistory: [
              { ...activeCall, endTime: new Date(), status: 'ended', duration: data.duration },
              ...state.callHistory.slice(0, 99),
            ],
          }));
        }
      },

      handleCallDtmf: (data) => {
        console.log('DTMF received:', data.digit);
        // Could emit event or update UI
      },
    })),
    { name: 'call-store' }
  )
);

// Subscribe to socket events
if (typeof window !== 'undefined') {
  socketClient.on('call:ringing', useCallStore.getState().handleCallRinging);
  socketClient.on('call:answered', useCallStore.getState().handleCallAnswered);
  socketClient.on('call:ended', useCallStore.getState().handleCallEnded);
  socketClient.on('call:dtmf', useCallStore.getState().handleCallDtmf);
}
```

Dependencies:
- zustand
- zustand/middleware (devtools, subscribeWithSelector)

State Shape:
```typescript
{
  activeCall: Call | null;
  callHistory: CallHistoryItem[];
  isMuted: boolean;
  isOnHold: boolean;
  isRecording: boolean;
  callDuration: number;
}
```

Actions:
- originate(destination, callerId?) → callId
- answer(callId)
- hangup(callId, reason?)
- hold/unhold(callId)
- mute/unmute(callId)
- sendDtmf(callId, digits)
- transfer(callId, destination, type)
- startRecording/stopRecording(callId)
- loadCallHistory(limit?)

Acceptance Criteria:
- Store state persists across components
- Socket events update state correctly
- Call duration timer accurate
- History maintained in memory
- Works with REAL API and WebSocket''',
        63, 3, 8, 'Frontend,Store,Zustand'))

    # Task: useWebRTC Hook
    items.append(create_item(
        'Task: Implement useWebRTC custom hook',
        'Task', feat1, 'High',
        '''File: packages/web/src/hooks/useWebRTC.ts

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { useCallStore } from '@/store/call.store';

interface UseWebRTCOptions {
  sipServer: string;
  sipUser: string;
  sipPassword: string;
  iceServers?: RTCIceServer[];
}

interface UseWebRTCReturn {
  isRegistered: boolean;
  isConnecting: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string | null;
  register: () => Promise<void>;
  unregister: () => void;
  makeCall: (destination: string) => Promise<void>;
  answerCall: () => Promise<void>;
  hangup: () => void;
  toggleMute: () => void;
  isMuted: boolean;
}

export function useWebRTC(options: UseWebRTCOptions): UseWebRTCReturn {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  const userAgentRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  // Initialize SIP.js User Agent
  const initUserAgent = useCallback(async () => {
    try {
      // Dynamic import to avoid SSR issues
      const { UserAgent, Registerer, Inviter, SessionState } = await import('sip.js');

      const uri = UserAgent.makeURI(`sip:${options.sipUser}@${options.sipServer}`);
      if (!uri) {
        throw new Error('Failed to create SIP URI');
      }

      const transportOptions = {
        server: `wss://${options.sipServer}/ws`,
        traceSip: process.env.NODE_ENV === 'development',
      };

      const userAgentOptions = {
        uri,
        transportOptions,
        authorizationUsername: options.sipUser,
        authorizationPassword: options.sipPassword,
        sessionDescriptionHandlerFactoryOptions: {
          iceGatheringTimeout: 5000,
          peerConnectionConfiguration: {
            iceServers: options.iceServers || [
              { urls: 'stun:stun.l.google.com:19302' },
            ],
          },
        },
        delegate: {
          onInvite: (invitation: any) => handleIncomingCall(invitation),
        },
      };

      userAgentRef.current = new UserAgent(userAgentOptions);
      
      return userAgentRef.current;
    } catch (err) {
      setError(`Failed to initialize: ${err.message}`);
      throw err;
    }
  }, [options]);

  const register = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const ua = await initUserAgent();
      await ua.start();

      const { Registerer } = await import('sip.js');
      const registerer = new Registerer(ua);
      
      registerer.stateChange.addListener((state: any) => {
        if (state === 'Registered') {
          setIsRegistered(true);
          setIsConnecting(false);
        } else if (state === 'Unregistered') {
          setIsRegistered(false);
        }
      });

      await registerer.register();
    } catch (err) {
      setError(`Registration failed: ${err.message}`);
      setIsConnecting(false);
    }
  }, [initUserAgent]);

  const unregister = useCallback(() => {
    if (userAgentRef.current) {
      userAgentRef.current.stop();
      setIsRegistered(false);
    }
  }, []);

  const getLocalMedia = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      setError(`Microphone access denied: ${err.message}`);
      throw err;
    }
  }, []);

  const makeCall = useCallback(async (destination: string) => {
    if (!userAgentRef.current || !isRegistered) {
      throw new Error('Not registered');
    }

    try {
      const { Inviter } = await import('sip.js');
      
      const targetUri = UserAgent.makeURI(`sip:${destination}@${options.sipServer}`);
      if (!targetUri) {
        throw new Error('Invalid destination');
      }

      await getLocalMedia();

      const inviter = new Inviter(userAgentRef.current, targetUri);
      sessionRef.current = inviter;

      inviter.stateChange.addListener((state: any) => {
        handleSessionState(state);
      });

      await inviter.invite();
    } catch (err) {
      setError(`Call failed: ${err.message}`);
      throw err;
    }
  }, [isRegistered, options.sipServer, getLocalMedia]);

  const handleIncomingCall = useCallback(async (invitation: any) => {
    sessionRef.current = invitation;
    
    // Notify call store
    useCallStore.getState().handleCallRinging({
      callId: invitation.id,
      callerId: invitation.remoteIdentity.uri.user,
      callerName: invitation.remoteIdentity.displayName,
      direction: 'inbound',
    });

    invitation.stateChange.addListener((state: any) => {
      handleSessionState(state);
    });
  }, []);

  const answerCall = useCallback(async () => {
    if (!sessionRef.current) {
      throw new Error('No incoming call');
    }

    try {
      await getLocalMedia();
      await sessionRef.current.accept();
    } catch (err) {
      setError(`Answer failed: ${err.message}`);
      throw err;
    }
  }, [getLocalMedia]);

  const hangup = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.bye?.() || sessionRef.current.reject?.();
      sessionRef.current = null;
    }
    cleanupMedia();
  }, []);

  const handleSessionState = useCallback((state: any) => {
    const { SessionState } = require('sip.js');
    
    switch (state) {
      case SessionState.Establishing:
        // Ringing
        break;
        
      case SessionState.Established:
        // Connected - setup remote audio
        setupRemoteAudio();
        useCallStore.getState().handleCallAnswered({});
        break;
        
      case SessionState.Terminated:
        cleanupMedia();
        useCallStore.getState().handleCallEnded({});
        break;
    }
  }, []);

  const setupRemoteAudio = useCallback(() => {
    if (!sessionRef.current) return;

    const pc = sessionRef.current.sessionDescriptionHandler?.peerConnection;
    if (!pc) return;

    pcRef.current = pc;

    pc.ontrack = (event: RTCTrackEvent) => {
      const [stream] = event.streams;
      setRemoteStream(stream);
      
      // Create audio element and play
      const audio = new Audio();
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.play().catch(console.error);
    };
  }, []);

  const cleanupMedia = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
  }, [localStream]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unregister();
      cleanupMedia();
    };
  }, [unregister, cleanupMedia]);

  return {
    isRegistered,
    isConnecting,
    localStream,
    remoteStream,
    error,
    register,
    unregister,
    makeCall,
    answerCall,
    hangup,
    toggleMute,
    isMuted,
  };
}
```

Dependencies:
```json
{
  "dependencies": {
    "sip.js": "^0.21.2"
  }
}
```

Configuration:
- SIP_SERVER: WebSocket SIP server URL
- SIP_USER: Extension/username
- SIP_PASSWORD: SIP password
- ICE_SERVERS: STUN/TURN servers

Usage:
```typescript
const webrtc = useWebRTC({
  sipServer: 'sip.example.com',
  sipUser: 'agent001',
  sipPassword: '***',
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
});

// Register
await webrtc.register();

// Make call
await webrtc.makeCall('1234567890');

// Answer incoming
await webrtc.answerCall();
```

Acceptance Criteria:
- SIP registration working
- Outbound calls working
- Inbound calls detected and answerable
- Audio streams properly managed
- Mute toggle working
- Cleanup on hangup/unmount
- Works with REAL SIP server''',
        64, 4, 10, 'Frontend,Hook,WebRTC'))

    return items

if __name__ == '__main__':
    generate_frontend()

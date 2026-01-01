#!/usr/bin/env python3
"""
Part 12: Agent Desktop & UI Components
"""
import sys
sys.path.insert(0, 'd:/Project/psitrix/psynq/scripts')
from generate_detailed_workitems import create_item, write_items

def generate_agent_desktop():
    """Generate Agent Desktop UI detailed work items"""
    print("\nGenerating Agent Desktop UI...")
    items = []
    phase = 'Phase: Frontend Applications'
    
    # Epic: Agent Desktop
    epic = 'Epic: Agent Desktop Application'
    items.append(create_item(epic, 'Epic', phase, 'High',
        '''Complete agent workspace for handling calls.

Layout:
- Header: Agent status, notifications
- Left: Navigation, queue list
- Center: Active call panel
- Right: Customer info, history
- Bottom: Quick actions, disposition

Features:
- WebRTC softphone
- Screen pop with customer data
- Call history
- Wrap-up/disposition
- Knowledge base search
- Supervisor chat

Responsive for desktop (1920x1080 minimum).''', 95, 35, labels='Frontend,Agent'))

    # Task: Agent Layout Component
    items.append(create_item(
        'Task: Implement Agent Desktop Layout',
        'Task', epic, 'High',
        '''File: packages/web/src/app/(agent)/layout.tsx

```typescript
'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { AgentHeader } from '@/components/agent/AgentHeader';
import { AgentSidebar } from '@/components/agent/AgentSidebar';
import { CallPanel } from '@/components/agent/CallPanel';
import { CustomerPanel } from '@/components/agent/CustomerPanel';
import { useAuthStore } from '@/store/auth.store';
import { useAgentStore } from '@/store/agent.store';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useDashboardSocket } from '@/hooks/useDashboardSocket';
import { cn } from '@/lib/utils';

interface AgentLayoutProps {
  children: ReactNode;
}

export default function AgentLayout({ children }: AgentLayoutProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { status, currentCall, initialize } = useAgentStore();
  const { register, isRegistered } = useWebRTC();
  useDashboardSocket({ autoReconnect: true });

  // Redirect if not authenticated or not an agent
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!user?.roles?.includes('agent')) {
      router.push('/unauthorized');
      return;
    }

    // Initialize agent state
    initialize();

    // Register SIP endpoint
    register();
  }, [isAuthenticated, user, router, initialize, register]);

  // Prevent accidental navigation when on call
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentCall) {
        e.preventDefault();
        e.returnValue = 'You have an active call. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentCall]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <AgentHeader 
        status={status}
        isRegistered={isRegistered}
        hasActiveCall={!!currentCall}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <AgentSidebar className="w-64 border-r" />

        {/* Center Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Call Panel (when active) */}
          {currentCall && (
            <CallPanel 
              call={currentCall}
              className="border-b"
            />
          )}

          {/* Main Content Area */}
          <div className="flex-1 overflow-auto p-4">
            {children}
          </div>
        </main>

        {/* Right Panel (Customer Info) */}
        <CustomerPanel 
          className={cn(
            "w-80 border-l transition-all duration-300",
            !currentCall && "w-0 opacity-0"
          )}
          call={currentCall}
        />
      </div>

      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        richColors
        closeButton
      />
    </div>
  );
}
```

File: packages/web/src/components/agent/AgentHeader.tsx

```typescript
'use client';

import { useState } from 'react';
import { Bell, Phone, PhoneOff, Settings, LogOut, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { AgentStatusSelector } from './AgentStatusSelector';
import { useAuthStore } from '@/store/auth.store';
import { useAgentStore, AgentStatus } from '@/store/agent.store';
import { formatDuration } from '@/lib/utils';

interface AgentHeaderProps {
  status: AgentStatus;
  isRegistered: boolean;
  hasActiveCall: boolean;
}

export function AgentHeader({ status, isRegistered, hasActiveCall }: AgentHeaderProps) {
  const { user, logout } = useAuthStore();
  const { statusDuration, notReadyReason, setStatus } = useAgentStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleLogout = async () => {
    if (hasActiveCall) {
      // Show confirmation dialog
      return;
    }
    await logout();
  };

  const statusColors: Record<AgentStatus, string> = {
    available: 'bg-green-500',
    busy: 'bg-red-500',
    'not-ready': 'bg-yellow-500',
    'wrap-up': 'bg-blue-500',
    offline: 'bg-gray-500',
  };

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4">
      {/* Left: Logo and Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Phone className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">Psynq</span>
        </div>

        <div className="h-8 w-px bg-border" />

        {/* SIP Registration Status */}
        <div className="flex items-center gap-2">
          {isRegistered ? (
            <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
              <Phone className="w-3 h-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-red-600 border-red-600">
              <PhoneOff className="w-3 h-3" />
              Disconnected
            </Badge>
          )}
        </div>

        {/* Agent Status */}
        <AgentStatusSelector
          status={status}
          onStatusChange={setStatus}
          disabled={hasActiveCall}
        />

        {/* Status Duration */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatDuration(statusDuration)}
        </div>

        {/* Not Ready Reason */}
        {status === 'not-ready' && notReadyReason && (
          <Badge variant="secondary">{notReadyReason}</Badge>
        )}
      </div>

      {/* Right: Notifications and User Menu */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setNotificationsOpen(!notificationsOpen)}
        >
          <Bell className="w-5 h-5" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">{user?.name}</div>
                <div className="text-xs text-muted-foreground">{user?.extension}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              disabled={hasActiveCall}
              className="text-red-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

Features:
- Responsive header with status
- SIP registration indicator
- Status duration timer
- Not-ready reason display
- Notification bell
- User dropdown menu
- Logout prevention when on call

Acceptance Criteria:
- All header elements display correctly
- Status changes work
- Duration updates every second
- Logout blocked during call
- Mobile responsive (collapsed)''',
        95, 4, 8, 'Frontend,Agent,Layout'))

    # Task: Agent Status Store
    items.append(create_item(
        'Task: Implement Agent State Store',
        'Task', epic, 'High',
        '''File: packages/web/src/store/agent.store.ts

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { apiClient } from '@/lib/api';

export type AgentStatus = 'available' | 'busy' | 'not-ready' | 'wrap-up' | 'offline';

export interface Call {
  id: string;
  direction: 'inbound' | 'outbound';
  state: 'ringing' | 'connected' | 'on-hold' | 'conferencing';
  callerNumber: string;
  callerName?: string;
  queueId?: string;
  queueName?: string;
  startedAt: Date;
  answeredAt?: Date;
  duration: number;
  isRecording: boolean;
  isMuted: boolean;
  isOnHold: boolean;
}

export interface CustomerInfo {
  id?: string;
  name?: string;
  phone: string;
  email?: string;
  company?: string;
  notes?: string;
  history: CallHistoryItem[];
}

export interface CallHistoryItem {
  id: string;
  date: Date;
  duration: number;
  direction: 'inbound' | 'outbound';
  disposition?: string;
  notes?: string;
}

interface AgentState {
  // Status
  status: AgentStatus;
  previousStatus: AgentStatus;
  statusChangedAt: Date;
  statusDuration: number;
  notReadyReason?: string;

  // Current call
  currentCall: Call | null;
  customerInfo: CustomerInfo | null;

  // Stats
  callsToday: number;
  talkTimeToday: number;
  avgHandleTime: number;

  // Queue assignments
  assignedQueues: string[];

  // Actions
  initialize: () => Promise<void>;
  setStatus: (status: AgentStatus, reason?: string) => Promise<void>;
  setCall: (call: Call | null) => void;
  updateCallDuration: () => void;
  setCustomerInfo: (info: CustomerInfo | null) => void;
  incrementCallCount: () => void;
  addTalkTime: (seconds: number) => void;
  updateStatusDuration: () => void;

  // Call actions
  answerCall: () => Promise<void>;
  hangupCall: () => Promise<void>;
  holdCall: () => Promise<void>;
  resumeCall: () => Promise<void>;
  muteCall: () => Promise<void>;
  unmuteCall: () => Promise<void>;
  transferCall: (destination: string) => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
}

export const useAgentStore = create<AgentState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        status: 'offline',
        previousStatus: 'offline',
        statusChangedAt: new Date(),
        statusDuration: 0,
        notReadyReason: undefined,
        currentCall: null,
        customerInfo: null,
        callsToday: 0,
        talkTimeToday: 0,
        avgHandleTime: 0,
        assignedQueues: [],

        // Initialize from server
        initialize: async () => {
          try {
            const response = await apiClient.get('/agent/state');
            const { status, queues, stats } = response.data;

            set((state) => {
              state.status = status;
              state.statusChangedAt = new Date();
              state.assignedQueues = queues;
              state.callsToday = stats.callsToday;
              state.talkTimeToday = stats.talkTimeToday;
              state.avgHandleTime = stats.avgHandleTime;
            });
          } catch (error) {
            console.error('Failed to initialize agent state:', error);
          }
        },

        // Set agent status
        setStatus: async (newStatus, reason) => {
          const currentStatus = get().status;

          try {
            await apiClient.post('/agent/status', {
              status: newStatus,
              reason,
            });

            set((state) => {
              state.previousStatus = currentStatus;
              state.status = newStatus;
              state.statusChangedAt = new Date();
              state.statusDuration = 0;
              state.notReadyReason = reason;
            });
          } catch (error) {
            console.error('Failed to update status:', error);
            throw error;
          }
        },

        // Set current call
        setCall: (call) => {
          set((state) => {
            state.currentCall = call;
            if (call) {
              state.status = 'busy';
              state.statusChangedAt = new Date();
            }
          });
        },

        // Update call duration
        updateCallDuration: () => {
          set((state) => {
            if (state.currentCall?.answeredAt) {
              const now = new Date();
              const start = new Date(state.currentCall.answeredAt);
              state.currentCall.duration = Math.floor(
                (now.getTime() - start.getTime()) / 1000
              );
            }
          });
        },

        // Set customer info
        setCustomerInfo: (info) => {
          set((state) => {
            state.customerInfo = info;
          });
        },

        // Increment call count
        incrementCallCount: () => {
          set((state) => {
            state.callsToday += 1;
          });
        },

        // Add talk time
        addTalkTime: (seconds) => {
          set((state) => {
            state.talkTimeToday += seconds;
            // Recalculate average
            if (state.callsToday > 0) {
              state.avgHandleTime = Math.floor(state.talkTimeToday / state.callsToday);
            }
          });
        },

        // Update status duration
        updateStatusDuration: () => {
          set((state) => {
            const now = new Date();
            const start = new Date(state.statusChangedAt);
            state.statusDuration = Math.floor(
              (now.getTime() - start.getTime()) / 1000
            );
          });
        },

        // Call actions
        answerCall: async () => {
          const call = get().currentCall;
          if (!call) return;

          await apiClient.post(`/calls/${call.id}/answer`);

          set((state) => {
            if (state.currentCall) {
              state.currentCall.state = 'connected';
              state.currentCall.answeredAt = new Date();
            }
          });
        },

        hangupCall: async () => {
          const call = get().currentCall;
          if (!call) return;

          const duration = call.duration || 0;

          await apiClient.post(`/calls/${call.id}/hangup`);

          set((state) => {
            state.currentCall = null;
            state.customerInfo = null;
            state.status = 'wrap-up';
            state.statusChangedAt = new Date();
            state.statusDuration = 0;
          });

          get().incrementCallCount();
          get().addTalkTime(duration);
        },

        holdCall: async () => {
          const call = get().currentCall;
          if (!call) return;

          await apiClient.post(`/calls/${call.id}/hold`);

          set((state) => {
            if (state.currentCall) {
              state.currentCall.isOnHold = true;
              state.currentCall.state = 'on-hold';
            }
          });
        },

        resumeCall: async () => {
          const call = get().currentCall;
          if (!call) return;

          await apiClient.post(`/calls/${call.id}/resume`);

          set((state) => {
            if (state.currentCall) {
              state.currentCall.isOnHold = false;
              state.currentCall.state = 'connected';
            }
          });
        },

        muteCall: async () => {
          set((state) => {
            if (state.currentCall) {
              state.currentCall.isMuted = true;
            }
          });
        },

        unmuteCall: async () => {
          set((state) => {
            if (state.currentCall) {
              state.currentCall.isMuted = false;
            }
          });
        },

        transferCall: async (destination) => {
          const call = get().currentCall;
          if (!call) return;

          await apiClient.post(`/calls/${call.id}/transfer`, {
            destination,
          });

          set((state) => {
            state.currentCall = null;
            state.customerInfo = null;
            state.status = 'available';
            state.statusChangedAt = new Date();
          });
        },

        startRecording: async () => {
          const call = get().currentCall;
          if (!call) return;

          await apiClient.post(`/calls/${call.id}/recording/start`);

          set((state) => {
            if (state.currentCall) {
              state.currentCall.isRecording = true;
            }
          });
        },

        stopRecording: async () => {
          const call = get().currentCall;
          if (!call) return;

          await apiClient.post(`/calls/${call.id}/recording/stop`);

          set((state) => {
            if (state.currentCall) {
              state.currentCall.isRecording = false;
            }
          });
        },
      })),
      {
        name: 'agent-state',
        partialize: (state) => ({
          assignedQueues: state.assignedQueues,
        }),
      }
    ),
    { name: 'agent-store' }
  )
);

// Timer hook for updating durations
export function useAgentTimers() {
  const { updateStatusDuration, updateCallDuration, currentCall } = useAgentStore();

  useEffect(() => {
    const interval = setInterval(() => {
      updateStatusDuration();
      if (currentCall?.answeredAt) {
        updateCallDuration();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentCall, updateStatusDuration, updateCallDuration]);
}
```

Features:
- Agent status management
- Call state tracking
- Customer info storage
- Daily stats tracking
- Persisted queue assignments
- All call control actions
- Duration timers

API Endpoints Used:
- GET /agent/state
- POST /agent/status
- POST /calls/:id/answer
- POST /calls/:id/hangup
- POST /calls/:id/hold
- POST /calls/:id/resume
- POST /calls/:id/transfer
- POST /calls/:id/recording/start
- POST /calls/:id/recording/stop

Acceptance Criteria:
- State syncs with server
- Timers update every second
- All call actions work
- Stats accumulate correctly
- Persists across page refresh
- Works offline (graceful degradation)''',
        97, 5, 10, 'Frontend,State,Agent'))

    # Task: Call Panel
    items.append(create_item(
        'Task: Implement Active Call Panel Component',
        'Task', epic, 'High',
        '''File: packages/web/src/components/agent/CallPanel.tsx

```typescript
'use client';

import { useEffect, useState } from 'react';
import {
  Phone,
  PhoneOff,
  Pause,
  Play,
  Mic,
  MicOff,
  PhoneForwarded,
  Users,
  Circle,
  Square,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { TransferDialog } from './TransferDialog';
import { ConferenceDialog } from './ConferenceDialog';
import { DispositionDialog } from './DispositionDialog';
import { useAgentStore, Call } from '@/store/agent.store';
import { formatDuration, cn } from '@/lib/utils';

interface CallPanelProps {
  call: Call;
  className?: string;
}

export function CallPanel({ call, className }: CallPanelProps) {
  const {
    answerCall,
    hangupCall,
    holdCall,
    resumeCall,
    muteCall,
    unmuteCall,
    startRecording,
    stopRecording,
  } = useAgentStore();

  const [transferOpen, setTransferOpen] = useState(false);
  const [conferenceOpen, setConferenceOpen] = useState(false);
  const [volume, setVolume] = useState(80);
  const [showDisposition, setShowDisposition] = useState(false);

  const isRinging = call.state === 'ringing';
  const isConnected = call.state === 'connected';
  const isOnHold = call.state === 'on-hold';

  const handleHangup = async () => {
    await hangupCall();
    setShowDisposition(true);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    // Apply volume to audio element
    const audio = document.querySelector('audio');
    if (audio) {
      audio.volume = value[0] / 100;
    }
  };

  return (
    <>
      <div className={cn("bg-card p-4", className)}>
        <div className="flex items-center justify-between">
          {/* Left: Caller Info */}
          <div className="flex items-center gap-4">
            {/* Call Direction Indicator */}
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              call.direction === 'inbound' ? "bg-blue-500" : "bg-green-500"
            )}>
              <Phone className="w-6 h-6 text-white" />
            </div>

            {/* Caller Details */}
            <div>
              <div className="text-lg font-semibold">
                {call.callerName || 'Unknown Caller'}
              </div>
              <div className="text-sm text-muted-foreground">
                {call.callerNumber}
              </div>
              {call.queueName && (
                <Badge variant="secondary" className="mt-1">
                  {call.queueName}
                </Badge>
              )}
            </div>

            {/* Call State */}
            <Badge 
              variant={isRinging ? 'destructive' : isOnHold ? 'secondary' : 'default'}
              className="animate-pulse"
            >
              {isRinging && 'Ringing'}
              {isConnected && 'Connected'}
              {isOnHold && 'On Hold'}
            </Badge>

            {/* Duration */}
            {!isRinging && (
              <div className="text-lg font-mono">
                {formatDuration(call.duration)}
              </div>
            )}

            {/* Recording Indicator */}
            {call.isRecording && (
              <div className="flex items-center gap-1 text-red-500">
                <Circle className="w-3 h-3 fill-current animate-pulse" />
                <span className="text-sm">REC</span>
              </div>
            )}
          </div>

          {/* Right: Call Controls */}
          <div className="flex items-center gap-2">
            {/* Ringing Controls */}
            {isRinging && (
              <>
                <Button
                  size="lg"
                  className="bg-green-500 hover:bg-green-600 gap-2"
                  onClick={answerCall}
                >
                  <Phone className="w-5 h-5" />
                  Answer
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  className="gap-2"
                  onClick={handleHangup}
                >
                  <PhoneOff className="w-5 h-5" />
                  Reject
                </Button>
              </>
            )}

            {/* Connected Controls */}
            {(isConnected || isOnHold) && (
              <>
                {/* Mute */}
                <Button
                  variant={call.isMuted ? 'destructive' : 'outline'}
                  size="icon"
                  onClick={call.isMuted ? unmuteCall : muteCall}
                  title={call.isMuted ? 'Unmute' : 'Mute'}
                >
                  {call.isMuted ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </Button>

                {/* Hold/Resume */}
                <Button
                  variant={isOnHold ? 'default' : 'outline'}
                  size="icon"
                  onClick={isOnHold ? resumeCall : holdCall}
                  title={isOnHold ? 'Resume' : 'Hold'}
                >
                  {isOnHold ? (
                    <Play className="w-5 h-5" />
                  ) : (
                    <Pause className="w-5 h-5" />
                  )}
                </Button>

                {/* Recording */}
                <Button
                  variant={call.isRecording ? 'destructive' : 'outline'}
                  size="icon"
                  onClick={call.isRecording ? stopRecording : startRecording}
                  title={call.isRecording ? 'Stop Recording' : 'Start Recording'}
                >
                  {call.isRecording ? (
                    <Square className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </Button>

                {/* Transfer */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTransferOpen(true)}
                  title="Transfer"
                >
                  <PhoneForwarded className="w-5 h-5" />
                </Button>

                {/* Conference */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setConferenceOpen(true)}
                  title="Add to Conference"
                >
                  <Users className="w-5 h-5" />
                </Button>

                {/* Volume */}
                <div className="flex items-center gap-2 w-32">
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <Slider
                    value={[volume]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                  />
                </div>

                {/* Hangup */}
                <Button
                  variant="destructive"
                  size="lg"
                  className="gap-2"
                  onClick={handleHangup}
                >
                  <PhoneOff className="w-5 h-5" />
                  End Call
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Transfer Dialog */}
      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        callId={call.id}
      />

      {/* Conference Dialog */}
      <ConferenceDialog
        open={conferenceOpen}
        onOpenChange={setConferenceOpen}
        callId={call.id}
      />

      {/* Disposition Dialog */}
      <DispositionDialog
        open={showDisposition}
        onOpenChange={setShowDisposition}
        callId={call.id}
      />
    </>
  );
}
```

Features:
- Caller info display
- Call state indicator
- Duration timer
- Recording indicator
- Mute/unmute button
- Hold/resume button
- Start/stop recording
- Transfer dialog trigger
- Conference dialog trigger
- Volume control
- Hangup with disposition

Acceptance Criteria:
- All controls functional
- Visual feedback on states
- Dialogs open correctly
- Volume control works
- Duration updates live
- Recording indicator animates''',
        95, 4, 8, 'Frontend,Agent,Call'))

    # Task: Customer Panel
    items.append(create_item(
        'Task: Implement Customer Information Panel',
        'Task', epic, 'Normal',
        '''File: packages/web/src/components/agent/CustomerPanel.tsx

```typescript
'use client';

import { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  Building, 
  Clock, 
  FileText,
  History,
  ChevronDown,
  ChevronUp,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAgentStore, Call, CustomerInfo, CallHistoryItem } from '@/store/agent.store';
import { apiClient } from '@/lib/api';
import { formatDuration, formatDate, cn } from '@/lib/utils';

interface CustomerPanelProps {
  className?: string;
  call: Call | null;
}

export function CustomerPanel({ className, call }: CustomerPanelProps) {
  const { customerInfo, setCustomerInfo } = useAgentStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch customer info when call changes
  useEffect(() => {
    if (call?.callerNumber) {
      fetchCustomerInfo(call.callerNumber);
    }
  }, [call?.callerNumber]);

  const fetchCustomerInfo = async (phoneNumber: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/customers/lookup`, {
        params: { phone: phoneNumber },
      });
      setCustomerInfo(response.data);
      setEditedNotes(response.data.notes || '');
    } catch (error) {
      // Customer not found - create placeholder
      setCustomerInfo({
        phone: phoneNumber,
        history: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async () => {
    if (!customerInfo) return;

    try {
      await apiClient.patch(`/customers/${customerInfo.id}/notes`, {
        notes: editedNotes,
      });
      setCustomerInfo({ ...customerInfo, notes: editedNotes });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  };

  if (!call) {
    return null;
  }

  return (
    <div className={cn("bg-card overflow-hidden flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold">Customer Information</h3>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <Tabs defaultValue="info" className="h-full">
            <TabsList className="w-full justify-start rounded-none border-b px-4">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="p-4 space-y-4">
              {/* Customer Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {customerInfo?.name || 'Unknown'}
                    </div>
                    {customerInfo?.company && (
                      <div className="text-sm text-muted-foreground">
                        {customerInfo.company}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{customerInfo?.phone}</span>
                  </div>

                  {customerInfo?.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{customerInfo.email}</span>
                    </div>
                  )}

                  {customerInfo?.company && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span>{customerInfo.company}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              {customerInfo?.history && customerInfo.history.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-2xl font-bold">
                      {customerInfo.history.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Calls
                    </div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-2xl font-bold">
                      {formatDuration(
                        customerInfo.history.reduce((acc, h) => acc + h.duration, 0) /
                        customerInfo.history.length
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg Duration
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="p-4">
              {customerInfo?.history && customerInfo.history.length > 0 ? (
                <div className="space-y-2">
                  {customerInfo.history.map((item) => (
                    <CallHistoryCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-8 h-8 mx-auto mb-2" />
                  <p>No call history</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="p-4">
              <div className="space-y-4">
                {isEditing ? (
                  <>
                    <Textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      placeholder="Add notes about this customer..."
                      rows={8}
                    />
                    <div className="flex gap-2">
                      <Button onClick={saveNotes} size="sm">
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditedNotes(customerInfo?.notes || '');
                          setIsEditing(false);
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {customerInfo?.notes ? (
                      <div className="prose prose-sm max-w-none">
                        {customerInfo.notes}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-8 h-8 mx-auto mb-2" />
                        <p>No notes yet</p>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      {customerInfo?.notes ? 'Edit Notes' : 'Add Notes'}
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      )}
    </div>
  );
}

function CallHistoryCard({ item }: { item: CallHistoryItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80">
          <div className="flex items-center gap-3">
            <Badge variant={item.direction === 'inbound' ? 'default' : 'secondary'}>
              {item.direction === 'inbound' ? '↓' : '↑'}
            </Badge>
            <div>
              <div className="text-sm font-medium">
                {formatDate(item.date)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDuration(item.duration)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {item.disposition && (
              <Badge variant="outline">{item.disposition}</Badge>
            )}
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {item.notes && (
          <div className="p-3 pt-0 text-sm text-muted-foreground">
            {item.notes}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
```

Features:
- Customer lookup by phone
- Contact info display
- Call history with expandable details
- Editable notes
- Quick stats
- Tabbed interface
- Loading state

API Endpoints:
- GET /customers/lookup?phone=
- PATCH /customers/:id/notes

Acceptance Criteria:
- Auto-lookup on incoming call
- Screen pop with customer data
- History shows previous interactions
- Notes are editable and saveable
- Works with unknown callers
- Responsive panel width''',
        92, 4, 8, 'Frontend,Agent,Customer'))

    return items

if __name__ == '__main__':
    generate_agent_desktop()

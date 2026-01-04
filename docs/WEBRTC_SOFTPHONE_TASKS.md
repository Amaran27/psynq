# WebRTC Softphone - Feature #3704

## Status: Frontend Components Implemented

The core frontend components for the WebRTC Softphone have been implemented and integrated into the `CallCenterView`.

### 1. Components Created
- **Dialpad (`packages/web/components/dialer/Dialpad.tsx`)**:
  - Keypad UI
  - Number display
  - Backspace and Call actions
  - Connected to `useCallStore`

- **ActiveCall (`packages/web/components/dialer/ActiveCall.tsx`)**:
  - Call Timer (duration)
  - Mute / Unmute toggle
  - Hold / Resume toggle
  - End Call action
  - Status display (Ringing, Connected, On Hold)

- **IncomingCallModal (`packages/web/components/dialer/IncomingCallModal.tsx`)**:
  - Pop-up for `INBOUND` & `RINGING` calls
  - Answer / Decline actions
  - Caller ID display

### 2. Integration
- Integrated into `packages/web/components/CallCenterView.tsx`.
- Replaced manual "Dialpad" form with `<Dialpad />`.
- Added `<ActiveCall />` for current call management.
- Added `<IncomingCallModal />` for global incoming call alerts.

### 3. Next Steps
- [ ] **E2E Testing**: Verify call flows with Playwright.
- [ ] **Styling Refinement**: Ensure responsive design on smaller screens.
- [ ] **Audio Device Management**: Add UI to select Input/Output devices (Microphone/Speaker).
- [ ] **DTMF Support**: Implement DTMF tone sending during active calls (Keypad exists but needs logic).

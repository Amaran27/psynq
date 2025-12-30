# Inbound Call Flow Testing Guide

## Test Environment Setup

### Prerequisites
- ✅ Docker Compose running (`docker-compose -f docker-compose.dev.yml up -d`)
- ✅ Web container rebuilt with latest changes
- ✅ Asterisk running and connected to Twilio SIP trunk
- ✅ Backend API accessible at http://127.0.0.1:3001
- ✅ Frontend accessible at http://localhost:3000

### Test Credentials
- Username: `sysadmin`
- Password: `PsynqSecure2025!!`

## Test Scenarios

### Test 1: Verify Login with 0 Console Errors

**Steps**:
1. Open browser DevTools (F12) → Console tab
2. Navigate to http://localhost:3000
3. Login with sysadmin credentials
4. Observe console output

**Expected Results**:
- ✅ Login successful
- ✅ 0 console errors
- ✅ See log: `%c[SipJsAdapter] ℹ️ Config stored, initialization deferred until needed`
- ✅ See log: `[CallStore] isAudioReady set to true for outbound calls`
- ✅ Dialpad enabled
- ✅ No SIP.js registration attempts

**What to Check**:
- No "Failed to register" errors from SIP.js
- No WebSocket connection errors to Asterisk
- Agent status shows "Ready" or "Available"

---

### Test 2: Verify Outbound Call Works (Without SIP.js)

**Steps**:
1. From dialpad, enter a phone number (e.g., +1234567890)
2. Click "Call" button
3. Observe console and network requests

**Expected Results**:
- ✅ Call creation request sent to backend
- ✅ Call appears in "Active Calls" list
- ✅ Call state: RINGING → ANSWERED → ENDED
- ✅ No SIP.js initialization triggered
- ✅ Audio handled by backend ARI

**Console Logs**:
```
[CallStore] Creating outbound call
[HTTPCallAPI] POST /calls → 201 Created
[CallGateway] newCall event received
[CallCenterContainer] New call added (direction: outbound)
```

---

### Test 3: Verify Inbound Call Triggers SIP.js Initialization

**Steps**:
1. Open DevTools → Console tab
2. Login to the application
3. Call the Twilio phone number from an external phone
4. Observe console logs and browser behavior

**Expected Results**:
- ✅ See log: `%c[CallCenterContainer] 📞 Inbound call detected, initializing SIP.js...`
- ✅ See log: `%c[AdapterStore] 🔄 Initializing SIP.js on-demand for inbound call...`
- ✅ SIP.js registers with Asterisk via WebSocket
- ✅ Call appears in "Active Calls" list with direction: inbound
- ✅ Answer button enabled
- ✅ Browser rings (audio notification)

**Console Logs**:
```
[CallGateway] newCall event received
[CallCenterContainer] Inbound call detected, direction: inbound
[CallCenterContainer] Initializing SIP.js on-demand...
[SipJsAdapter] Performing actual SIP.js initialization
[SipJsAdapter] WebSocket connected to wss://asterisk:8089/ws
[SipJsAdapter] REGISTER successful
[SipJsAdapter] Ready for WebRTC calls
```

---

### Test 4: Verify Inbound Call Answer and Audio

**Steps**:
1. When inbound call rings, click "Answer" button
2. Speak into browser microphone
3. Verify audio is heard on calling phone
4. Listen for audio from calling phone in browser

**Expected Results**:
- ✅ Call state changes: RINGING → ANSWERED
- ✅ WebRTC audio session established
- ✅ DTLS-SRTP encryption active (check chrome://webrtc-internals)
- ✅ Bidirectional audio working
- ✅ Hold/Resume buttons functional
- ✅ End Call button functional

**What to Check**:
- Browser microphone permission granted
- Audio levels visible in UI
- No "Failed to set remote description" errors
- No ICE connection failures

---

### Test 5: Verify WebRTC Internals

**Steps**:
1. During active inbound call, open chrome://webrtc-internals
2. Find the active PeerConnection
3. Inspect stats

**Expected Results**:
- ✅ ICE connection state: "connected" or "completed"
- ✅ DTLS state: "established"
- ✅ Audio codec: opus (preferred) or PCMU/PCMA
- ✅ Bytes sent/received increasing
- ✅ RTP packets sent/received increasing

**Key Metrics**:
```
googCodecName: opus
bytesSent: > 0
bytesReceived: > 0
packetsSent: > 0
packetsReceived: > 0
googIceConnectionState: connected
googDtlsState: established
```

---

## Regression Tests

### Test 6: Verify Multiple Inbound Calls

**Steps**:
1. Receive first inbound call
2. Answer first call
3. Receive second inbound call while first is active
4. Verify behavior

**Expected Results**:
- ✅ SIP.js initialized only once (on first inbound call)
- ✅ Second call doesn't re-initialize SIP.js
- ✅ Both calls visible in Active Calls list
- ✅ Can switch between calls

---

### Test 7: Verify Logout Cleans Up SIP.js

**Steps**:
1. Login and receive inbound call (SIP.js initialized)
2. Logout
3. Login again
4. Verify SIP.js behavior

**Expected Results**:
- ✅ Logout triggers SIP.js unregister
- ✅ WebSocket closed
- ✅ Second login defers SIP.js initialization again
- ✅ Second inbound call re-initializes SIP.js

---

## Performance Tests

### Test 8: Verify Memory and CPU

**Steps**:
1. Open Chrome Task Manager (Shift+Esc)
2. Monitor before and after inbound call
3. Check for memory leaks

**Expected Results**:
- ✅ SIP.js initialization doesn't cause memory spike
- ✅ CPU usage normal during call
- ✅ No memory leaks after call ends

---

## Error Handling Tests

### Test 9: Verify Asterisk Connection Failure

**Steps**:
1. Stop Asterisk container
2. Try to receive inbound call
3. Observe error handling

**Expected Results**:
- ✅ Graceful error message in UI
- ✅ Console shows clear error log
- ✅ Application doesn't crash
- ✅ Can retry when Asterisk is back

---

### Test 10: Verify Network Interruption

**Steps**:
1. During active inbound call, disconnect network
2. Observe behavior
3. Reconnect network
4. Verify recovery

**Expected Results**:
- ✅ Call detects disconnection
- ✅ UI shows error state
- ✅ Reconnection triggers cleanup
- ✅ Can receive new calls after reconnection

---

## Console Log Reference

### Successful Inbound Call Flow

```log
1. Login
[AuthStore] Logging in...
[SipJsAdapter] Config stored, initialization deferred
[CallStore] isAudioReady: true (outbound via ARI)

2. Inbound Call Arrives
[CallGateway] newCall event received via WebSocket
[CallCenterContainer] 📞 Inbound call detected, initializing SIP.js...

3. SIP.js Initialization
[AdapterStore] Checking if already initialized...
[SipJsAdapter] Performing actual SIP.js initialization
[SipJsAdapter] Connecting WebSocket to wss://asterisk:8089/ws
[SipJsAdapter] WebSocket connected
[SipJsAdapter] Registering SIP endpoint
[SipJsAdapter] REGISTER 200 OK
[SipJsAdapter] Ready for WebRTC calls

4. Incoming SIP INVITE
[SipJsAdapter] Incoming INVITE from Asterisk
[SipJsAdapter] WebRTC session established
[CallStore] Call state: RINGING → ANSWERED
```

---

## Troubleshooting

### Issue: Inbound call not triggering SIP.js initialization

**Check**:
- Browser console shows `newCall` event?
- Call direction is 'inbound'?
- `initializeAudioAdapterOnDemand()` function exists?

**Fix**:
- Verify backend WebSocket connection
- Check call.entity.ts default direction
- Inspect CallCenterContainer subscription

---

### Issue: SIP.js fails to register

**Check**:
- Asterisk WebSocket is running?
- WebRTC configuration correct?
- TLS certificate valid?

**Fix**:
- Check Asterisk logs: `docker logs asterisk`
- Verify pjsip.conf endpoint config
- Test WebSocket connection manually

---

### Issue: No audio in WebRTC call

**Check**:
- Browser microphone permission?
- ICE candidates exchanged?
- DTLS handshake successful?

**Fix**:
- Check chrome://webrtc-internals
- Verify NAT/firewall settings
- Test with different browsers

---

## Success Criteria

✅ **All tests pass**
✅ **0 console errors on login**
✅ **Outbound calls work without SIP.js**
✅ **Inbound calls trigger SIP.js initialization**
✅ **Bidirectional audio works**
✅ **No memory leaks**
✅ **Graceful error handling**

---

## Next Steps After Testing

1. If all tests pass → Document architecture
2. If tests fail → Debug and fix issues
3. Document findings in MIGRATION_PLAN.md
4. Update docs/readme.md with architecture decision records

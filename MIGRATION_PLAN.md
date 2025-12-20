# Migration Plan: Multi-Provider to Asterisk-Centric Architecture

## Overview
This document outlines the step-by-step migration from the current multi-provider telephony architecture to an Asterisk-centric approach with Twilio (and other providers) configured as SIP trunks.

## Phase 1: Configure Asterisk SIP Trunking (Week 1-2)

### 1.1 Set up Twilio Elastic SIP Trunking
- [ ] Log in to Twilio Console
- [ ] Navigate to Elastic SIP Trunking section
- [ ] Create new SIP Trunk with following settings:
  - Friendly Name: "psynq-asterisk-trunk"
  - Termination SIP URI: `{your-domain}.pstn.twilio.com`
  - Configure IP Access Control List with your server's public IP
  - Set up Credential List with username/password

### 1.2 Configure Asterisk PJSIP Settings
Create/Update these files in `deploy/asterisk/asterisk-config/`:

**pjsip.conf**
```ini
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089

[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060

[twilio-trunk]
type=endpoint
context=from-twilio
disallow=all
allow=ulaw
allow=alaw
transport=transport-udp
from_domain=your-domain.pstn.twilio.com

[auth-twilio]
type=auth
auth_type=userpass
password=your_twilio_password
username=your_twilio_username

[identify-twilio]
type=identify
endpoint=twilio-trunk
match=your-domain.pstn.twilio.com

[twilio-registration]
type=registration
transport=transport-udp
outbound_auth=auth-twilio
client_uri=sip:your_twilio_username@your-domain.pstn.twilio.com
server_uri=sip:your-domain.pstn.twilio.com
retry_interval=60
forbidden_retry_interval=300
```

**extensions.conf**
```ini
[from-twilio]
; Incoming calls from Twilio
exten => _X.,1,NoOp(Incoming call from Twilio to ${EXTEN})
 same => n,Answer()
 same => n,Playback(hello-world)
 same => n,Hangup()

[from-internal]
; Outbound calls through Twilio
exten => _+X.,1,NoOp(Outbound call to ${EXTEN} via Twilio)
 same => n,Dial(PJSIP/${EXTEN}@twilio-trunk)
 same => n,Hangup()
```

### 1.3 Test Basic Connectivity
- [ ] Start Asterisk container: `cd deploy/asterisk && docker-compose up -d`
- [ ] Verify Asterisk CLI access: `docker exec -it psynq-asterisk asterisk -rvvv`
- [ ] Check PJSIP registration: `pjsip show registrations`
- [ ] Test outbound call: `channel originate PJSIP/+1234567890@twilio-trunk application echo`
- [ ] Monitor with: `pjsip set logger on`

### 1.4 Configure Inbound Routing
- [ ] Purchase/verify Twilio phone number
- [ ] Configure number to point to your SIP trunk
- [ ] Update Asterisk dialplan to route to appropriate context
- [ ] Test inbound call routing

## Phase 2: Update Backend Architecture (Week 3-4)

### 2.1 Modify TelephonyRouterAdapter
Update `packages/backend/src/adapters/telephony-router.adapter.ts`:
- Route all calls through AsteriskAdapter by default
- Remove provider selection logic for basic calls
- Keep provider selection for specific use cases if needed

### 2.2 Update AsteriskAdapter
Enhance `packages/backend/src/adapters/asterisk.adapter.ts`:
- Add SIP trunk selection logic
- Implement provider failover in Asterisk dialplan
- Add support for multiple SIP providers
- Improve error handling and logging

### 2.3 Configure Least Cost Routing
Add Asterisk dialplan logic for:
- Prefix-based routing (country codes)
- Time-of-day routing
- Cost-based provider selection
- Failover between providers

## Phase 3: Frontend Migration (Week 5-6)

### 3.1 Replace Twilio Voice SDK
Update frontend packages:
```bash
npm uninstall @twilio/voice-sdk
npm install sip.js
```

### 3.2 Create WebRTC Adapter
Create `packages/web/src/adapters/webrtc-asterisk.adapter.ts`:
- Implement SIP.js connection to Asterisk
- Handle authentication and registration
- Manage audio streams
- Handle call events

### 3.3 Update Call Components
Modify React components to use new WebRTC adapter:
- Update softphone component
- Change call control buttons
- Handle connection status
- Update error handling

### 3.4 Test Browser-to-Asterisk Connection
- [ ] Verify WebRTC connection to Asterisk
- [ ] Test audio in both directions
- [ ] Verify call control functions (mute, hold, transfer)
- [ ] Test in multiple browsers

## Phase 4: Advanced Features Implementation (Week 7-8)

### 4.1 Configure Asterisk IVR and Queuing
- Set up call queues for agents
- Configure IVR menus
- Implement hold music and announcements
- Set up ring groups

### 4.2 Implement Call Recording
- Configure Asterisk to record calls
- Store recordings in MinIO/S3 through backend
- Update Recording entity and adapters
- Implement recording retrieval API

### 4.3 Supervisor Features
- Implement barge/whisper functionality
- Create supervisor dashboard
- Add live call monitoring
- Set up call coaching features

### 4.4 Real-time Reporting
- Configure Asterisk CDR logging
- Create real-time statistics dashboard
- Implement call quality metrics
- Set up alerts and notifications

## Phase 5: Cleanup and Optimization (Week 9-10)

### 5.1 Remove Direct Dependencies
- Remove direct Twilio API calls from telephony adapters
- Clean up unused code and dependencies
- Update documentation
- Archive old provider-specific code

### 5.2 Performance Optimization
- Tune Asterisk configuration for your call volume
- Optimize WebRTC settings
- Implement connection pooling
- Monitor and reduce latency

### 5.3 Monitoring and Alerting
- Set up Asterisk health monitoring
- Configure alerts for service failures
- Implement log aggregation
- Create operational dashboards

### 5.4 Documentation
- Update system architecture documentation
- Create operational procedures
- Write troubleshooting guides
- Document new configuration options

## Testing Strategy

### Unit Tests
- Test each adapter in isolation
- Mock Asterisk ARI calls
- Verify error handling
- Test configuration loading

### Integration Tests
- Test end-to-end call flow
- Verify SIP trunk connectivity
- Test failover scenarios
- Verify recording functionality

### Load Tests
- Simulate concurrent calls
- Test system limits
- Verify performance under load
- Test resource cleanup

## Rollback Plan

If any phase fails:
1. Revert to last working configuration
2. Document lessons learned
3. Adjust plan as needed
4. Re-test before proceeding

## Success Criteria

- All calls route through Asterisk
- Frontend connects via WebRTC
- No degradation in call quality
- All existing features work
- Improved flexibility and scalability

## Estimated Timeline: 10 weeks

This migration will provide a more flexible, scalable, and maintainable telephony architecture while maintaining all current functionality.
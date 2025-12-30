# Asterisk Integration Status & Next Steps

## ✅ Completed Work

### 1. Asterisk SIP Trunk Configuration
- **Twilio SIP Trunk**: Successfully configured and tested
- **Authentication**: Digest auth working (407 → 200 OK)
- **Caller ID**: Verified trial number (+12706481767) configured
- **Call Flow**: INVITE → 407 Challenge → Authenticated INVITE → 183 Session Progress (ringing)

### 2. Configuration Files Updated
- `extensions.conf`: Added TWILIO_CALLER_ID global variable, updated twilio extension
- `ari.conf`: Enabled ARI, added CORS support, configured user (psynq-app/psynq-pass)
- `http.conf`: Enabled WebSocket support, CORS for development
- `pjsip.conf`: Already had correct auth configuration (realm=sip.twilio.com)
- `.env`: Updated with correct ARI credentials and Twilio config

### 3. Verification
- ✅ ARI Connection: Working (tested with test-ari-connection.js)
- ✅ SIP Trunk: Can originate calls via CLI
- ✅ PostgreSQL: Running and accepting connections
- ✅ Asterisk: Running with all modules loaded

## ⚠️ Current Issues

### Backend Not Starting
The NestJS backend is not starting properly. Need to investigate:
1. Check for compilation errors
2. Verify database connection
3. Check for missing dependencies
4. Review error logs

## 📋 Next Steps

### Phase 1: Fix Backend Startup (IMMEDIATE)
1. Check backend logs for errors
2. Run `npm install` to ensure all dependencies are installed
3. Try running with `npm run start:dev` and capture full error output
4. Fix any configuration or compilation issues

### Phase 2: Test Backend-ARI Integration
1. Once backend is running, test ARI connection via backend
2. Verify telephony adapter can connect to Asterisk
3. Test token generation for WebRTC clients

### Phase 3: Test Outbound Calling via Backend
1. Create a test call via backend API:
   ```bash
   curl -X POST http://localhost:3001/calls \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "to": "+918608273468",
       "from": "test-agent",
       "callType": "outbound"
     }'
   ```
2. Verify call is originated through Asterisk
3. Check ARI events for call state changes

### Phase 4: Frontend Integration
1. Ensure frontend is running on port 3000
2. Configure WebRTC client to connect to Asterisk WebSocket
3. Test browser SIP registration
4. Test outbound call from frontend UI
5. Test inbound call handling

### Phase 5: End-to-End Testing
1. Test complete call flow: Frontend → Backend → Asterisk → Twilio → PSTN
2. Test call controls: hold, resume, mute, transfer
3. Test supervisor features: whisper, monitor, barge-in
4. Test recording functionality

## 🔧 Troubleshooting Commands

### Check Asterisk Status
```bash
docker exec psynq-asterisk asterisk -rx 'core show channels'
docker exec psynq-asterisk asterisk -rx 'pjsip show endpoints'
docker exec psynq-asterisk asterisk -rx 'ari show status'
```

### Test ARI Directly
```bash
curl -u psynq-app:psynq-pass http://127.0.0.1:8088/ari/endpoints
```

### Test SIP Call via CLI
```bash
docker exec psynq-asterisk asterisk -rx 'channel originate Local/+918608273468@outbound-routing application Wait,1'
```

### Check Backend Logs
```bash
cd packages/backend
npm run start:dev
# Check for errors in output
```

### Database Connection
```bash
docker exec psynq-postgres-dev pg_isready -U psynq_user
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -c "SELECT * FROM ps_endpoints;"
```

## 📝 Configuration Summary

### Asterisk ARI
- URL: `http://127.0.0.1:8088`
- Username: `psynq-app`
- Password: `psynq-pass`
- App: `psynq-app`
- WebSocket: `ws://127.0.0.1:8088/ws`

### Twilio SIP Trunk
- Domain: `tkf27c75cb6eb2a1df1ff35797ecf2edd4.pstn.twilio.com`
- Port: `5061` (TLS)
- Username: `psynq_sip_trunk_username`
- Password: `psynq_sip_trunk_Pass29`
- Caller ID: `+12706481767` (verified trial number)

### Backend
- Port: `3001`
- Database: `postgresql://psynq_user:mysecretpassword@localhost:5432/psynq_db`
- ARI URL: `http://127.0.0.1:8088`
- Environment: `development`

## 🎯 Success Criteria

- [ ] Backend starts without errors
- [ ] Backend can connect to Asterisk ARI
- [ ] Backend can generate WebRTC tokens
- [ ] Frontend can register as SIP client
- [ ] Can originate outbound call from Frontend → Backend → Asterisk → Twilio
- [ ] Call rings at destination (+918608273468)
- [ ] Call can be answered and audio flows both ways
- [ ] Call controls work (hold, mute, hangup)
- [ ] Recording functionality works
- [ ] Supervisor injection works (whisper/monitor/barge-in)

## 🚀 Quick Start Commands

Once backend is fixed:

```bash
# Terminal 1: Start Backend
cd packages/backend
npm run start:dev

# Terminal 2: Start Frontend
cd packages/web
npm run dev

# Terminal 3: Monitor Asterisk
docker exec psynq-asterisk asterisk -rvvv

# Terminal 4: Test ARI
node test-ari-connection.js

# Terminal 5: Test Call via CLI
docker exec psynq-asterisk asterisk -rx 'channel originate Local/+918608273468@outbound-routing application Wait,1'
```

# Call Recording Test - Direct Asterisk Method

## Issue: Web UI Authentication Failure

The web UI is showing "Not authenticated or API adapter not initialized" error due to JWT token expiration. While we fix this, we can test the call recording feature **directly via Asterisk CLI**.

---

## 🎯 Alternative Test Method: Direct Asterisk Call

This method bypasses the web UI and tests the recording feature directly.

### Step 1: Open Monitoring Terminals

**Terminal A - Asterisk Messages**:
```powershell
docker exec psynq-asterisk tail -f /var/log/asterisk/messages | Select-String "mixmonitor|recording|Local/"
```

**Terminal B - Upload Log**:
```powershell
docker exec psynq-asterisk tail -f /var/log/asterisk/upload-recording.log
```

**Terminal C - Recording Directory**:
```powershell
while($true) { Clear-Host; docker exec psynq-asterisk ls -lh /var/spool/asterisk/monitor/; Start-Sleep 2 }
```

---

### Step 2: Place Test Call via Asterisk CLI

```powershell
# Test outbound call to echo test number
docker exec psynq-asterisk asterisk -rx "channel originate Local/18005788287@place-call-test application Echo 30"
```

**What this does**:
- Creates a local channel that executes the [place-call-test] context
- Dials 18005788287 (India Echo Test)
- Records the call automatically (MixMonitor)
- Runs for 30 seconds

---

### Step 3: Watch for Recording Activity

**In Terminal A** (Asterisk Messages):
```
✅ "Setting MixMonitor with filename: /var/spool/asterisk/monitor/UNIQUEID.wav"
✅ "Begin MixMonitor on channel Local/..."
✅ "MixMonitor recording started"
✅ "Call started to 18005788287"
```

**In Terminal C** (Recording Directory):
```
✅ File appears: UNIQUEID.wav
✅ File size increases: 12K → 24K → 36K...
```

---

### Step 4: Wait for Call Completion

The call will run for 30 seconds automatically. After it ends:

**In Terminal B** (Upload Log):
```
✅ "Uploading recording: /var/spool/asterisk/monitor/UNIQUEID.wav"
✅ "Recording uploaded successfully: http://minio:9000/psynq-recordings/..."
✅ "Local file deleted: /var/spool/asterisk/monitor/UNIQUEID.wav"
```

---

### Step 5: Verify Upload Success

```powershell
# Check MinIO received the file
docker exec psynq-minio mc ls myminio/psynq-recordings/ --recursive
```

**Expected Output**:
```
[2025-12-30 17:XX:XX UTC]  45KiB STANDARD UNIQUEID.wav
```

---

### Step 6: Verify Database CDR

```powershell
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -c "SELECT uniqueid, calldate, src, dst, disposition, billsec, recording_path FROM cdr ORDER BY calldate DESC LIMIT 1;"
```

**Expected Output**:
```
  uniqueid     |       calldate       | src  |     dst      | disposition | billsec |                        recording_path
---------------+------------------------+------+---------------+-------------+---------+------------------------------------------------------------
 1737212345678 | 2025-12-30 17:XX:XX   | Local| 18005788287   | ANSWERED    |      30 | http://minio:9000/psynq-recordings/2025/12/30/1737212345678.wav
```

---

### Step 7: Download and Play Recording

```powershell
# Get the UNIQUEID from the CDR output above
# Download from MinIO
docker exec psynq-minio mc cp myminio/psynq-recordings/2025/12/30/UNIQUEID.wav /tmp/test-recording.wav

# Copy to local machine
docker cp psynq-minio:/tmp/test-recording.wav ./test-recording.wav

# Play with your default audio player
# Windows: Double-click the file
```

---

## ✅ Success Criteria

- [ ] Terminal A shows MixMonitor starting
- [ ] Terminal C shows .wav file created and growing
- [ ] Terminal B shows upload success message
- [ ] MinIO has the recording file
- [ ] CDR has recording_path populated
- [ ] Downloaded file plays audio

**If ALL checks passed** → ✅ **CALL RECORDING WORKS!**

---

## 🔧 Alternative: Test with Extension

If the echo test doesn't work, try calling a local extension:

```powershell
# Call local extension 1001 (should exist in your dialplan)
docker exec psynq-asterisk asterisk -rx "channel originate Local/1001@main-ivr application Wait 30"
```

---

## 🔧 Alternative: Test with Music on Hold

```powershell
# Call that plays music on hold for 20 seconds
docker exec psynq-asterisk asterisk -rx "channel originate Local/test@place-call-test application MusicOnHold 20"
```

---

## 📊 Test Results

| Test Method | Status | Notes |
|-------------|--------|-------|
| MixMonitor Started | ☐ PASS | |
| Recording Created | ☐ PASS | |
| Upload Successful | ☐ PASS | |
| CDR Updated | ☐ PASS | |
| Playback Works | ☐ PASS | |

**Overall**: ☐ PASS / ☐ FAIL

---

## 🆘 Troubleshooting

### "No such context" error
```powershell
# Check available contexts
docker exec psynq-asterisk asterisk -rx "dialplan show places"
```

### Recording file not created
```powershell
# Verify MixMonitor is loaded
docker exec psynq-asterisk asterisk -rx "module show like app_mixmonitor"

# Check recording directory
docker exec psynq-asterisk ls -la /var/spool/asterisk/monitor/
```

### Upload failed
```powershell
# Check upload log
docker exec psynq-asterisk cat /var/log/asterisk/upload-recording.log

# Test MinIO connectivity
docker exec psynq-asterisk curl -I http://minio:9000
```

---

## 🎯 Quick Test Commands

```powershell
# 1. Start monitoring (3 separate terminals)
docker exec psynq-asterisk tail -f /var/log/asterisk/messages | Select-String "mixmonitor|recording"
docker exec psynq-asterisk tail -f /var/log/asterisk/upload-recording.log
while($true) { Clear-Host; docker exec psynq-asterisk ls -lh /var/spool/asterisk/monitor/; Start-Sleep 2 }

# 2. Place test call
docker exec psynq-asterisk asterisk -rx "channel originate Local/18005788287@place-call-test application Echo 30"

# 3. Verify upload
docker exec psynq-minio mc ls myminio/psynq-recordings/ --recursive

# 4. Check CDR
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -c "SELECT uniqueid, recording_path FROM cdr ORDER BY calldate DESC LIMIT 1;"

# 5. Download recording
docker exec psynq-minio mc cp myminio/psynq-recordings/2025/12/30/UNIQUEID.wav /tmp/test.wav
docker cp psynq-minio:/tmp/test.wav ./test.wav
```

---

## 📝 Next Steps

After successful recording test:

1. ✅ Call recording feature verified
2. ⏳ Fix web UI authentication issue
3. ⏳ Test backend recording APIs
4. ⏳ Build frontend UI

---

**This method tests the core recording feature without needing web UI authentication.**

**Last Updated**: December 30, 2025

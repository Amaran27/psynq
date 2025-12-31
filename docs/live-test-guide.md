# Call Recording - Live Test Execution Guide

## 🎬 Ready to Test - December 30, 2025

### ✅ Pre-Test Verification: COMPLETE

All components verified and ready:
- ✅ Asterisk MixMonitor running
- ✅ Recording directory ready
- ✅ Upload script executable
- ✅ TRAI compliance configured
- ✅ Database schema updated
- ✅ MinIO bucket created
- ✅ All containers healthy

---

## 🚀 START TESTING NOW

### Step 1: Open Monitoring (Run in 3 separate terminals)

**Terminal A - Asterisk Messages**:
```powershell
docker exec psynq-asterisk tail -f /var/log/asterisk/messages | Select-String "mixmonitor|recording"
```

**Terminal B - Upload Log**:
```powershell
docker exec psynq-asterisk tail -f /var/log/asterisk/upload-recording.log
```

**Terminal C - Recording Directory**:
```powershell
while($true) { Clear-Host; docker exec psynq-asterisk ls -lh /var/spool/asterisk/monitor/; Start-Sleep 2 }
```

### Step 2: Place Test Call via Web UI

1. **Open Browser**: http://localhost:3000
2. **Login as Agent**
3. **Click "Make Call" or "Dial"**
4. **Enter Number**: `18005788287` (India Echo Test)
5. **Click "Call"**

### Step 3: What to Watch For

**In Terminal A** (Asterisk Messages):
```
- "Setting MixMonitor with filename: /var/spool/asterisk/monitor/UNIQUEID.wav"
- "Begin MixMonitor on channel SIP/..."
- "MixMonitor recording started"
```

**In Terminal C** (Recording Directory):
```
- File appears: UNIQUEID.wav
- File size increases during call (e.g., 12K, 24K, 36K...)
```

### Step 4: During the Call

1. **Wait for answer** (ringing → connected)
2. **Speak into microphone**: "Testing 1, 2, 3, this is a recording test"
3. **Listen for echo** (echo test repeats your audio)
4. **Wait 30 seconds**
5. **Hang up**

### Step 5: After Hangup - Verify Upload

**In Terminal B** (Upload Log):
```
✅ "Uploading recording: /var/spool/asterisk/monitor/UNIQUEID.wav"
✅ "Recording uploaded successfully: http://minio:9000/psynq-recordings/..."
✅ "Local file deleted: /var/spool/asterisk/monitor/UNIQUEID.wav"
```

**In Terminal C** (Recording Directory):
```
✅ File should disappear (cleanup after upload)
```

### Step 6: Verify MinIO Upload

```powershell
# Check MinIO received the file
docker exec psynq-minio mc ls myminio/psynq-recordings/ --recursive | Select-Object -Last 1
```

**Expected Output**:
```
[2025-12-30 17:XX:XX UTC]  45KiB STANDARD UNIQUEID.wav
```

### Step 7: Verify Database CDR

```powershell
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -c "SELECT uniqueid, calldate, src, dst, disposition, billsec, recording_path FROM cdr ORDER BY calldate DESC LIMIT 1;"
```

**Expected Output**:
```
  uniqueid     |       calldate       | src  |     dst      | disposition | billsec |                        recording_path
---------------+------------------------+------+---------------+-------------+---------+------------------------------------------------------------
 1737212345678 | 2025-12-30 17:XX:XX   | 1001 | 18005788287   | ANSWERED    |      32 | http://minio:9000/psynq-recordings/2025/12/30/1737212345678.wav
```

### Step 8: Download and Play Recording

```powershell
# Get the UNIQUEID from the CDR output above
# Download from MinIO
docker exec psynq-minio mc cp myminio/psynq-recordings/2025/12/30/UNIQUEID.wav /tmp/test-recording.wav

# Copy to local machine
docker cp psynq-minio:/tmp/test-recording.wav ./test-recording.wav

# Play with your default audio player
# Windows: Double-click the file or open in Groove Music / Windows Media Player
```

**What You Should Hear**:
- Your voice from the test call (echo test repeats your audio)
- Both sides of the conversation
- Clear audio quality

---

## ✅ Success Criteria

You've successfully tested call recording if ALL of these are true:

- [ ] Terminal A showed MixMonitor starting
- [ ] Terminal C showed .wav file created and growing
- [ ] Terminal B showed upload success message
- [ ] MinIO has the recording file
- [ ] CDR has recording_path populated with URL
- [ ] Downloaded file plays your audio clearly

**If ALL checks passed** → ✅ **CALL RECORDING WORKS!**

---

## 🆘 Troubleshooting

### No MixMonitor messages in Terminal A
```powershell
# Verify MixMonitor is loaded
docker exec psynq-asterisk asterisk -rx "module show like app_mixmonitor"
```

### No .wav file in Terminal C
```powershell
# Check directory permissions
docker exec psynq-asterisk ls -la /var/spool/asterisk/monitor/

# If missing, recreate
docker exec psynq-asterisk mkdir -p /var/spool/asterisk/monitor
docker exec psynq-asterisk chown asterisk:asterisk /var/spool/asterisk/monitor
```

### Upload failed in Terminal B
```powershell
# Check upload log for errors
docker exec psynq-asterisk tail -50 /var/log/asterisk/upload-recording.log

# Test MinIO connectivity
docker exec psynq-asterisk curl -I http://minio:9000
```

### CDR recording_path is NULL
```powershell
# Verify column exists
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -c "\d cdr"

# Check recent CDRs
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -c "SELECT uniqueid, recording_path FROM cdr ORDER BY calldate DESC LIMIT 3;"
```

---

## 📊 Test Results Template

**Test Date**: December 30, 2025  
**Test Number**: 18005788287 (Echo Test)  
**Test Duration**: XX seconds  

### Results

| Check | Status | Notes |
|-------|--------|-------|
| MixMonitor started | ☐ PASS / ☐ FAIL | |
| Recording file created | ☐ PASS / ☐ FAIL | |
| Upload successful | ☐ PASS / ☐ FAIL | |
| MinIO upload verified | ☐ PASS / ☐ FAIL | |
| CDR recording_path populated | ☐ PASS / ☐ FAIL | |
| Playback works | ☐ PASS / ☐ FAIL | |

### Overall Result
☐ **PASS** - All checks passed  
☐ **FAIL** - Issues found (see notes)

### Issues Found
- 
- 

### Next Steps
- [ ] Proceed to backend API testing
- [ ] Build frontend UI
- [ ] Document test results

---

## 🎯 Quick Commands Reference

```powershell
# Start monitoring (3 terminals)
docker exec psynq-asterisk tail -f /var/log/asterisk/messages | Select-String "mixmonitor|recording"
docker exec psynq-asterisk tail -f /var/log/asterisk/upload-recording.log
while($true) { Clear-Host; docker exec psynq-asterisk ls -lh /var/spool/asterisk/monitor/; Start-Sleep 2 }

# Verify upload
docker exec psynq-minio mc ls myminio/psynq-recordings/ --recursive

# Check CDR
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -c "SELECT uniqueid, recording_path FROM cdr ORDER BY calldate DESC LIMIT 1;"

# Download recording
docker exec psynq-minio mc cp myminio/psynq-recordings/2025/12/30/UNIQUEID.wav /tmp/test.wav
docker cp psynq-minio:/tmp/test.wav ./test.wav
```

---

## 🚦 GO!

All systems ready. Open your 3 monitoring terminals, then navigate to http://localhost:3000 and place your test call.

**Good luck! 🍀**

---

**Last Updated**: December 30, 2025  
**Status**: ✅ READY FOR LIVE TESTING  

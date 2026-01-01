# Call Recording - Quick Start Testing Guide

## 🚀 5-Minute Quick Test

Follow these steps to verify call recording works in **5 minutes**.

### Prerequisites
- Docker containers running: `docker ps`
- Web interface accessible: http://localhost:3000
- Agent account created

---

## Step 1: Start Monitoring (30 seconds)

Open **3 separate terminals** and run:

**Terminal 1 - Asterisk Messages**:
```bash
docker exec psynq-asterisk tail -f /var/log/asterisk/messages | grep -i "mixmonitor\|recording"
```

**Terminal 2 - Upload Log**:
```bash
docker exec psynq-asterisk tail -f /var/log/asterisk/upload-recording.log
```

**Terminal 3 - Recording Directory**:
```bash
watch -n 2 'docker exec psynq-asterisk ls -lh /var/spool/asterisk/monitor/'
```

---

## Step 2: Place Test Call (2 minutes)

1. **Open Web Interface**: http://localhost:3000
2. **Login as Agent**
3. **Click "Make Call" or "Dial" button**
4. **Enter Test Number**: `18005788287` (India Echo Test)
5. **Click "Call"**

**What Should Happen**:
- Phone starts ringing
- In Terminal 1, you should see:
  ```
  Setting MixMonitor with filename: /var/spool/asterisk/monitor/UNIQUEID.wav
  Begin MixMonitor on channel
  ```
- In Terminal 3, you should see a `.wav` file appear and grow

6. **Speak into microphone** (test audio)
7. **Wait 30 seconds**
8. **Hang up**

---

## Step 3: Verify Upload (1 minute)

**Check Terminal 2** - You should see:
```
Uploading recording: /var/spool/asterisk/monitor/UNIQUEID.wav
Recording uploaded successfully: http://minio:9000/psynq-recordings/2025/01/18/UNIQUEID.wav
Local file deleted: /var/spool/asterisk/monitor/UNIQUEID.wav
```

**Verify MinIO Upload**:
```bash
docker exec psynq-minio mc ls myminio/psynq-recordings/ --recursive | tail -1
```

**Expected Output**:
```
[2025-01-18 12:34:56 UTC]  123KiB STANDARD UNIQUEID.wav
```

---

## Step 4: Verify Database CDR (30 seconds)

```bash
docker exec -it psynq-postgres-dev psql -U psynq_user -d psynq_db -c "
SELECT uniqueid, calldate, src, dst, disposition, billsec, recording_path 
FROM cdr 
ORDER BY calldate DESC 
LIMIT 1;
"
```

**Expected Output**:
```
  uniqueid     |       calldate       | src  |     dst      | disposition | billsec |                        recording_path
---------------+------------------------+------+---------------+-------------+---------+------------------------------------------------------------
 1737212345678 | 2025-01-18 12:34:56   | 1001 | 18005788287   | ANSWWERED   |      32 | http://minio:9000/psynq-recordings/2025/01/18/1737212345678.wav
```

**Key Checks**:
- ✅ `uniqueid` matches the filename
- ✅ `disposition` = ANSWERED
- ✅ `billsec` > 0 (call duration)
- ✅ `recording_path` is populated with MinIO URL

---

## Step 5: Download & Play (1 minute)

**Get the UNIQUEID from the CDR output above**, then:

```bash
# Download from MinIO
docker exec psynq-minio mc cp myminio/psynq-recordings/2025/01/18/UNIQUEID.wav /tmp/test-recording.wav

# Copy to local machine
docker cp psynq-minio:/tmp/test-recording.wav ./test-recording.wav

# Play with your default audio player
# Windows: Start-Menu → Groove Music / Windows Media Player
# Mac: QuickTime Player
# Linux: vlc test-recording.wav
```

**What You Should Hear**:
- Your voice from the test call (echo test repeats your audio)
- Both sides of the conversation (you and the echo test)

---

## ✅ Success Criteria

You've successfully verified call recording if:

- [ ] Terminal 1 showed MixMonitor starting
- [ ] Terminal 3 showed .wav file created and growing
- [ ] Terminal 2 showed upload success message
- [ ] MinIO has the recording file
- [ ] CDR has recording_path populated
- [ ] Downloaded file plays your audio

**If ALL checks passed** → ✅ **Call Recording Works!**

**If ANY check failed** → See [Troubleshooting](#troubleshooting) below

---

## 🎧 Test Inbound Call with TRAI Consent (Optional)

**Prerequisites**: SIP phone configured (Zoiper, MicroSIP, etc.)

1. **Register SIP phone** to psynq-asterisk
2. **Call your DID number** (or test extension)
3. **Listen for consent announcement**:
   - "This call is being recorded for quality and training purposes"
4. **Wait 30 seconds, hang up**
5. **Verify recording** (same as Steps 3-5 above)

---

## 🔍 Troubleshooting

### Issue: No MixMonitor messages in Terminal 1

**Check MixMonitor is loaded**:
```bash
docker exec psynq-asterisk asterisk -rx "module show like app_mixmonitor"
```

**If not loaded**:
```bash
docker exec psynq-asterisk asterisk -rx "module load app_mixmonitor.so"
```

---

### Issue: No .wav file created in Terminal 3

**Check recording directory**:
```bash
docker exec psynq-asterisk ls -la /var/spool/asterisk/monitor/
```

**If missing**:
```bash
docker exec psynq-asterisk mkdir -p /var/spool/asterisk/monitor
docker exec psynq-asterisk chown asterisk:asterisk /var/spool/asterisk/monitor
docker restart psynq-asterisk
```

---

### Issue: Upload failed in Terminal 2

**Check upload log**:
```bash
docker exec psynq-asterisk tail -100 /var/log/asterisk/upload-recording.log
```

**Test MinIO connectivity**:
```bash
docker exec psynq-asterisk curl -I http://minio:9000
```

**Check upload script**:
```bash
docker exec psynq-asterisk ls -la /usr/local/bin/upload-recording.sh
```

---

### Issue: CDR recording_path is NULL

**Check database column**:
```bash
docker exec -it psynq-postgres-dev psql -U psynq_user -d psynq_db -c "\d cdr"
```

**Look for**: `recording_path | character varying | | `

**If missing**:
```bash
docker exec -i psynq-postgres-dev psql -U psynq_user -d psynq_db < deploy/db/05-add-recording-path.sql
```

---

### Issue: MinIO file not found

**Check bucket exists**:
```bash
docker exec psynq-minio mc ls myminio/psynq-recordings/
```

**If missing**:
```bash
docker exec psynq-minio mc mb myminio/psynq-recordings
```

**Check today's directory**:
```bash
docker exec psynq-minio mc ls myminio/psynq-recordings/$(date +%Y)/$(date +%m)/$(date +%d)/
```

---

## 📋 Quick Test Checklist

Copy-paste this entire block into your terminal:

```bash
echo "=== CALL RECORDING QUICK TEST ==="
echo ""
echo "1. Checking Asterisk MixMonitor..."
docker exec psynq-asterisk asterisk -rx "module show like app_mixmonitor" | grep -i "mixmonitor"
echo ""
echo "2. Checking recording directory..."
docker exec psynq-asterisk ls -la /var/spool/asterisk/monitor/
echo ""
echo "3. Checking upload script..."
docker exec psynq-asterisk ls -la /usr/local/bin/upload-recording.sh
echo ""
echo "4. Checking MinIO bucket..."
docker exec psynq-minio mc ls myminio/psynq-recordings/
echo ""
echo "5. Checking database column..."
docker exec -it psynq-postgres-dev psql -U psynq_user -d psynq_db -c "\d cdr" | grep recording_path
echo ""
echo "6. Counting existing recordings..."
docker exec -it psynq-postgres-dev psql -U psynq_user -d psynq_db -c "SELECT COUNT(*) FROM cdr WHERE recording_path IS NOT NULL;"
echo ""
echo "=== READY TO TEST ==="
echo "Next: Place test call via web interface to 18005788287"
```

**All checks should show**:
- ✅ MixMonitor module loaded
- ✅ Recording directory exists
- ✅ Upload script exists
- ✅ MinIO bucket exists
- ✅ Database column exists

---

## 🎯 What's Next?

### ✅ If Quick Test Passed

**Proceed to Comprehensive Testing**:
- Follow full test plan: [recording-test-plan.md](recording-test-plan.md)
- Test all 6 test cases
- Document results
- Proceed to backend API testing

**Commands**: See [recording-test-commands.md](recording-test-commands.md)

### ❌ If Quick Test Failed

**Troubleshoot**:
1. Check [Troubleshooting](#troubleshooting) section above
2. Review [recording-test-plan.md](recording-test-plan.md) for detailed debugging
3. Check Asterisk logs: `docker exec psynq-asterisk tail -100 /var/log/asterisk/messages`
4. Check upload log: `docker exec psynq-asterisk tail -100 /var/log/asterisk/upload-recording.log`

---

## 📞 Test Numbers (India)

**Echo Test**:
- `18005788287` - Repeats your audio (good for testing)
- `18002090209` - Another echo test number

**Time Test**:
- `1800221122` - Speaks current time

**Verify Audio Quality**:
- Call echo test
- Speak: "Testing 1, 2, 3, this is a recording test"
- Wait for echo
- Hang up after 30 seconds
- Download recording
- Verify you can hear yourself clearly

---

## 📊 Record Results

**Test Date**: _____________  
**Tester**: _____________  
**Test Number Called**: _____________

**Results**:
- [ ] MixMonitor started: YES / NO
- [ ] File created: YES / NO
- [ ] Upload successful: YES / NO
- [ ] CDR updated: YES / NO
- [ ] Playback works: YES / NO

**Issues Found**: _____________  
**Overall**: PASS / FAIL  

---

**Last Updated**: January 18, 2025  
**Full Documentation**: [call-recording-complete.md](call-recording-complete.md)

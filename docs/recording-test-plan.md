# Call Recording Feature - Isolated Testing Plan

## Purpose
Industry-standard isolated testing approach for Call Recording feature with TRAI compliance.
**Goal**: Verify recording functionality end-to-end before building frontend UI.

## Test Environment
- **Asterisk**: 22.7.0 (psynq-asterisk container)
- **Database**: PostgreSQL 15 with cdr table (recording_path column)
- **Storage**: MinIO (psynq-recordings bucket)
- **Test Date**: [Fill in when testing]
- **Tester**: [Fill in]

## Pre-Test Checklist

### 1. Verify Asterisk Configuration
```bash
# Check MixMonitor is loaded
docker exec psynq-asterisk asterisk -rx "module show like app_mixmonitor"

# Check recording directory exists
docker exec psynq-asterisk ls -la /var/spool/asterisk/monitor/

# Check upload script exists
docker exec psynq-asterisk ls -la /usr/local/bin/upload-recording.sh

# Verify TRAI compliance contexts loaded
docker exec psynq-asterisk asterisk -rx "dialplan show check-dnd-registry"
docker exec psynq-asterisk asterisk -rx "dialplan show consent-announcement-inbound"

# Check globals
docker exec psynq-asterisk asterisk -rx "core show globals CONSENT_REQUIRED"
docker exec psynq-asterisk asterisk -rx "core show globals CALL_TYPE"
```

**Expected Results**:
- ✓ MixMonitor module loaded and running
- ✓ /var/spool/asterisk/monitor/ directory exists with write permissions
- ✓ upload-recording.sh script exists at /usr/local/bin/
- ✓ TRAI compliance contexts loaded from traicompliance.conf
- ✓ CONSENT_REQUIRED=TRUE, CALL_TYPE=TRANSACTIONAL

### 2. Verify Database Schema
```sql
-- Connect to PostgreSQL
docker exec -it psynq-postgres-dev psql -U psynq_user -d psynq_db

-- Check recording_path column exists
\d cdr

-- Verify column type and constraints
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cdr' AND column_name = 'recording_path';

-- Verify index exists
SELECT indexname FROM pg_indexes WHERE tablename = 'cdr';
```

**Expected Results**:
- ✓ recording_path column exists (VARCHAR(512), nullable)
- ✓ Index idx_cdr_recording_path exists

### 3. Verify MinIO Setup
```bash
# Check MinIO is running
docker ps | grep minio

# Verify bucket exists (using mc client or API)
docker exec psynq-minio mc ls myminio/psynq-recordings/

# Check bucket is accessible
curl -I http://localhost:9001/  # MinIO Console
```

**Expected Results**:
- ✓ MinIO container is running and healthy
- ✓ psynq-recordings bucket exists
- ✓ MinIO Console accessible at http://localhost:9001

## Test Case 1: Outbound Call Recording

### Test Steps

1. **Initiate Test Call via Web Interface**
   - Navigate to http://localhost:3000 (web interface)
   - Login as agent
   - Click "Make Call" or "Dial" button
   - Enter test number: **18005788287** (Echo Test - India)
   - Click "Call"

2. **Monitor Asterisk Console for Recording Messages**
   ```bash
   docker exec psynq-asterisk asterisk -rx "core set verbose 5"
   docker exec psynq-asterisk tail -f /var/log/asterisk/messages | grep -i "mixmonitor\|recording"
   ```

   **Expected Log Messages**:
   - `Setting MixMonitor with filename: /var/spool/asterisk/monitor/UNIQUEID.wav`
   - `Begin MixMonitor on channel`
   - `MixMonitor recording started`

3. **Verify Recording File Created During Call**
   ```bash
   # While call is active, check if file is being written
   docker exec psynq-asterisk ls -lh /var/spool/asterisk/monitor/
   
   # Check file size (should be increasing during call)
   docker exec psynq-asterisk watch -n 2 'ls -lh /var/spool/asterisk/monitor/ | tail -5'
   ```

   **Expected Results**:
   - ✓ File created: UNIQUEID.wav (UNIQUEID = Asterisk call ID)
   - ✓ File size increases during call (audio data being written)
   - ✓ File permissions: 644 (rw-r--r--)

4. **Let Call Run for 30 Seconds**
   - Speak into phone/microphone
   - Listen to echo test to verify two-way audio
   - Note the UNIQUEID from Asterisk CLI

5. **Hang Up Call**

6. **Verify Upload Script Executed**
   ```bash
   # Check upload log
   docker exec psynq-asterisk tail -50 /var/log/asterisk/upload-recording.log
   
   # Look for success messages:
   # "Recording uploaded successfully: http://minio:9000/psynq-recordings/..."
   ```

   **Expected Results**:
   - ✓ Upload log shows: "Uploading recording: /var/spool/asterisk/monitor/UNIQUEID.wav"
   - ✓ Upload log shows: "Recording uploaded successfully"
   - ✓ Upload log shows MinIO URL with year/month/day path
   - ✓ No error messages in log

7. **Verify MinIO Upload**
   ```bash
   # List files in bucket (most recent first)
   docker exec psynq-minio mc ls myminio/psynq-recordings/ --recursive | tail -10
   
   # Verify file exists for today's date
   docker exec psynq-minio mc ls myminio/psynq-recordings/$(date +%Y)/$(date +%m)/$(date +%d)/
   ```

   **Expected Results**:
   - ✓ File exists: UNIQUEID.wav in YYYY/MM/DD/ directory structure
   - ✓ File size > 0 bytes
   - ✓ File timestamp matches call time

8. **Verify Database CDR Entry**
   ```sql
   -- Connect to PostgreSQL
   docker exec -it psynq-postgres-dev psql -U psynq_user -d psynq_db
   
   -- Get most recent call CDR
   SELECT uniqueid, calldate, src, dst, disposition, billsec, recording_path 
   FROM cdr 
   ORDER BY calldate DESC 
   LIMIT 5;
   
   -- Verify recording_path matches MinIO URL format
   SELECT uniqueid, recording_path,
          recording_path LIKE '%psynq-recordings/%' AS valid_path
   FROM cdr 
   WHERE recording_path IS NOT NULL 
   ORDER BY calldate DESC 
   LIMIT 1;
   ```

   **Expected Results**:
   - ✓ CDR entry exists for the test call
   - ✓ uniqueid matches recording filename
   - ✓ recording_path populated with MinIO URL format
   - ✓ recording_path pattern: `http://minio:9000/psynq-recordings/YYYY/MM/DD/UNIQUEID.wav`
   - ✓ disposition = 'ANSWERED'
   - ✓ billsec > 0 (call duration in seconds)

9. **Verify Local File Cleanup**
   ```bash
   # Check if local file was deleted after upload
   docker exec psynq-asterisk ls -la /var/spool/asterisk/monitor/ | grep UNIQUEID
   ```

   **Expected Results**:
   - ✓ Local file deleted (cleanup after upload)
   - ✓ Directory empty or only contains files from active calls

### Test Results (Test Case 1)
- [ ] Test Passed
- [ ] Test Failed (note issues below)

**Issues Found**:
- 
- 

---

## Test Case 2: Inbound Call Recording with TRAI Consent

### Test Steps

1. **Initiate Inbound Test Call**
   - Use SIP phone (Zoiper, MicroSIP, etc.) configured to psynq-asterisk
   - OR Use PSTN number mapped to psynq (Zadarma/Twilio)
   - Call the IVR number

2. **Listen for Consent Announcement**
   - Call should be answered
   - Expect to hear: **"This call is being recorded for quality and training purposes"**
   - Wait 0.5 seconds after announcement
   - Recording should start

3. **Monitor Asterisk Console**
   ```bash
   docker exec psynq-asterisk asterisk -rx "core set verbose 5"
   docker exec psynq-asterisk tail -f /var/log/asterisk/messages | grep -i "consent\|recording\|mixmonitor"
   ```

   **Expected Log Sequence**:
   - `Playing TRAI consent announcement`
   - `Playing 'and-recordings'`
   - `Starting call recording`
   - `Set __RECORDING_FILE=/var/spool/asterisk/monitor/UNIQUEID.wav`
   - `Begin MixMonitor on channel`

4. **Navigate IVR and Let Call Run**
   - Enter extension or menu option
   - Speak into phone
   - Let call run for 30 seconds

5. **Hang Up Call**

6. **Verify Recording Uploaded** (Same as Test Case 1, steps 6-9)

7. **Verify CDR with Inbound Call Details**
   ```sql
   SELECT uniqueid, calldate, src, dst, disposition, billsec, recording_path,
          lastapp, channel
   FROM cdr 
   WHERE recording_path IS NOT NULL 
   ORDER BY calldate DESC 
   LIMIT 1;
   ```

   **Expected Results**:
   - ✓ CDR shows inbound call (src = external number, dst = psynq number)
   - ✓ Consent announcement played before recording started
   - ✓ Recording file uploaded to MinIO
   - ✓ recording_path populated correctly

### Test Results (Test Case 2)
- [ ] Test Passed
- [ ] Test Failed (note issues below)

**Issues Found**:
- 
- 

---

## Test Case 3: Recording Playback via MinIO URL

### Test Steps

1. **Get Recording URL from Database**
   ```sql
   SELECT uniqueid, recording_path 
   FROM cdr 
   WHERE recording_path IS NOT NULL 
   ORDER BY calldate DESC 
   LIMIT 1;
   ```

2. **Copy the recording_path URL**

3. **Download Recording File**
   ```bash
   # Replace UNIQUEID with actual value from database
   docker exec psynq-minio mc cp myminio/psynq-recordings/2025/01/18/UNIQUEID.wav /tmp/test-recording.wav
   
   # Or use curl to download
   curl -o test-recording.wav "http://localhost:9000/psynq-recordings/2025/01/18/UNIQUEID.wav"
   ```

4. **Verify Audio File**
   ```bash
   # Play the recording (if you have audio tools)
   docker exec psynq-asterisk aplay /tmp/test-recording.wav
   
   # Or check file format
   docker exec psynq-asterisk file /tmp/test-recording.wav
   ```

   **Expected Results**:
   - ✓ File downloads successfully
   - ✓ File is valid WAV format
   - ✓ Audio plays back correctly (hear your voice from test call)

5. **Verify Presigned URL Generation** (Preparation for API testing)
   ```bash
   # Test MinIO presigned URL generation
   docker exec psynq-minio mc share download myminio/psynq-recordings/2025/01/18/UNIQUEID.wav
   ```

   **Expected Results**:
   - ✓ Presigned URL generated with expiration time
   - ✓ URL format: `http://minio:9000/...?X-Amz-Expires=3600&...`

### Test Results (Test Case 3)
- [ ] Test Passed
- [ ] Test Failed (note issues below)

**Issues Found**:
- 
- 

---

## Test Case 4: TRAI Compliance - DND Check (Framework Only)

**Note**: Full DND integration requires TRAI NDNC registry API access. This test verifies the framework is in place.

### Test Steps

1. **Check DND Context Exists**
   ```bash
   docker exec psynq-asterisk asterisk -rx "dialplan show check-dnd-registry"
   ```

2. **Review DND Check Logic**
   - Read traicompliance.conf section: [check-dnd-registry]
   - Verify it queries DND_STATUS variable
   - Verify it aborts call if DND_FOUND

3. **Manual DND Check Test** (Simulated)
   ```bash
   # Test the context manually (simulate DND found)
   docker exec psynq-asterisk asterisk -rx "channel originate Local/s@test-dnd extension echo@test-dnd"
   ```

**Expected Results**:
- ✓ DND check context is properly structured
- ✓ Will abort call if DND_STATUS=FOUND
- ✓ Will continue if DND_STATUS=NOT_FOUND

**Production Implementation Required**:
- Integration with TRAI NDNC registry API (https://www.trai.gov.in/)
- External AGI script or curl call to check number against registry
- Set DND_STATUS variable based on API response

### Test Results (Test Case 4)
- [ ] Framework Verified (ready for production integration)
- [ ] Framework Issues Found:

---

## Test Case 5: TRAI Compliance - Time Restrictions

### Test Steps

1. **Check Time Restriction Context**
   ```bash
   docker exec psynq-asterisk asterisk -rx "dialplan show check-time-restrictions"
   ```

2. **Test During Allowed Hours** (9 AM - 8 PM IST)
   - Set CALL_TYPE=PROMOTIONAL
   - Place test call during allowed hours
   - Call should proceed

3. **Test During Restricted Hours** (After 8 PM or before 9 AM)
   - Set CALL_TYPE=PROMOTIONAL
   - Attempt call during restricted hours
   - Call should be rejected with time restriction message

**Expected Results**:
- ✓ Transactional calls: No time restrictions
- ✓ Promotional calls: Allowed 9 AM - 8 PM IST only
- ✓ After-hours call rejected with message

### Test Results (Test Case 5)
- [ ] Test Passed (transactional calls work any time)
- [ ] Test Passed (promotional calls rejected after hours)
- [ ] Test Failed (note issues below)

**Issues Found**:
- 
- 

---

## Test Case 6: Recording Retention Policy

### Test Steps

1. **Review Retention Policy**
   - Check traicompliance.conf section: [recording-retention-policy]
   - Verify 1-year retention configured
   - Verify cleanup cron job logic

2. **Verify Cleanup Script Framework**
   - Check if cleanup script exists: `/usr/local/bin/cleanup-old-recordings.sh`
   - Review script logic (deletes files older than 365 days)

3. **Manual Cleanup Test** (Do NOT run in production)
   ```bash
   # Review the cleanup script first
   docker exec psynq-asterisk cat /usr/local/bin/cleanup-old-recordings.sh
   
   # Test dry-run mode (if implemented)
   # docker exec psynq-asterisk /usr/local/bin/cleanup-old-recordings.sh --dry-run
   ```

**Expected Results**:
- ✓ Cleanup script exists with proper find logic
- ✓ Script deletes files older than 365 days (1 year)
- ✓ Script logs deletions to /var/log/asterisk/recording-cleanup.log

**Production Implementation Required**:
- Add cron job to run cleanup daily/weekly
- Test in staging environment first
- Monitor cleanup logs

### Test Results (Test Case 6)
- [ ] Framework Verified
- [ ] Framework Issues Found:

---

## Performance Testing (Optional)

### Concurrent Recording Test

1. **Initiate 5-10 Concurrent Calls**
   - Use multiple SIP phones or automated dialing
   - Monitor system resources: `docker stats psynq-asterisk`

2. **Monitor Recording Performance**
   ```bash
   # Check disk I/O
   docker exec psynq-asterisk iostat -x 1 5
   
   # Check CPU usage during recording
   docker exec psynq-asterisk top -b -n 1 | grep asterisk
   
   # Check recording file sizes
   docker exec psynq-asterisk du -sh /var/spool/asterisk/monitor/
   ```

**Expected Results**:
- ✓ All recordings created successfully
- ✓ No dropped calls or recording failures
- ✓ CPU usage < 80%
- ✓ Disk I/O within acceptable limits

---

## Troubleshooting Guide

### Issue: Recording File Not Created

**Possible Causes**:
1. MixMonitor not loaded
   ```bash
   docker exec psynq-asterisk asterisk -rx "module load app_mixmonitor.so"
   docker exec psynq-asterisk asterisk -rx "module show like app_mixmonitor"
   ```

2. Recording directory doesn't exist
   ```bash
   docker exec psynq-asterisk mkdir -p /var/spool/asterisk/monitor
   docker exec psynq-asterisk chown asterisk:asterisk /var/spool/asterisk/monitor
   ```

3. Permissions issue
   ```bash
   docker exec psynq-asterisk ls -la /var/spool/asterisk/
   ```

### Issue: Recording Not Uploaded to MinIO

**Possible Causes**:
1. Upload script not executable
   ```bash
   docker exec psynq-asterisk chmod +x /usr/local/bin/upload-recording.sh
   ```

2. MinIO connection error
   ```bash
   # Check MinIO is accessible from Asterisk container
   docker exec psynq-asterisk curl -I http://minio:9000
   ```

3. Check upload log
   ```bash
   docker exec psynq-asterisk tail -100 /var/log/asterisk/upload-recording.log
   ```

### Issue: CDR recording_path Not Populated

**Possible Causes**:
1. Database column doesn't exist
   ```sql
   \d cdr
   -- If missing, re-run migration:
   docker exec -i psynq-postgres-dev psql -U psynq_user -d psynq_db < deploy/db/05-add-recording-path.sql
   ```

2. ODBC connection issue
   ```bash
   docker exec psynq-asterisk cat /etc/odbcinst.ini
   docker exec psynq-asterisk cat /etc/odbc.ini
   ```

### Issue: Consent Announcement Not Playing

**Possible Causes**:
1. Sound file missing
   ```bash
   docker exec psynq-asterisk ls -la /var/lib/asterisk/sounds/en/ | grep recording
   ```

2. CONSENT_REQUIRED not set to TRUE
   ```bash
   docker exec psynq-asterisk asterisk -rx "core show globals CONSENT_REQUIRED"
   ```

---

## Test Summary

### Overall Test Results
- **Test Case 1 (Outbound Recording)**: [ ] PASS / [ ] FAIL
- **Test Case 2 (Inbound with Consent)**: [ ] PASS / [ ] FAIL
- **Test Case 3 (Playback Verification)**: [ ] PASS / [ ] FAIL
- **Test Case 4 (DND Framework)**: [ ] VERIFIED / [ ] ISSUES
- **Test Case 5 (Time Restrictions)**: [ ] PASS / [ ] FAIL
- **Test Case 6 (Retention Policy)**: [ ] VERIFIED / [ ] ISSUES

### Critical Issues Blocking Frontend Development
1. 
2. 
3. 

### Non-Critical Issues to Fix Later
1. 
2. 

### Recommendations
- 
- 

### Next Steps
1. [ ] Fix any critical issues found
2. [ ] Re-test failed scenarios
3. [ ] Proceed to Backend API Testing (Task #6)
4. [ ] Build Frontend UI (Task #8)

---

## Sign-Off

**Tested By**: ___________________ **Date**: _____________

**Approved for Frontend Development**: [ ] YES [ ] NO

**Comments**: 
- 
- 

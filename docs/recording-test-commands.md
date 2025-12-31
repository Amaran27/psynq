# Call Recording - Quick Test Commands

## Pre-Test Verification

### Check Asterisk Configuration
```bash
# MixMonitor loaded?
docker exec psynq-asterisk asterisk -rx "module show like app_mixmonitor"

# Recording directory exists?
docker exec psynq-asterisk ls -la /var/spool/asterisk/monitor/

# Upload script exists?
docker exec psynq-asterisk ls -la /usr/local/bin/upload-recording.sh

# TRAI contexts loaded?
docker exec psynq-asterisk asterisk -rx "dialplan show check-dnd-registry"
docker exec psynq-asterisk asterisk -rx "dialplan show consent-announcement-inbound"

# Check globals
docker exec psynq-asterisk asterisk -rx "core show globals CONSENT_REQUIRED"
docker exec psynq-asterisk asterisk -rx "core show globals CALL_TYPE"
```

### Check Database
```sql
-- Connect to PostgreSQL
docker exec -it psynq-postgres-dev psql -U psynq_user -d psynq_db

-- Check recording_path column
\d cdr

-- Most recent CDRs with recording
SELECT uniqueid, calldate, src, dst, disposition, billsec, recording_path 
FROM cdr 
ORDER BY calldate DESC 
LIMIT 5;
```

### Check MinIO
```bash
# List recordings bucket
docker exec psynq-minio mc ls myminio/psynq-recordings/ --recursive

# Check bucket for today
docker exec psynq-minio mc ls myminio/psynq-recordings/$(date +%Y)/$(date +%m)/$(date +%d)/
```

## During Test Call

### Monitor Asterisk Messages (Real-time)
```bash
# Terminal 1: Watch for recording messages
docker exec psynq-asterisk tail -f /var/log/asterisk/messages | grep -i "mixmonitor\|recording"

# Terminal 2: Watch for upload messages
docker exec psynq-asterisk tail -f /var/log/asterisk/upload-recording.log

# Terminal 3: Check recording directory
watch -n 2 'docker exec psynq-asterisk ls -lh /var/spool/asterisk/monitor/'
```

### Check Recording File During Call
```bash
# File size should increase during call
docker exec psynq-asterisk ls -lh /var/spool/asterisk/monitor/

# Watch file growth
docker exec psynq-asterisk watch -n 2 'ls -lh /var/spool/asterisk/monitor/'
```

## After Test Call

### Verify Upload Success
```bash
# Check upload log
docker exec psynq-asterisk tail -50 /var/log/asterisk/upload-recording.log

# Verify MinIO upload
docker exec psynq-minio mc ls myminio/psynq-recordings/ --recursive | tail -5

# Get the UNIQUEID from log or CDR, then:
docker exec psynq-minio mc ls myminio/psynq-recordings/$(date +%Y)/$(date +%m)/$(date +%d)/ | grep UNIQUEID
```

### Verify CDR Entry
```sql
-- Get most recent call with recording
SELECT uniqueid, calldate, src, dst, disposition, billsec, recording_path 
FROM cdr 
WHERE recording_path IS NOT NULL 
ORDER BY calldate DESC 
LIMIT 1;

-- Verify path format
SELECT uniqueid, 
       recording_path,
       recording_path LIKE '%psynq-recordings/%' AS valid_path,
       length(recording_path) AS path_length
FROM cdr 
WHERE recording_path IS NOT NULL 
ORDER BY calldate DESC 
LIMIT 1;
```

### Download and Play Recording
```bash
# Download from MinIO
docker exec psynq-minio mc cp myminio/psynq-recordings/2025/01/18/UNIQUEID.wav /tmp/test-recording.wav

# Or use curl (replace URL with actual path from CDR)
curl -o test-recording.wav "http://localhost:9000/psynq-recordings/2025/01/18/UNIQUEID.wav"

# Verify file format
file test-recording.wav

# Play (if you have audio tools)
aplay test-recording.wav  # Linux
# or open in VLC/Windows Media Player
```

## Troubleshooting

### Recording Not Created
```bash
# Check MixMonitor is loaded
docker exec psynq-asterisk asterisk -rx "module show like app_mixmonitor"

# Check dialplan for MixMonitor call
docker exec psynq-asterisk asterisk -rx "dialplan show place-call-test"

# Check recording directory permissions
docker exec psynq-asterisk ls -la /var/spool/asterisk/ | grep monitor

# Create directory if missing
docker exec psynq-asterisk mkdir -p /var/spool/asterisk/monitor
docker exec psynq-asterisk chown asterisk:asterisk /var/spool/asterisk/monitor
```

### Upload Not Working
```bash
# Check upload log for errors
docker exec psynq-asterisk tail -100 /var/log/asterisk/upload-recording.log

# Test MinIO connectivity from Asterisk container
docker exec psynq-asterisk curl -I http://minio:9000

# Check upload script permissions
docker exec psynq-asterisk ls -la /usr/local/bin/upload-recording.sh

# Test MinIO credentials
docker exec psynq-asterisk env | grep MINIO
```

### CDR recording_path Not Populated
```sql
-- Check if column exists
\d cdr

-- If missing, re-run migration
docker exec -i psynq-postgres-dev psql -U psynq_user -d psynq_db < deploy/db/05-add-recording-path.sql

-- Check CDR logging enabled
docker exec psynq-asterisk asterisk -rx "module show like cdr"
```

### Consent Announcement Not Playing
```bash
# Check CONSENT_REQUIRED global
docker exec psynq-asterisk asterisk -rx "core show globals CONSENT_REQUIRED"

# Check if sound file exists
docker exec psynq-asterisk ls -la /var/lib/asterisk/sounds/en/ | grep -i record

# List available sound files
docker exec psynq-asterisk ls -la /var/lib/asterisk/sounds/en/

# Test playback manually
docker exec psynq-asterisk asterisk -rx "playback and-recordings"
```

## Reload Configuration

```bash
# Reload dialplan
docker exec psynq-asterisk asterisk -rx "dialplan reload"

# Reload Asterisk (last resort)
docker restart psynq-asterisk

# Check dialplan reloaded
docker exec psynq-asterisk asterisk -rx "dialplan show globals"
```

## Performance Monitoring

```bash
# Container resource usage
docker stats psynq-asterisk --no-stream

# Asterisk active channels
docker exec psynq-asterisk asterisk -rx "core show channels"

# Asterisk process info
docker exec psynq-asterisk ps aux | grep asterisk

# Disk usage (recording directory)
docker exec psynq-asterisk du -sh /var/spool/asterisk/monitor/

# MinIO bucket size
docker exec psynq-minio mc du myminio/psynq-recordings/
```

## Quick Test Flow (Copy-Paste)

```bash
# 1. Start monitoring (run in separate terminals)
docker exec psynq-asterisk tail -f /var/log/asterisk/messages | grep -i "mixmonitor\|recording" &
docker exec psynq-asterisk tail -f /var/log/asterisk/upload-recording.log &

# 2. Place test call via web interface
# Navigate to http://localhost:3000, dial 18005788287

# 3. During call, check recording file
docker exec psynq-asterisk ls -lh /var/spool/asterisk/monitor/

# 4. After call, verify upload
docker exec psynq-asterisk tail -20 /var/log/asterisk/upload-recording.log

# 5. Check MinIO
docker exec psynq-minio mc ls myminio/psynq-recordings/ --recursive | tail -1

# 6. Check CDR
docker exec -it psynq-postgres-dev psql -U psynq_user -d psynq_db -c "SELECT uniqueid, calldate, src, dst, disposition, recording_path FROM cdr ORDER BY calldate DESC LIMIT 1;"

# 7. Download and verify (replace UNIQUEID)
docker exec psynq-minio mc cp myminio/psynq-recordings/2025/01/18/UNIQUEID.wav /tmp/test.wav
```

## Backend API Testing (Next Phase)

```bash
# Start backend if not running
cd packages/backend && npm run start:dev

# Test recordings list API
curl -X GET http://localhost:3001/api/recordings?page=1&limit=10

# Test single recording API
curl -X GET http://localhost:3001/api/recordings/UNIQUEID

# Test statistics API
curl -X GET http://localhost:3001/api/recordings/stats/overview

# Test download API (get presigned URL)
curl -X GET http://localhost:3001/api/recordings/UNIQUEID/download
```

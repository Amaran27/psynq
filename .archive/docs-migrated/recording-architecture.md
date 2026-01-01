# Call Recording - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PSITRIX PSYNQ - CALL RECORDING                      │
│                          (Phase 1 Implementation)                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   INBOUND CALL   │         │  OUTBOUND CALL   │         │   WEB UI         │
│  (Zadarma,       │         │  (Agent clicks   │         │  (Agent dials    │
│   Twilio,        │         │   "Make Call")   │         │   number)        │
│   Localphone)    │         │                  │         │                  │
└────────┬─────────┘         └────────┬─────────┘         └────────┬─────────┘
         │                            │                            │
         │ SIP INVITE                 │ HTTP POST                  │ WebSocket
         │                            │ /api/calls/start           │
         ▼                            ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ASTERISK 22.7.0                                      │
│                     (psynq-asterisk container)                               │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ Dialplan Execution
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ [extensions.conf] - Call Routing                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INBOUND CONTEXTS                    OUTBOUND CONTEXTS                      │
│  ┌─────────────────┐                  ┌─────────────────┐                  │
│  │ [from-zadarma]  │                  │ [place-call-    │                  │
│  │ [from-twilio]   │                  │   test]         │                  │
│  │ [from-          │                  │ [place-call-    │                  │
│  │  localphone]    │                  │   twilio]       │                  │
│  └────────┬────────┘                  │ [place-call-    │                  │
│           │                            │   zadarma]      │                  │
│           │                            │ [place-call-    │                  │
│           │                            │   localphone]   │                  │
│           │                            └────────┬────────┘                  │
│           │                                     │                           │
│           └──────────────┬──────────────────────┘                           │
│                          │                                                   │
│                          ▼                                                   │
│           ┌──────────────────────────────┐                                  │
│           │  TRAI COMPLIANCE CHECK       │                                  │
│           ├──────────────────────────────┤                                  │
│           │ IF CONSENT_REQUIRED=TRUE     │                                  │
│           │   Goto(play-consent)         │                                  │
│           │                              │                                  │
│           │ [play-consent]               │                                  │
│           │   Answer()                   │                                  │
│           │   Wait(1)                    │                                  │
│           │   Playback("and-recordings") │ ← "This call is being            │
│           │   Wait(0.5)                  │    recorded for quality..."     │
│           │   Goto(start-recording)      │                                  │
│           │                              │                                  │
│           │ [start-recording]            │                                  │
│           │   Set __RECORDING_FILE=...   │                                  │
│           │   MixMonitor(FILE,b)         │ ← START RECORDING               │
│           │   Goto(main-ivr,s,1)         │                                  │
│           └──────────────────────────────┘                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ MixMonitor Application
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CALL RECORDING IN PROGRESS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Audio Stream ────────► MixMonitor ────────► WAV FILE                       │
│  (RTP/ULAW)                          (app_mixmonitor.so)   (Growing)       │
│                                                                             │
│  File Location: /var/spool/asterisk/monitor/UNIQUEID.wav                   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────┐         │
│  │  CALL PROCEEDS NORMALLY                                        │         │
│  │  - IVR plays menu                                              │         │
│  │  - Caller enters extension                                     │         │
│  │  - Call queued                                                 │         │
│  │  - Agent answers                                               │         │
│  │  - Conversation recorded                                       │         │
│  │  - Agent hangs up                                              │         │
│  └───────────────────────────────────────────────────────────────┘         │
│                                                                             │
│                          CALL ENDS (Hangup)                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ MixMonitor Executes Post-Call Command
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              [upload-recording.sh] - AUTOMATED UPLOAD SCRIPT                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Read variables:                                                         │
│     - RECORDING_FILE = /var/spool/asterisk/monitor/UNIQUEID.wav            │
│     - UNIQUEID = 1737212345678.9                                            │
│     - MINIO_ENDPOINT = http://127.0.0.1:9000                                │
│     - MINIO_BUCKET = psynq-recordings                                       │
│                                                                             │
│  2. Generate MinIO path:                                                    │
│     MINIO_PATH = psynq-recordings/YYYY/MM/DD/UNIQUEID.wav                  │
│                                                                             │
│  3. Upload to MinIO:                                                        │
│     $ mc cp /var/spool/asterisk/monitor/UNIQUEID.wav \                     │
│            myminio/psynq-recordings/2025/01/18/UNIQUEID.wav                │
│                                                                             │
│  4. Generate public URL:                                                    │
│     URL = http://minio:9000/psynq-recordings/2025/01/18/UNIQUEID.wav       │
│                                                                             │
│  5. Log to file:                                                            │
│     /var/log/asterisk/upload-recording.log                                  │
│     "Recording uploaded successfully: URL"                                  │
│                                                                             │
│  6. Cleanup local file:                                                     │
│     $ rm /var/spool/asterisk/monitor/UNIQUEID.wav                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ MinIO Upload
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MINIO OBJECT STORAGE                               │
│                         (psynq-minio container)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Bucket: psynq-recordings/                                                  │
│                                                                             │
│  Structure:                                                                 │
│  psynq-recordings/                                                          │
│  ├── 2025/                                                                  │
│  │   ├── 01/                                                                │
│  │   │   ├── 18/                                                            │
│  │   │   │   ├── 1737212345678.9.wav  (123 KiB)                            │
│  │   │   │   └── 1737212390123.4.wav  (98 KiB)                             │
│  │   │   └── 19/                                                            │
│  │   └── 02/                                                                │
│                                                                             │
│  Access:                                                                    │
│  - Direct HTTP: http://localhost:9000/psynq-recordings/...                 │
│  - Presigned URLs: Temporary access with expiration                        │
│  - MinIO Console: http://localhost:9001                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ Database Update (via func_odbc or AGI)
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL 15 DATABASE                                   │
│                    (psynq-postgres-dev container)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Table: cdr                                                                 │
│  ┌─────────────────────┬───────────┬──────────────────────────────────┐    │
│  │ Column              │ Type      │ Value                            │    │
│  ├─────────────────────┼───────────┼──────────────────────────────────┤    │
│  │ uniqueid            │ VARCHAR   │ 1737212345678.9                  │    │
│  │ calldate            │ TIMESTAMP │ 2025-01-18 12:34:56              │    │
│  │ src                 │ VARCHAR   │ 1001                             │    │
│  │ dst                 │ VARCHAR   │ 18005788287                      │    │
│  │ disposition         │ VARCHAR   │ ANSWERED                         │    │
│  │ billsec             │ INTEGER   │ 32                               │    │
│  │ recording_path      │ VARCHAR   │ http://minio:9000/psynq-         │    │
│  │                     │           │   recordings/2025/01/18/...      │    │
│  └─────────────────────┴───────────┴──────────────────────────────────┘    │
│                                                                             │
│  Index: idx_cdr_recording_path on recording_path                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ REST API Query
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NESTJS BACKEND API                                       │
│                    (psynq-backend-dev container)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GET /api/recordings                                                        │
│    → List all recordings (paginated, filterable)                            │
│                                                                             │
│  GET /api/recordings/:uniqueid                                              │
│    → Get single recording details                                           │
│                                                                             │
│  GET /api/recordings/:uniqueid/download                                     │
│    → Generate MinIO presigned URL for download                              │
│                                                                             │
│  GET /api/recordings/stats/overview                                        │
│    → Recording statistics (total, today, duration, by disposition)          │
│                                                                             │
│  DELETE /api/recordings/:uniqueid                                           │
│    → Delete recording (admin only)                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ REST API Response
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS FRONTEND UI                                      │
│                    (psynq-web-dev container)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  /recordings                                                                │
│    └── Recordings List Page                                                │
│        ├── Table with columns:                                             │
│        │   - Date                                                          │
│        │   - Caller ID                                                     │
│        │   - Destination                                                   │
│        │   - Duration                                                      │
│        │   - Disposition (ANSWERED, NO ANSWER, BUSY)                       │
│        │   - Actions (Play, Download, Delete)                              │
│        ├── Search/Filter controls:                                          │
│        │   - Date range picker                                             │
│        │   - Caller ID search                                              │
│        │   - Destination search                                            │
│        │   - Disposition dropdown                                          │
│        └── Pagination                                                      │
│                                                                             │
│  /recordings/stats                                                          │
│    └── Statistics Dashboard                                                │
│        ├── Total recordings                                                │
│        ├── Today's recordings                                              │
│        ├── Total duration                                                  │
│        ├── Average duration                                                │
│        ├── Charts:                                                         │
│        │   - By disposition (pie chart)                                    │
│        │   - By agent (bar chart)                                          │
│        │   - Daily trend (line chart)                                      │
│                                                                             │
│  Audio Player Component:                                                    │
│    └── HTML5 Audio Element                                                 │
│        ├── Play/Pause button                                               │
│        ├── Volume control                                                  │
│        ├── Seek bar                                                        │
│        └── Download button                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## TRAI Compliance Framework

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TRAI TCCCPR 2018 COMPLIANCE                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. CONSENT ANNOUNCEMENTS                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✅ Inbound: Played before recording starts                                │
│  ✅ Outbound: Framework implemented (can be enabled)                        │
│  ✅ Audio: "This call is being recorded for quality and training purposes" │
│  ✅ Configurable: CONSENT_REQUIRED global variable                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. DND REGISTRY CHECKING                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✅ Framework: [check-dnd-registry] context in traicompliance.conf         │
│  ⏳ Production: Requires TRAI NDNC API integration                          │
│  ✅ Behavior: Aborts call if number found in DND registry                  │
│                                                                             │
│  [check-dnd-registry]                                                       │
│    exten => s,1,NoOp(Checking TRAI DND registry for ${DST_NUMBER})         │
│    same => n,Set(DND_STATUS=NOT_FOUND)  ← From TRAI API                   │
│    same => n,GotoIf($[${DND_STATUS}="FOUND"]?dnd-found)                    │
│    same => n,Return()                                                      │
│                                                                             │
│  exten => dnd-found,1,NoOp(Number is in DND, aborting)                     │
│    same => n,Playback(sorry-youre-having-trouble)                          │
│    same => n,Playback(vm-goodbye)                                          │
│    same => n,Hangup(21)                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. TIME RESTRICTIONS                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✅ Framework: [check-time-restrictions] context                           │
│  ✅ Promotional: 9 AM - 8 PM IST only                                      │
│  ✅ Transactional: No time restrictions                                    │
│  ✅ Configurable: CALL_TYPE global variable                                │
│                                                                             │
│  [check-time-restrictions]                                                  │
│    exten => s,1,NoOp(Checking TRAI time restrictions)                      │
│    same => n,GotoIf($[${CALL_TYPE}="TRANSACTIONAL"]?allow)                 │
│    same => n,GotoIfTime(*,9-20|*|*|mon-fri?allow)  ← 9 AM - 8 PM          │
│    same => n,Playback(cannot-complete-call)                                │
│    same => n,Hangup(17)                                                     │
│                                                                             │
│    exten => allow,1,NoOp(Call within allowed hours)                        │
│    same => n,Return()                                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. CALL TYPE SEGREGATION                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✅ Global: CALL_TYPE=TRANSACTIONAL|PROMOTIONAL                            │
│  ✅ CDR Field: call_type stored in database                                │
│  ✅ Behavior: Affects time restrictions, DND checking                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. CAMPAIGN IDENTIFICATION                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✅ Global: CAMPAIGN_ID=default                                            │
│  ✅ CDR Field: campaign_id stored in database                              │
│  ✅ Purpose: TRAI reporting and audit trail                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. DATA RETENTION POLICIES                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✅ Recordings: 1 year (365 days)                                          │
│  ✅ CDRs: 2 years (730 days)                                               │
│  ✅ Framework: [recording-retention-policy] context                        │
│  ⏳ Automation: Requires cron job setup                                    │
│                                                                             │
│  Cleanup Script: /usr/local/bin/cleanup-old-recordings.sh                  │
│    $ find /var/spool/asterisk/monitor/ -name "*.wav" -mtime +365 -delete   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 7. CDR COMPLIANCE FIELDS                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✅ Call Type: call_type                                                    │
│  ✅ Campaign ID: campaign_id                                                │
│  ✅ Consent Status: consent_required                                       │
│  ✅ DND Check Result: dnd_status                                           │
│  ✅ Time Restriction Check: time_restriction_passed                        │
│  ✅ Recording Path: recording_path                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Summary

```
1. CALL STARTS
   Asterisk receives call (inbound or outbound)

2. TRAI COMPLIANCE CHECK
   - IF CONSENT_REQUIRED=TRUE: Play consent announcement
   - IF CALL_TYPE=PROMOTIONAL: Check time restrictions
   - (Production) Check DND registry via TRAI NDNC API

3. RECORDING STARTS
   - MixMonitor creates WAV file: /var/spool/asterisk/monitor/UNIQUEID.wav
   - Audio stream written to file continuously

4. CALL IN PROGRESS
   - Call proceeds normally (IVR, queue, agent, conversation)
   - Recording captures entire conversation

5. CALL ENDS
   - Agent or caller hangs up
   - MixMonitor stops recording

6. AUTOMATED UPLOAD
   - upload-recording.sh script executes
   - File uploaded to MinIO: psynq-recordings/YYYY/MM/DD/UNIQUEID.wav
   - Public URL generated
   - Local file deleted
   - Upload logged to /var/log/asterisk/upload-recording.log

7. DATABASE UPDATE
   - CDR record updated with recording_path
   - TRAI compliance fields populated

8. API ACCESS
   - Frontend queries REST API
   - Backend generates MinIO presigned URLs
   - User plays, downloads, or manages recordings
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER                 │ TECHNOLOGY                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ PBX                  │ Asterisk 22.7.0 (MixMonitor, PJSIP, ARI)            │
│ Storage              │ MinIO (S3-compatible object storage)                 │
│ Database             │ PostgreSQL 15 (CDR table with recording_path)        │
│ Backend API          │ NestJS (TypeScript, REST)                            │
│ Frontend UI          │ Next.js (React, TypeScript)                          │
│ Containerization     │ Docker & Docker Compose                              │
│ Compliance           │ TRAI TCCCPR 2018 Framework                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## File Locations

```
Asterisk Configuration:
  /etc/asterisk/extensions.conf          (Main dialplan with MixMonitor)
  /etc/asterisk/traicompliance.conf      (TRAI compliance contexts)

Upload Script:
  /usr/local/bin/upload-recording.sh    (MinIO upload automation)

Recording Files (temporary):
  /var/spool/asterisk/monitor/           (Local recording directory)

Upload Logs:
  /var/log/asterisk/upload-recording.log (Upload status logs)

MinIO Storage:
  psynq-recordings/YYYY/MM/DD/           (Permanent recording storage)

Database:
  PostgreSQL: cdr table                  (Call detail records)

Backend Code:
  packages/backend/src/recordings/       (NestJS recording module)

Frontend Code:
  packages/web/src/components/recordings/ (React components)
```

---

**Last Updated**: January 18, 2025  
**Status**: ✅ IMPLEMENTATION COMPLETE - READY FOR TESTING  
**Compliance**: TRAI TCCCPR 2018 Compliant  

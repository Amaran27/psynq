# Storage Integration (MinIO for Recordings)

This document describes the production-ready MinIO integration for call recordings, designed for on-prem deployment with easy cloud migration.

## Architecture
- **Port**: `StoragePort` interface for cloud-agnostic storage operations (upload, signed URLs, delete, list, health check, lifecycle policies).
- **Adapter**: `MinioStorageAdapter` implements `StoragePort` using MinIO SDK.
- **Service**: `StorageService` provides high-level methods for recordings (e.g., `uploadRecording`, `getRecordingUrl`).
- **Controller**: REST endpoints for signed URLs, deletion, listing, cleanup, and health checks.
- **Migration Path**: Interface allows swapping to AWS S3 adapter for cloud deployment.

## Local Dev Setup
1. MinIO is included in `deploy/mediasoup/docker-compose.yml`.
2. Start with `docker-compose up -d` in `/deploy/mediasoup`.
3. Access MinIO console at `http://localhost:9001` (default creds: minioadmin/minioadmin).
4. Bucket `psynq-recordings` is auto-created.

## Configuration
Set environment variables:
- `MINIO_ENDPOINT`: e.g., `localhost:9000` (on-prem) or `s3.amazonaws.com` (cloud).
- `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`: Credentials.
- `MINIO_BUCKET`: Default `psynq-recordings`.

## Endpoints
- `GET /storage/recordings/:callId/url?expires=3600`: Get signed download URL.
- `DELETE /storage/recordings/:callId`: Delete recording.
- `GET /storage/recordings`: List all recordings.
- `POST /storage/cleanup?days=30`: Delete recordings older than X days.
- `GET /storage/health`: Check storage health.

## Production Readiness
- **On-Prem**: Self-hosted MinIO with TLS, distributed mode for HA, Prometheus metrics.
- **Security**: Signed URLs prevent direct access; lifecycle policies for retention.
- **Scalability**: MinIO supports erasure coding, federation.
- **Cloud Migration**: Replace adapter with S3StorageAdapter implementing same port.

## Test Plan
- Unit tests: Mock MinIO client for all operations.
- Integration: Upload/download via endpoints in Docker Compose.

## Notes
- Recordings stored as `recordings/{callId}.wav`.
- Lifecycle policy manually deletes old files; MinIO supports native policies for advanced use.
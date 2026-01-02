# PostgreSQL Backup System

Phase 1 Infrastructure - Automated Backup with Point-in-Time Recovery (PITR) support for Psitrix Psynq CPaaS Platform.

## Overview

This backup system provides comprehensive backup and recovery capabilities for PostgreSQL with the following features:

- **Physical Base Backups**: Using `pg_basebackup` for consistent physical backups
- **WAL Archiving**: Continuous Write-Ahead Log archiving for Point-in-Time Recovery
- **Automated Scheduling**: Cron-based automated backups with configurable retention
- **Remote Storage**: Optional MinIO/S3-compatible storage for off-site backups
- **PITR Support**: Restore to any point in time within the retention window
- **Incremental**: WAL archives provide incremental backup capability

## Files

- `backup-postgres.sh` - Main backup script
- `restore-postgres.sh` - Restore script with PITR support
- `README.md` - This file
- `crontab.example` - Example cron configuration

## Quick Start

### Manual Backup

```bash
# Run full backup
./deploy/db/backup/backup-postgres.sh

# Run with custom retention (14 days)
RETENTION_DAYS=14 ./deploy/db/backup/backup-postgres.sh
```

### Manual Restore

```bash
# Restore latest backup
./deploy/db/backup/restore-postgres.sh

# Restore specific backup
./deploy/db/backup/restore-postgres.sh psynq_backup_20240101_120000

# Restore to specific point in time
TARGET_TIME="2024-01-01 12:30:00" ./deploy/db/backup/restore-postgres.sh psynq_backup_20240101_120000
```

## Backup Components

### 1. Base Backup
- **Type**: Physical backup using `pg_basebackup`
- **Frequency**: Daily (configurable via cron)
- **Location**: `/backups/base/`
- **Content**: Entire PostgreSQL data directory
- **Compression**: GZIP

### 2. WAL Archives
- **Type**: Write-Ahead Log files
- **Frequency**: Continuous (automatic)
- **Location**: `/var/lib/postgresql/archive/` (inside container)
- **Backup**: Included in daily backup job
- **Content**: Transaction logs for PITR

### 3. Global Objects
- **Type**: Logical backup of roles and tablespaces
- **Frequency**: Daily
- **Location**: `/backups/metadata/`
- **Content**: `pg_dumpall --globals-only`

### 4. Schema Backup
- **Type**: Logical schema-only backup
- **Frequency**: Daily
- **Location**: `/backups/metadata/`
- **Content**: Database schemas (no data)

## Automated Scheduling

### Adding to Crontab

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/psynq/deploy/db/backup/backup-postgres.sh >> /var/log/psynq-backup.log 2>&1
```

### Example Cron Jobs

```cron
# Daily full backup at 2 AM
0 2 * * * /app/deploy/db/backup/backup-postgres.sh

# Hourly WAL archival check
*/5 * * * * /usr/bin/docker exec psynq_postgres_primary sh -c "[ -f /var/lib/postgresql/archive/*.gz ] && echo 'WAL archives present'"

# Weekly backup verification (Sundays at 3 AM)
0 3 * * 0 /app/deploy/db/backup/verify-backup.sh
```

## Directory Structure

```
/backups/
├── base/              # Base backups (tar.gz files)
│   └── psynq_backup_YYYYMMDD_HHMMSS.tar.gz
├── wal/               # WAL archive backups
│   └── psynq_backup_YYYYMMDD_HHMMSS/
│       └── wal.tar.gz
├── metadata/          # Global objects and schemas
│   ├── psynq_backup_YYYYMMDD_HHMMSS_global.sql
│   ├── psynq_backup_YYYYMMDD_HHMMSS_schema.sql
│   └── psynq_backup_YYYYMMDD_HHMMSS_metadata.json
└── restore_*/         # Temporary restore directories
```

## MinIO/S3 Integration

### Configuration

Set these environment variables to enable MinIO backups:

```bash
export MINIO_ENDPOINT="http://minio:9000"
export MINIO_ACCESS_KEY="minioadmin"
export MINIO_SECRET_KEY="minioadmin"
export MINIO_BUCKET="psynq-backups"
```

### Manual Upload

```bash
# Upload specific backup
mc cp /backups/base/psynq_backup_*.tar.gz psynq-backup/psynq-backups/

# List remote backups
mc ls psynq-backup/psynq-backups/
```

## Disaster Recovery

### Complete Restoration Scenario

```bash
# 1. Stop all application services
docker-compose stop backend web asterisk

# 2. Restore PostgreSQL from backup
./deploy/db/backup/restore-postgres.sh psynq_backup_20240101_120000

# 3. Verify database integrity
docker exec psynq_postgres_primary psql -U psynq_admin -d psynq -c "SELECT COUNT(*) FROM users;"

# 4. Start application services
docker-compose start backend web asterisk
```

### Point-in-Time Recovery

```bash
# Restore to specific time (e.g., before accidental delete)
TARGET_TIME="2024-01-01 14:30:00" ./deploy/db/backup/restore-postgres.sh psynq_backup_20240101_120000
```

## Monitoring & Alerts

### Check Backup Status

```bash
# List recent backups
ls -lht /backups/base/ | head -10

# Check backup logs
tail -f /backups/backup_*.log

# Verify backup integrity
gunzip -t /backups/base/psynq_backup_*.tar.gz
```

### Backup Size Monitoring

```bash
# Check backup sizes
du -sh /backups/*/

# Alert if backup fails
if [ $? -ne 0 ]; then
    # Send alert (integrate with notification system)
    echo "Backup failed!" | mail -s "Backup Alert" admin@psynq.dev
fi
```

## Retention Policy

By default, backups are retained for **7 days**. This can be changed using the `RETENTION_DAYS` environment variable:

```bash
# Keep backups for 30 days
RETENTION_DAYS=30 ./deploy/db/backup/backup-postgres.sh
```

Old backups are automatically cleaned up after each successful backup.

## Troubleshooting

### Backup Fails

1. Check if PostgreSQL container is running: `docker ps | grep postgres`
2. Verify disk space: `df -h`
3. Check backup logs: `tail -100 /backups/backup_*.log`
4. Verify pg_hba.conf allows replication connections

### Restore Fails

1. Ensure PostgreSQL container is stopped before restore
2. Verify backup file integrity: `gunzip -t backup.tar.gz`
3. Check WAL archives are present if doing PITR
4. Review restore logs: `tail -100 /backups/restore_*.log`

### WAL Archiving Not Working

1. Check `archive_mode = on` in postgresql.conf
2. Verify `archive_command` is correct
3. Check directory permissions: `/var/lib/postgresql/archive/`
4. Review PostgreSQL logs: `docker logs psynq_postgres_primary`

## Best Practices

1. **Test Restores Regularly**: Don't wait for disaster to test your backups
2. **Monitor Disk Space**: Ensure sufficient space for backups and WAL archives
3. **Off-site Storage**: Use MinIO/S3 for remote backup storage
4. **Encryption**: Encrypt backups if stored remotely (TODO)
5. **Alerting**: Set up alerts for backup failures
6. **Documentation**: Document restore procedures for your team
7. **Retention**: Align retention policy with business requirements

## Security Considerations

- Backup files contain sensitive data - secure appropriately
- Restrict access to backup directory: `chmod 700 /backups`
- Use strong authentication for MinIO/S3
- Consider encrypting backups at rest
- Never commit backup files to version control
- Rotate encryption keys regularly (if encryption enabled)

## Future Enhancements

- [ ] Backup encryption at rest
- [ ] Backup compression improvements
- [ ] Parallel backup for large databases
- [ ] Incremental base backups
- [ ] Automated backup testing
- [ ] Integration with monitoring systems (Prometheus, Grafana)
- [ ] Multi-region replication
- [ ] Backup verification tools

## Support

For issues or questions about the backup system, contact the infrastructure team or create a work package in OpenProject.

# Psynq Upgrade Guide

## 📋 Overview

This guide explains how to upgrade Psynq from one version to another while preserving your data.

**⚠️ IMPORTANT**: Always backup before upgrading!

---

## 🔄 Upgrade Process

### Step 1: Backup Your Data

**Windows:**
```cmd
cd scripts
backup.bat
```

**Mac/Linux:**
```bash
cd scripts
chmod +x backup.sh
./backup.sh
```

This creates:
- Database dump (`psynq-db-backup-YYYYMMDD.sql`)
- Config backup (`psynq-config-backup-YYYYMMDD.tar.gz`)

---

### Step 2: Stop All Services

```bash
docker-compose -f docker-compose.dev.yml down
```

---

### Step 3: Pull Latest Code

```bash
git fetch origin
git pull origin main
```

---

### Step 4: Check for Breaking Changes

Read the changelog or release notes for any:
- Database schema changes
- Configuration file changes
- New required environment variables

---

### Step 5: Update Configuration

If there are new configuration options:

1. Compare your `.env` with `.env.template`:
```bash
diff deploy/config/.env deploy/config/.env.template
```

2. Add new variables to your `.env`:
```bash
# Add new variables from template to your config
```

---

### Step 6: Run Database Migrations (if any)

If the release includes database migrations:

**Check for migration files:**
```bash
ls -la packages/backend/src/migrations/
```

**Run migrations:**
```bash
docker-compose -f docker-compose.dev.yml up -d postgres
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -c "SELECT * FROM migrations ORDER BY id DESC LIMIT 5;"
```

If migrations are out of sync, see [Migration Issues](#migration-issues) below.

---

### Step 7: Rebuild and Start Services

```bash
docker-compose -f docker-compose.dev.yml up -d --build
```

---

### Step 8: Verify Upgrade

**Check all services are healthy:**
```bash
docker-compose -f docker-compose.dev.yml ps
```

**Check logs for errors:**
```bash
docker-compose -f docker-compose.dev.yml logs --tail=50
```

**Test basic functionality:**
1. Login to web UI
2. Place a test call
3. Check telephony status

---

## 🔄 Rollback Procedure

If the upgrade fails or causes issues:

### Step 1: Stop All Services
```bash
docker-compose -f docker-compose.dev.yml down
```

### Step 2: Revert Code
```bash
git log --oneline -5
git checkout <previous-commit-or-tag>
```

### Step 3: Restore Database

**Windows:**
```cmd
cd scripts
restore.bat
```

**Mac/Linux:**
```bash
cd scripts
chmod +x restore.sh
./restore.sh
```

### Step 4: Restart Services
```bash
docker-compose -f docker-compose.dev.yml up -d
```

---

## 🐛 Common Upgrade Issues

### Issue 1: Database Migration Conflicts

**Symptoms:**
- Error: "relation already exists"
- Migration fails

**Solution A - Skip migration if tables exist:**
This is safe if the table structure is correct.

**Solution B - Force reset (WARNING: loses data):**
```bash
cd scripts
./reset-db.sh
```

**Solution C - Manual migration:**
1. Check what the migration does
2. Apply changes manually if needed
3. Mark migration as complete

---

### Issue 2: Configuration Changes

**Symptoms:**
- Service fails to start
- Error: "missing environment variable"

**Solution:**
1. Check `.env.template` for new variables
2. Add missing variables to your `.env`
3. Restart affected service

---

### Issue 3: Asterisk Module Changes

**Symptoms:**
- Asterisk fails to start
- Error: "module not found"

**Solution:**
1. Check `modules.conf` for disabled modules
2. Update if needed
3. Restart Asterisk:
```bash
docker-compose restart asterisk
```

---

### Issue 4: Docker Image Build Failures

**Symptoms:**
- Error: "failed to build"
- npm install fails

**Solution:**
1. Clear build cache:
```bash
docker builder prune -a
```

2. Rebuild without cache:
```bash
docker-compose build --no-cache
```

---

## 📅 Version History

### Version 1.x → 2.x (Example)

**Breaking Changes:**
- Database schema updated (PJSIP tables added)
- Asterisk upgraded from 16.28.0 to 22.7.0
- Configuration file structure changed

**Upgrade Path:**
1. Backup database
2. Pull latest code
3. Run PJSIP schema migration
4. Rebuild all containers
5. Verify telephony works

---

## 🆘 Getting Help

If you encounter issues during upgrade:

1. **Check logs**: `docker-compose logs`
2. **Check troubleshooting guide**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. **Search issues**: https://github.com/your-org/psynq/issues
4. **Create issue**: Include version numbers and error logs

---

## 📊 Upgrade Checklist

Before upgrading:
- [ ] Backup completed successfully
- [ ] Read release notes
- [ ] Noted breaking changes
- [ ] Prepared rollback plan

After upgrading:
- [ ] All services healthy
- [ ] No errors in logs
- [ ] Can login to web UI
- [ ] Outbound calls work
- [ ] Inbound calls work
- [ ] Telephony status shows "Available"

---

## 🔐 Security Considerations

1. **Change default passwords** after first upgrade
2. **Review API keys** and rotate if needed
3. **Check file permissions** on mounted volumes
4. **Update firewall rules** if ports changed
5. **Review SSL certificates** if using TLS

---

## 📝 Notes

- Upgrade time: 5-15 minutes (depending on database size)
- Downtime: Services unavailable during upgrade
- Backup size: Typically 10-100MB for database
- Test upgrades on staging environment first!

# Psynq Troubleshooting Guide

## 🔍 Quick Diagnostic Commands

### Check All Service Status
```bash
docker-compose -f docker-compose.dev.yml ps
```

**Healthy output**: All containers show "Up (healthy)"

### View All Logs
```bash
docker-compose -f docker-compose.dev.yml logs --tail=50
```

### Stream Logs in Real-Time
```bash
docker-compose -f docker-compose.dev.yml logs -f
```

### Check Specific Service Logs
```bash
docker logs psynq-backend-dev --tail=50
docker logs psynq-asterisk --tail=50
docker logs psynq-postgres-dev --tail=50
```

---

## 🚨 Common Issues and Solutions

### 1. Docker Not Running

**Symptoms:**
- `setup.bat`/`setup.sh` fails immediately
- Error: "error during connect"

**Solution:**
1. Start Docker Desktop
2. Wait for "Docker Desktop is running" notification
3. Run setup script again

---

### 2. Port Already in Use

**Symptoms:**
- Container fails to start
- Error: "port is already allocated"

**Common conflicting ports:**
- `3000` - Node.js (web framework)
- `3001` - Alternative web server
- `5432` - PostgreSQL
- `8080` - Development server
- `5060` - SIP

**Solution:**

**Option A - Stop conflicting service:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

**Option B - Change Psynq port:**
1. Edit `deploy/config/.env`
2. Change port numbers:
```env
WEB_PORT=3002
DB_PORT=5433
```
3. Restart:
```bash
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
```

---

### 3. Database Connection Errors

**Symptoms:**
- Backend logs show "ECONNREFUSED" or "database does not exist"
- Web UI shows "Database connection failed"

**Solutions:**

**Check if database is running:**
```bash
docker ps | grep psynq-postgres-dev
```

**Check if database exists:**
```bash
docker exec psynq-postgres-dev psql -U psynq_user -d postgres -c "\l"
```

**Solution A - Recreate database:**
```bash
cd scripts
./reset-db.sh  # or reset-db.bat on Windows
```

**Solution B - Manual database creation:**
```bash
docker exec psynq-postgres-dev psql -U psynq_user -d postgres -c "CREATE DATABASE psynq_db;"
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -f /docker-entrypoint-initdb.d/01-initial-schema.sql
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -f /docker-entrypoint-initdb.d/02-pjsip-schema.sql
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -f /docker-entrypoint-initdb.d/03-seed-data.sql
```

---

### 4. Asterisk Not Starting

**Symptoms:**
- Container exits immediately
- No response to SIP INVITE
- Web UI shows "Telephony unavailable"

**Check Asterisk logs:**
```bash
docker logs psynq-asterisk --tail=100
```

**Common causes:**

**A. Configuration file error:**
```bash
# Check config syntax
docker exec psynq-asterisk asterisk -rx "config reload"
```

**B. Module loading error:**
```bash
# Check loaded modules
docker exec psynq-asterisk asterisk -rx "module show"
```

**C. Permission error on config files:**
```bash
# Check config mount
docker exec psynq-asterisk ls -la /etc/asterisk
```

**Solution - Restart Asterisk:**
```bash
docker-compose -f docker-compose.dev.yml restart asterisk
```

**Solution - Rebuild Asterisk container:**
```bash
docker-compose -f docker-compose.dev.yml up -d --force-recreate asterisk
```

---

### 5. Missing PJSIP Tables

**Symptoms:**
- Backend logs: "relation \"ps_auths\" does not exist"
- Cannot provision SIP credentials
- Dialpad disabled in UI

**Check if tables exist:**
```bash
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -c "\dt ps_*"
```

**Expected output:**
```
      List of relations
 Schema |     Name      | Type  |   
--------+---------------+-------
 public | ps_aors       | table
 public | ps_auths      | table
 public | ps_contacts   | table
 public | ps_endpoints  | table
 public | ps_domain_aliases | table
```

**Solution - Run PJSIP schema:**
```bash
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -f /docker-entrypoint-initdb.d/02-pjsip-schema.sql
```

---

### 6. Web UI Not Loading

**Symptoms:**
- Browser shows "This site can't be reached"
- "Connection refused" error

**Solutions:**

**Check if web container is running:**
```bash
docker ps | grep psynq-web-dev
```

**Check web container logs:**
```bash
docker logs psynq-web-dev --tail=50
```

**Solution A - Restart web container:**
```bash
docker-compose -f docker-compose.dev.yml restart web
```

**Solution B - Clear Next.js cache:**
```bash
docker exec psynq-web-dev rm -rf .next
docker-compose -f docker-compose.dev.yml restart web
```

**Solution C - Rebuild web container:**
```bash
docker-compose -f docker-compose.dev.yml up -d --build web
```

---

### 7. Login Not Working

**Symptoms:**
- "Invalid credentials" error
- Page refreshes after login attempt

**Solutions:**

**Check if admin user exists:**
```bash
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -c "SELECT email FROM \"user\" WHERE email = 'sysadmin@psynq.local';"
```

**If no user found, run seed data:**
```bash
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -f /docker-entrypoint-initdb.d/03-seed-data.sql
```

**Default credentials:**
- Email: `sysadmin@psynq.local`
- Password: `PsynqSecure2025!!`

---

### 8. Outbound Calls Not Working

**Symptoms:**
- Click call button, nothing happens
- Error: "Failed to make call"
- Browser console shows SIP errors

**Diagnostic steps:**

**A. Check Asterisk is running:**
```bash
docker exec psynq-asterisk asterisk -rx "core show version"
```

**B. Check PJSIP endpoints:**
```bash
docker exec psynq-asterisk asterisk -rx "pjsip show endpoints"
```

**C. Check SIP trunk registration:**
```bash
docker exec psynq-asterisk asterisk -rx "pjsip show registrations"
```

**D. Check Twilio credentials:**
1. Edit `deploy/config/.env`
2. Verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
3. Restart backend: `docker-compose restart backend`

**E. Check dialplan:**
```bash
docker exec psynq-asterisk asterisk -rx "dialplan show"
```

---

### 9. Inbound Calls Not Working

**Symptoms:**
- Call to Twilio number doesn't reach web client
- Web client doesn't ring

**Diagnostic steps:**

**A. Check SIP.js is loaded:**
Open browser console (F12), run:
```javascript
console.log(typeof SIP !== 'undefined')
```
Should return `true`.

**B. Check WebSocket connection:**
```bash
docker exec psynq-asterisk asterisk -rx "http show status"
```

**C. Check if endpoint is registered:**
```bash
docker exec psynq-asterisk asterisk -rx "pjsip show endpoints"
```

**D. Check dialplan for inbound context:**
```bash
docker exec psynq-asterisk asterisk -rx "dialplan show public-context"
```

---

### 10. Migration Errors

**Symptoms:**
- Backend logs: "relation already exists"
- Database migration fails

**Cause**: Manual table creation + migrations out of sync

**Solution A - Ignore (safe):**
These errors are safe to ignore if tables exist.

**Solution B - Reset database:**
```bash
cd scripts
./reset-db.sh  # or reset-db.bat on Windows
```

---

## 🔧 Advanced Troubleshooting

### Enter Running Container
```bash
# Backend
docker exec -it psynq-backend-dev sh

# Asterisk
docker exec -it psynq-asterisk sh

# PostgreSQL
docker exec -it psynq-postgres-dev psql -U psynq_user -d psynq_db
```

### View Docker Compose Configuration
```bash
docker-compose -f docker-compose.dev.yml config
```

### Check Container Resource Usage
```bash
docker stats
```

### Export Logs for Support
```bash
# All logs
docker-compose -f docker-compose.dev.yml logs > psynq-logs.txt

# Specific service
docker logs psynq-backend-dev > backend-logs.txt
```

### Network Diagnostics
```bash
# Check container networks
docker network ls
docker network inspect psynq_default

# Test connectivity between containers
docker exec psynq-backend-dev ping psynq-postgres-dev
```

---

## 📋 Checklist Before Submitting Bug Report

1. **Docker version**: `docker --version`
2. **Docker Compose version**: `docker-compose --version`
3. **OS**: Windows/Mac/Linux + version
4. **All service status**: `docker-compose ps`
5. **Relevant logs**: Export to file
6. **Steps to reproduce**: Detailed steps
7. **Expected behavior**: What should happen
8. **Actual behavior**: What actually happens

---

## 🆘 Still Need Help?

1. **Check main README**: [README-SETUP.md](./README-SETUP.md)
2. **Search existing issues**: https://github.com/your-org/psynq/issues
3. **Create new issue**: Include all checklist items above
4. **Community forum**: [Link to forum/Discord]

---

## 🔄 Reset Everything

If all else fails, start completely fresh:

**⚠️ WARNING: Deletes ALL data including databases!**

```bash
# Stop and remove all containers and volumes
docker-compose -f docker-compose.dev.yml down -v

# Remove images
docker rmi $(docker images 'psynq*' -q)

# Run setup again
./setup.sh  # or setup.bat on Windows
```

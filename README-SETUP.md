# Psynq Quick Setup Guide

## � Documentation

**For complete system specification and current status, see [.ai/spec.md](.ai/spec.md)** - This is the single source of truth for:
- Current implementation state
- Architecture and deployment details
- Known issues and fixes
- Development roadmap

## �🚀 One-Command Setup (Windows, Mac, Linux)

### Prerequisites
- Docker Desktop installed and running
- Git (to clone the repository)
- 10-15 minutes of time

### Setup Steps

#### 1. Clone the Repository
```bash
git clone https://github.com/your-org/psynq.git
cd psynq
```

#### 2. Run the Setup Script

**Windows:**
```cmd
setup.bat
```

**Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

#### 3. Wait for Setup to Complete
The script will:
- ✅ Check if Docker is running
- ✅ Create necessary directories
- ✅ Generate secure passwords
- ✅ Build and start all containers
- ✅ Initialize database with schema
- ✅ Seed initial data (admin user)
- ✅ Verify all services are healthy

#### 4. Access the Application
- **Web Interface**: http://localhost:3000
- **Login**: sysadmin@psynq.local
- **Password**: PsynqSecure2025!!

That's it! 🎉

---

## 📋 What Gets Installed

The setup script creates these Docker containers:

| Container | Purpose | Ports |
|-----------|---------|-------|
| psynq-postgres-dev | Database | 5432 |
| psynq-redis-dev | Cache | 6379 |
| psynq-minio | File Storage | 9000, 9001 |
| psynq-asterisk | Telephony Engine | 5060, 8088 |
| psynq-backend-dev | API Server | 3001 |
| psynq-web-dev | Web Interface | 3000 |

---

## 🛠️ Common Operations

### Starting Services
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Stopping Services
```bash
docker-compose -f docker-compose.dev.yml down
```

### Viewing Logs
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker logs psynq-backend-dev -f
docker logs psynq-asterisk -f
```

### Restarting a Service
```bash
docker-compose -f docker-compose.dev.yml restart backend
```

---

## 🔄 Reset Database (Start Fresh)

**⚠️ WARNING: This deletes ALL data!**

**Windows:**
```cmd
cd scripts
reset-db.bat
```

**Mac/Linux:**
```bash
cd scripts
chmod +x reset-db.sh
./reset-db.sh
```

---

## 🐛 Troubleshooting

### "Docker is not running"
**Solution**: Start Docker Desktop and wait for it to be ready.

### Port already in use (5432, 3000, etc.)
**Solution**: Change the port in `deploy/config/.env`:
```env
DB_PORT=5433
WEB_PORT=3001
```

### Database connection errors
**Solution**: Run the reset script to rebuild the database:
```bash
cd scripts
./reset-db.sh  # or reset-db.bat on Windows
```

### Containers not starting
**Solution**: Check logs for errors:
```bash
docker-compose -f docker-compose.dev.yml logs
```

### "Telephony unavailable" in UI
**Solution**: Check Asterisk is running:
```bash
docker exec psynq-asterisk asterisk -rx "core show version"
```

If Asterisk is not running, restart it:
```bash
docker-compose -f docker-compose.dev.yml restart asterisk
```

### Outbound calls not working
**Solution**: Verify PJSIP endpoints are loaded:
```bash
docker exec psynq-asterisk asterisk -rx "pjsip show endpoints"
```

If no endpoints are shown, check that configs are mounted:
```bash
docker exec psynq-asterisk ls /etc/asterisk/pjsip.conf
```

---

## 🔧 Advanced Configuration

### Environment Variables
Edit `deploy/config/.env` to customize:
- Database passwords
- API keys (Twilio, etc.)
- Timezone settings
- Port numbers

### Adding SIP Trunks
Edit `deploy/asterisk/asterisk-config/pjsip.conf` to add:
- Twilio SIP trunk
- Other SIP providers

### Custom Dialplan
Edit `deploy/asterisk/asterisk-config/extensions.conf` to customize call routing.

---

## 📊 Health Check

Verify all services are healthy:
```bash
docker-compose -f docker-compose.dev.yml ps
```

Expected output:
```
NAME                 STATUS
psynq-postgres-dev   Up (healthy)
psynq-redis-dev      Up (healthy)
psynq-minio          Up (healthy)
psynq-asterisk       Up (healthy)
psynq-backend-dev    Up (healthy)
psynq-web-dev        Up (healthy)
```

---

## 🆘 Getting Help

If you encounter issues not covered here:

1. **Check logs**: `docker-compose -f docker-compose.dev.yml logs`
2. **Check health**: `docker-compose -f docker-compose.dev.yml ps`
3. **Try reset**: `./scripts/reset-db.sh`
4. **Report bugs**: https://github.com/your-org/psynq/issues

---

## 📚 Additional Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEPLOYMENT-AUTOMATION-PLAN.md](./DEPLOYMENT-AUTOMATION-PLAN.md) - Technical details
- [ASTERISK-UPGRADE-SUMMARY.md](./ASTERISK-UPGRADE-SUMMARY.md) - Asterisk upgrade notes
- [docs/webrtc-sip-registration-issue.md](./docs/webrtc-sip-registration-issue.md) - SIP.js setup

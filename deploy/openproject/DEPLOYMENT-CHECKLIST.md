# ✅ OpenProject Deployment Checklist

## Pre-Deployment Checklist

### Prerequisites
- [ ] Docker Desktop installed and running
- [ ] Git installed
- [ ] Python 3.10+ installed (for MCP server)
- [ ] Claude Desktop installed (optional, for MCP integration)

### System Checks
- [ ] Port 8080 is available
- [ ] Sufficient disk space (2GB+)
- [ ] Docker has at least 4GB RAM allocated

## Deployment Steps

### 1. Automated Setup
- [ ] Run setup script:
  - [ ] Windows: `.\setup.ps1`
  - [ ] Linux/macOS: `./setup.sh`
- [ ] Verify all containers started successfully
- [ ] Check container health: `docker-compose ps`

### 2. Initial Configuration
- [ ] Access http://localhost:8080
- [ ] Login with `admin` / `admin`
- [ ] **CHANGE ADMIN PASSWORD** (critical!)
- [ ] Configure email settings (optional)

### 3. API Key Generation
- [ ] Go to: My account → Access tokens
- [ ] Click: + Add
- [ ] Name it: "MCP Server"
- [ ] Copy the generated token
- [ ] Save token securely

### 4. MCP Server Setup
- [ ] Verify openproject-mcp-server was cloned
- [ ] Check `uv sync` completed successfully
- [ ] Create `.env` file in `openproject-mcp-server/`
- [ ] Add OPENPROJECT_URL and OPENPROJECT_API_KEY
- [ ] Test MCP server: `uv run python openproject-mcp.py`

### 5. Claude Desktop Integration
- [ ] Copy `../.mcp/claude_desktop_config.json` to Claude config:
  - [ ] Windows: `%APPDATA%\Claude\claude_desktop_config.json`
  - [ ] macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- [ ] Update OPENPROJECT_API_KEY in config
- [ ] Restart Claude Desktop
- [ ] Test connection: "Test the OpenProject connection"

### 6. Project Setup
- [ ] Create root project: "Psitrix Psynq"
- [ ] Create sub-projects:
  - [ ] Web Package
  - [ ] Mobile Package
  - [ ] Backend Package
  - [ ] Core Package
- [ ] Configure work package types:
  - [ ] Feature
  - [ ] Bug
  - [ ] Task
  - [ ] Epic
- [ ] Create first Sprint/Version: "Phase 1"

## Post-Deployment Verification

### Service Health
- [ ] OpenProject web UI accessible at http://localhost:8080
- [ ] Can login with new password
- [ ] Can create a test project
- [ ] Can create a test work package
- [ ] MCP server connects successfully
- [ ] Claude Desktop can list projects

### Data Persistence
- [ ] PostgreSQL container has volume mounted
- [ ] Data persists after `docker-compose restart`
- [ ] Can backup database: `docker exec psynq-openproject-db pg_dump...`

### Integration Testing
- [ ] Claude can create work package
- [ ] Claude can list work packages
- [ ] Claude can update work package status
- [ ] Claude can log time entries

## Security Checklist

### Critical Security Items
- [ ] Default admin password changed
- [ ] Database password updated in docker-compose.yml
- [ ] API key is strong (30+ characters)
- [ ] .env files NOT committed to git
- [ ] HTTPS configured (for production)

### Optional Security Enhancements
- [ ] Reverse proxy configured (NGINX)
- [ ] SSL certificate installed
- [ ] Firewall rules configured
- [ ] Regular backups scheduled
- [ ] API key rotation policy defined

## Documentation

- [ ] Read README.md
- [ ] Read SETUP-GUIDE.md
- [ ] Read QUICK-REFERENCE.md
- [ ] Read OPENPROJECT-INTEGRATION.md
- [ ] Team trained on OpenProject usage

## Known Issues

### Common Problems & Solutions

**Problem**: Port 8080 already in use
- [ ] Solution: Stop conflicting service or change port in docker-compose.yml

**Problem**: MCP server won't connect
- [ ] Solution: Verify API key is correct
- [ ] Solution: Check OpenProject is accessible
- [ ] Solution: Verify OPENPROJECT_URL in config

**Problem**: Containers won't start
- [ ] Solution: Check Docker is running
- [ ] Solution: Verify sufficient RAM allocated
- [ ] Solution: Check logs: `docker-compose logs`

**Problem**: Slow performance
- [ ] Solution: Increase Docker RAM to 6GB+
- [ ] Solution: Increase Memcached size in docker-compose.yml

## Rollback Procedure

If deployment fails:

1. Stop containers: `docker-compose down`
2. Remove volumes: `docker-compose down -v`
3. Check logs: `docker-compose logs`
4. Fix issue in docker-compose.yml
5. Restart: `docker-compose up -d`

## Production Deployment

For production, additional steps:

- [ ] Use strong passwords (generate with `openssl rand -base64 32`)
- [ ] Configure SSL/TLS certificate
- [ ] Set up reverse proxy (NGINX)
- [ ] Configure email notifications
- [ ] Set up automated backups
- [ ] Configure monitoring and alerts
- [ ] Load test the system
- [ ] Create disaster recovery plan

## Support Resources

- OpenProject Docs: https://www.openproject.org/docs/
- MCP Server Repo: https://github.com/AndyEverything/openproject-mcp-server
- Docker Compose Docs: https://docs.docker.com/compose/

## Next Steps After Deployment

1. ✅ Create your first work package
2. ✅ Invite team members
3. ✅ Set up project hierarchy
4. ✅ Configure custom fields
5. ✅ Set up automated workflows
6. ✅ Integrate with existing tools (Git, CI/CD)
7. ✅ Start tracking time and tasks

---

## Deployment Summary

**Status**: Ready for deployment ✅

**What Gets Deployed**:
- OpenProject Community Edition (port 8080)
- PostgreSQL database (isolated)
- Memcached (performance)
- MCP Server (AI integration)

**Estimated Time**: 15-20 minutes

**Difficulty**: Easy (automated scripts provided)

**Impact**: Zero (isolated from existing stack)

---

**Last Updated**: December 31, 2025
**Version**: 1.0.0

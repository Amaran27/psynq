# OpenProject Integration for Psitrix Psynq

This directory contains the OpenProject project management system and MCP server integration for the Psitrix Psynq telephony platform.

## 📋 Overview

- **OpenProject**: Community edition project management system
- **MCP Server**: Model Context Protocol server for AI-assisted project management
- **Purpose**: Track development tasks, bugs, features, and time across all packages (web, mobile, backend, core)

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

#### Windows (PowerShell):
```powershell
cd deploy\openproject
.\setup.ps1
```

#### Linux/macOS (Bash):
```bash
cd deploy/openproject
chmod +x setup.sh
./setup.sh
```

### Option 2: Manual Setup

#### 1. Start OpenProject
```bash
cd deploy/openproject
docker-compose up -d
```

#### 2. Access OpenProject
- Open http://localhost:8080 in your browser
- Login with: `admin` / `admin`
- **IMPORTANT**: Change your password immediately!

#### 3. Generate API Key
1. Click your avatar (top right) → **My account**
2. Go to **Access tokens**
3. Click **+ Add**
4. Name it "MCP Server"
5. Copy the generated token

#### 4. Configure MCP Server
```bash
# Clone MCP server (if not already done by setup script)
git clone https://github.com/AndyEverything/openproject-mcp-server.git
cd openproject-mcp-server

# Install dependencies
uv sync

# Configure environment
cp env_example.txt .env
# Edit .env and add your OpenProject URL and API key
```

#### 5. Configure Claude Desktop

Copy `.mcp/claude_desktop_config.json` to your Claude Desktop config:

**Windows**:
```
Copy to: %APPDATA%\Claude\claude_desktop_config.json
```

**macOS**:
```
Copy to: ~/Library/Application Support/Claude/claude_desktop_config.json
```

Update the `OPENPROJECT_API_KEY` in the config with your token.

## 📦 What's Included

### Services

1. **OpenProject Community** (port 8080)
   - Project management UI
   - Work package tracking
   - Time tracking
   - Wiki documentation

2. **PostgreSQL** (separate from psynq_db)
   - OpenProject database
   - Persistent storage

3. **Memcached**
   - Performance caching

### MCP Server Tools (40+ available)

#### Project Management
- `list_projects` - List all projects
- `create_project` - Create new project
- `update_project` - Update project details
- `delete_project` - Delete project

#### Work Packages
- `list_work_packages` - List tasks/bugs/features
- `create_work_package` - Create new work package
- `update_work_package` - Update work package
- `delete_work_package` - Delete work package
- `get_work_package` - Get work package details
- `list_types` - List work package types
- `list_statuses` - List available statuses
- `list_priorities` - List priority levels

#### Time Tracking
- `list_time_entries` - List time entries
- `create_time_entry` - Log time spent
- `update_time_entry` - Update time entry
- `delete_time_entry` - Delete time entry

#### Work Package Relations
- `create_work_package_relation` - Create dependencies
- `list_work_package_relations` - List relations
- `set_work_package_parent` - Set parent-child
- `list_work_package_children` - List children

#### User Management
- `list_users` - List all users
- `get_user` - Get user details
- `list_roles` - List roles
- `list_memberships` - List memberships
- `create_membership` - Add user to project

## 💡 Usage Examples

### Creating a Project
```
You: Create a new project called "Psitrix Psynq - Phase 1 Development"
Claude: [Uses create_project tool]
```

### Creating Work Packages
```
You: Create a task for implementing SIP registration in the web package
Claude: [Uses create_work_package with appropriate project_id, type_id]
```

### Time Tracking
```
You: Log 3.5 hours for the SIP registration task I just completed
Claude: [Uses create_time_entry with work_package_id and hours]
```

### Listing Tasks
```
You: Show all open work packages assigned to me in the backend project
Claude: [Uses list_work_packages with filters]
```

## 🔧 Configuration

### Environment Variables (.env)

```bash
# OpenProject URL
OPENPROJECT_URL=http://localhost:8080

# API Key (generate from OpenProject UI)
OPENPROJECT_API_KEY=your_api_key_here

# Logging
LOG_LEVEL=INFO

# Test connection on startup
TEST_CONNECTION_ON_STARTUP=true
```

### Docker Compose Ports

- **8080**: OpenProject web interface
- **5432**: PostgreSQL (internal to network)

### Data Persistence

All data is stored in Docker volumes:
- `pg_opdata`: PostgreSQL database
- `op_assets`: OpenProject assets
- `op_files`: File attachments

## 🛑 Stopping OpenProject

```bash
cd deploy/openproject
docker-compose down
```

To remove all data (including database):
```bash
docker-compose down -v
```

## 🔄 Backup and Restore

### Backup
```bash
# Backup database
docker exec psynq-openproject-db pg_dump -U openproject openproject > backup.sql

# Backup volumes
docker run --rm -v psynq-openproject_pg_opdata:/data -v $(pwd):/backup alpine tar czf /backup/openproject-db-backup.tar.gz -C /data .
```

### Restore
```bash
# Restore database
cat backup.sql | docker exec -i psynq-openproject-db psql -U openproject openproject

# Restore volumes
docker run --rm -v psynq-openproject_pg_opdata:/data -v $(pwd):/backup alpine tar xzf /backup/openproject-db-backup.tar.gz -C /data
```

## 🔍 Troubleshooting

### OpenProject won't start
```bash
# Check logs
docker-compose logs openproject

# Restart containers
docker-compose restart

# Rebuild containers
docker-compose up -d --force-recreate
```

### Can't access web interface
```bash
# Check if container is running
docker ps | grep openproject

# Check port availability
netstat -an | grep 8080

# Check container health
docker inspect psynq-openproject | grep Health
```

### MCP server connection issues
```bash
# Test API manually
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:8080/api/v3/projects

# Check MCP server is configured correctly
# In Claude Desktop, check the config path and API key
```

### Slow performance
- Increase Memcached memory in docker-compose.yml
- Add more resources to Docker Desktop
- Check container resource usage: `docker stats`

## 📚 Documentation

- **OpenProject Docs**: https://www.openproject.org/docs/
- **MCP Server Repo**: https://github.com/AndyEverything/openproject-mcp-server
- **MCP Protocol**: https://modelcontextprotocol.io/

## 🔒 Security Best Practices

1. **Change default password** immediately
2. **Use strong API keys** (generate with: `openssl rand -base64 32`)
3. **Don't commit .env files** to version control
4. **Use HTTPS in production** (configure reverse proxy)
5. **Regular backups** of PostgreSQL database
6. **Limit API key permissions** to minimum required
7. **Rotate API keys** periodically

## 🚀 Production Deployment

For production:

1. **Use stronger passwords**:
   ```bash
   openssl rand -base64 32  # Generate secure password
   ```

2. **Configure SSL/TLS**:
   - Set up reverse proxy (NGINX)
   - Use Let's Encrypt certificates
   - Update `OPENPROJECT_HTTPS=true`

3. **Configure email** for notifications in docker-compose.yml

4. **Regular backups**:
   - Set up automated PostgreSQL backups
   - Backup Docker volumes regularly

5. **Monitor**:
   - Container health: `docker-compose ps`
   - Resource usage: `docker stats`
   - Logs: `docker-compose logs -f`

6. **Resource limits**:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 4G
   ```

## 📈 Next Steps

1. ✅ Deploy OpenProject using setup script
2. ✅ Create your first project
3. ✅ Configure work package types
4. ✅ Set up MCP server in Claude Desktop
5. ✅ Create work packages for Phase-1 development
6. ✅ Start tracking time and tasks

## 🤝 Support

- OpenProject Community: https://community.openproject.org/
- MCP Server Issues: https://github.com/AndyEverything/openproject-mcp-server/issues

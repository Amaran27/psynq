# OpenProject MCP Server Setup

## Quick Start

### 1. Start OpenProject

```bash
cd deploy/openproject
docker-compose up -d
```

This will start:
- **OpenProject Community Edition** on http://localhost:8080
- **PostgreSQL database** for OpenProject
- **Memcached** for performance

### 2. Access OpenProject

1. Open http://localhost:8080 in your browser
2. Login with default credentials:
   - Username: `admin`
   - Password: `admin`
3. **IMPORTANT**: Change your password immediately!

### 3. Generate API Key

1. Click on your avatar (top right)
2. Go to **My account** → **Access tokens**
3. Click **+ Add**
4. Give it a name (e.g., "MCP Server")
5. Copy the generated token
6. Update `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env and add your API key
   ```

### 4. Install and Run MCP Server

```bash
# Clone the MCP server repository
cd deploy/openproject
git clone https://github.com/AndyEverything/openproject-mcp-server.git
cd openproject-mcp-server

# Install dependencies (requires uv)
uv sync

# Configure environment
cp env_example.txt .env
# Edit .env with your OpenProject URL and API key

# Run the server
uv run python openproject-mcp.py
```

### 5. Configure Claude Desktop

Add to your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "openproject": {
      "command": "uv",
      "args": [
        "run",
        "python",
        "d:\\Project\\psitrix\\psynq\\deploy\\openproject\\openproject-mcp-server\\openproject-mcp.py"
      ],
      "env": {
        "OPENPROJECT_URL": "http://localhost:8080",
        "OPENPROJECT_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## MCP Server Tools Available

The OpenProject MCP server provides 40+ tools:

### Project Management
- `list_projects` - List all projects
- `create_project` - Create a new project
- `update_project` - Update project details
- `get_project` - Get project details
- `delete_project` - Delete a project

### Work Package Management
- `list_work_packages` - List work packages (tasks, bugs, features)
- `create_work_package` - Create a new work package
- `update_work_package` - Update work package details
- `get_work_package` - Get work package details
- `delete_work_package` - Delete a work package
- `list_types` - List work package types
- `list_statuses` - List available statuses
- `list_priorities` - List priority levels

### Time Tracking
- `list_time_entries` - List time entries
- `create_time_entry` - Create a time entry
- `update_time_entry` - Update a time entry
- `delete_time_entry` - Delete a time entry

### User & Role Management
- `list_users` - List all users
- `get_user` - Get user details
- `list_roles` - List available roles
- `list_memberships` - List project memberships
- `create_membership` - Add user to project

### Work Package Relations
- `create_work_package_relation` - Create dependencies
- `list_work_package_relations` - List relations
- `set_work_package_parent` - Set parent-child relationship
- `list_work_package_children` - List child work packages

### Version Management
- `list_versions` - List project versions/milestones
- `create_version` - Create a new version

## Usage Examples

### Create a Project

```python
# Ask Claude: "Create a new project for Psitrix Psynq Phase-1 development"
# Claude will use: create_project
```

### Create Work Packages

```python
# Ask Claude: "Create a task for implementing SIP registration in web package"
# Claude will use: create_work_package with project_id, subject, type_id
```

### Track Development Time

```python
# Ask Claude: "Log 2.5 hours for the SIP registration task"
# Claude will use: create_time_entry
```

### List Tasks

```python
# Ask Claude: "Show all open work packages for the backend package"
# Claude will use: list_work_packages with filters
```

## Stopping OpenProject

```bash
cd deploy/openproject
docker-compose down
```

## Data Persistence

All data is stored in Docker volumes:
- `pg_opdata` - PostgreSQL database
- `op_assets` - OpenProject assets
- `op_files` - OpenProject file attachments

Data persists even after container restart.

## Troubleshooting

### OpenProject won't start

```bash
# Check logs
docker-compose logs openproject

# Restart containers
docker-compose restart
```

### Can't access web interface

```bash
# Check if container is running
docker ps | grep openproject

# Check port 8080 is not already in use
netstat -an | grep 8080
```

### MCP server connection issues

```bash
# Test API connection manually
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:8080/api/v3/projects

# Check MCP server logs
# Look for errors in the terminal where you're running the MCP server
```

## Security Notes

1. **Change default admin password** immediately after first login
2. **Use strong API keys** - generate long, random strings
3. **Don't commit .env files** to version control
4. **Use HTTPS in production** - configure reverse proxy with SSL
5. **Regular backups** - backup PostgreSQL database regularly

## Production Deployment

For production deployment:

1. Use stronger passwords (generate with: `openssl rand -base64 32`)
2. Configure SSL/TLS with reverse proxy (NGINX)
3. Set up regular database backups
4. Configure email for notifications
5. Increase resource limits in docker-compose.yml
6. Monitor container health and logs

## Next Steps

1. Start OpenProject and explore the UI
2. Create your first project (e.g., "Psitrix Psynq - Phase 1")
3. Configure work package types (Feature, Bug, Task, Sprint)
4. Set up MCP server in Claude Desktop
5. Start creating work packages for your development tasks

# OpenProject Integration - Project Overview

## 🎯 What Has Been Deployed

An **OpenProject Community Edition** instance with **MCP (Model Context Protocol) server** integration has been successfully deployed for the Psitrix Psynq project.

### Location
- **Deployment Files**: `/deploy/openproject/`
- **MCP Configuration**: `/.mcp/claude_desktop_config.json`

### Services Deployed

| Service | Container Name | Port | Purpose |
|---------|---------------|------|---------|
| OpenProject Community | psynq-openproject | 8080 | Project management UI |
| PostgreSQL (OpenProject) | psynq-openproject-db | 5432 (internal) | OpenProject database |
| Memcached | psynq-openproject-memcached | N/A | Performance caching |
| MCP Server | (Python process) | N/A | AI integration bridge |

### Key Features

✅ **40+ MCP Tools** for project management
✅ **Separate database** from psynq_db (no conflicts)
✅ **Persistent storage** with Docker volumes
✅ **Time tracking** for billing/usage-based development
✅ **Work package relations** (dependencies, blocking, parent-child)
✅ **User/role management** (matches RBAC structure)
✅ **API-first** design (aligns with project philosophy)

## 📂 File Structure

```
psynq/
├── .mcp/
│   └── claude_desktop_config.json          # MCP server configuration
├── deploy/
│   └── openproject/
│       ├── docker-compose.yml              # OpenProject containers
│       ├── .env.example                    # Environment template
│       ├── setup.sh                        # Linux/macOS setup script
│       ├── setup.ps1                       # Windows setup script
│       ├── README.md                       # Deployment documentation
│       ├── SETUP-GUIDE.md                  # Comprehensive setup guide
│       ├── QUICK-REFERENCE.md              # Claude command reference
│       └── openproject-mcp-server/         # MCP server (cloned during setup)
│           ├── openproject-mcp.py          # Main server file
│           ├── env_example.txt             # MCP environment template
│           └── ...
└── README.md                               # This file
```

## 🚀 Quick Start

### Step 1: Deploy OpenProject

**Windows (PowerShell):**
```powershell
cd deploy\openproject
.\setup.ps1
```

**Linux/macOS (Bash):**
```bash
cd deploy/openproject
chmod +x setup.sh
./setup.sh
```

This will:
- ✅ Clone the OpenProject MCP server
- ✅ Start OpenProject containers
- ✅ Wait for services to be healthy
- ✅ Display next steps

### Step 2: Access OpenProject

1. Open http://localhost:8080 in your browser
2. Login with `admin` / `admin`
3. **CHANGE YOUR PASSWORD IMMEDIATELY!**

### Step 3: Generate API Key

1. Click your avatar (top right) → **My account**
2. Go to **Access tokens**
3. Click **+ Add**
4. Name it "MCP Server"
5. Copy the generated token

### Step 4: Configure Claude Desktop

1. Copy `/.mcp/claude_desktop_config.json` to:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

2. Update the `OPENPROJECT_API_KEY` with your token

### Step 5: Test Integration

In Claude Desktop, ask:
> "Test the OpenProject connection"

You should see a success message!

## 💡 Using OpenProject with Claude

### Example 1: Create a Project
```
You: Create a new project called "Psitrix Psynq - Phase 1 Development"
Claude: [Uses create_project tool]
✅ Project created successfully
```

### Example 2: Create Work Package
```
You: Create a task for implementing SIP registration in the web package
Claude: [Uses create_work_package tool]
✅ Work package created with ID 123
```

### Example 3: Track Time
```
You: Log 3 hours for the SIP registration task
Claude: [Uses create_time_entry tool]
✅ Time entry created
```

### Example 4: Show Dependencies
```
You: Show all work packages that block the testing phase
Claude: [Uses list_work_package_relations tool]
✅ Found 3 blocking work packages
```

## 🎨 Recommended Project Structure

### Project Hierarchy

```
Psitrix Psynq (Root Project)
├── Phase 1: Core Platform (Version/Sprint)
│   ├── Web Package (Sub-project)
│   ├── Mobile Package (Sub-project)
│   ├── Backend Package (Sub-project)
│   └── Core Package (Sub-project)
├── Phase 2: Advanced Features (Version/Sprint)
└── Phase 3: Production Hardening (Version/Sprint)
```

### Work Package Types

| Type | Usage | Example |
|------|-------|---------|
| **Feature** | New functionality | "Implement SIP registration" |
| **Bug** | Defects/issues | "Fix WebRTC connection timeout" |
| **Task** | General work | "Configure Asterisk dialplan" |
| **Epic** | Large features | "Implement call recording system" |
| **User Story** | Agile stories | "As an agent, I want to make calls..." |

### Status Workflow

```
New → In Progress → Code Review → Testing → Resolved → Closed
                        ↓
                    Blocked
```

## 🔗 Integration with Existing Stack

### No Conflicts

✅ **Separate PostgreSQL database** (`openproject` vs `psynq_db`)
✅ **Different port** (8080 vs 3000/3001)
✅ **Independent Docker network** (`psynq-openproject` vs `psynq-dev`)
✅ **Isolated volumes** (no shared data)

### Potential Integrations

#### 1. Asterisk ARI Events
```javascript
// Auto-create work packages from ARI errors
ari.on('StasisStart', (event) => {
  if (event.error === 'Authentication failed') {
    await createWorkPackage({
      type: 'Bug',
      subject: 'SIP authentication failed',
      description: `Error: ${event.message}`
    });
  }
});
```

#### 2. Docker Events
```bash
# Auto-update tasks on container events
docker events --filter 'container=psynq-backend-dev'
# On restart → Update work package status
```

#### 3. Test Failures
```javascript
// Auto-create bugs from test failures
test.on('fail', (test) => {
  await createWorkPackage({
    type: 'Bug',
    subject: `Test failed: ${test.title}`,
    project: 'Backend Package'
  });
});
```

#### 4. CDR Analysis
```sql
-- Create work package from CDR anomalies
SELECT 
  'Bug' as type,
  'High call failure rate' as subject,
  COUNT(*) as description
FROM cdr
  WHERE disposition = 'failed'
  GROUP BY DATE(created_at)
  HAVING COUNT(*) > 100;
```

## 📊 MCP Server Tools (Summary)

### Category: Core (10 tools)
- `test_connection`, `list_projects`, `create_project`, `update_project`, `delete_project`
- `get_project`, `create_work_package`, `list_work_packages`, `update_work_package`, `delete_work_package`

### Category: Work Packages (15 tools)
- `get_work_package`, `list_types`, `list_statuses`, `list_priorities`
- `set_work_package_parent`, `remove_work_package_parent`, `list_work_package_children`
- `create_work_package_relation`, `list_work_package_relations`, `update_work_package_relation`
- `delete_work_package_relation`, `get_work_package_relation`

### Category: Time Tracking (5 tools)
- `list_time_entries`, `create_time_entry`, `update_time_entry`, `delete_time_entry`
- `list_time_entry_activities`

### Category: Users & Teams (10 tools)
- `list_users`, `get_user`, `list_roles`, `get_role`
- `list_memberships`, `create_membership`, `update_membership`, `delete_membership`
- `get_membership`, `list_project_members`, `list_user_projects`

### Category: Versions (3 tools)
- `list_versions`, `create_version`, `get_version`

## 🔒 Security Considerations

### ✅ What's Secure

- Separate database with strong password
- API key authentication (not password-based)
- Isolated Docker network
- No exposed ports except 8080
- HTTPS support (configure for production)

### ⚠️ What You Should Change

1. **Default admin password** → Change immediately
2. **Database password** → Update in docker-compose.yml
3. **API key** → Regenerate periodically
4. **Add HTTPS** → Use reverse proxy for production

## 🛑 Stopping OpenProject

```bash
cd deploy/openproject
docker-compose down
```

### Remove All Data (including database)
```bash
docker-compose down -v
```

## 📈 Next Steps

### Immediate (Day 1)
1. ✅ Deploy OpenProject using setup script
2. ✅ Create first project: "Psitrix Psynq - Phase 1"
3. ✅ Configure work package types
4. ✅ Set up MCP server in Claude Desktop
5. ✅ Create first work package

### Short-term (Week 1)
1. Create sub-projects for each package (web, mobile, backend, core)
2. Define custom work package types for telephony domain
3. Set up user accounts for team members
4. Create Sprint 1 milestone
5. Migrate existing tasks from issue tracker

### Long-term (Month 1)
1. Integrate with Asterisk ARI for auto-bug creation
2. Set up time tracking for billing
3. Configure automated reports
4. Set up email notifications
5. Train team on OpenProject usage

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [README.md](deploy/openproject/README.md) | Quick start guide |
| [SETUP-GUIDE.md](deploy/openproject/SETUP-GUIDE.md) | Comprehensive setup instructions |
| [QUICK-REFERENCE.md](deploy/openproject/QUICK-REFERENCE.md) | Claude command reference |
| [setup.sh / setup.ps1](deploy/openproject/) | Automated setup scripts |

## 🆘 Support

- **OpenProject Community**: https://community.openproject.org/
- **MCP Server Issues**: https://github.com/AndyEverything/openproject-mcp-server/issues
- **Documentation**: See files in `/deploy/openproject/`

## 🎉 Summary

You now have:
- ✅ **OpenProject** running on port 8080
- ✅ **MCP Server** ready for Claude Desktop integration
- ✅ **40+ tools** for project management
- ✅ **Time tracking** for billing
- ✅ **Work package relations** for dependencies
- ✅ **Isolated deployment** (no conflicts with existing stack)

**Ready to manage your telephony project with AI assistance!** 🚀

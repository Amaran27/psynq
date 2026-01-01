# OpenProject MCP Server - Quick Reference

## Claude Desktop Integration

Once configured, you can interact with OpenProject directly through Claude Desktop using natural language.

## Common Commands

### Project Management

**List Projects**
```
"List all OpenProject projects"
"Show active projects only"
```

**Create Project**
```
"Create a new project called 'Psitrix Psynq - Phase 1' with identifier 'psynq-phase1'"
```

**Get Project Details**
```
"Show details for project ID 5"
```

### Work Package Management

**List Work Packages**
```
"Show all open work packages"
"List all work packages in project 5"
"Show all closed tasks"
"Display work packages assigned to user 3"
```

**Create Work Package**
```
"Create a task in project 5 titled 'Implement SIP registration'"
"Create a bug in project 5 with description: 'WebRTC connection drops after 5 minutes'"
```

**Update Work Package**
```
"Update work package 123 status to 'In Progress'"
"Set work package 456 to 80% complete"
"Assign work package 789 to user 3"
```

**Work Package Relations**
```
"Make work package 10 block work package 15"
"Set work package 20 as a child of work package 5"
"Show all dependencies for work package 25"
```

### Time Tracking

**Log Time**
```
"Log 2.5 hours for work package 123"
"Create a time entry for 4 hours on task 456 with comment: 'Implemented SIP registration'"
```

**List Time Entries**
```
"Show all time entries for work package 123"
"List time entries I logged this week"
```

### User Management

**List Users**
```
"List all active users in OpenProject"
"Show user details for user ID 3"
```

**Project Members**
```
"Show all members of project 5"
"List my projects"
```

## Example Workflows

### 1. Creating a Feature Task

```
You: Create a task for implementing WebRTC calling in the web package
Claude: [Creates work package with:
  - Project: Psitrix Psynq - Web
  - Type: Task
  - Subject: Implement WebRTC calling
  - Status: New
]

You: Make this task block the testing phase
Claude: [Creates relation: Task blocks "Testing Phase" milestone]
```

### 2. Tracking Bug Fix

```
You: Create a bug for SIP authentication failing with 403
Claude: [Creates work package with:
  - Project: Psitrix Psynq - Backend
  - Type: Bug
  - Subject: SIP authentication returns 403
  - Priority: High
]

You: Assign this bug to the backend team lead
Claude: [Updates work package with assignee_id]
```

### 3. Logging Development Time

```
You: Log 3 hours for the SIP registration task I just completed
Claude: [Creates time entry with:
  - work_package_id: 123
  - hours: 3.0
  - spent_on: today
  - comment: Auto-generated from Claude
]
```

### 4. Sprint Planning

```
You: Show all open work packages for the backend project
Claude: [Lists all open work packages]

You: Create a sprint called "Sprint 1" for the backend project
Claude: [Creates version/milestone]

You: Assign all high-priority tasks to Sprint 1
Claude: [Updates work packages with version/sprint]
```

## Work Package Types

Typical work package types in OpenProject:

- **Task**: General development task
- **Bug**: Software bug or issue
- **Feature**: New feature implementation
- **User Story**: Agile user story
- **Epic**: Large feature spanning multiple stories
- **Support**: Support or maintenance task

## Status Flow

Typical work package status flow:

```
New → In Progress → Resolved → Closed
     ↓
  Blocked
```

## Priority Levels

- **Low**: Nice to have
- **Normal**: Standard priority
- **High**: Important
- **Urgent**: Critical, needs immediate attention

## Tips for Effective Use

### 1. Be Specific
❌ "Create a task for the web thing"
✅ "Create a task for implementing SIP registration in the web package"

### 2. Use Context
❌ "Show tasks"
✅ "Show all open work packages in the backend project assigned to me"

### 3. Reference IDs
❌ "Update that task"
✅ "Update work package 123 status to 'In Progress'"

### 4. Provide Details
❌ "Create a bug"
✅ "Create a bug with description: 'SIP INVITE messages fail authentication with 403 error'"

### 5. Chain Commands
```
You: Create a task for implementing call recording
You: Set it to high priority
You: Assign it to user 5
You: Make it block the testing phase
```

## Telephony-Specific Examples

### SIP Configuration
```
"Create a task for configuring SIP trunk with Twilio"
"Create a bug: SIP REGISTER failing with 403 Forbidden"
"Log 2 hours for troubleshooting SIP authentication"
```

### WebRTC Integration
```
"Create a task for implementing WebRTC video calling"
"Create a bug: WebRTC connection drops after 5 minutes"
"Show all WebRTC-related work packages"
```

### Asterisk Integration
```
"Create a task for setting up ARI event handlers"
"Log 4 hours for implementing Asterisk dialplan"
"Create a bug: CDR not being written to PostgreSQL"
```

### Database
```
"Create a task for optimizing CDR queries"
"Create a bug: Database connection pool exhausted"
"Show all database-related bugs"
```

## Quick Commands Summary

| Action | Example |
|--------|---------|
| List projects | "List all projects" |
| Create task | "Create task: Implement SIP registration" |
| Update status | "Set task 123 to In Progress" |
| Assign task | "Assign task 123 to user 5" |
| Log time | "Log 3 hours for task 123" |
| Show dependencies | "Show dependencies for task 123" |
| Block task | "Task 123 blocks task 456" |
| Create milestone | "Create milestone: Sprint 1" |
| Add to sprint | "Add task 123 to Sprint 1" |

## Getting Help

If something doesn't work:

1. **Check connection**: "Test the OpenProject connection"
2. **List resources**: "List all projects" or "List all work packages"
3. **Check permissions**: Make sure your API key has the right permissions
4. **Use IDs**: Always reference work packages by ID when possible

## Next Steps

1. ✅ Start OpenProject: `docker-compose up -d`
2. ✅ Create your first project
3. ✅ Configure Claude Desktop with API key
4. ✅ Try: "Test the OpenProject connection"
5. ✅ Create your first work package
6. ✅ Start managing your telephony project!

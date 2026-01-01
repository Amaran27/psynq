# Archived Local Documentation - Migration to OpenProject

**Archive Date**: December 31, 2025
**Reason**: All documentation migrated to OpenProject as work packages (single source of truth)
**Action**: Local markdown files have been archived to this directory

## What Was Migrated

All critical documentation has been moved from local markdown files to OpenProject work packages:

### 1. Architecture & Specifications
- **Source**: `.ai/spec.md` (301 lines)
- **Migrated to**: OpenProject Work Package (Architecture Specification)
- **Content**: System vision, tech stack, deployment state, ODBC integration, Docker services

### 2. Work Package Audit
- **Source**: `WORK-PACKAGE-COMPLETENESS-AUDIT.md`
- **Migrated to**: OpenProject Work Package (Documentation Assessment)
- **Content**: Completeness analysis, ambiguity matrix, deviation risks, success criteria

### 3. Missing Artifacts Plan
- **Source**: `.ai/MISSING-ARTIFACTS-PLAN.md`
- **Migrated to**: OpenProject Work Package (Canonical Artifacts Creation)
- **Content**: 12 critical artifacts, templates, validation criteria

### 4. AI Role Templates
- **Source**: `.ai/ai-role-templates.md`
- **Migrated to**: OpenProject Work Package (AI Agent Guidelines)
- **Content**: Developer, Tester, Analyst, SRE, QA role templates

### 5. Session Summaries
- `SESSION3-SUMMARY.md` → OpenProject Work Package
- `NEXT-SESSION-HANDOVER.md` → OpenProject Work Package
- `CONSOLIDATION-COMPLETE.md` → OpenProject Work Package

### 6. Testing Documentation
- `INTEGRATION-TEST-REPORT.md` → OpenProject Work Package
- `BROWSER-TESTING-GUIDE.md` → OpenProject Work Package
- `test-frontend-integration.md` → OpenProject Work Package
- `test-inbound-flow.md` → OpenProject Work Package
- `docs/testing/*.md` → OpenProject Work Packages

### 7. Deployment & Operations
- `README-SETUP.md` → OpenProject Work Package
- `TROUBLESHOOTING.md` → OpenProject Work Package
- `UPGRADE.md` → OpenProject Work Package
- `MIGRATION_PLAN.md` → OpenProject Work Package
- `docs/docker-dev.md` → OpenProject Work Package
- `docs/live-test-guide.md` → OpenProject Work Package

### 8. Feature Documentation
- `docs/call-recording-complete.md` → OpenProject Work Package
- `docs/recording-*.md` → OpenProject Work Package
- `docs/webrtc-sip-registration-issue.md` → OpenProject Work Package
- `docs/direct-asterisk-test.md` → OpenProject Work Package

## Files Archived

The following directories now contain archived copies:
- `.archive/old-docs/` - Previously archived documentation
- `.backup/docs/` - Backup copies of documentation

## New Workflow: Single Source of Truth

### Before (Fragmented):
```
Local Files:
- .ai/spec.md
- .ai/ai-role-templates.md
- WORK-PACKAGE-COMPLETENESS-AUDIT.md
- docs/testing/*.md
- docs/recording-*.md
(60+ markdown files scattered across repository)
```

### After (Centralized):
```
OpenProject Work Packages:
- #Architecture Specification
- #AI Agent Guidelines
- #Documentation Assessment
- #Canonical Artifacts Creation
- #Test Plans & Results
- #Deployment Guides
(All documentation versioned, tracked, searchable)
```

## How to Access Documentation

1. **Go to OpenProject**: https://openproject.psynq.dev (or your instance)
2. **Search by Work Package**: Use keywords like "architecture", "testing", "deployment"
3. **View in Wiki Format**: OpenProject has rich text editor, markdown support
4. **Edit in OpenProject**: Make changes directly in work packages (tracked, versioned)

## Benefits of OpenProject as Source of Truth

✅ **Single Location**: No more searching across 60+ files
✅ **Version Control**: Every change is tracked with author and timestamp
✅ **Assignable**: Documentation can be assigned to team members
✅ **Traceable**: Linked to work packages, milestones, releases
✅ **Searchable**: Full-text search across all documentation
✅ **Collaborative**: Multiple team members can edit simultaneously
✅ **Auditable**: Complete history of who changed what and when
✅ **Accessible**: Web UI, mobile app, API access

## Migration Status

- ✅ Architecture specs migrated
- ✅ AI role templates migrated
- ✅ Testing docs migrated
- ✅ Deployment guides migrated
- ✅ Session summaries migrated
- ✅ Audit documents migrated
- ✅ Work package descriptions updated with references

## Local Files Status

### Deleted/Moved to Archive:
- `.ai/spec.md` → `.archive/spec.md.bak`
- `.ai/ai-role-templates.md` → `.archive/ai-role-templates.md.bak`
- `WORK-PACKAGE-COMPLETENESS-AUDIT.md` → `.archive/`
- `.ai/MISSING-ARTIFACTS-PLAN.md` → `.archive/`
- Session summaries → `.archive/`

### Kept (Generated / README):
- `README.md` (project overview, links to OpenProject)
- `OPENPROJECT-INTEGRATION.md` (integration guide)
- `package.json` (dependencies, scripts)
- `docker-compose*.yml` (deployment configs)

### Kept (Code Docs):
- Inline code comments (JSDoc, TSDoc)
- API documentation (generated from OpenAPI spec)
- Database schema comments (SQL COMMENT ON)

## Next Steps

1. **Update README.md**: Add links to OpenProject work packages
2. **Create Onboarding Guide**: Point new team members to OpenProject
3. **Archive This File**: Once migration is verified complete
4. **Clean Up .ai Directory**: Remove after verifying OpenProject has everything

---

**Last Updated**: December 31, 2025
**Migration Status**: Complete - All documentation now in OpenProject

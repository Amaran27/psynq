# Pre-Commit Cleanup Tasks

## Files to Remove from Repository

These test/debug files should be removed before committing:

### Test Scripts (JavaScript)
- ❌ `decode-jwt.js` - JWT decoder for testing
- ❌ `generate-hash.js` - Bcrypt hash generator
- ❌ `test-login.js` - Login testing script
- ❌ `packages/backend/scripts/set-password.js` - Password setting script

### Test Data Files (JSON)
- ❌ `login-test.json` - Login request test data
- ❌ `refresh-test.json` - Refresh token test data
- ❌ `test-token.json` - JWT token test data

### SQL Scripts (Temporary)
- ❌ `update-password.sql` - Temporary password update
- ❌ `update-password-new.sql` - Temporary password update

### Documentation Files (Temporary/Redundant)
- ⚠️ Consider consolidating these docs:
  - `docs/FINAL-STATUS.md`
  - `docs/RECORDING-IMPLEMENTATION-SUMMARY.md`
  - `docs/call-recording-complete.md`
  - `docs/direct-asterisk-test.md`
  - `docs/live-test-guide.md`
  - `docs/pre-test-verification.md`
  - `docs/recording-architecture.md`
  - `docs/recording-quick-start.md`
  - `docs/recording-test-commands.md`
  - `docs/recording-test-plan.md`

**Recommendation**: Keep only essential documentation, consolidate or archive the rest.

## Files to Add to .gitignore

Add these patterns to `.gitignore` if not already present:

```gitignore
# Test scripts
*-test.js
test-*.js

# Test data
*-test.json
test-*.json

# Temporary SQL scripts
temp-*.sql
update-*.sql
```

## Commands to Clean Up

```powershell
# Remove test scripts
Remove-Item decode-jwt.js, generate-hash.js, test-login.js -Force

# Remove test data files
Remove-Item login-test.json, refresh-test.json, test-token.json -Force

# Remove temporary SQL scripts
Remove-Item update-password.sql, update-password-new.sql -Force

# Remove backend test script
Remove-Item packages/backend/scripts/set-password.js -Force
```

## Files to Keep

✅ **KEEP** - These are important:
- `.env.example` - Template for environment configuration
- `.gitignore` - Already properly configured
- `docs/CODE-REVIEW-AUTH-IMPLEMENTATION.md` - This review
- `docs/readme.md` - Main documentation
- `packages/backend/src/migrations/fix-roles-column.ts` - Database migration

## Before Final Commit

1. ✅ Remove all test files listed above
2. ✅ Verify `.env` is in `.gitignore`
3. ✅ Verify `.env.example` exists and is documented
4. ✅ Run tests to ensure nothing breaks
5. ✅ Check git status to ensure only production files are staged

## Check Git Status

```powershell
git status
```

Should show only:
- Modified: `docker-compose.dev.yml`
- Modified: `packages/backend/src/auth/auth.service.ts`
- Modified: `packages/backend/src/auth/auth.controller.ts`
- Modified: `packages/backend/src/services/settings.service.ts`
- Modified: `packages/backend/src/app.module.ts`
- New: `.env.example`
- New: `packages/backend/src/adapters/storage-factory.adapter.ts`
- New: `packages/backend/src/system-settings.controller.ts`
- New: `packages/backend/src/migrations/fix-roles-column.ts`
- New: `docs/CODE-REVIEW-AUTH-IMPLEMENTATION.md`

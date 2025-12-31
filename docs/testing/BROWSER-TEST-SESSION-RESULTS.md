# Browser Testing Session Results - Phase 2C

**Date**: December 31, 2025  
**Session**: Continuation of Phase 2C Testing  
**Tester**: Automated Browser Testing  
**Environment**: Development (Docker)

---

## Executive Summary

**Tests Completed**: 2/7 (29%)  
**Tests Passed**: 1  
**Tests Failed**: 1  
**Tests Blocked**: 5  
**Critical Issues Found**: 2  

**Status**: **HALTED** - Multiple critical issues blocking further testing

---

## Test Results

### ✅ Test 7: Frontend Login UI - PASSED

**Objective**: Verify localStorage token storage after successful login

**Steps**:
1. Navigated to http://localhost:3000
2. Logged out (cleared localStorage)
3. Logged in with username: `sysadmin`, password: `test12345`
4. Verified localStorage contents

**Results**:
- ✅ `jwt_token` stored in localStorage
- ✅ `refresh_token` stored in localStorage
- ✅ `user_data` stored in localStorage
- ✅ JWT structure valid (3 parts: header, payload, signature)
- ✅ JWT payload contains correct user data:
  - username: "sysadmin"
  - sub: "72fa5b0f-d44e-4407-b4bc-acb7973e5dd2"
  - roles: ["agent"]
  - orgId: "c18d8db4-55e4-4bae-8b18-f23e04c231de"
  - iat: 1767174664
  - exp: 1767261064 (24-hour expiry)

**Issues Found**: None

**Notes**:
- Discovered during testing that sysadmin password in database was incorrectly set
- Fixed by copying password hash from testuser (testuser/test12345)
- Seed data SQL needs updating to use proper bcrypt hashes

---

### ❌ Test 8: Automatic Token Refresh on 401 - FAILED

**Objective**: Corrupt access_token, make API call, verify automatic refresh

**Steps**:
1. Corrupted the `jwt_token` in localStorage by injecting "CORRUPTED" string
2. Navigated to settings page to trigger API calls
3. Expected: ApiClientService should detect 401, call `/auth/refresh`, get new token
4. Actual: User was logged out, localStorage cleared

**Results**:
- ❌ Automatic token refresh did NOT occur
- ❌ localStorage was completely cleared instead of refreshing
- ❌ User logged out and shown login screen
- ❌ Error message: "Not authenticated or API adapter not initialized"

**Root Cause Analysis**:
The `auth.store.ts` file contains a `refreshToken()` action that makes a direct fetch call:
```typescript
// Line 213 in auth.store.ts
const response = await fetch('http://localhost:3001/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refresh_token: currentRefreshToken }),
});
```

This bypasses `ApiClientService` which has the automatic 401 handling and retry logic.

**Expected Behavior**:
1. ApiClientService should intercept all HTTP requests
2. On 401 response, ApiClientService should:
   - Call `/auth/refresh` automatically
   - Update localStorage with new tokens
   - Retry original request with new token
3. User should not be logged out

**Actual Behavior**:
1. Corrupted token causes 401 responses
2. No automatic refresh occurs
3. Auth store's `fetchAgentStatus` throws error
4. Error handler in `loadInitialAuth` calls `logout()`
5. User logged out

**Fix Required**:
Refactor `auth.store.ts` to use `ApiClientService` for all HTTP calls instead of direct fetch. This ensures automatic token refresh works consistently across the application.

**Priority**: 🔴 **CRITICAL** - Core authentication feature not working

**Files Affected**:
- [packages/web/stores/auth.store.ts](packages/web/stores/auth.store.ts)
- [packages/web/services/api-client.service.ts](packages/web/services/api-client.service.ts)

---

### ⏸️ Test 9: Storage Configuration UI - BLOCKED

**Objective**: Test storage provider switching (MinIO ↔ S3) via system settings UI

**Status**: Blocked by Next.js SSR hydration issues

**Issues**:
1. Navigating to `/settings` shows "Please login to access settings" even when logged in
2. SSR hydration mismatch causing incorrect auth state
3. Same issue as fixed in Session 4 for CallCenterContainer/SettingsContainer, but still occurring

**Error Messages**:
```
Error: Hydration failed because the server rendered text didn't match the client.
```

**Priority**: 🟠 **HIGH** - Blocks access to system settings UI

**Files Affected**:
- Settings page component needs hydration fix similar to CallCenterContainer
- Possibly related to middleware or auth guard on settings route

---

### ⏸️ Test 10: Storage Health Check UI - BLOCKED

**Objective**: Test "Test Connection" button functionality in storage settings

**Status**: Blocked by Test 9 - Cannot access settings UI

---

### ⏸️ Test 11: Telephony Configuration UI - BLOCKED

**Objective**: Test Asterisk connection configuration and validation in system settings

**Status**: Blocked by Test 9 - Cannot access settings UI

---

### ⏸️ Test 12: RBAC Enforcement - BLOCKED

**Objective**: Verify role-based access control by logging in as different user roles

**Status**: Blocked by Test 8 - Cannot reliably test RBAC when token refresh fails

**Notes**:
- Created testuser with agent role for testing
- sysadmin user has agent role (not admin role)
- No users with admin role exist in database
- Cannot test RBAC without proper role setup

---

### ⏸️ Test 13: Concurrent Request Handling - BLOCKED

**Objective**: Verify single refresh call when multiple 401 errors occur simultaneously

**Status**: Blocked by Test 8 - Depends on automatic token refresh working

**Note**: ApiClientService already has locking mechanism implemented, but cannot be tested until Test 8 is fixed.

---

## Critical Issues Summary

### Issue #1: Automatic Token Refresh Not Working

**Severity**: 🔴 CRITICAL  
**Impact**: Users are logged out when access token expires instead of silently refreshing  
**Affected Component**: [packages/web/stores/auth.store.ts](packages/web/stores/auth.store.ts)  

**Root Cause**: Auth store uses direct `fetch()` calls instead of `ApiClientService` for HTTP requests

**Fix Required**:
1. Create an AuthApiPort interface
2. Implement HttpAuthApiAdapter that uses ApiClientService
3. Inject adapter into auth store
4. Remove direct fetch calls from auth.store.ts

**Estimated Effort**: 2-3 hours

---

### Issue #2: Settings Page Hydration Mismatch

**Severity**: 🟠 HIGH  
**Impact**: Cannot access system settings UI  
**Affected Component**: Settings page/route  

**Root Cause**: Next.js SSR hydration timing issue

**Fix Required**:
1. Add hydration state similar to CallCenterContainer fix
2. Or remove server-side auth check from settings page
3. Verify auth guard logic

**Estimated Effort**: 1-2 hours

---

### Issue #3: Missing Password in Seed Data

**Severity**: 🟡 MEDIUM  
**Impact**: Cannot create new users with known passwords for testing  

**Root Cause**: Seed data SQL uses placeholder `$2b$10$YourHashedPasswordHere`

**Fix Required**:
1. Generate proper bcrypt hash for default password
2. Update [deploy/db/03-seed-data.sql](deploy/db/03-seed-data.sql)
3. Document default credentials in README

**Estimated Effort**: 30 minutes

---

## Infrastructure Issues

### sysadmin User Password Problem

**Discovery**: During testing, sysadmin login failed with 401 Unauthorized

**Investigation**:
- Checked database: user exists with invalid password hash
- Seed data SQL contains placeholder: `$2b$10$YourHashedPasswordHere`
- This is not a valid bcrypt hash

**Workaround Applied**:
```sql
-- Copied hash from testuser
UPDATE users u1 
SET password = (SELECT password FROM users u2 WHERE u2.username = 'testuser') 
WHERE u1.username = 'sysadmin';
```

**Current Credentials**:
- Username: `sysadmin` / Password: `test12345`
- Username: `testuser` / Password: `test12345`

---

## Recommendations

### Immediate Actions (Before Next Testing Session)

1. **Fix automatic token refresh** (Issue #1)
   - Refactor auth.store.ts to use ApiClientService
   - Write unit tests for token refresh logic
   - Test manually with corrupted token

2. **Fix settings page hydration** (Issue #2)
   - Apply same fix as CallCenterContainer
   - Test navigation to settings page
   - Verify settings UI loads correctly

3. **Update seed data** (Issue #3)
   - Generate proper bcrypt hash for default password
   - Update SQL file
   - Document credentials

### Follow-up Actions

4. **Create admin user for RBAC testing**
   - Add user with admin role to seed data
   - Document role-based permissions
   - Test access control

5. **Complete remaining browser tests** (Tests 9-13)
   - Storage configuration UI
   - Storage health check
   - Telephony configuration
   - RBAC enforcement
   - Concurrent request handling

---

## Test Environment

**Docker Containers**:
- psynq-web-dev: Up 21 minutes (healthy) ✅
- psynq-backend-dev: Up About an hour (healthy) ✅
- psynq-asterisk: Up About an hour (healthy) ✅
- psynq-postgres-dev: Up About an hour (healthy) ✅
- psynq-redis-dev: Up 20 hours (healthy) ✅
- psynq-minio: Up 20 hours (healthy) ✅

**Frontend**: http://localhost:3000  
**Backend API**: http://localhost:3001  

**Database**:
- PostgreSQL 15
- 1 organization (c18d8db4-55e4-4bae-8b18-f23e04c231de)
- 2 users (sysadmin, testuser)
- Both users have agent role (no admin users)

---

## Conclusion

Phase 2C browser testing identified **2 critical issues** that must be fixed before continuing:

1. **Automatic token refresh not working** - Core authentication feature broken
2. **Settings page inaccessible** - Cannot test system configuration UI

These issues indicate that while the backend API and Session 3 integration (ApiClientService) were implemented correctly, the frontend integration is incomplete.

**Recommendation**: Halt further testing until these issues are resolved. Focus on fixing authentication flow first, then complete remaining tests.

**Next Steps**:
1. Fix auth.store.ts to use ApiClientService
2. Fix settings page hydration issue
3. Re-run Test 8 to verify automatic refresh
4. Continue with Tests 9-13
5. Create final Phase 2C completion report

---

**Report Generated**: December 31, 2025  
**Session Duration**: ~1 hour  
**Browser**: Chromium (via Playwright)  

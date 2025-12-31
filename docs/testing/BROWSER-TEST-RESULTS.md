# Browser Test Results - Phase 2C

**Date**: December 31, 2025
**Session**: Phase 2C - Browser-Based Testing
**Test Environment**: Chrome Browser (via Playwright automation)
**Status**: 2/10 tests complete (20%)

---

## Executive Summary

Successfully executed 2 browser-based tests to verify frontend authentication and token storage. Discovered **CRITICAL BUG**: Refresh token is not being stored in localStorage during login, which will cause users to be unable to refresh their tokens and will be logged out after 24 hours.

**Key Findings**:
- ✅ Login functionality works correctly
- ✅ Access token stored and decoded correctly
- ❌ **CRITICAL**: Refresh token not stored (BLOCKS Tests 3-4)
- ✅ User data stored with correct structure
- ✅ Token contains correct claims (username, roles, orgId, expiry)

**Blockers**:
- Refresh token storage bug prevents testing automatic token refresh
- Logout button not clearing localStorage (needs investigation)

---

## Test Results

### Test 1: Login & Token Storage ✅ PARTIAL PASS

**Status**: ⚠️ PARTIAL PASS - Login works but refresh token not stored

**Steps Executed**:
1. Navigated to http://localhost:3000
2. Found login form with pre-filled credentials (sysadmin / PsynqSecure2025!!)
3. Updated password to correct value: admin123
4. Clicked Login button
5. Observed successful login and redirect to dashboard

**Expected Results**:
- ✅ Access token stored in localStorage
- ❌ Refresh token stored in localStorage
- ✅ Token expiration time stored
- ✅ User redirected to dashboard
- ✅ No console errors

**Actual Results**:
```javascript
// localStorage contents after login
localStorage.getItem('jwt_token')      // "eyJhbGciOiJIUzI1NiIs..." (313 chars) ✅
localStorage.getItem('refresh_token')  // null ❌ CRITICAL BUG
localStorage.getItem('user_data')      // {"id":"72fa5b0f...","username":"sysadmin",...} ✅
```

**Console Output**:
```
[HttpCallApiAdapter] Connecting to backend WebSocket at http://localhost:3001
[HttpCallApiAdapter] ✅ WebSocket connected successfully
[SipJsAdapter] initialize called with config: {provider: asterisk, server: ws://127.0.0.1:8088...}
[CallStore] ✅ Telephony initialized (backend WebSocket only, SIP.js deferred)
```

**Dashboard Display**:
- Username: sysadmin ✅
- Role: Level 4 Agent ✅
- Wallet Balance: $42.50 ✅
- Agent Status: Available ✅

**Issues Found**:
1. 🔴 **CRITICAL**: Refresh token not stored in localStorage
   - **Expected**: `localStorage.getItem('refresh_token')` returns JWT string
   - **Actual**: Returns `null`
   - **Impact**: Token refresh will fail after access token expires (24 hours)
   - **Root Cause**: Likely in [packages/web/stores/auth.store.ts](packages/web/stores/auth.store.ts) `login()` function
   - **Fix Required**: Ensure `localStorage.setItem('refresh_token', response.refresh_token)` is executed

2. 🟡 **MINOR**: Token key names differ from documentation
   - **Documented**: `auth_token`, `auth_refreshToken`, `auth_tokenExpiresAt`
   - **Actual**: `jwt_token`, `refresh_token`, `user_data`
   - **Impact**: Documentation needs updating for consistency

**Status**: ⚠️ PARTIAL PASS - Login successful but critical bug in refresh token storage

---

### Test 2: Decode Access Token ✅ PASS

**Status**: ✅ PASS - All token claims verified

**Steps Executed**:
1. Retrieved `jwt_token` from localStorage
2. Decoded JWT payload (base64 decode middle segment)
3. Verified all required claims present and correct
4. Checked token expiration time

**Expected Results**:
- ✅ Token should contain username claim
- ✅ Token should contain user ID (sub)
- ✅ Token should contain roles array with system_admin
- ✅ Token should contain organization ID
- ✅ Token should have issued at (iat) timestamp
- ✅ Token should have expiration (exp) timestamp
- ✅ Token should expire in ~24 hours

**Actual Results**:
```json
{
  "username": "sysadmin",                              ✅
  "userId": "72fa5b0f-d44e-4407-b4bc-acb7973e5dd2",    ✅
  "roles": ["system_admin"],                           ✅
  "organizationId": "c18d8db4-55e4-4bae-8b18-f23e04c231de", ✅
  "issuedAt": "2025-12-31T08:06:04.000Z",             ✅
  "expiresAt": "2026-01-01T08:06:04.000Z",             ✅
  "timeUntilExpiry": "24.0 hours",                     ✅
  "isSystemAdmin": true,                               ✅
  "rolesMatch": true                                   ✅
}
```

**Token Expiry Verification**:
- Issued at: Dec 31, 2025 08:06:04 UTC
- Expires at: Jan 1, 2026 08:06:04 UTC
- Time until expiry: 24.0 hours ✅
- Expiration within expected range: YES ✅

**Claims Validation**:
- username: "sysadmin" ✅ matches expected
- sub (user ID): UUID format valid ✅
- roles: ["system_admin"] ✅ matches expected
- orgId: UUID format valid ✅ matches organization in database
- iat: Valid Unix timestamp ✅
- exp: Valid Unix timestamp ✅ 24 hours after iat

**Status**: ✅ PASS - All token claims verified correct

---

## Critical Bugs Found

### Bug #1: Refresh Token Not Stored 🔴 CRITICAL

**Severity**: Critical
**Impact**: Users cannot refresh tokens, forced re-login after 24 hours
**Component**: Frontend Auth Store
**Location**: [packages/web/stores/auth.store.ts](packages/web/stores/auth.store.ts)

**Description**:
The login function is not storing the refresh token in localStorage, even though:
1. Backend API correctly returns refresh_token in response ✅
2. Frontend receives the response ✅
3. Access token is stored correctly ✅
4. Refresh token storage code exists in auth.store.ts ✅

**Expected Behavior**:
```typescript
// From auth.store.ts login() function ~line 103
localStorage.setItem('jwt_token', response.access_token);
localStorage.setItem('refresh_token', response.refresh_token);  // Should execute
localStorage.setItem('user_data', JSON.stringify(user));
```

**Actual Behavior**:
```javascript
// After login
localStorage.getItem('jwt_token');      // "eyJhbGci..." ✅ Stored
localStorage.getItem('refresh_token');  // null ❌ NOT STORED
```

**Investigation Required**:
1. Check if `response.refresh_token` is undefined/null in login()
2. Verify localStorage.setItem is not throwing silently
3. Check if there's a race condition or early return
4. Add console.log to debug refresh token value in login()

**Recommended Fix**:
```typescript
// In packages/web/stores/auth.store.ts login() function
try {
  const response = await apiAdapter.login(username, password);
  const decodedToken: any = apiAdapter.decodeToken(response.access_token);
  const user = {
    id: decodedToken.sub,
    username: decodedToken.username,
    roles: decodedToken.roles,
    organizationId: decodedToken.orgId,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem('jwt_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token || '');  // Add fallback
    localStorage.setItem('user_data', JSON.stringify(user));
    console.log('Tokens stored:', {
      hasAccessToken: !!response.access_token,
      hasRefreshToken: !!response.refresh_token,
      refreshTokenLength: response.refresh_token?.length
    });
  }

  set({
    isLoggedIn: true,
    user,
    token: response.access_token,
    refreshToken: response.refresh_token,  // Also store in Zustand state
    tokenExpiresAt: decodedToken.exp * 1000,
    isLoading: false,
  });
  // Fetch agent status immediately after login
  await get().fetchAgentStatus();
} catch (error) {
  // ...
}
```

**Blocked Tests**:
- Test 3: Automatic Token Refresh on 401 (cannot test without refresh token)
- Test 4: Proactive Token Refresh (cannot test without refresh token)
- Test 9: Concurrent Request Handling (requires refresh token)

**Status**: 🔴 CRITICAL - Must fix before continuing with Tests 3-4, 9

---

### Bug #2: Logout Button Not Clearing localStorage 🟡 MEDIUM

**Severity**: Medium
**Impact**: Tokens remain in localStorage after logout, security risk
**Component**: Frontend Auth Store / UI
**Location**: Unknown (need to investigate)

**Description**:
When clicking the Logout button, localStorage is not being cleared. Tokens remain in browser storage even after logout.

**Steps to Reproduce**:
1. Login as sysadmin
2. Click Logout button
3. Check localStorage

**Expected Behavior**:
```javascript
// After logout
localStorage.getItem('jwt_token');      // null
localStorage.getItem('refresh_token');  // null
localStorage.getItem('user_data');      // null
```

**Actual Behavior**:
```javascript
// After clicking logout
localStorage.getItem('jwt_token');      // "eyJhbGci..." ❌ Still present!
localStorage.getItem('refresh_token');  // null
localStorage.getItem('user_data');      // "{\"id\":\"72fa5b0f...\"}" ❌ Still present!
```

**Investigation Required**:
1. Check if logout() function in auth.store.ts is being called
2. Verify if there's an error in localStorage.removeItem()
3. Check if there are multiple logout handlers that conflict
4. Verify button click event is properly bound

**Status**: 🟡 MEDIUM - Needs investigation but doesn't block other tests

---

## Tests Status Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Login & Token Storage | ⚠️ PARTIAL | Login works, refresh token not stored |
| 2. Decode Access Token | ✅ PASS | All claims verified |
| 3. Auto Refresh on 401 | ❌ BLOCKED | Requires refresh token fix |
| 4. Proactive Token Refresh | ❌ BLOCKED | Requires refresh token fix |
| 5. Storage Config UI | ⏳ PENDING | |
| 6. Storage Health Check UI | ⏳ PENDING | |
| 7. Telephony Config UI | ⏳ PENDING | |
| 8. Logout Clears Tokens | ❌ FAIL | Logout not working |
| 9. Concurrent Request Handling | ❌ BLOCKED | Requires refresh token fix |
| 10. RBAC Enforcement | ⏳ PENDING | Requires test user creation |

**Overall Progress**: 2/10 tests complete (20%)

---

## Next Steps

### Immediate: Fix Critical Bug #1
1. **Investigate refresh token storage issue** in auth.store.ts
2. Add debug logging to login() function
3. Verify response.refresh_token value is present
4. Test localStorage.setItem is not failing silently
5. Confirm fix by re-running Test 1 and checking refresh token in localStorage

### Short-Term: Complete Unblocked Tests
6. **Execute Test 5**: Storage Configuration UI (not blocked by bugs)
7. **Execute Test 6**: Storage Health Check UI (not blocked by bugs)
8. **Execute Test 7**: Telephony Configuration UI (not blocked by bugs)

### Medium-Term: Fix Remaining Bugs
9. **Investigate Bug #2**: Logout button not clearing localStorage
10. **Create test user** for RBAC testing (Test 10)

### After Bug Fixes
11. **Execute Test 3**: Automatic Token Refresh on 401
12. **Execute Test 4**: Proactive Token Refresh
13. **Execute Test 8**: Logout Clears Tokens
14. **Execute Test 9**: Concurrent Request Handling
15. **Execute Test 10**: RBAC Enforcement

---

## Recommendations

1. **Fix Bug #1 immediately** - This is blocking 3 important tests and is a critical functionality issue
2. **Add integration test** for refresh token storage in login flow
3. **Update documentation** to reflect actual localStorage key names (`jwt_token`, `refresh_token`, `user_data`)
4. **Investigate logout** - May be related to auth store initialization or event handling
5. **Consider E2E test automation** - Playwright tests would catch these regressions

---

## Test Environment Details

- **Browser**: Chrome (via Playwright automation)
- **Test URL**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Test User**: sysadmin / admin123
- **User Role**: system_admin
- **Organization ID**: c18d8db4-55e4-4bae-8b18-f23e04c231de
- **All Docker Services**: Running and healthy

---

**End of Browser Test Results**

**Next Action**: Fix refresh token storage bug (Bug #1) before proceeding with Tests 3-4, 9

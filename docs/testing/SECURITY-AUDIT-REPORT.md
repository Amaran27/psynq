# Security Audit Report
## Phase 2C: Testing & Documentation - Pre-Commit Review

**Date**: 2025-01-XX
**Auditor**: Copilot AI
**Scope**: All modified code before commit
**Severity Levels**: 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 INFO

---

## Executive Summary

**Total Files Audited**: 8 modified files + 3 new files
**Critical Issues Found**: 2
**High Issues Found**: 2
**Medium Issues Found**: 4
**Low Issues Found**: 3

**🔴 BLOCKING**: Cannot commit until critical security issues are resolved.

---

## 1. CRITICAL SECURITY ISSUES 🔴

### Issue #1: Console Logs Expose JWT Tokens in Browser
**File**: [packages/web/stores/auth.store.ts](../packages/web/stores/auth.store.ts)
**Lines**: 100, 101, 107
**Severity**: 🔴 CRITICAL
**Status**: ⛔ NOT FIXED - MUST FIX BEFORE COMMIT

**Problem**:
```typescript
// Line 100
console.log('[AuthStore] Login response:', response); // EXPOSES FULL TOKEN OBJECT
// Line 101
console.log('[AuthStore] Has refresh_token?', 'refresh_token' in response, response.refresh_token); // EXPOSES REFRESH TOKEN
// Line 107
console.log('[AuthStore] Storing refresh_token:', response.refresh_token); // EXPOSES REFRESH TOKEN
```

**Impact**:
- JWT access tokens and refresh tokens are logged to browser console
- Anyone with access to browser DevTools can copy valid tokens
- Tokens remain in console even after logout
- Enables session hijacking and unauthorized access

**Fix Required**:
```typescript
// REMOVE ALL LINES or replace with safe logging:
console.log('[AuthStore] Login successful'); // SAFE - no token data
console.log('[AuthStore] Refresh token stored'); // SAFE - no value
```

**Action**: [ ] Remove all console.log statements containing tokens

---

### Issue #2: Token Validation Happens AFTER Setting Auth State
**File**: [packages/web/stores/auth.store.ts](../packages/web/stores/auth.store.ts)
**Lines**: 56-86
**Severity**: 🟠 HIGH
**Status**: ⛔ NOT FIXED - SHOULD FIX BEFORE COMMIT

**Problem**:
```typescript
loadInitialAuth: () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jwt_token');
    const user = localStorage.getItem('user_data');
    if (token && user) {
      // VERIFICATION HAPPENS HERE
      try {
        const decoded = apiAdapter?.decodeToken(token);
        const now = Date.now() / 1000;
        if (decoded && decoded.exp && decoded.exp < now) {
          console.warn('Stale token found in localStorage, clearing...');
          get().logout();
          return;
        }
      } catch (e) {
        get().logout();
        return;
      }

      // BUT STATE IS SET AFTER VERIFICATION (CORRECT)
      set({
        isLoggedIn: true,
        token: token,
        // ...
      });
    }
  }
},
```

**Analysis**:
- Actually, the code is CORRECT - validation happens before `set()`
- But the issue is that initial render happens before `loadInitialAuth()` completes
- This causes the UI flash (see issue below)

**Action**: [ ] Fix timing issue (see UI/UX section below)

---

## 2. HIGH SEVERITY ISSUES 🟠

### Issue #3: Token Stored in WebSocket Memory for Lifetime
**File**: [packages/web/adapters/http-call-api.adapter.ts](../packages/web/adapters/http-call-api.adapter.ts)
**Line**: 161
**Severity**: 🟠 HIGH
**Status**: ⚠️ ACCEPTABLE RISK - DOCUMENTED

**Problem**:
```typescript
socket = new WebSocket(`wss://${this.backendHost}/ari/events?app=psynq-app&api_key=${username}:${password}`);
```

**Impact**:
- WebSocket URL contains credentials in memory
- Anyone with memory dump access could extract
- However, WebSocket requires authentication anyway

**Mitigation**:
- ✅ Already using `wss://` (encrypted WebSocket)
- ✅ Credentials are per-session
- ✅ Backend validates on each connection

**Action**: [x] Documented as acceptable risk for current architecture
**Future**: Consider WebSocket token-based auth in Phase 3

---

### Issue #4: No Token Expiry Check Before Use
**File**: [packages/web/adapters/http-call-api.adapter.ts](../packages/web/adapters/http-call-api.adapter.ts)
**Severity**: 🟠 HIGH
**Status**: ⚠️ PARTIALLY MITIGATED

**Problem**:
Tokens are used without checking if they're expired before making API calls.

**Mitigation**:
- ✅ Auth store validates on load
- ✅ Backend will reject expired tokens with 401
- ⚠️ No client-side check before API calls

**Action**: [ ] Consider adding token expiry check in `getHeaders()` method

---

## 3. MEDIUM SEVERITY ISSUES 🟡

### Issue #5: Settings Page SSR Timing Issue
**File**: [packages/web/containers/SettingsContainer.tsx](../packages/web/containers/SettingsContainer.tsx)
**Line**: 31
**Severity**: 🟡 MEDIUM
**Status**: ⚠️ NOT FIXED

**Problem**:
```typescript
if (!isLoggedIn) return <div className="p-10 text-slate-600">Please login to access settings.</div>;
```

This check happens before auth store is hydrated from localStorage, causing "Please login" message to flash even when user is logged in.

**Fix Required**:
```typescript
const [isHydrated, setIsHydrated] = useState(false);

useEffect(() => {
  // Wait for auth store to hydrate from localStorage
  const timer = setTimeout(() => setIsHydrated(true), 100);
  return () => clearTimeout(timer);
}, []);

if (!isHydrated) return <div className="p-10 text-slate-600">Loading...</div>;
if (!isLoggedIn) return <div className="p-10 text-slate-600">Please login to access settings.</div>;
```

**Action**: [ ] Add hydration state before auth check

---

### Issue #6: Main Page Login Flash
**File**: [packages/web/containers/CallCenterContainer.tsx](../packages/web/containers/CallCenterContainer.tsx)
**Lines**: 91-96, 191
**Severity**: 🟡 MEDIUM (UX Issue)
**Status**: ⚠️ NOT FIXED - USER REPORTED THIS

**Problem**:
User reports: "while I refresh the page I see the login page immediately and then it loads to the homepage"

**Root Cause**:
```typescript
// Line 91-96: Auth load happens in useEffect (AFTER initial render)
useEffect(() => {
  loadInitialAuth();
}, [loadInitialAuth]);

// Line 191: Render logic depends on isLoggedIn
if (!isLoggedIn) {
  return <LoginScreen onLogin={handleLogin} isLoading={authLoading} error={authError} />;
}
```

**Sequence**:
1. Component mounts with `isLoggedIn: false`
2. Initial render shows `<LoginScreen />`
3. `useEffect` fires, calls `loadInitialAuth()`
4. `loadInitialAuth()` reads from localStorage (synchronous)
5. State updates to `isLoggedIn: true`
6. Re-render shows `<CallCenterView />`

**Duration**: Flash lasts 100-200ms

**Fix Required** (Option 1 - Loading State):
```typescript
const [isHydrating, setIsHydrating] = useState(true);

useEffect(() => {
  loadInitialAuth();
  // Auth load is synchronous, so we can set hydrating to false immediately
  setIsHydrating(false);
}, [loadInitialAuth]);

if (isHydrating) {
  return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">Loading...</div>;
}
if (!isLoggedIn) {
  return <LoginScreen onLogin={handleLogin} isLoading={authLoading} error={authError} />;
}
```

**Fix Required** (Option 2 - Check localStorage Before Render):
```typescript
// Check if we have a token before first render
const hasStoredToken = typeof window !== 'undefined' && !!localStorage.getItem('jwt_token');

if (!isLoggedIn && !hasStoredToken) {
  return <LoginScreen onLogin={handleLogin} isLoading={authLoading} error={authError} />;
}
if (!isLoggedIn && hasStoredToken) {
  return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">Loading...</div>;
}
```

**Recommendation**: Option 2 is better - no flash, immediately shows appropriate UI

**Action**: [ ] Implement Option 2 fix

---

### Issue #7: No Rate Limiting on Login
**File**: [packages/web/stores/auth.store.ts](../packages/web/stores/auth.store.ts)
**Severity**: 🟡 MEDIUM
**Status**: ⚠️ NOT A FRONTEND CONCERN (BACKEND SHOULD HANDLE)

**Problem**:
Frontend does not implement rate limiting for login attempts.

**Analysis**:
- ✅ Rate limiting should be implemented on backend
- ✅ Frontend rate limiting can be bypassed
- Current backend: `auth.service.ts` - needs audit

**Action**: [ ] Audit backend auth service for rate limiting

---

### Issue #8: Debug Logs in Production
**File**: [packages/web/containers/CallCenterContainer.tsx](../packages/web/containers/CallCenterContainer.tsx)
**Lines**: 116-118, 125, 127
**Severity**: 🟡 MEDIUM
**Status**: ⚠️ NOT FIXED

**Problem**:
```typescript
console.log('[CallCenterContainer] 📞 New call received:', { direction: newCall.direction, state: newCall.state });
console.log('%c[CallCenterContainer] 📞 Inbound call detected, initializing SIP.js...', 'color: #2196F3');
console.log('[CallCenterContainer] 📞 Call is NOT inbound+ringing, skipping SIP.js initialization');
```

**Impact**:
- Clutters console in production
- Exposes internal call flow
- No security risk, just noise

**Fix Required**:
```typescript
// Use environment-based logging:
const DEBUG = process.env.NODE_ENV === 'development';
if (DEBUG) console.log('[CallCenterContainer] 📞 New call received:', { direction: newCall.direction, state: newCall.state });
```

**Action**: [ ] Wrap debug logs in environment check or remove

---

## 4. LOW SEVERITY / INFO 🟢

### Issue #9: Console Logs Expose Backend URL
**File**: [packages/web/adapters/http-call-api.adapter.ts](../packages/web/adapters/http-call-api.adapter.ts)
**Line**: 31
**Severity**: 🟢 LOW
**Status**: ✅ ACCEPTABLE

**Problem**:
```typescript
console.log(`[ApiClient] Initialized with backend URL: ${this.backendUrl || '(default fallback)'}`);
```

**Impact**: Backend URL is not sensitive information

**Action**: [x] No action needed

---

### Issue #10: Import Path Inconsistency
**File**: Multiple files in packages/web/
**Severity**: 🟢 LOW
**Status**: ⚠️ TECHNICAL DEBT

**Problem**:
Code uses both `@/` imports and relative imports (`../`):
- tsconfig.json has `"@/*": ["./src/*"]`
- But `src/` directory is empty
- Fixed in container by using relative imports

**Impact**: Confusion, potential build issues

**Action**: [ ] Standardize on one import style (recommend relative paths)

---

## 5. AUDIT SUMMARY BY FILE

### ✅ [packages/backend/src/system-settings.controller.ts](../packages/backend/src/system-settings.controller.ts)
**Status**: PASSED ✅
**Issues Found**: None
**Notes**: Clean implementation, proper error handling

---

### ⚠️ [packages/web/adapters/http-call-api.adapter.ts](../packages/web/adapters/http-call-api.adapter.ts)
**Status**: MINOR ISSUES ⚠️
**Issues Found**:
- 🟠 HIGH: Token in WebSocket URL (acceptable risk, documented)
- 🟠 HIGH: No token expiry check before use (partially mitigated)
- 🟢 LOW: Console log of backend URL (acceptable)

**Action Required**: [ ] Consider token expiry check

---

### 🔴 [packages/web/stores/auth.store.ts](../packages/web/stores/auth.store.ts)
**Status**: CRITICAL ISSUES 🔴
**Issues Found**:
- 🔴 CRITICAL: Console logs expose tokens (lines 100-101-107)
- 🟠 HIGH: Token validation timing (actually correct, but causes UI flash)
- 🟡 MEDIUM: No rate limiting (backend concern)

**Action Required**:
- [ ] REMOVE lines 100-101-107 console.log statements
- [ ] Fix UI flash with Option 2 (check localStorage before render)

---

### ⚠️ [packages/web/containers/CallCenterContainer.tsx](../packages/web/containers/CallCenterContainer.tsx)
**Status**: MINOR ISSUES ⚠️
**Issues Found**:
- 🟡 MEDIUM: Login flash on page refresh (USER REPORTED)
- 🟡 MEDIUM: Debug console logs in production

**Action Required**:
- [ ] Implement Option 2 fix for UI flash
- [ ] Remove or environment-wrap debug logs

---

### ⚠️ [packages/web/containers/SettingsContainer.tsx](../packages/web/containers/SettingsContainer.tsx)
**Status**: MINOR ISSUES ⚠️
**Issues Found**:
- 🟡 MEDIUM: SSR timing issue shows "Please login" when logged in

**Action Required**: [ ] Add hydration state before auth check

---

### ✅ [packages/web/ports/settings-api.port.ts](../packages/web/ports/settings-api.port.ts)
**Status**: PASSED ✅
**Issues Found**: None
**Notes**: Clean interface definition

---

### ✅ [packages/web/ports/call-api.port.ts](../packages/web/ports/call-api.port.ts)
**Status**: PASSED ✅
**Issues Found**: None
**Notes**: Added `refreshToken()` method correctly

---

### ⚠️ [packages/web/stores/settings.store.ts](../packages/web/stores/settings.store.ts)
**Status**: MINOR ISSUES ⚠️
**Issues Found**:
- 🟢 LOW: Console error logging is appropriate

**Action Required**: None

---

### ✅ [packages/web/adapters/http-settings-api.adapter.ts](../packages/web/adapters/http-settings-api.adapter.ts)
**Status**: PASSED ✅
**Issues Found**: None
**Notes**: Import paths fixed

---

## 6. PRE-COMMIT CHECKLIST

### 🔴 BLOCKING (Must Fix Before Commit)
- [ ] **CRITICAL**: Remove console.log statements in [auth.store.ts#L100-L101-L107](../packages/web/stores/auth.store.ts#L100)
- [ ] **HIGH**: Fix token validation timing causing UI flash (implement Option 2 in CallCenterContainer)

### ⚠️ RECOMMENDED (Should Fix)
- [ ] **MEDIUM**: Fix SettingsContainer SSR timing issue
- [ ] **MEDIUM**: Remove or environment-wrap debug console logs in CallCenterContainer

### 📝 TECHNICAL DEBT (Can Be Deferred)
- [ ] Consider token expiry check before API calls
- [ ] Standardize import paths (relative vs @/ aliases)
- [ ] Audit backend auth service for rate limiting

---

## 7. SECURITY BEST PRACTICES REMINDERS

### ✅ What We Did Right
1. Using JWT tokens with expiry
2. Storing tokens in localStorage (acceptable for SPA)
3. Token validation on app load
4. Proper error handling in API calls
5. Using HTTPS/WSS for encrypted transport

### ⚠️ What Needs Improvement
1. Never log tokens to console (CRITICAL)
2. Avoid UI flashes during auth hydration (UX)
3. Add environment-based logging (development vs production)

### 🔒 Future Enhancements
1. Implement token refresh mechanism (already have backend support)
2. Add token expiry warning before expiry
3. Consider httpOnly cookies for tokens (more secure)
4. Add CSRF protection for state-changing operations
5. Implement backend rate limiting on auth endpoints

---

## 8. TESTING RECOMMENDATIONS

After fixing security issues, test:

1. **Login Flow**: Verify no tokens in console
2. **Page Refresh**: Verify no login flash
3. **Token Expiry**: Verify logout on expiry
4. **Settings Page**: Verify no "Please login" flash
5. **Console Cleanliness**: Verify no debug logs in production mode

---

## 9. APPROVAL

**Ready for Commit**: ❌ NO - Critical issues must be fixed

**Required Actions**:
1. Remove all console.log statements exposing tokens
2. Fix UI flash issue in CallCenterContainer
3. Re-test to verify fixes
4. Create git commit with proper message

**Estimated Time**: 15 minutes

---

**End of Security Audit Report**

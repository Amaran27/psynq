# Frontend Integration Test Plan

## Overview
This document outlines the manual testing steps for Phase 2B: Frontend Integration with JWT refresh tokens and system settings.

## Prerequisites
1. All services running via `docker-compose -f docker-compose.dev.yml up`
2. Backend API accessible at http://localhost:3001
3. Frontend accessible at http://localhost:3000
4. PostgreSQL database initialized with seed data

## Test Scenarios

### 1. Authentication & Token Management

#### Test 1.1: Login with Refresh Token Storage
**Steps:**
1. Navigate to http://localhost:3000/login
2. Enter valid credentials (use seeded admin user)
3. Submit login form

**Expected Results:**
- Login succeeds
- Access token stored in localStorage (`auth_token`)
- Refresh token stored in localStorage (`auth_refreshToken`)
- Token expiration time stored (`auth_tokenExpiresAt`)
- User redirected to dashboard

**Verification:**
```javascript
// Run in browser console
localStorage.getItem('auth_token')        // Should show JWT
localStorage.getItem('auth_refreshToken') // Should show refresh JWT
localStorage.getItem('auth_tokenExpiresAt') // Should show timestamp
```

#### Test 1.2: Automatic Token Refresh on 401
**Steps:**
1. Login as admin
2. Manually corrupt the access token in localStorage:
   ```javascript
   localStorage.setItem('auth_token', 'invalid.token.here')
   ```
3. Navigate to Settings page
4. Observe network requests in DevTools

**Expected Results:**
- First API call fails with 401
- ApiClientService automatically calls `/auth/refresh`
- New access token received and stored
- Original request retried with new token
- UI loads successfully without manual re-login

**Verification:**
```javascript
// Check network tab
// Should see:
// 1. Request to settings endpoint (401)
// 2. Request to /auth/refresh (200)
// 3. Retry of settings request (200)

// Check localStorage
localStorage.getItem('auth_token') // Should be NEW valid token
```

#### Test 1.3: Proactive Token Refresh
**Steps:**
1. Login as admin
2. Modify token expiration to be < 5 minutes in future:
   ```javascript
   const expiresAt = Date.now() + (4 * 60 * 1000); // 4 minutes
   localStorage.setItem('auth_tokenExpiresAt', expiresAt.toString());
   ```
3. Make any API call (e.g., navigate to Settings)

**Expected Results:**
- Token automatically refreshed before making request
- Request succeeds without 401

**Verification:**
- Check network tab for `/auth/refresh` call
- Verify new token in localStorage

#### Test 1.4: Logout Clears All Tokens
**Steps:**
1. Login as admin
2. Click logout

**Expected Results:**
- All localStorage cleared:
  - `auth_token` = null
  - `auth_refreshToken` = null
  - `auth_tokenExpiresAt` = null
- User redirected to login page

### 2. System Settings - Storage Configuration

#### Test 2.1: Load Storage Configuration
**Steps:**
1. Login as system_admin
2. Navigate to Settings → Storage tab

**Expected Results:**
- Current storage provider displayed in dropdown
- Provider-specific config form shows (S3 or MinIO)
- No console errors

#### Test 2.2: Update S3 Configuration
**Steps:**
1. Navigate to Settings → Storage
2. Select "Amazon S3" from dropdown
3. Fill in S3 credentials:
   - Access Key ID: `test-access-key`
   - Secret Access Key: `test-secret-key`
   - Region: `us-east-1`
   - Bucket: `test-bucket`
4. Click "Save S3 Keys"

**Expected Results:**
- Button shows "Saving..." during request
- Success message shown
- Config persisted to database via backend API
- No console errors

**Verification:**
```javascript
// Check network tab
// Should see PUT /api/v1/settings/storage/config/s3
// Body should contain config object
```

#### Test 2.3: Update MinIO Configuration
**Steps:**
1. Navigate to Settings → Storage
2. Select "MinIO" from dropdown
3. Fill in MinIO credentials:
   - Endpoint: `localhost`
   - Port: `9000`
   - Access Key: `minioadmin`
   - Secret Key: `minioadmin`
   - Bucket: `psynq-recordings`
   - Force Secure SSL: unchecked
4. Click "Update Cluster Auth"

**Expected Results:**
- Config saved successfully
- Values persist on page reload

#### Test 2.4: Storage Health Check
**Steps:**
1. Configure MinIO with valid credentials
2. Click "Test Connection" button

**Expected Results:**
- Button shows "Testing..." during request
- Health status banner appears:
  - Green checkmark with "Connection Successful"
  - Provider name shown
  - Success message
- No console errors

**Verification:**
```javascript
// Check network tab
// Should see POST /api/v1/settings/storage/test
// Response: { healthy: true, provider: 'minio', message: '...' }
```

#### Test 2.5: Storage Health Check Failure
**Steps:**
1. Configure MinIO with INVALID credentials
2. Click "Test Connection"

**Expected Results:**
- Red X with "Connection Failed"
- Error message displayed
- Button not disabled (can retry)

### 3. System Settings - Telephony Configuration

#### Test 3.1: Load Asterisk Configuration
**Steps:**
1. Login as system_admin
2. Navigate to Settings → Telephony tab

**Expected Results:**
- Asterisk status indicator shows "Active"
- Current config loaded:
  - ARI WebSocket URL
  - Stasis Username
  - Stasis Password
  - App Identifier

#### Test 3.2: Update Asterisk Configuration
**Steps:**
1. Modify Asterisk config values
2. Click "Update Bridge Config"

**Expected Results:**
- Config saved via API
- Success feedback shown
- Values persist on reload

### 4. System Settings - Recording Configuration

#### Test 4.1: Load Recording Settings
**Steps:**
1. Login as system_admin
2. Navigate to Settings (if recording tab exists)

**Expected Results:**
- Recording enabled/disabled status shown
- Auto-delete days displayed
- Format displayed
- Storage path displayed

#### Test 4.2: Update Recording Settings
**Steps:**
1. Toggle recording enabled
2. Change auto-delete days
3. Save changes

**Expected Results:**
- Settings persisted
- UI reflects new values

### 5. Error Handling

#### Test 5.1: Network Error Handling
**Steps:**
1. Stop backend service
2. Navigate to Settings
3. Attempt to save any config

**Expected Results:**
- Error message displayed in red banner
- Button returns to normal state (not stuck loading)
- Console shows error details
- No unhandled exceptions

#### Test 5.2: RBAC Enforcement
**Steps:**
1. Login as regular agent (non-admin)
2. Attempt to navigate to /settings

**Expected Results:**
- "Access denied. Admins only." message shown
- No settings UI displayed

#### Test 5.3: Token Expiry Handling
**Steps:**
1. Login as admin
2. Set both tokens to expire:
   ```javascript
   localStorage.setItem('auth_token', 'expired');
   localStorage.setItem('auth_refreshToken', 'expired');
   ```
3. Navigate to Settings

**Expected Results:**
- Refresh attempt fails
- User logged out automatically
- Redirected to login page
- Error message shown (if applicable)

### 6. Concurrent Request Handling

#### Test 6.1: Multiple Requests with Token Refresh
**Steps:**
1. Login as admin
2. Corrupt access token
3. Rapidly navigate between multiple settings tabs

**Expected Results:**
- Only ONE refresh token request made
- All subsequent requests queued
- All requests succeed after refresh completes
- No race conditions or duplicate refresh calls

**Verification:**
```javascript
// Check network tab
// Should see EXACTLY one /auth/refresh call
// Multiple other requests should be queued and retried
```

## Success Criteria

✅ All authentication flows work correctly
✅ Token refresh happens automatically on 401
✅ Storage configuration persists correctly
✅ Health check returns accurate results
✅ Error handling is graceful
✅ RBAC is enforced
✅ No console errors or unhandled exceptions
✅ Concurrent requests handled properly

## Known Issues to Watch For

1. **Token Refresh Loop:** If refresh endpoint returns 401, ensure logout happens
2. **Stale Tokens:** Verify new token is actually used after refresh
3. **Request Queuing:** Check that concurrent requests don't overwhelm the refresh mechanism
4. **Local Storage Persistence:** Ensure tokens survive page refresh
5. **SSL Issues:** MinIO health checks may fail if SSL settings mismatch

## Test Execution Checklist

- [ ] Start all services with docker-compose
- [ ] Verify backend health at http://localhost:3001/health
- [ ] Run Test 1.1 - Login with refresh token
- [ ] Run Test 1.2 - Automatic token refresh on 401
- [ ] Run Test 1.3 - Proactive token refresh
- [ ] Run Test 1.4 - Logout clears all tokens
- [ ] Run Test 2.1 - Load storage config
- [ ] Run Test 2.2 - Update S3 config
- [ ] Run Test 2.3 - Update MinIO config
- [ ] Run Test 2.4 - Storage health check (success)
- [ ] Run Test 2.5 - Storage health check (failure)
- [ ] Run Test 3.1 - Load Asterisk config
- [ ] Run Test 3.2 - Update Asterisk config
- [ ] Run Test 5.1 - Network error handling
- [ ] Run Test 5.2 - RBAC enforcement
- [ ] Run Test 6.1 - Concurrent request handling
- [ ] Check for console errors throughout
- [ ] Verify localStorage cleanup on logout

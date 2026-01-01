# Browser Testing Quick Guide

**Purpose**: Manual testing checklist for frontend integration
**Test URL**: http://localhost:3000
**Test Credentials**: sysadmin / admin123

---

## Pre-Test Setup

### 1. Open Browser DevTools
- **Chrome/Edge**: F12 or Ctrl+Shift+I
- **Firefox**: F12 or Ctrl+Shift+K
- **Safari**: Cmd+Option+I (Enable Develop menu first)

### 2. Navigate to Application Tab
- Find **Application** or **Storage** tab
- Expand **Local Storage**
- Select `http://localhost:3000`

### 3. Keep Console Open
- Switch to **Console** tab
- Keep visible for JavaScript commands and errors

---

## Test 1: Login & Token Storage

### Steps
1. Navigate to: http://localhost:3000
2. You should see login form
3. Enter username: `sysadmin`
4. Enter password: `admin123`
5. Click **Login** button

### Expected Results
- ✅ Page redirects to dashboard or home page
- ✅ No console errors
- ✅ Network tab shows POST `/auth/login` (status 200)

### Verify Token Storage
In Console, run:
```javascript
// Check all auth-related localStorage keys
Object.keys(localStorage).filter(k => k.includes('auth'))
```

Expected output:
```javascript
['auth_token', 'auth_refreshToken', 'auth_tokenExpiresAt']
```

Verify each token:
```javascript
console.log('Access Token:', localStorage.getItem('auth_token'));
console.log('Refresh Token:', localStorage.getItem('auth_refreshToken'));
console.log('Expires At:', localStorage.getItem('auth_tokenExpiresAt'));
```

Expected:
- Access token: ~300 characters JWT string
- Refresh token: ~300 characters JWT string
- Expires at: timestamp like `1735249200000`

---

## Test 2: Decode Access Token

### Steps
In Console, run:
```javascript
const token = localStorage.getItem('auth_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token Payload:', payload);
```

### Expected Results
```javascript
{
  username: "sysadmin",
  sub: "72fa5b0f-d44e-4407-b4bc-acb7973e5dd2",
  roles: ["system_admin"],
  orgId: "c18d8db4-55e4-4bae-8b18-f23e04c231de",
  iat: 1767167300,
  exp: 1767253700
}
```

Verify:
- ✅ roles includes "system_admin"
- ✅ exp is 24 hours after iat

---

## Test 3: Automatic Token Refresh on 401

### Steps
1. Login as sysadmin (if not already)
2. Navigate to: http://localhost:3000/settings
3. Open **Network** tab in DevTools
4. Filter by "Fetch/XHR"
5. In Console, corrupt the token:
   ```javascript
   localStorage.setItem('auth_token', 'invalid.token.here');
   ```
6. Refresh the page (F5) or navigate to another settings tab

### Expected Results
- **Network tab should show**:
  1. First request to settings endpoint → 401 Unauthorized
  2. Request to `/auth/refresh` → 200 OK
  3. Retry of settings request → 200 OK

- **Console should show**:
  - No errors about authentication
  - Page loads successfully

### Verify New Token
In Console:
```javascript
const newToken = localStorage.getItem('auth_token');
console.log('New Token:', newToken);
console.log('Is different from "invalid":', newToken !== 'invalid.token.here');
```

Expected:
- ✅ New token is a valid JWT (not "invalid.token.here")
- ✅ New token has different expiration time

---

## Test 4: Proactive Token Refresh

### Steps
1. Login as sysadmin
2. In Console, set token expiration to < 5 minutes in future:
   ```javascript
   const expiresAt = Date.now() + (4 * 60 * 1000); // 4 minutes
   localStorage.setItem('auth_tokenExpiresAt', expiresAt.toString());
   console.log('Token expires at:', new Date(expiresAt));
   ```
3. Navigate to Settings page
4. Open **Network** tab

### Expected Results
- **Network tab should show**:
  - Request to `/auth/refresh` BEFORE any other API call
  - All subsequent calls succeed with 200 OK

- ✅ No 401 errors
- ✅ Token refreshed proactively

---

## Test 5: Storage Configuration UI

### Steps
1. Navigate to: http://localhost:3000/settings
2. Click **Storage** tab (if not active)
3. Observe storage provider dropdown

### Expected Results
- ✅ Current provider selected (should be "local")
- ✅ Dropdown shows: Local Filesystem, Amazon S3, MinIO
- ✅ No console errors

### Test Provider Switching
1. Select "Amazon S3" from dropdown
2. S3 config form should appear below
3. Fill in test values:
   - Access Key ID: `test-key`
   - Secret Access Key: `test-secret`
   - Region: `us-east-1`
   - Bucket: `test-bucket`
4. Click **Save S3 Keys**

### Expected Results
- ✅ Button shows "Saving..." during request
- ✅ Success message appears
- ✅ Values persist on page reload

### Verify in Database
```bash
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -c "SELECT * FROM settings WHERE key = 'storage.s3.config';"
```

---

## Test 6: Storage Health Check

### Steps
1. Configure MinIO (default in dev):
   - Provider: MinIO
   - Endpoint: `localhost`
   - Port: `9000`
   - Access Key: `minioadmin`
   - Secret Key: `minioadmin`
   - Bucket: `psynq-recordings`
   - Force Secure SSL: unchecked
2. Click **Update Cluster Auth** (wait for save)
3. Click **Test Connection** button

### Expected Results
- ✅ Button shows "Testing..." during request
- ✅ Green banner appears with checkmark
- ✅ Message: "Connection Successful"
- ✅ Provider name displayed

### Test Invalid Credentials
1. Change Secret Key to `wrong-password`
2. Click **Update Cluster Auth**
3. Click **Test Connection**

### Expected Results
- ✅ Red banner appears with X
- ✅ Message: "Connection Failed"
- ✅ Error details shown

---

## Test 7: Telephony Configuration

### Steps
1. Navigate to: http://localhost:3000/settings
2. Click **Telephony** tab
3. Observe Asterisk configuration form

### Expected Results
- ✅ ARI WebSocket URL field
- ✅ Stasis Username field
- ✅ Stasis Password field
- ✅ App Identifier field
- ✅ Current values loaded (if set)

### Test Configuration Update
1. Modify any value
2. Click **Update Bridge Config**

### Expected Results
- ✅ Save succeeds
- ✅ Values persist on reload

---

## Test 8: Logout Clears Tokens

### Steps
1. Login as sysadmin
2. Verify tokens exist in localStorage
3. Click logout button/link
4. Check localStorage again

### Expected Results
- ✅ `auth_token` is null or removed
- ✅ `auth_refreshToken` is null or removed
- ✅ `auth_tokenExpiresAt` is null or removed
- ✅ Redirected to login page

Verify in Console:
```javascript
console.log('Token:', localStorage.getItem('auth_token'));
console.log('Refresh Token:', localStorage.getItem('auth_refreshToken'));
```

All should return `null`.

---

## Test 9: Concurrent Request Handling

### Steps
1. Login as sysadmin
2. Corrupt access token:
   ```javascript
   localStorage.setItem('auth_token', 'invalid');
   ```
3. Open **Network** tab
4. Rapidly navigate between multiple settings tabs
5. Observe network requests

### Expected Results
- ✅ Only ONE `/auth/refresh` request in Network tab
- ✅ All other requests queued and retried
- ✅ All requests succeed after refresh
- ✅ No race conditions or duplicate refresh calls

---

## Test 10: RBAC Enforcement

### Note**: This test requires a non-admin user. Currently blocked on user creation issue.

### Workaround: Create Test User in Database
```bash
docker exec psynq-postgres-dev psql -U psynq_user -d psynq_db -c "
INSERT INTO users (id, username, password, roles, organizationId) 
VALUES (
  gen_random_uuid(), 
  'testagent', 
  '\$2a\$10\$abcdefghijklmnopqrstuv', 
  '{agent}', 
  'c18d8db4-55e4-4bae-8b18-f23e04c231de'
);
"
```

### Steps (after creating user)
1. Logout as sysadmin
2. Login as testagent (password unknown, will need reset)
3. Attempt to navigate to http://localhost:3000/settings

### Expected Results
- ✅ "Access denied. Admins only." message
- ✅ No settings UI displayed
- ✅ Redirected or shown error

---

## Console Commands Reference

### Check Authentication State
```javascript
// Check if logged in
const token = localStorage.getItem('auth_token');
console.log('Logged in:', !!token);

// Check user info
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('User:', payload.username);
  console.log('Roles:', payload.roles);
}
```

### Check Token Expiry
```javascript
const expiresAt = localStorage.getItem('auth_tokenExpiresAt');
if (expiresAt) {
  const expiryDate = new Date(parseInt(expiresAt));
  const now = new Date();
  const minutesLeft = (expiryDate - now) / 60000;
  console.log('Token expires in:', minutesLeft.toFixed(0), 'minutes');
  console.log('Should refresh:', minutesLeft < 5);
}
```

### Manually Trigger Token Refresh
```javascript
import { useAuthStore } from '@/stores/auth.store';
const authStore = useAuthStore.getState();
authStore.refreshToken().then(() => {
  console.log('Token refreshed');
  console.log('New token:', localStorage.getItem('auth_token'));
});
```

### Clear All Auth Data
```javascript
localStorage.removeItem('auth_token');
localStorage.removeItem('auth_refreshToken');
localStorage.removeItem('auth_tokenExpiresAt');
location.reload();
```

---

## Network Tab Patterns

### Authentication Flow
- `POST /auth/login` → Initial login
- `POST /auth/refresh` → Token refresh
- All other requests should include `Authorization: Bearer ...` header

### Settings API Calls
- `GET /api/system-settings` → Get all settings
- `GET /api/system-settings/storage/config` → Get storage config
- `PUT /api/system-settings/storage/config` → Update storage config
- `POST /api/system-settings/storage/test` → Test storage
- `GET /api/system-settings/telephony/config` → Get telephony config
- `PUT /api/system-settings/telephony/config` → Update telephony config

### Expected Status Codes
- `200 OK` - Successful GET/POST/PUT
- `401 Unauthorized` - Token expired (should trigger refresh)
- `403 Forbidden` - RBAC enforcement (non-admin trying to access admin)
- `400 Bad Request` - Invalid request body

---

## Common Issues

### Issue: "No authentication token available"
**Cause**: Token not in localStorage or expired
**Fix**: Login again

### Issue: 401 errors not refreshing token
**Cause**: ApiClientService not initialized or token expired and refresh also expired
**Fix**: Logout and login again

### Issue: Storage health check fails
**Cause**: MinIO not running or wrong credentials
**Fix**: Check MinIO is running: `docker ps | grep minio`

### Issue: Settings page shows "Access denied"
**Cause**: User doesn't have system_admin role
**Fix**: Login as sysadmin

---

## Test Completion Checklist

- [ ] Test 1: Login & Token Storage
- [ ] Test 2: Decode Access Token
- [ ] Test 3: Automatic Token Refresh on 401
- [ ] Test 4: Proactive Token Refresh
- [ ] Test 5: Storage Configuration UI
- [ ] Test 6: Storage Health Check
- [ ] Test 7: Telephony Configuration
- [ ] Test 8: Logout Clears Tokens
- [ ] Test 9: Concurrent Request Handling
- [ ] Test 10: RBAC Enforcement

---

**End of Browser Testing Guide**

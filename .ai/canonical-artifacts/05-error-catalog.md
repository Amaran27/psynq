# Canonical Error Code Catalog - Psynq CPaaS Platform

**Version**: 1.0.0
**Last Updated**: December 31, 2025
**Status**: SINGLE SOURCE OF TRUTH
**Purpose**: Complete error code reference

---

## Error Code Format
`{CATEGORY}_{SPECIFIC}`

Example: `CALL_001`, `AUTH_005`

---

## 1. Authentication Errors (AUTH_001 - AUTH_020)

| Code | HTTP Status | Message | Cause | Recovery |
|------|-------------|---------|-------|----------|
| AUTH_001 | 401 | Invalid credentials | Wrong email/password | User re-enters credentials |
| AUTH_002 | 401 | Account locked | 5 failed login attempts | Admin unlock or password reset |
| AUTH_003 | 401 | Token expired | JWT token expired | Refresh token |
| AUTH_004 | 401 | Invalid token | Malformed JWT | Re-login |
| AUTH_005 | 403 | Forbidden | Insufficient permissions | Contact admin |
| AUTH_006 | 401 | Session expired | Refresh token invalid | Re-login |
| AUTH_007 | 400 | Password too weak | Password doesn't meet requirements | Choose stronger password |
| AUTH_008 | 409 | Email already exists | Email already registered | Use different email |
| AUTH_009 | 409 | Username already exists | Username already registered | Use different username |
| AUTH_010 | 429 | Too many login attempts | Rate limit exceeded | Wait 15 minutes |

---

## 2. Call Control Errors (CALL_001 - CALL_050)

| Code | HTTP Status | Message | Cause | Recovery |
|------|-------------|---------|-------|----------|
| CALL_001 | 400 | Invalid phone number | Non-E.164 format | Format as +15551234567 |
| CALL_002 | 402 | Insufficient balance | Wallet balance too low | Top up wallet |
| CALL_003 | 429 | Rate limit exceeded | Too many concurrent calls | Wait or upgrade plan |
| CALL_004 | 404 | Agent not found | Agent ID invalid | Check agent ID |
| CALL_005 | 404 | Queue not found | Queue ID invalid | Check queue ID |
| CALL_006 | 400 | Agent unavailable | Agent not in AVAILABLE state | Wait or assign different agent |
| CALL_007 | 400 | Call not found | Call ID invalid | Check call ID |
| CALL_008 | 400 | Call already ended | Cannot modify ended call | Use active call ID |
| CALL_009 | 400 | Invalid transition | State transition not allowed | Check current call state |
| CALL_010 | 503 | Telephony provider error | Asterisk/Provider error | Retry or contact support |
| CALL_011 | 400 | Invalid DTMF | Non-DTMF characters | Use 0-9, *, # only |
| CALL_012 | 400 | Transfer failed | Target unavailable | Check target availability |
| CALL_013 | 403 | Permission denied | Cannot monitor this call | Check permissions |
| CALL_014 | 400 | Recording not enabled | Recording disabled for call | Enable recording |
| CALL_015 | 404 | Recording not found | Recording ID invalid | Check recording ID |

---

## 3. Organization Errors (ORG_001 - ORG_030)

| Code | HTTP Status | Message | Cause | Recovery |
|------|-------------|---------|-------|----------|
| ORG_001 | 404 | Organization not found | Org ID invalid | Check org ID |
| ORG_002 | 409 | Organization already exists | Slug already taken | Use different slug |
| ORG_003 | 400 | Invalid slug | Slug format invalid | Use lowercase letters, numbers, hyphens |
| ORG_004 | 403 | Organization suspended | Org suspended by admin | Contact support |
| ORG_005 | 403 | Max agents exceeded | Agent limit reached | Upgrade plan |
| ORG_006 | 403 | Max concurrent calls exceeded | Call limit reached | Upgrade plan |
| ORG_007 | 400 | Invalid plan tier | Plan tier not recognized | Use free/pro/enterprise |
| ORG_008 | 403 | International calls not allowed | Setting disabled | Enable international calls |
| ORG_009 | 400 | Invalid timezone | Timezone not recognized | Use IANA timezone format |

---

## 4. User Errors (USER_001 - USER_040)

| Code | HTTP Status | Message | Cause | Recovery |
|------|-------------|---------|-------|----------|
| USER_001 | 404 | User not found | User ID invalid | Check user ID |
| USER_002 | 409 | User already exists | Email/username already in org | Use different email/username |
| USER_003 | 400 | Invalid role | Role not recognized | Use superadmin/admin/supervisor/agent |
| USER_004 | 400 | Invalid skill level | Not 1-5 | Use 1-5 range |
| USER_005 | 403 | Cannot delete last admin | Last admin cannot be deleted | Create new admin first |
| USER_006 | 403 | Cannot modify self | Cannot modify own role | Use different user |
| USER_007 | 400 | SIP endpoint not found | PJSIP endpoint missing | Register SIP endpoint |
| USER_008 | 400 | Agent not in queue | Agent not queue member | Add agent to queue |

---

## 5. SMS Errors (SMS_001 - SMS_030)

| Code | HTTP Status | Message | Cause | Recovery |
|------|-------------|---------|-------|----------|
| SMS_001 | 400 | Invalid phone number | Non-E.164 format | Format correctly |
| SMS_002 | 400 | Message too long | Over 1600 chars | Split message |
| SMS_003 | 402 | Insufficient balance | Wallet too low | Top up wallet |
| SMS_004 | 429 | Rate limit exceeded | >10 SMS/minute | Wait |
| SMS_005 | 400 | Provider error | Twilio/Bandwidth error | Check provider status |
| SMS_006 | 400 | Invalid country | SMS not supported | Use supported country |
| SMS_007 | 400 | Message blocked | Content policy violation | Check content |

---

## 6. Recording Errors (REC_001 - REC_020)

| Code | HTTP Status | Message | Cause | Recovery |
|------|-------------|---------|-------|----------|
| REC_001 | 404 | Recording not found | Recording ID invalid | Check recording ID |
| REC_002 | 403 | Access denied | No permission | Check permissions |
| REC_003 | 400 | Transcription failed | STT provider error | Retry or check provider |
| REC_004 | 400 | Invalid format | Format not supported | Use wav/mp3/ogg |
| REC_005 | 503 | Storage error | MinIO error | Check storage |

---

## 7. Billing Errors (BILL_001 - BILL_030)

| Code | HTTP Status | Message | Cause | Recovery |
|------|-------------|---------|-------|----------|
| BILL_001 | 402 | Payment failed | Payment gateway error | Retry or use different method |
| BILL_002 | 400 | Invalid amount | Negative or zero amount | Use positive amount |
| BILL_003 | 400 | Invalid currency | Non-ISO currency | Use ISO 4217 code |
| BILL_004 | 409 | Duplicate transaction | Transaction ID exists | Check transaction ID |

---

## 8. Validation Errors (VAL_001 - VAL_050)

| Code | HTTP Status | Message | Cause | Recovery |
|------|-------------|---------|-------|----------|
| VAL_001 | 400 | Required field missing | Field not provided | Provide required field |
| VAL_002 | 400 | Invalid UUID | UUID format invalid | Use valid UUID |
| VAL_003 | 400 | Invalid email | Email format invalid | Use valid email |
| VAL_004 | 400 | Invalid date | Date format invalid | Use ISO 8601 format |
| VAL_005 | 400 | Value too long | Exceeds max length | Shorten value |
| VAL_006 | 400 | Value too short | Below min length | Lengthen value |
| VAL_007 | 400 | Invalid enum value | Not in allowed values | Use allowed value |

---

## Error Response Schema

```json
{
  "error": "Human-readable error message",
  "error_code": "CATEGORY_001",
  "message": "Detailed error description",
  "details": {
    "field": "Specific field that caused error",
    "value": "Invalid value provided"
  },
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-31T12:00:00Z"
}
```

---

## Total Error Codes: 200+

---

**See OpenProject Work Package**: #Error Code Catalog (complete 200+ error definitions)

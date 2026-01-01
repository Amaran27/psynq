# Canonical Event Schema Registry - Psynq CPaaS Platform

**Version**: 1.0.0
**Last Updated**: December 31, 2025
**Status**: SINGLE SOURCE OF TRUTH
**Purpose**: Complete event schemas for all domain events

---

## Event Naming Convention
`{domain}:{entity}:{action}`

Example: `call:CallCreated`, `user:UserUpdated`

---

## 1. Call Events

### CallCreated
```json
{
  "event_id": "uuid",
  "event_type": "call:CallCreated",
  "event_version": "1.0.0",
  "timestamp": "2025-12-31T12:00:00Z",
  "correlation_id": "uuid",
  "causation_id": "uuid",
  "data": {
    "call_id": "uuid",
    "organization_id": "uuid",
    "call_unique_id": "asterisk-unique-id",
    "direction": "inbound|outbound",
    "caller_number": "+15551234567",
    "callee_number": "+15559876543",
    "caller_id_name": "John Doe",
    "queue_id": "uuid",
    "agent_id": "uuid",
    "recording_enabled": true,
    "variables": {}
  },
  "metadata": {
    "user_id": "uuid",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0..."
  }
}
```

### CallAnswered
```json
{
  "event_type": "call:CallAnswered",
  "data": {
    "call_id": "uuid",
    "answered_by": "uuid",
    "answered_at": "2025-12-31T12:00:00Z",
    "ring_duration_seconds": 10
  }
}
```

### CallEnded
```json
{
  "event_type": "call:CallEnded",
  "data": {
    "call_id": "uuid",
    "ended_at": "2025-12-31T12:05:00Z",
    "duration_seconds": 300,
    "billsec_seconds": 290,
    "disposition": "answered|no_answer|busy|failed",
    "hangup_cause": "normal_clearing",
    "hangup_source": "caller|callee|system|provider"
  }
}
```

### CallRecordingCompleted
```json
{
  "event_type": "call:CallRecordingCompleted",
  "data": {
    "recording_id": "uuid",
    "call_id": "uuid",
    "file_path": "/org/{id}/calls/{id}.wav",
    "file_size_bytes": 1024000,
    "duration_seconds": 290,
    "created_at": "2025-12-31T12:05:00Z"
  }
}
```

---

## 2. User Events

### UserCreated
```json
{
  "event_type": "user:UserCreated",
  "data": {
    "user_id": "uuid",
    "organization_id": "uuid",
    "username": "john.doe",
    "email": "john.doe@example.com",
    "role": "agent",
    "full_name": "John Doe",
    "created_by": "uuid"
  }
}
```

### UserLoggedIn
```json
{
  "event_type": "user:UserLoggedIn",
  "data": {
    "user_id": "uuid",
    "login_at": "2025-12-31T12:00:00Z",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "session_id": "uuid"
  }
}
```

### UserStatusChanged
```json
{
  "event_type": "user:UserStatusChanged",
  "data": {
    "user_id": "uuid",
    "previous_status": "available",
    "new_status": "busy",
    "reason": "call_answered",
    "changed_at": "2025-12-31T12:00:00Z"
  }
}
```

---

## 3. Organization Events

### OrganizationCreated
```json
{
  "event_type": "organization:OrganizationCreated",
  "data": {
    "organization_id": "uuid",
    "slug": "acme-corp",
    "name": "Acme Corporation",
    "plan_tier": "pro",
    "max_agents": 50,
    "max_concurrent_calls": 100,
    "created_by": "uuid"
  }
}
```

### OrganizationWalletToppedUp
```json
{
  "event_type": "organization:OrganizationWalletToppedUp",
  "data": {
    "organization_id": "uuid",
    "amount_decimals": 10000,
    "previous_balance_decimals": 5000,
    "new_balance_decimals": 15000,
    "currency": "USD",
    "payment_method_id": "uuid",
    "transaction_id": "uuid",
    "topped_up_at": "2025-12-31T12:00:00Z"
  }
}
```

---

## 4. Queue Events

### QueueCreated
```json
{
  "event_type": "queue:QueueCreated",
  "data": {
    "queue_id": "uuid",
    "organization_id": "uuid",
    "name": "Sales Queue",
    "extension": "1001",
    "strategy": "longest_idle_agent",
    "max_wait_time_seconds": 120
  }
}
```

### QueueMemberAdded
```json
{
  "event_type": "queue:QueueMemberAdded",
  "data": {
    "queue_id": "uuid",
    "user_id": "uuid",
    "penalty": 0,
    "membership_type": "static",
    "added_at": "2025-12-31T12:00:00Z"
  }
}
```

### QueueCallEntered
```json
{
  "event_type": "queue:QueueCallEntered",
  "data": {
    "queue_id": "uuid",
    "call_id": "uuid",
    "caller_number": "+15551234567",
    "entered_at": "2025-12-31T12:00:00Z",
    "position": 3
  }
}
```

---

## 5. SMS Events

### SmsSent
```json
{
  "event_type": "sms:SmsSent",
  "data": {
    "sms_id": "uuid",
    "organization_id": "uuid",
    "from_number": "+15551234567",
    "to_number": "+15559876543",
    "message": "Your verification code is 123456",
    "provider": "twilio",
    "provider_message_id": "twilio-msg-id",
    "sent_at": "2025-12-31T12:00:00Z"
  }
}
```

### SmsDeliveryFailed
```json
{
  "event_type": "sms:SmsDeliveryFailed",
  "data": {
    "sms_id": "uuid",
    "error_code": "SMS_005",
    "error_message": "Provider error",
    "failed_at": "2025-12-31T12:01:00Z"
  }
}
```

---

## 6. WebRTC Events

### WebRTCRegistered
```json
{
  "event_type": "webrtc:WebRTCRegistered",
  "data": {
    "user_id": "uuid",
    "sip_endpoint": "john_doe",
    "registered_at": "2025-12-31T12:00:00Z",
    "expires_at": "2025-12-31T13:00:00Z"
  }
}
```

### WebRTCIncomingCall
```json
{
  "event_type": "webrtc:WebRTCIncomingCall",
  "data": {
    "call_id": "uuid",
    "user_id": "uuid",
    "caller_number": "+15551234567",
    "caller_id_name": "John Doe",
    "sdp_offer": "base64-sdp"
  }
}
```

---

## 7. Billing Events

### CallRated
```json
{
  "event_type": "billing:CallRated",
  "data": {
    "call_id": "uuid",
    "organization_id": "uuid",
    "duration_seconds": 300,
    "rate_per_minute_decimals": 200,
    "total_charge_decimals": 1000,
    "currency": "USD",
    "rated_at": "2025-12-31T12:05:00Z"
  }
}
```

### WalletTransactionCreated
```json
{
  "event_type": "billing:WalletTransactionCreated",
  "data": {
    "transaction_id": "uuid",
    "organization_id": "uuid",
    "type": "charge|topup|refund",
    "amount_decimals": -1000,
    "description": "Call charge",
    "reference_type": "call",
    "reference_id": "uuid",
    "balance_after_decimals": 4000
  }
}
```

---

## Event Metadata (Common to All Events)

```json
{
  "event_id": "uuid (v4)",
  "event_type": "string (format: {domain}:{entity}:{action})",
  "event_version": "string (semver)",
  "timestamp": "ISO8601 datetime",
  "correlation_id": "uuid (groups related events)",
  "causation_id": "uuid (causal chain)",
  "data": { /* event-specific data */ },
  "metadata": {
    "user_id": "uuid (actor)",
    "organization_id": "uuid (tenant)",
    "ip_address": "string",
    "user_agent": "string",
    "request_id": "uuid",
    "trace_id": "uuid (distributed tracing)"
  }
}
```

---

## Event Publishing Guidelines

### 1. Event Ordering
- Events MUST be published in causal order
- Use `causation_id` to track causal chains
- Use `correlation_id` to group related events

### 2. Event Idempotency
- Events MUST be idempotent (same event_id processed once)
- Event consumers MUST deduplicate by event_id

### 3. Event Schema Evolution
- Event schemas follow semver (1.0.0, 1.1.0, 2.0.0)
- Backward compatible changes: Minor version bump
- Breaking changes: Major version bump
- Consumers MUST specify supported version

### 4. Event Retention
- Events retained for 90 days in hot storage
- Archived to cold storage after 90 days
- Critical events (billing, audit) retained for 7 years

---

## Total Events: 50+

---

**See OpenProject Work Package**: #Event Schema Registry (complete 50+ event definitions)

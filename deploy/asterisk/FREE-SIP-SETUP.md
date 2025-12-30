# Free SIP Trunk Setup Guide - Call Real Mobile Numbers!

## 🎯 Goal: Test Asterisk & WebRTC by calling real phones without expensive services

---

## **Option A: Zadarma (FREE Test Calls - RECOMMENDED)**

### ✅ Pros:
- **No credit card** required for testing
- **10-20 free calls** to real mobile numbers
- Immediate activation
- Works in 100+ countries

### 📝 Setup Steps:

#### 1. Sign Up (2 minutes)
1. Go to: https://zadarma.com/en/signup/
2. Register with email (no payment needed)
3. Confirm your email

#### 2. Get SIP Credentials (1 minute)
1. Login to Zadarma dashboard
2. Go to: **Settings** → **SIP Settings**
3. Note down:
   - **SIP Server**: sip.zadarma.com
   - **SIP Username**: Your numeric ID (e.g., 1234567)
   - **SIP Password**: Click "Show" to reveal

#### 3. Configure Asterisk
Edit: `deploy/asterisk/asterisk-config/pjsip.d/zadarma-trunk.conf`

```ini
; REPLACE THESE 3 VALUES:
[aor-zadarma]
type=aor
contact=sip:YOUR_ZADARMA_SIP_USER@sip.zadarma.com  ; ← Put your numeric ID here

[auth-zadarma]
type=auth
auth_type=userpass
password=YOUR_ZADARMA_SIP_PASSWORD  ; ← Your SIP password
username=YOUR_ZADARMA_SIP_USER      ; ← Your numeric ID again
```

#### 4. Restart Asterisk
```powershell
docker-compose restart asterisk
```

#### 5. Test Outbound Call
```powershell
# Enter Asterisk container
docker exec -it psynq-asterisk asterisk -rvvv

# Test call to your mobile (use international format)
channel originate PJSIP/+1234567890@zadarma-trunk application echo

; Replace +1234567890 with your actual mobile number
; Include country code: +1 for US/Canada, +44 for UK, +91 for India, etc.
```

---

## **Option B: Localphone (CHEAPEST Pay-As-You-Go)**

### ✅ Pros:
- **No monthly fees**
- **Very low rates**: ~$0.005/min (200 minutes = $1!)
- **Minimum deposit**: $10 (lasts months for testing)
- High call quality

### 📝 Setup Steps:

#### 1. Sign Up
1. Go to: https://www.localphone.com/
2. Register ($10 minimum deposit via PayPal/card)
3. Deposit lasts for months of testing

#### 2. Get SIP Credentials
1. Login → **Account** → **SIP Settings**
2. Note down:
   - **SIP Server**: sip.localphone.com
   - **SIP Username**: Your SIP ID
   - **SIP Password**: Click to reveal

#### 3. Configure Asterisk
Edit: `deploy/asterisk/asterisk-config/pjsip.d/zadarma-trunk.conf`

Update the `[localphone-trunk]` section:
```ini
[aor-localphone]
type=aor
contact=sip:YOUR_LOCALPHONE_SIP_ID@sip.localphone.com

[auth-localphone]
type=auth
auth_type=userpass
password=YOUR_LOCALPHONE_PASSWORD
username=YOUR_LOCALPHONE_SIP_ID
```

#### 4. Update Dialplan
Edit: `deploy/asterisk/asterisk-config/extensions.conf`

Change the provider from `zadarma` to `localphone`:
```ini
exten => _+1X.,1,NoOp(North America outbound call to ${EXTEN})
 same => n,Set(PROVIDER=localphone)  ; ← Change this
 same => n,Goto(place-call,${EXTEN},1)
```

#### 5. Restart & Test
```powershell
docker-compose restart asterisk
docker exec -it psynq-asterisk asterisk -rvvv
channel originate PJSIP/+1234567890@localphone-trunk application echo
```

---

## **Quick Verification Commands**

### Check if Trunk is Registered:
```bash
docker exec -it psynq-asterisk asterisk -rx "pjsip show registrations"
```

Expected output:
```
<Registrator/Server..............................> State..........Username
================================================================================
sip.zadarma.com:5060..........................................Registered......1234567
```

### Check Trunk Status:
```bash
docker exec -it psynq-asterisk asterisk -rx "pjsip show endpoints"
```

### View Active Calls:
```bash
docker exec -it psynq-asterisk asterisk -rx "core show channels"
```

---

## **Testing WebRTC Browser Client**

Once the trunk works, test your WebRTC UI:

### 1. Start Backend
```powershell
cd d:\Project\psitrix\psynq
.\scripts\dev-up.ps1
```

### 2. Open Browser
Navigate to: http://localhost:3000

### 3. Make Test Call
- Use your WebRTC softphone in the UI
- Dial: `+1234567890` (your mobile)
- Should ring your actual phone!

---

## **Troubleshooting**

### ❌ "Registration Failed"
- **Check**: SIP username/password are correct
- **Check**: Firewall allows port 5060 UDP
- **Fix**: `docker logs psynq-asterisk` to see errors

### ❌ "Call Failed - 403 Forbidden"
- **Check**: Your account has credit/s remaining
- **Check**: Number format is correct (+countrycode)
- **Fix**: Try Zadarma's free test tier first

### ❌ "No Audio"
- **Check**: RTP ports 10000-10100 are open
- **Check**: `pjsip.conf` has `media_address=YOUR_PUBLIC_IP`
- **Fix**: Ensure NAT is configured correctly

### ❌ "SIP2SIP Not Working"
- **Reason**: SIP2SIP service is deprecated/unreliable
- **Solution**: Use Zadarma or Localphone instead

---

## **Cost Comparison (Calling US Mobile)**

| Provider      | Cost/min | Free Calls | Setup Time |
|---------------|----------|------------|------------|
| **Zadarma**   | $0.03    | 10-20 free | 5 min      |
| **Localphone**| $0.005   | None       | 5 min      |
| **Twilio**    | $0.013   | $15 credit | 10 min     |
| **SIP2SIP**   | Free     | SIP only   | Not working|

---

## **Recommended Testing Flow**

### Step 1: Verify Trunk Registration (Asterisk CLI)
```bash
docker exec -it psynq-asterisk asterisk -rx "pjsip show registrations"
```
✅ Should show "Registered"

### Step 2: Test Echo Call (Asterisk CLI)
```bash
docker exec -it psynq-asterisk asterisk -rvvv
> channel originate PJSIP/+1234567890@zadarma-trunk application echo
```
✅ Should call your phone and echo back what you say

### Step 3: Test WebRTC UI
1. Open: http://localhost:3000
2. Login with agent credentials (alice/alice123)
3. Dial your mobile: `+1234567890`
4. Should ring your actual phone!

### Step 4: Test Inbound (Optional)
If you buy a DID number (~$1/month):
1. Configure inbound routing in `extensions.conf`
2. Call your DID from mobile
3. Should route to your WebRTC agent!

---

## **Next Steps**

Once SIP trunk is working:
- ✅ Test WebRTC browser → Asterisk → PSTN
- ✅ Test inbound calls (if you have a DID number)
- ✅ Test call recording
- ✅ Test agent-to-agent internal calls (1001 → 1002)

---

## **Questions?**

Check logs:
```powershell
docker logs psynq-asterisk --tail 100 -f
```

Enable SIP debugging:
```bash
docker exec -it psynq-asterisk asterisk -rx "pjsip set logger on"
```

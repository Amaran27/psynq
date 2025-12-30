# Twilio SIP Trunk Setup Guide (Free Trial Account)

## ✅ TWILIO FREE TRIAL FACTS

**YES - You CAN use SIP Trunking on Twilio's free trial!**

- ✅ Get 1 free SIP trunk automatically
- ✅ Can make **real calls to mobile numbers**
- ✅ $15 free credit for testing
- ❌ Can ONLY call **verified phone numbers**
- ❌ Max 10 minutes per call
- ❌ Max 4 concurrent calls
- ❌ Plays "trial account" message

---

## 📋 STEP-BY-STEP SETUP

### Step 1: Get Your Twilio Account Details

1. **Sign up/Login**: https://www.twilio.com/try-twilio
2. **Get your Account SID and Auth Token**:
   - Go to Console: https://console.twilio.com
   - Copy "Account SID" (starts with AC...)
   - Click "Show" to copy "Auth Token"

### Step 2: Verify Your Mobile Number (REQUIRED on Free Trial)

1. **Go to**: https://console.twilio.com/us1/develop/phone-numbers/manage/verified
2. **Click**: "+ Add a new Verified Caller ID"
3. **Enter**: Your mobile number (with country code, e.g., +919876543210)
4. **Select**: "Verify via SMS" or "Verify via Call"
5. **Enter**: The verification code you receive
6. **Result**: Your number is now verified!

⚠️ **IMPORTANT**: On free trial, you can ONLY call verified numbers!

### Step 3: Create SIP Trunk

1. **Go to**: https://console.twilio.com/us1/develop/sip/trunking
2. **Click**: "Create new SIP Trunk" (or use existing one)
3. **Name**: `psynq-asterisk-trunk`
4. **Click**: "Create"

### Step 4: Configure Credential List

1. **In your SIP Trunk**, click "Credentials" tab
2. **Under "Credential Lists"**, click "Create Credential List"
3. **Name**: `asterisk-credentials`
4. **Username**: `psynq-user` (or choose your own)
5. **Password**: Generate a strong password (e.g., `SecurePass123!`)
6. **Click**: "Create"

**Save these credentials - you'll need them!**
- Username: `__________________`
- Password: `__________________`

### Step 5: Configure IP Access Control List

1. **Still in "Credentials" tab**, go to "IP Access Control Lists"
2. **Click**: "Create IP Access Control List"
3. **Name**: `asterisk-ip-acl`
4. **IP Address**: Your public IP address
   - **Find your public IP**: Visit https://ifconfig.me or run `curl ifconfig.me`
   - **Enter IP**: `__________________`
5. **Click**: "Create"

### Step 6: Link Credentials to SIP Trunk

1. **In your SIP Trunk**, go to "Settings" tab
2. **Under "Termination"**:
   - **Credential List**: Select `asterisk-credentials`
   - **IP Access Control List**: Select `asterisk-ip-acl`
3. **Click**: "Save"

### Step 7: Get Your SIP Domain

1. **In your SIP Trunk**, go to "Settings" tab
2. **Find "SIP URI"** (e.g., `TKxxxxx.pstn.twilio.com`)
3. **Copy this domain**: `__________________`

This is your **SIP Domain** (not the full URI, just the domain part).

---

## 🔧 CONFIGURE ASTERISK

### Option A: Automatic Configuration (Recommended)

Run the setup script:

```powershell
# From project root
cd scripts
.\setup-twilio.ps1
```

### Option B: Manual Configuration

1. **Edit**: `deploy/asterisk/asterisk-config/pjsip.d/twilio-trunk.conf`

2. **Replace the placeholders**:

```ini
[twilio-trunk]
type=endpoint
from_domain=TKxxxxx.pstn.twilio.com           ; Your SIP Domain

[twilio-auth]
type=auth
username=psynq-user                            ; Your Credential List username
password=SecurePass123!                        ; Your Credential List password

[twilio-aor]
type=aor
contact=sip:TKxxxxx.pstn.twilio.com            ; Your SIP Domain

[twilio-identify]
type=identify
match=TKxxxxx.pstn.twilio.com                  ; Your SIP Domain
endpoint=twilio-trunk

[twilio-registration]
type=registration
server_uri=sip:TKxxxxx.pstn.twilio.com         ; Your SIP Domain
client_uri=sip:psynq-user@TKxxxxx.pstn.twilio.com ; username@domain
outbound_auth=twilio-auth
```

3. **Save the file**

---

## 🚀 START AND TEST

### 1. Restart Asterisk

```powershell
cd d:\Project\psitrix\psynq
docker-compose restart asterisk
```

### 2. Check Registration Status

```bash
docker exec -it psynq-asterisk asterisk -rx "pjsip show registrations"
```

**Expected output**:
```
<Reg./ContactURI............................> State       <Status..........................>
[twilio-registration] sip:psynq-user@TKxxxxx.pstn.twilio.com Registered        Sent reg: 200
```

✅ **If "Registered"** - Great! Proceed to testing.
❌ **If "Rejected" or "Sent"** - Check credentials and IP ACL.

### 3. Test Outbound Call

**Method 1: Asterisk CLI (Quick Test)**

```bash
# Replace with YOUR VERIFIED mobile number (with + and country code)
docker exec -it psynq-asterisk asterisk -rx "channel originate PJSIP/+919876543210@twilio-trunk application echo"
```

**Method 2: From Softphone/WebRTC**

1. Register your SIP client (agent 1000)
2. Dial your verified mobile number: `+919876543210`

**What to expect:**
- Phone should ring
- When you answer, hear "Trial account" message
- Then hear echo (if using Echo app) or connect to call

---

## 🔍 TROUBLESHOOTING

### Registration Fails (Status: "Rejected")

**Possible causes**:
1. ❌ Wrong username/password
   - Check Credential List in Twilio Console
   - Ensure credentials match `twilio-trunk.conf`

2. ❌ IP not in ACL
   - Verify your public IP is added to IP Access Control List
   - Check current IP: `curl ifconfig.me`

3. ❌ Transport issues
   - Ensure UDP port 5060 is open outbound
   - Check firewall settings

**Debug commands**:
```bash
# Enable SIP debugging
docker exec -it psynq-asterisk asterisk -rx "pjsip set logger on"

# Check logs
docker logs psynq-asterisk --tail 100
```

### Call Fails (No audio, one-way audio, or doesn't ring)

**Possible causes**:
1. ❌ RTP ports blocked
   - Open ports 10000-10100 UDP in your firewall/router

2. ❌ NAT issues
   - Ensure `external_media_address` in `pjsip.conf` is your public IP
   - Configure STUN server

3. ❌ Codec mismatch
   - Twilio uses G.711 (ulaw/alaw)
   - Verify codecs are allowed in endpoint config

### "403 Forbidden" Error

- Destination number is not verified
- Verify the number in Twilio Console first!

---

## 📞 TESTING CHECKLIST

- [ ] Account created and credentials obtained
- [ ] Mobile number verified in Twilio Console
- [ ] SIP Trunk created
- [ ] Credential List created (username/password saved)
- [ ] IP Access Control List created with your public IP
- [ ] Credentials linked to SIP Trunk
- [ ] SIP Domain obtained
- [ ] Asterisk config updated with credentials
- [ ] Asterisk restarted
- [ ] Registration shows "Registered" status
- [ ] Test outbound call to verified number
- [ ] Call connects successfully

---

## 🎯 NEXT STEPS

### Once Twilio is Working:

1. **Test inbound calls**:
   - Configure your Twilio phone number to send calls to your SIP trunk
   - Set webhook URL to your server

2. **Test from your UI**:
   - Start backend: `docker-compose up backend`
   - Start web: `docker-compose up web`
   - Login and make call from softphone

3. **Upgrade when ready**:
   - When ready for production, upgrade account
   - Removes verification requirement
   - Removes 10-minute call limit
   - Increases concurrent calls

---

## 📚 USEFUL LINKS

- Twilio Console: https://console.twilio.com
- SIP Trunking Docs: https://www.twilio.com/docs/sip-trunking
- Free Trial Limitations: https://help.twilio.com/articles/360036052753
- Verify Numbers: https://console.twilio.com/us1/develop/phone-numbers/manage/verified

---

## 💡 TIP

**Want to skip phone verification?** Use these free alternatives:

1. **Zadarma** - 10-20 free test calls, no credit card
2. **Localphone** - Pay-as-you-go, $10 minimum, very cheap rates
3. **Internal extensions** - Call 1000, 1001 between browsers (free!)

See: [deploy/asterisk/README.md](../deploy/asterisk/README.md) for other provider configs.

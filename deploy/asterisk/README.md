# Asterisk Configuration for Psynq

This directory contains the Asterisk configuration files for the Psynq contact center platform.

## Configuration Overview

### Core Configuration Files

1. **pjsip.conf** - PJSIP endpoint and transport configuration
   - Twilio SIP trunk settings
   - WebRTC transport for browser clients
   - Authentication settings

2. **extensions.conf** - Dialplan logic
   - IVR menus
   - Call routing rules
   - Queue configuration
   - Outbound call routing

3. **http.conf** - HTTP server configuration
   - ARI (Asterisk REST Interface) settings
   - TLS configuration

4. **ari.conf** - ARI application configuration
   - Application: psynq-app
   - Authentication credentials

### Supporting Configuration

5. **sip.conf** - Legacy SIP configuration (for compatibility)
6. **rtp.conf** - RTP media stream settings
7. **musiconhold.conf** - Music on hold classes
8. **logger.conf** - Logging configuration
9. **cel.conf** - Channel event logging

## Setup Instructions

### 1. Configure Twilio SIP Trunk

1. Log in to Twilio Console
2. Navigate to Elastic SIP Trunking
3. Create a new trunk with:
   - Termination URI: `{your-domain}.pstn.twilio.com`
   - Configure IP ACL with your server's public IP
   - Set up Credential List with username/password

### 2. Update Configuration Files

Replace the placeholder values in the config files:

1. In `pjsip.conf`:
   - `your-domain.pstn.twilio.com` - Your Twilio SIP trunk domain
   - `your_twilio_username` - Twilio SIP trunk username
   - `your_twilio_password` - Twilio SIP trunk password
   - `YOUR_PUBLIC_IP` - Your server's public IP address

2. In `http.conf` and `ari.conf`:
   - Update `localhost` if needed for your Docker network

### 3. Generate SSL Certificates

For WebRTC and ARI security, generate SSL certificates:

```bash
cd /etc/asterisk/keys
openssl req -new -newkey rsa:2048 -nodes -keyout asterisk.key -out asterisk.csr
openssl x509 -req -days 365 -in asterisk.csr -signkey asterisk.key -out asterisk.crt
```

### 4. Test Configuration

1. Start Asterisk: `docker-compose up -d`
2. Check logs: `docker logs psynq-asterisk`
3. Connect to CLI: `docker exec -it psynq-asterisk asterisk -rvvv`
4. Verify modules: `module show` or `core show applications`

### 5. Verify SIP Registration

In the Asterisk CLI:
```
pjsip show registrations
pjsip show endpoints
```

### 6. Test Call Flow

1. Outbound: `channel originate PJSIP/+1234567890@twilio-trunk application echo`
2. Monitor: `pjsip set logger on`
3. Check RTP: `rtp set debug on`

## WebRTC Configuration

For WebRTC to work properly:

1. Ensure ports 8089 (WSS) and 10000-10100 (RTP) are open
2. Configure public IP in `pjsip.conf`
3. Set up SSL certificates for WSS transport
4. Configure STUN/TURN servers if behind NAT

## Monitoring

Key commands for monitoring:

- `core show channels` - Active channels
- `core show uptime` - System uptime
- `pjsip show endpoints` - Registered endpoints
- `queue show` - Queue status
- `stun show` - STUN statistics

## Troubleshooting

Common issues:

1. **SIP Registration Fails**
   - Check credentials
   - Verify firewall allows port 5060
   - Check network connectivity

2. **No Audio (One-way or Two-way)**
   - Verify RTP ports (10000-10100) are open
   - Check NAT configuration
   - Verify STUN/TURN settings

3. **WebRTC Connection Fails**
   - Check WSS port (8089) accessibility
   - Verify SSL certificates
   - Check browser console for errors

## Integration with Backend

The backend connects to Asterisk via:

1. **ARI (Asterisk REST Interface)**
   - Port: 8088 (HTTPS)
   - Application: psynq-app
   - Used for: Call control, channel manipulation

2. **AMI (Asterisk Manager Interface)**
   - Port: 5038 (optional)
   - Used for: System monitoring, status checks

## File Structure

```
asterisk-config/
├── pjsip.conf          # PJSIP configuration (primary)
├── extensions.conf      # Dialplan logic
├── http.conf           # HTTP/ARI server
├── ari.conf            # ARI application
├── sip.conf            # Legacy SIP compatibility
├── rtp.conf            # RTP media settings
├── musiconhold.conf    # MOH classes
├── logger.conf         # Logging configuration
├── cel.conf            # Channel event logging
└── README.md           # This file
```
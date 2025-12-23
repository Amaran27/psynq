# Production Setup Guide

## Configuration Required for Production

This document lists all the placeholder values that need to be replaced with real values for production deployment.

### 1. Twilio SIP Trunk Configuration

File: `asterisk-config/pjsip.d/twilio-trunk.conf`

Replace these placeholders:
- `YOUR_TWILIO_DOMAIN` - Your Twilio SIP Domain (e.g., `example.pstn.twilio.com`)
- `YOUR_TWILIO_USERNAME` - Your Twilio SIP username
- `YOUR_TWILIO_PASSWORD` - Your Twilio SIP password
- `YOUR_PUBLIC_IP` - Your server's public IP address

### 2. WebRTC Configuration

File: `asterisk-config/pjsip.conf`

Update these values:
- `YOUR_PUBLIC_IP` - Your server's public IP address (line with `media_address=`)
- Uncomment and update certificate paths after generating SSL certificates:
  - `dtls_cert_file=/etc/asterisk/keys/asterisk.crt`
  - `dtls_private_key=/etc/asterisk/keys/asterisk.key`

### 3. HTTP/ARI Configuration

File: `asterisk-config/http.conf`

Update these values:
- Uncomment and update certificate paths after generating SSL certificates:
  - `tlscertfile=/etc/asterisk/keys/asterisk.crt`
  - `tlsprivatekey=/etc/asterisk/keys/asterisk.key`
- Uncomment and update allowed origins with your actual URLs:
  - `alloworigin=http://your-backend-url`
  - `alloworigin=http://your-frontend-url`

### 4. TLS Transport Configuration

File: `asterisk-config/pjsip.conf`

After generating SSL certificates:
- Uncomment `cert_file=/etc/asterisk/keys/asterisk.crt`
- Uncomment `priv_key_file=/etc/asterisk/keys/asterisk.key`

### 5. SSL Certificate Generation

Generate self-signed certificates or use certificates from a trusted CA:

```bash
# Create certificate directory
mkdir -p /etc/asterisk/keys

# Generate private key
openssl genrsa -out /etc/asterisk/keys/asterisk.key 2048

# Generate certificate signing request
openssl req -new -key /etc/asterisk/keys/asterisk.key -out /etc/asterisk/keys/asterisk.csr

# Generate self-signed certificate
openssl x509 -req -days 365 -in /etc/asterisk/keys/asterisk.csr -signkey /etc/asterisk/keys/asterisk.key -out /etc/asterisk/keys/asterisk.crt

# Set proper permissions
chmod 600 /etc/asterisk/keys/asterisk.key
chmod 644 /etc/asterisk/keys/asterisk.crt
```

### 6. Firewall Configuration

Ensure these ports are open:
- 5060/udp - SIP
- 5061/tcp - SIP TLS
- 8088/tcp - ARI HTTP
- 8089/tcp - WebRTC WSS
- 10000-10100/udp - RTP media

### 7. Deployment Steps

1. Update all placeholder values with your actual configuration
2. Generate SSL certificates
3. Update firewall rules
4. Restart Asterisk: `docker-compose restart`
5. Verify PJSIP trunk registration: `docker exec psynq-asterisk asterisk -rx "pjsip show registrations"`
6. Test outbound calling to verify Twilio connectivity
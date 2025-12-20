#!/bin/bash

# Migration script to move from multi-provider to Asterisk-centric architecture
echo "======================================"
echo "Psynq Migration to Asterisk-Centric"
echo "======================================"

# Phase 1: Backup current configuration
echo -e "\n[Phase 1] Backing up current configuration..."
mkdir -p backup/$(date +%Y%m%d_%H%M%S)
cp -r packages/backend/src/adapters/infobip* backup/$(date +%Y%m%d_%H%M%S)/
echo "✓ Backup completed"

# Phase 2: Clean up obsolete code
echo -e "\n[Phase 2] Moving obsolete code to temp folder..."
# Already done manually
echo "✓ Obsolete code moved to temp/obsolete/"

# Phase 3: Start Asterisk
echo -e "\n[Phase 3] Starting Asterisk..."
cd deploy/asterisk
docker-compose down
docker-compose up -d
echo "✓ Asterisk starting..."

# Phase 4: Verify Asterisk is running
echo -e "\n[Phase 4] Verifying Asterisk status..."
sleep 10
if docker ps | grep psynq-asterisk; then
    echo "✓ Asterisk is running"
else
    echo "✗ Asterisk failed to start"
    exit 1
fi

# Phase 5: Instructions for next steps
echo -e "\n[Next Steps]"
echo "1. Configure Twilio SIP trunking in Twilio Console"
echo "2. Update credentials in deploy/asterisk/asterisk-config/pjsip.conf"
echo "3. Test SIP registration: docker exec -it psynq-asterisk asterisk -rx 'pjsip show registrations'"
echo "4. Test outbound call: docker exec -it psynq-asterisk asterisk -rx \"channel originate PJSIP/+1234567890@twilio-trunk application echo\""

echo -e "\nMigration script completed!"
echo "======================================"
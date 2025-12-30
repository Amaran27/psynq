#!/bin/bash
# Asterisk SIP Trunk Test Script
# Run this to verify your SIP trunk configuration

echo "=========================================="
echo "  Asterisk SIP Trunk Test Script"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 Step 1: Checking Asterisk container status..."
if docker ps | grep -q psynq-asterisk; then
    echo -e "${GREEN}✅ Asterisk container is running${NC}"
else
    echo -e "${RED}❌ Asterisk container is NOT running${NC}"
    echo "   Start it with: docker-compose up -d asterisk"
    exit 1
fi

echo ""
echo "📋 Step 2: Checking PJSIP module..."
if docker exec psynq-asterisk asterisk -rx "module show like res_pjsip.so" | grep -q "Running"; then
    echo -e "${GREEN}✅ PJSIP module is loaded${NC}"
else
    echo -e "${RED}❌ PJSIP module is NOT loaded${NC}"
    exit 1
fi

echo ""
echo "📋 Step 3: Checking PJSIP endpoints..."
docker exec psynq-asterisk asterisk -rx "pjsip show endpoints"

echo ""
echo "📋 Step 4: Checking SIP registrations..."
REGISTRATIONS=$(docker exec psynq-asterisk asterisk -rx "pjsip show registrations")
echo "$REGISTRATIONS"

if echo "$REGISTRATIONS" | grep -q "Registered"; then
    echo -e "${GREEN}✅ SIP trunk is REGISTERED${NC}"
else
    echo -e "${YELLOW}⚠️  No SIP registrations found${NC}"
    echo "   This is normal if you haven't configured credentials yet"
    echo "   Edit: deploy/asterisk/asterisk-config/pjsip.d/zadarma-trunk.conf"
fi

echo ""
echo "📋 Step 5: Checking active channels..."
CHANNELS=$(docker exec psynq-asterisk asterisk -rx "core show channels")
ACTIVE_COUNT=$(echo "$CHANNELS" | grep "active calls" | awk '{print $1}')
echo "Active calls: $ACTIVE_COUNT"

echo ""
echo "=========================================="
echo "  Test Options:"
echo "=========================================="
echo ""
echo "1️⃣  Test outbound call to mobile (REPLACE +1234567890 with your number):"
echo "   docker exec -it psynq-asterisk asterisk -rvvv"
echo "   channel originate PJSIP/+1234567890@zadarma-trunk application echo"
echo ""
echo "2️⃣  Test internal extension call:"
echo "   docker exec -it psynq-asterisk asterisk -rvvv"
echo "   channel originate PJSIP/1001 application echo"
echo ""
echo "3️⃣  View Asterisk logs:"
echo "   docker logs psynq-asterisk --tail 50 -f"
echo ""
echo "4️⃣  Enable SIP debugging:"
echo "   docker exec -it psynq-asterisk asterisk -rx 'pjsip set logger on'"
echo ""
echo "=========================================="
echo "✅ Script complete!"
echo "=========================================="

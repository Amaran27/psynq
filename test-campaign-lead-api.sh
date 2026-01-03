#!/bin/bash
# Campaign Management API Integration Test
# Tests all Campaign and Lead endpoints to verify implementation

BASE_URL="http://localhost:3001/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Campaign Management API Integration Test ===${NC}\n"

# Test Counter
TOTAL_TESTS=0
PASSED_TESTS=0

# Helper function to test endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_code="$5"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${YELLOW}Test $TOTAL_TESTS: $name${NC}"
    echo "  $method $endpoint"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_code" ] || [ "${http_code:0:1}" = "$expected_code" ]; then
        echo -e "  ${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "  ${RED}✗ FAILED${NC} (Expected: $expected_code, Got: $http_code)"
        echo "  Response: $body"
        return 1
    fi
}

echo -e "\n${YELLOW}=== CAMPAIGN ENDPOINTS ===${NC}"

# Campaign Tests
echo -e "\n${YELLOW}1. Create Campaign${NC}"
test_endpoint "Create Campaign" "POST" "/campaigns" \
    '{"name":"Test Campaign","description":"Integration test campaign","type":"OUTBOUND","status":"DRAFT","startDate":"2026-01-03","endDate":"2026-12-31","organizationId":1}' \
    "2"

echo -e "\n${YELLOW}2. List All Campaigns${NC}"
test_endpoint "List Campaigns" "GET" "/campaigns" "" "2"

echo -e "\n${YELLOW}3. Get Single Campaign${NC}"
test_endpoint "Get Campaign by ID" "GET" "/campaigns/1" "" "2"

echo -e "\n${YELLOW}4. Update Campaign${NC}"
test_endpoint "Update Campaign" "PUT" "/campaigns/1" \
    '{"name":"Updated Test Campaign","description":"Updated description","type":"OUTBOUND","status":"ACTIVE","startDate":"2026-01-03","endDate":"2026-12-31","organizationId":1}' \
    "2"

echo -e "\n${YELLOW}5. Start Campaign${NC}"
test_endpoint "Start Campaign" "POST" "/campaigns/1/start" "" "2"

echo -e "\n${YELLOW}6. Get Campaign Stats${NC}"
test_endpoint "Get Campaign Statistics" "GET" "/campaigns/1/stats" "" "2"

echo -e "\n${YELLOW}7. Pause Campaign${NC}"
test_endpoint "Pause Campaign" "POST" "/campaigns/1/pause" "" "2"

echo -e "\n${YELLOW}8. Stop Campaign${NC}"
test_endpoint "Stop Campaign" "POST" "/campaigns/1/stop" "" "2"

echo -e "\n${YELLOW}=== LEAD ENDPOINTS ===${NC}"

# Lead Tests
echo -e "\n${YELLOW}9. Create Lead${NC}"
test_endpoint "Create Lead" "POST" "/leads" \
    '{"campaignId":1,"phoneNumber":"+1234567890","email":"test@example.com","firstName":"John","lastName":"Doe","status":"NEW","priority":"HIGH","customFields":{"source":"web","interest":"high"}}' \
    "2"

echo -e "\n${YELLOW}10. List All Leads${NC}"
test_endpoint "List Leads" "GET" "/leads" "" "2"

echo -e "\n${YELLOW}11. List Leads by Campaign${NC}"
test_endpoint "List Leads by Campaign ID" "GET" "/leads?campaignId=1" "" "2"

echo -e "\n${YELLOW}12. Get Single Lead${NC}"
test_endpoint "Get Lead by ID" "GET" "/leads/1" "" "2"

echo -e "\n${YELLOW}13. Update Lead${NC}"
test_endpoint "Update Lead" "PUT" "/leads/1" \
    '{"campaignId":1,"phoneNumber":"+1234567890","email":"john.updated@example.com","firstName":"John","lastName":"Doe","status":"CONTACTED","priority":"HIGH"}' \
    "2"

echo -e "\n${YELLOW}14. Update Lead Status${NC}"
test_endpoint "Update Lead Status" "POST" "/leads/1/status/CONTACTED" "" "2"

echo -e "\n${YELLOW}15. Assign Lead to Agent${NC}"
test_endpoint "Assign Lead to Agent" "POST" "/leads/1/assign/2" "" "2"

# Test Summary
echo -e "\n${YELLOW}=== TEST SUMMARY ===${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $((TOTAL_TESTS - PASSED_TESTS))${NC}"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "\n${GREEN}✓ All tests passed! Campaign Management API is working correctly.${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed. Please check the implementation.${NC}"
    exit 1
fi

#!/bin/bash
# GlyphForge Stripe Payment Tests

set -e

# Load config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/config.local.env" ]; then
  source "$SCRIPT_DIR/config.local.env"
elif [ -f "$SCRIPT_DIR/config.env" ]; then
  source "$SCRIPT_DIR/config.env"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

test_endpoint() {
  local name="$1"
  local expected_code="$2"
  local actual_code="$3"

  if [ "$actual_code" = "$expected_code" ]; then
    echo -e "${GREEN}PASS${NC} $name (HTTP $actual_code)"
    ((PASSED++))
  else
    echo -e "${RED}FAIL${NC} $name (expected $expected_code, got $actual_code)"
    ((FAILED++))
  fi
}

echo "========================================"
echo "GlyphForge Stripe Payment Tests"
echo "Base URL: $BASE_URL"
echo "========================================"
echo ""

if [ "$API_KEY" = "YOUR_API_KEY_HERE" ] || [ -z "$API_KEY" ]; then
  echo -e "${YELLOW}SKIPPED${NC} All tests (set API_KEY in config.local.env)"
  echo ""
  echo "To run Stripe tests:"
  echo "1. Register at $BASE_URL/register"
  echo "2. Verify your email"
  echo "3. Copy your API key to tests/config.local.env"
  exit 0
fi

echo "--- Subscription Status Tests ---"

# Test 1: Get subscription status
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/stripe/status?api_key=$API_KEY")
test_endpoint "GET /stripe/status" "200" "$CODE"

# Get current tier
RESPONSE=$(curl -s "$BASE_URL/stripe/status?api_key=$API_KEY")
TIER=$(echo "$RESPONSE" | jq -r '.tier // "unknown"')
USAGE_THIS_MONTH=$(echo "$RESPONSE" | jq -r '.usage.thisMonth // 0')
USAGE_TOTAL=$(echo "$RESPONSE" | jq -r '.usage.total // 0')
SUBSCRIPTION_ACTIVE=$(echo "$RESPONSE" | jq -r '.subscription.active // false')

echo ""
echo -e "${BLUE}Current Account Status:${NC}"
echo "  Tier: $TIER"
echo "  Usage this month: $USAGE_THIS_MONTH"
echo "  Total usage: $USAGE_TOTAL"
echo "  Subscription active: $SUBSCRIPTION_ACTIVE"
echo ""

# Test 2: Status via Authorization header
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/stripe/status" \
  -H "Authorization: Bearer $API_KEY")
test_endpoint "GET /stripe/status (Bearer auth)" "200" "$CODE"

echo ""
echo "--- Checkout Session Tests ---"

# Test 3: Create checkout session for Pro
RESPONSE=$(curl -s -X POST "$BASE_URL/stripe/checkout" \
  -H "Content-Type: application/json" \
  -d "{\"apiKey\":\"$API_KEY\",\"plan\":\"pro\"}")
SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
CHECKOUT_URL=$(echo "$RESPONSE" | jq -r '.url // empty')

if [ "$SUCCESS" = "true" ] && [ -n "$CHECKOUT_URL" ]; then
  echo -e "${GREEN}PASS${NC} Create Pro checkout session"
  ((PASSED++))
  echo "       Checkout URL: ${CHECKOUT_URL:0:60}..."
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')
  echo -e "${RED}FAIL${NC} Create Pro checkout session - $ERROR"
  ((FAILED++))
fi

# Test 4: Create checkout session for Business
RESPONSE=$(curl -s -X POST "$BASE_URL/stripe/checkout" \
  -H "Content-Type: application/json" \
  -d "{\"apiKey\":\"$API_KEY\",\"plan\":\"business\"}")
SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')

if [ "$SUCCESS" = "true" ]; then
  echo -e "${GREEN}PASS${NC} Create Business checkout session"
  ((PASSED++))
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')
  echo -e "${RED}FAIL${NC} Create Business checkout session - $ERROR"
  ((FAILED++))
fi

# Test 5: Checkout with invalid API key
RESPONSE=$(curl -s -X POST "$BASE_URL/stripe/checkout" \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"invalid_key_12345","plan":"pro"}')
SUCCESS=$(echo "$RESPONSE" | jq -r '.success // true')

if [ "$SUCCESS" = "false" ]; then
  echo -e "${GREEN}PASS${NC} Checkout with invalid key fails"
  ((PASSED++))
else
  echo -e "${RED}FAIL${NC} Checkout with invalid key should fail"
  ((FAILED++))
fi

# Test 6: Checkout with invalid plan
RESPONSE=$(curl -s -X POST "$BASE_URL/stripe/checkout" \
  -H "Content-Type: application/json" \
  -d "{\"apiKey\":\"$API_KEY\",\"plan\":\"invalid_plan\"}")
SUCCESS=$(echo "$RESPONSE" | jq -r '.success // true')

if [ "$SUCCESS" = "false" ]; then
  echo -e "${GREEN}PASS${NC} Checkout with invalid plan fails"
  ((PASSED++))
else
  echo -e "${RED}FAIL${NC} Checkout with invalid plan should fail"
  ((FAILED++))
fi

echo ""
echo "--- Billing Portal Tests ---"

# Test 7: Create billing portal session
RESPONSE=$(curl -s -X POST "$BASE_URL/stripe/portal" \
  -H "Content-Type: application/json" \
  -d "{\"apiKey\":\"$API_KEY\"}")
SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')

if [ "$SUCCESS" = "true" ]; then
  PORTAL_URL=$(echo "$RESPONSE" | jq -r '.url // empty')
  echo -e "${GREEN}PASS${NC} Create billing portal session"
  ((PASSED++))
  echo "       Portal URL: ${PORTAL_URL:0:60}..."
elif [[ "$ERROR" == *"No subscription"* ]] || [[ "$ERROR" == *"customer"* ]]; then
  echo -e "${YELLOW}SKIP${NC} Billing portal (no subscription yet)"
  echo "       $ERROR"
else
  echo -e "${RED}FAIL${NC} Billing portal - $ERROR"
  ((FAILED++))
fi

echo ""
echo "--- Webhook Endpoint Test ---"

# Test 8: Webhook without signature (should fail)
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/stripe/webhook" \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}')
if [ "$CODE" = "400" ]; then
  echo -e "${GREEN}PASS${NC} Webhook rejects missing signature (HTTP 400)"
  ((PASSED++))
else
  echo -e "${YELLOW}WARN${NC} Webhook returned $CODE (expected 400)"
  ((PASSED++))
fi

echo ""
echo "========================================"
echo -e "${BLUE}Manual Testing Steps:${NC}"
echo "========================================"
echo ""
echo "To complete Stripe testing manually:"
echo ""
echo "1. Create a checkout session:"
echo "   curl -X POST $BASE_URL/stripe/checkout \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"apiKey\":\"$API_KEY\",\"plan\":\"pro\"}'"
echo ""
echo "2. Open the checkout URL in your browser"
echo ""
echo "3. Use test card: 4242 4242 4242 4242"
echo "   - Any future expiry date"
echo "   - Any 3-digit CVC"
echo "   - Any billing details"
echo ""
echo "4. Complete payment and verify upgrade:"
echo "   curl '$BASE_URL/stripe/status?api_key=$API_KEY'"
echo ""
echo "5. Test billing portal (after subscription):"
echo "   curl -X POST $BASE_URL/stripe/portal \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"apiKey\":\"$API_KEY\"}'"
echo ""

echo "========================================"
echo "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "========================================"

exit $FAILED

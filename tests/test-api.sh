#!/bin/bash
# GlyphForge Core API Tests

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
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Test helper
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
echo "GlyphForge Core API Tests"
echo "Base URL: $BASE_URL"
echo "========================================"
echo ""

# Test 1: Health Check
echo "--- Health & Info ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
test_endpoint "GET /health" "200" "$CODE"

# Test 2: Root endpoint
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
test_endpoint "GET /" "200" "$CODE"

# Test 3: List styles
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/styles")
test_endpoint "GET /styles" "200" "$CODE"

# Verify styles count
STYLES_COUNT=$(curl -s "$BASE_URL/styles" | jq -r '.count // 0')
if [ "$STYLES_COUNT" -ge 20 ]; then
  echo -e "${GREEN}PASS${NC} Styles count: $STYLES_COUNT"
  ((PASSED++))
else
  echo -e "${RED}FAIL${NC} Styles count too low: $STYLES_COUNT"
  ((FAILED++))
fi

echo ""
echo "--- Authentication Tests ---"

# Test 4: Missing API key
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/transform" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello","style":"bold"}')
test_endpoint "POST /transform (no auth)" "401" "$CODE"

# Test 5: Invalid API key
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/transform" \
  -H "Authorization: Bearer invalid_key_12345" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello","style":"bold"}')
test_endpoint "POST /transform (invalid key)" "401" "$CODE"

if [ "$API_KEY" != "YOUR_API_KEY_HERE" ] && [ -n "$API_KEY" ]; then
  echo ""
  echo "--- Transform API Tests ---"

  # Test 6: Transform POST
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/transform" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"text":"Hello World","style":"bold"}')
  test_endpoint "POST /transform (bold)" "200" "$CODE"

  # Test 7: Transform GET
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/transform?text=Hello&style=italic&api_key=$API_KEY")
  test_endpoint "GET /transform (italic)" "200" "$CODE"

  # Test 8: Transform All
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/transform/all" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"text":"Test"}')
  test_endpoint "POST /transform/all" "200" "$CODE"

  # Test 9: Batch transform
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/batch" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"items":[{"text":"Hello","style":"bold"},{"text":"World","style":"italic"}]}')
  test_endpoint "POST /batch" "200" "$CODE"

  # Test 10: Invalid style
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/transform" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"text":"Hello","style":"nonexistent_style"}')
  test_endpoint "POST /transform (invalid style)" "400" "$CODE"

  # Test 11: Empty text
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/transform" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"text":"","style":"bold"}')
  test_endpoint "POST /transform (empty text)" "400" "$CODE"

  echo ""
  echo "--- Style Tests ---"

  # Test all styles
  STYLES=("bold" "italic" "boldItalic" "script" "fraktur" "doubleStruck" "monospace" "circled" "squared" "smallCaps" "upsideDown" "vaporwave" "zalgo" "strikethrough")

  for style in "${STYLES[@]}"; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/transform" \
      -H "Authorization: Bearer $API_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"text\":\"Test\",\"style\":\"$style\"}")
    test_endpoint "Style: $style" "200" "$CODE"
  done

  # Test zalgo with intensity
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/transform" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"text":"Spooky","style":"zalgo","zalgoIntensity":"maxi"}')
  test_endpoint "Style: zalgo (maxi)" "200" "$CODE"

  echo ""
  echo "--- Dashboard Tests ---"

  # Test 12: Dashboard data
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/dashboard/data?api_key=$API_KEY")
  test_endpoint "GET /dashboard/data" "200" "$CODE"

  # Verify dashboard data structure
  TIER=$(curl -s "$BASE_URL/dashboard/data?api_key=$API_KEY" | jq -r '.tier // "unknown"')
  if [ "$TIER" != "unknown" ] && [ "$TIER" != "null" ]; then
    echo -e "${GREEN}PASS${NC} Dashboard returns tier: $TIER"
    ((PASSED++))
  else
    echo -e "${RED}FAIL${NC} Dashboard tier missing"
    ((FAILED++))
  fi

else
  echo ""
  echo -e "${YELLOW}SKIPPED${NC} Authenticated tests (set API_KEY in config.local.env)"
fi

echo ""
echo "========================================"
echo "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "========================================"

exit $FAILED

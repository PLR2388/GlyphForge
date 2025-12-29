#!/bin/bash
# GlyphForge - Run All Tests
#
# Usage:
#   ./test-all.sh           # Run all tests
#   ./test-all.sh api       # Run only API tests
#   ./test-all.sh mcp       # Run only MCP tests
#   ./test-all.sh stripe    # Run only Stripe tests
#   ./test-all.sh quick     # Quick smoke test

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Load config
if [ -f "config.local.env" ]; then
  source "config.local.env"
  echo -e "${GREEN}Loaded config.local.env${NC}"
elif [ -f "config.env" ]; then
  source "config.env"
  echo -e "${YELLOW}Using default config.env (copy to config.local.env and set API_KEY)${NC}"
fi

echo ""
echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD}   GlyphForge Test Suite${NC}"
echo -e "${BOLD}========================================${NC}"
echo ""
echo "Base URL: $BASE_URL"
if [ "$API_KEY" != "YOUR_API_KEY_HERE" ] && [ -n "$API_KEY" ]; then
  echo "API Key:  ${API_KEY:0:10}..."
else
  echo -e "API Key:  ${YELLOW}Not configured${NC}"
fi
echo ""

# Make scripts executable
chmod +x test-api.sh test-mcp.sh test-stripe.sh 2>/dev/null || true

run_quick_test() {
  echo -e "${BLUE}=== Quick Smoke Test ===${NC}"
  echo ""

  # Health check
  echo -n "Health check... "
  if curl -sf "$BASE_URL/health" > /dev/null; then
    echo -e "${GREEN}OK${NC}"
  else
    echo -e "${RED}FAILED${NC}"
    exit 1
  fi

  # Styles
  echo -n "List styles... "
  COUNT=$(curl -sf "$BASE_URL/styles" | jq -r '.count // 0')
  if [ "$COUNT" -gt 0 ]; then
    echo -e "${GREEN}OK${NC} ($COUNT styles)"
  else
    echo -e "${RED}FAILED${NC}"
    exit 1
  fi

  # MCP info
  echo -n "MCP server... "
  if curl -sf "$BASE_URL/mcp" | jq -e '.name' > /dev/null; then
    echo -e "${GREEN}OK${NC}"
  else
    echo -e "${RED}FAILED${NC}"
    exit 1
  fi

  if [ "$API_KEY" != "YOUR_API_KEY_HERE" ] && [ -n "$API_KEY" ]; then
    # Transform
    echo -n "Transform API... "
    RESULT=$(curl -sf -X POST "$BASE_URL/transform" \
      -H "Authorization: Bearer $API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"text":"Test","style":"bold"}' | jq -r '.transformed // empty')
    if [ -n "$RESULT" ]; then
      echo -e "${GREEN}OK${NC} (→ $RESULT)"
    else
      echo -e "${RED}FAILED${NC}"
      exit 1
    fi

    # Dashboard
    echo -n "Dashboard data... "
    TIER=$(curl -sf "$BASE_URL/dashboard/data?api_key=$API_KEY" | jq -r '.tier // empty')
    if [ -n "$TIER" ]; then
      echo -e "${GREEN}OK${NC} (tier: $TIER)"
    else
      echo -e "${RED}FAILED${NC}"
      exit 1
    fi

    # MCP transform
    echo -n "MCP transform... "
    RESULT=$(curl -sf -X POST "$BASE_URL/mcp" \
      -H "Authorization: Bearer $API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"transform_text","arguments":{"text":"MCP","style":"italic"}}}' \
      | jq -r '.result.content[0].text // empty')
    if [ -n "$RESULT" ]; then
      echo -e "${GREEN}OK${NC}"
    else
      echo -e "${RED}FAILED${NC}"
      exit 1
    fi
  else
    echo -e "${YELLOW}Skipping authenticated tests (no API key)${NC}"
  fi

  echo ""
  echo -e "${GREEN}All smoke tests passed!${NC}"
}

run_all_tests() {
  TOTAL_PASSED=0
  TOTAL_FAILED=0

  echo -e "${BLUE}=== Running API Tests ===${NC}"
  echo ""
  if ./test-api.sh; then
    echo ""
  else
    TOTAL_FAILED=$((TOTAL_FAILED + $?))
  fi

  echo ""
  echo -e "${BLUE}=== Running MCP Tests ===${NC}"
  echo ""
  if ./test-mcp.sh; then
    echo ""
  else
    TOTAL_FAILED=$((TOTAL_FAILED + $?))
  fi

  echo ""
  echo -e "${BLUE}=== Running Stripe Tests ===${NC}"
  echo ""
  if ./test-stripe.sh; then
    echo ""
  else
    TOTAL_FAILED=$((TOTAL_FAILED + $?))
  fi

  echo ""
  echo -e "${BOLD}========================================${NC}"
  echo -e "${BOLD}   All Tests Complete${NC}"
  echo -e "${BOLD}========================================${NC}"

  if [ $TOTAL_FAILED -eq 0 ]; then
    echo -e "${GREEN}All test suites passed!${NC}"
  else
    echo -e "${RED}Some tests failed (exit code: $TOTAL_FAILED)${NC}"
    exit $TOTAL_FAILED
  fi
}

# Parse arguments
case "${1:-all}" in
  quick)
    run_quick_test
    ;;
  api)
    echo -e "${BLUE}=== Running API Tests ===${NC}"
    echo ""
    ./test-api.sh
    ;;
  mcp)
    echo -e "${BLUE}=== Running MCP Tests ===${NC}"
    echo ""
    ./test-mcp.sh
    ;;
  stripe)
    echo -e "${BLUE}=== Running Stripe Tests ===${NC}"
    echo ""
    ./test-stripe.sh
    ;;
  all|*)
    run_all_tests
    ;;
esac

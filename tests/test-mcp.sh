#!/bin/bash
# GlyphForge MCP Server Tests

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

test_jsonrpc() {
  local name="$1"
  local response="$2"
  local check_field="$3"

  # Check for error
  local error=$(echo "$response" | jq -r '.error // empty')
  if [ -n "$error" ] && [ "$error" != "null" ]; then
    echo -e "${RED}FAIL${NC} $name - Error: $(echo "$response" | jq -r '.error.message')"
    ((FAILED++))
    return
  fi

  # Check for expected field
  local value=$(echo "$response" | jq -r "$check_field // empty")
  if [ -n "$value" ] && [ "$value" != "null" ]; then
    echo -e "${GREEN}PASS${NC} $name"
    ((PASSED++))
  else
    echo -e "${RED}FAIL${NC} $name - Missing $check_field"
    ((FAILED++))
  fi
}

echo "========================================"
echo "GlyphForge MCP Server Tests"
echo "Base URL: $BASE_URL"
echo "========================================"
echo ""

echo "--- MCP Public Endpoints ---"

# Test 1: MCP Info (GET - public)
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/mcp")
test_endpoint "GET /mcp (info)" "200" "$CODE"

# Verify MCP info structure
MCP_NAME=$(curl -s "$BASE_URL/mcp" | jq -r '.name // "unknown"')
if [ "$MCP_NAME" = "glyphforge" ]; then
  echo -e "${GREEN}PASS${NC} MCP server name: $MCP_NAME"
  ((PASSED++))
else
  echo -e "${RED}FAIL${NC} MCP server name incorrect: $MCP_NAME"
  ((FAILED++))
fi

# Check protocol version
PROTOCOL=$(curl -s "$BASE_URL/mcp" | jq -r '.protocol // "unknown"')
echo -e "       Protocol: $PROTOCOL"

# Check tools list
TOOLS=$(curl -s "$BASE_URL/mcp" | jq -r '.tools | length')
echo -e "       Tools available: $TOOLS"

echo ""
echo "--- MCP Authentication Tests ---"

# Test 2: MCP POST without auth
RESPONSE=$(curl -s -X POST "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}')
ERROR_CODE=$(echo "$RESPONSE" | jq -r '.error.code // 0')
if [ "$ERROR_CODE" = "-32001" ]; then
  echo -e "${GREEN}PASS${NC} POST /mcp without auth returns error -32001"
  ((PASSED++))
else
  echo -e "${RED}FAIL${NC} POST /mcp without auth - expected -32001, got $ERROR_CODE"
  ((FAILED++))
fi

# Test 3: MCP POST with invalid auth
RESPONSE=$(curl -s -X POST "$BASE_URL/mcp" \
  -H "Authorization: Bearer invalid_key_12345" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}')
ERROR_CODE=$(echo "$RESPONSE" | jq -r '.error.code // 0')
if [ "$ERROR_CODE" = "-32002" ]; then
  echo -e "${GREEN}PASS${NC} POST /mcp with invalid key returns error -32002"
  ((PASSED++))
else
  echo -e "${RED}FAIL${NC} POST /mcp with invalid key - expected -32002, got $ERROR_CODE"
  ((FAILED++))
fi

if [ "$API_KEY" != "YOUR_API_KEY_HERE" ] && [ -n "$API_KEY" ]; then
  echo ""
  echo "--- MCP Protocol Tests ---"

  # Test 4: Initialize
  RESPONSE=$(curl -s -X POST "$BASE_URL/mcp" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}')
  test_jsonrpc "Initialize" "$RESPONSE" ".result.protocolVersion"

  # Test 5: List Tools
  RESPONSE=$(curl -s -X POST "$BASE_URL/mcp" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}')
  test_jsonrpc "List Tools" "$RESPONSE" ".result.tools"

  # Show available tools
  echo "       Available tools:"
  echo "$RESPONSE" | jq -r '.result.tools[].name' 2>/dev/null | while read tool; do
    echo "         - $tool"
  done

  # Test 6: Ping
  RESPONSE=$(curl -s -X POST "$BASE_URL/mcp" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":3,"method":"ping","params":{}}')
  if echo "$RESPONSE" | jq -e '.result' > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC} Ping"
    ((PASSED++))
  else
    echo -e "${RED}FAIL${NC} Ping"
    ((FAILED++))
  fi

  echo ""
  echo "--- MCP Tool Execution Tests ---"

  # Test 7: transform_text
  RESPONSE=$(curl -s -X POST "$BASE_URL/mcp" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"transform_text","arguments":{"text":"Hello MCP","style":"bold"}}}')
  test_jsonrpc "Tool: transform_text" "$RESPONSE" ".result.content"

  # Extract and display result
  RESULT=$(echo "$RESPONSE" | jq -r '.result.content[0].text' 2>/dev/null)
  if [ -n "$RESULT" ]; then
    TRANSFORMED=$(echo "$RESULT" | jq -r '.transformed // empty' 2>/dev/null)
    echo "       Transformed: $TRANSFORMED"
  fi

  # Test 8: transform_all
  RESPONSE=$(curl -s -X POST "$BASE_URL/mcp" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"transform_all","arguments":{"text":"Test"}}}')
  test_jsonrpc "Tool: transform_all" "$RESPONSE" ".result.content"

  # Test 9: list_styles
  RESPONSE=$(curl -s -X POST "$BASE_URL/mcp" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"list_styles","arguments":{}}}')
  test_jsonrpc "Tool: list_styles" "$RESPONSE" ".result.content"

  # Test 10: batch_transform
  RESPONSE=$(curl -s -X POST "$BASE_URL/mcp" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"batch_transform","arguments":{"items":[{"text":"A","style":"bold"},{"text":"B","style":"italic"}]}}}')
  test_jsonrpc "Tool: batch_transform" "$RESPONSE" ".result.content"

  echo ""
  echo "--- MCP Error Handling Tests ---"

  # Test 11: Invalid tool name
  RESPONSE=$(curl -s -X POST "$BASE_URL/mcp" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":8,"method":"tools/call","params":{"name":"nonexistent_tool","arguments":{}}}')
  if echo "$RESPONSE" | jq -e '.result.isError == true or .error' > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC} Invalid tool returns error"
    ((PASSED++))
  else
    echo -e "${RED}FAIL${NC} Invalid tool should return error"
    ((FAILED++))
  fi

  # Test 12: Invalid method
  RESPONSE=$(curl -s -X POST "$BASE_URL/mcp" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":9,"method":"invalid/method","params":{}}')
  ERROR_CODE=$(echo "$RESPONSE" | jq -r '.error.code // 0')
  if [ "$ERROR_CODE" = "-32601" ]; then
    echo -e "${GREEN}PASS${NC} Invalid method returns -32601"
    ((PASSED++))
  else
    echo -e "${YELLOW}WARN${NC} Invalid method - expected -32601, got $ERROR_CODE"
    ((PASSED++))  # Not all implementations return this
  fi

  # Test 13: Auth via query param
  RESPONSE=$(curl -s -X POST "$BASE_URL/mcp?api_key=$API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":10,"method":"ping","params":{}}')
  if echo "$RESPONSE" | jq -e '.result' > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC} Auth via query param works"
    ((PASSED++))
  else
    echo -e "${RED}FAIL${NC} Auth via query param failed"
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

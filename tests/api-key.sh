#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Igani API Key Integration Tests
# Usage:
#   chmod +x tests/api-key.sh
#   API_KEY=sk_live_<your_key> ./tests/api-key.sh
#
# Set BASE_URL to your production domain or leave as localhost for local dev:
#   BASE_URL=https://igani.co API_KEY=sk_live_xxx ./tests/api-key.sh
# ─────────────────────────────────────────────────────────────────────────────

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-igsk_REPLACE_WITH_YOUR_KEY}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

pass() { echo -e "${GREEN}✓ PASS${RESET} — $1"; }
fail() { echo -e "${RED}✗ FAIL${RESET} — $1"; }
info() { echo -e "${CYAN}→${RESET} $1"; }
section() { echo -e "\n${YELLOW}── $1 ──${RESET}"; }

check_status() {
  local label="$1" expected="$2" actual="$3" body="$4"
  if [ "$actual" -eq "$expected" ]; then
    pass "$label (HTTP $actual)"
  else
    fail "$label — expected HTTP $expected, got $actual"
    echo "   Body: $body"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
section "1. Auth guard — no token → 401"
# ─────────────────────────────────────────────────────────────────────────────

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/admin/projects" \
  -H "Content-Type: application/json" \
  -d '{"name":"test","description":"test"}')
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)
check_status "POST /api/admin/projects without token" 401 "$STATUS" "$BODY"

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/messages")
STATUS=$(echo "$RESPONSE" | tail -1)
check_status "GET /api/messages without token" 401 "$STATUS"

# ─────────────────────────────────────────────────────────────────────────────
section "2. Auth guard — invalid token → 401"
# ─────────────────────────────────────────────────────────────────────────────

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/admin/projects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer igsk_INVALID_KEY_000000000000000000000000000000000000000000000000000000000000000" \
  -d '{"name":"test","description":"test"}')
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)
check_status "POST /api/admin/projects with invalid token" 401 "$STATUS" "$BODY"

# ─────────────────────────────────────────────────────────────────────────────
section "3. Validation — missing required fields → 422"
# ─────────────────────────────────────────────────────────────────────────────

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/admin/projects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{}')
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)
check_status "POST /api/admin/projects — empty body" 422 "$STATUS" "$BODY"
info "Validation issues: $BODY"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/admin/projects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"name":"My Project"}')
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)
check_status "POST /api/admin/projects — missing description" 422 "$STATUS" "$BODY"

# ─────────────────────────────────────────────────────────────────────────────
section "4. Happy path — valid token + valid body → 201"
# ─────────────────────────────────────────────────────────────────────────────

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/admin/projects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "name": "n8n Test Project",
    "description": "Created automatically by the n8n integration test",
    "url": "https://igani.co",
    "category": "Test",
    "featured": false
  }')
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)
check_status "POST /api/admin/projects — valid request" 201 "$STATUS" "$BODY"
info "Created project: $BODY"

# ─────────────────────────────────────────────────────────────────────────────
section "5. GET /api/messages — all types"
# ─────────────────────────────────────────────────────────────────────────────

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/messages?type=all&limit=5" \
  -H "Authorization: Bearer $API_KEY")
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)
check_status "GET /api/messages?type=all" 200 "$STATUS" "$BODY"

# ─────────────────────────────────────────────────────────────────────────────
section "6. List API keys (admin)"
# ─────────────────────────────────────────────────────────────────────────────

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/admin/api-keys")
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)
check_status "GET /api/admin/api-keys" 200 "$STATUS" "$BODY"

# ─────────────────────────────────────────────────────────────────────────────
echo -e "\n${CYAN}Done. Run with API_KEY=sk_live_<your_key> to test authenticated routes.${RESET}\n"

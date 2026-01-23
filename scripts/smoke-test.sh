#!/usr/bin/env bash
#
# Post-Deploy Smoke Test Script
# Tests all critical health endpoints after deployment
#
# Usage:
#   ./scripts/smoke-test.sh                              # Uses default localhost:4650
#   BACKEND_URL=https://api.tenantflow.app ./scripts/smoke-test.sh
#   pnpm test:smoke                                      # Via package.json script
#
# Exit codes:
#   0 - All health checks passed
#   1 - One or more health checks failed
#

set -euo pipefail

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:4650}"
TIMEOUT=5
API_PREFIX="/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track failures
FAILED=0
PASSED=0

# Print functions
print_header() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  TenantFlow Smoke Test${NC}"
  echo -e "${BLUE}  Target: ${BACKEND_URL}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_test() {
  local name="$1"
  echo -e "${YELLOW}Testing:${NC} $name"
}

print_pass() {
  local name="$1"
  local time="$2"
  echo -e "${GREEN}✓ PASS${NC} $name (${time}s)"
  ((PASSED++))
}

print_fail() {
  local name="$1"
  local reason="$2"
  echo -e "${RED}✗ FAIL${NC} $name - $reason"
  ((FAILED++))
}

print_summary() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  Summary${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "  ${GREEN}Passed:${NC} $PASSED"
  echo -e "  ${RED}Failed:${NC} $FAILED"

  if [ "$FAILED" -eq 0 ]; then
    echo -e "\n${GREEN}All smoke tests passed!${NC}\n"
  else
    echo -e "\n${RED}Smoke tests failed. Check the output above.${NC}\n"
  fi
}

# Test a health endpoint
# Args: $1=name, $2=endpoint, $3=optional_grep_pattern
test_endpoint() {
  local name="$1"
  local endpoint="$2"
  local pattern="${3:-}"
  local url="${BACKEND_URL}${API_PREFIX}${endpoint}"

  print_test "$name ($endpoint)"

  local start_time
  start_time=$(date +%s.%N)

  # Make request with timeout
  local response
  local http_code

  if ! response=$(curl -sf --max-time "$TIMEOUT" -w "\n%{http_code}" "$url" 2>&1); then
    local end_time
    end_time=$(date +%s.%N)
    local elapsed
    elapsed=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "?")
    print_fail "$name" "Connection failed or timeout after ${TIMEOUT}s"
    return 1
  fi

  # Extract HTTP code (last line) and body (everything else)
  http_code=$(echo "$response" | tail -n1)
  local body
  body=$(echo "$response" | sed '$d')

  local end_time
  end_time=$(date +%s.%N)
  local elapsed
  elapsed=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "?")

  # Check HTTP status
  if [ "$http_code" != "200" ]; then
    print_fail "$name" "HTTP $http_code (expected 200)"
    return 1
  fi

  # Check for pattern if provided
  if [ -n "$pattern" ]; then
    if ! echo "$body" | grep -q "$pattern"; then
      print_fail "$name" "Response missing expected pattern: $pattern"
      return 1
    fi
  fi

  print_pass "$name" "$elapsed"
  return 0
}

# Main execution
main() {
  print_header

  # Test endpoints in order of speed (fastest first)
  # This provides quick feedback if basic connectivity fails

  # 1. Ping - Lightweight liveness probe (fastest)
  test_endpoint "Liveness Probe" "/health/ping" || true

  # 2. Ready - Readiness probe (DB + Redis)
  test_endpoint "Readiness Probe" "/health/ready" || true

  # 3. Stripe Sync - Stripe sync service status
  test_endpoint "Stripe Sync Status" "/health/stripe-sync" "status" || true

  # 4. Full Health - Complete health check (slowest)
  test_endpoint "Full Health Check" "/health" || true

  # Print summary
  print_summary

  # Exit with appropriate code
  if [ "$FAILED" -gt 0 ]; then
    exit 1
  fi
  exit 0
}

# Run main
main "$@"

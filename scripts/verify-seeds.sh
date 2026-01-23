#!/bin/bash
# ========================================
# TenantFlow Seed Verification Script
# ========================================
# Verifies seed data integrity and RLS isolation
#
# Usage: ./scripts/verify-seeds.sh [smoke|development|performance]
# Default: smoke
#
# Requirements: psql, DATABASE_URL environment variable

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default tier
TIER=${1:-smoke}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}TenantFlow Seed Verification${NC}"
echo -e "${BLUE}Tier: ${YELLOW}${TIER}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Validate DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}ERROR: DATABASE_URL environment variable not set${NC}"
  echo "Run with: doppler run -- ./scripts/verify-seeds.sh $TIER"
  exit 1
fi

# Define expected minimums per tier
case $TIER in
  smoke)
    MIN_USERS=4
    MIN_PROPERTIES=4
    MIN_UNITS=8
    MIN_LEASES=2
    MIN_MAINTENANCE=3
    ;;
  development)
    MIN_USERS=60
    MIN_PROPERTIES=50
    MIN_UNITS=100
    MIN_LEASES=30
    MIN_MAINTENANCE=100
    ;;
  performance)
    MIN_USERS=600
    MIN_PROPERTIES=1000
    MIN_UNITS=5000
    MIN_LEASES=5000
    MIN_MAINTENANCE=10000
    ;;
  *)
    echo -e "${RED}ERROR: Unknown tier '$TIER'. Use: smoke, development, or performance${NC}"
    exit 1
    ;;
esac

# Function to run SQL and get result
run_sql() {
  psql "$DATABASE_URL" -t -A -c "$1" 2>/dev/null | tr -d '[:space:]'
}

# Function to check count
check_count() {
  local label=$1
  local actual=$2
  local minimum=$3

  if [ "$actual" -ge "$minimum" ]; then
    echo -e "${GREEN}✓${NC} $label: $actual (min: $minimum)"
    return 0
  else
    echo -e "${RED}✗${NC} $label: $actual (min: $minimum)"
    return 1
  fi
}

FAILED=0

echo -e "${YELLOW}Checking row counts...${NC}"
echo ""

# Get counts
USER_COUNT=$(run_sql "SELECT COUNT(*) FROM public.users;")
OWNER_COUNT=$(run_sql "SELECT COUNT(*) FROM public.property_owners;")
TENANT_COUNT=$(run_sql "SELECT COUNT(*) FROM public.tenants;")
PROPERTY_COUNT=$(run_sql "SELECT COUNT(*) FROM public.properties;")
UNIT_COUNT=$(run_sql "SELECT COUNT(*) FROM public.units;")
LEASE_COUNT=$(run_sql "SELECT COUNT(*) FROM public.leases;")
MR_COUNT=$(run_sql "SELECT COUNT(*) FROM public.maintenance_requests;")

# Verify counts
check_count "Users" "$USER_COUNT" "$MIN_USERS" || FAILED=1
check_count "Properties" "$PROPERTY_COUNT" "$MIN_PROPERTIES" || FAILED=1
check_count "Units" "$UNIT_COUNT" "$MIN_UNITS" || FAILED=1
check_count "Leases" "$LEASE_COUNT" "$MIN_LEASES" || FAILED=1
check_count "Maintenance Requests" "$MR_COUNT" "$MIN_MAINTENANCE" || FAILED=1

echo ""
echo -e "${YELLOW}Additional counts:${NC}"
echo "  Property Owners: $OWNER_COUNT"
echo "  Tenants: $TENANT_COUNT"

# Check seed version tracking
echo ""
echo -e "${YELLOW}Checking seed version tracking...${NC}"

SEED_VERSIONS=$(run_sql "SELECT COUNT(*) FROM public.seed_versions WHERE tier = '$TIER';")
if [ "$SEED_VERSIONS" -ge 1 ]; then
  echo -e "${GREEN}✓${NC} Seed version tracked for tier: $TIER"
  LATEST_VERSION=$(psql "$DATABASE_URL" -t -A -c "SELECT version FROM public.seed_versions WHERE tier = '$TIER' ORDER BY applied_at DESC LIMIT 1;" 2>/dev/null)
  echo "  Latest version: $LATEST_VERSION"
else
  echo -e "${YELLOW}⚠${NC} No seed version found for tier: $TIER (first run?)"
fi

# Check temporal distribution (for development and performance tiers)
if [ "$TIER" != "smoke" ]; then
  echo ""
  echo -e "${YELLOW}Checking temporal distribution...${NC}"

  # Check maintenance requests span multiple months
  MR_MONTHS=$(run_sql "SELECT COUNT(DISTINCT date_trunc('month', created_at)) FROM public.maintenance_requests;")
  if [ "$MR_MONTHS" -ge 6 ]; then
    echo -e "${GREEN}✓${NC} Maintenance requests span $MR_MONTHS months"
  else
    echo -e "${YELLOW}⚠${NC} Maintenance requests only span $MR_MONTHS months (expected 6+)"
  fi

  # Check leases have varied dates
  LEASE_MONTHS=$(run_sql "SELECT COUNT(DISTINCT date_trunc('month', start_date)) FROM public.leases;")
  if [ "$LEASE_MONTHS" -ge 6 ]; then
    echo -e "${GREEN}✓${NC} Leases span $LEASE_MONTHS months"
  else
    echo -e "${YELLOW}⚠${NC} Leases only span $LEASE_MONTHS months (expected 6+)"
  fi
fi

# Check RLS isolation (smoke tier)
if [ "$TIER" == "smoke" ]; then
  echo ""
  echo -e "${YELLOW}Checking RLS isolation setup...${NC}"

  # Get owner IDs for testing
  OWNER_A_PO_ID=$(run_sql "SELECT po.id FROM public.property_owners po INNER JOIN public.users u ON po.user_id = u.id WHERE u.email = 'owner-a@test.com';")
  OWNER_B_PO_ID=$(run_sql "SELECT po.id FROM public.property_owners po INNER JOIN public.users u ON po.user_id = u.id WHERE u.email = 'owner-b@test.com';")

  if [ -n "$OWNER_A_PO_ID" ] && [ -n "$OWNER_B_PO_ID" ]; then
    echo -e "${GREEN}✓${NC} Owner A and B exist for RLS testing"
    echo "  Owner A PO ID: $OWNER_A_PO_ID"
    echo "  Owner B PO ID: $OWNER_B_PO_ID"

    # Check properties are isolated
    OWNER_A_PROPS=$(run_sql "SELECT COUNT(*) FROM public.properties WHERE property_owner_id = '$OWNER_A_PO_ID';")
    OWNER_B_PROPS=$(run_sql "SELECT COUNT(*) FROM public.properties WHERE property_owner_id = '$OWNER_B_PO_ID';")

    if [ "$OWNER_A_PROPS" -ge 2 ] && [ "$OWNER_B_PROPS" -ge 2 ]; then
      echo -e "${GREEN}✓${NC} Properties isolated: Owner A has $OWNER_A_PROPS, Owner B has $OWNER_B_PROPS"
    else
      echo -e "${RED}✗${NC} Property isolation issue: Owner A has $OWNER_A_PROPS, Owner B has $OWNER_B_PROPS"
      FAILED=1
    fi
  else
    echo -e "${RED}✗${NC} Could not find Owner A and/or Owner B for RLS testing"
    FAILED=1
  fi
fi

# Check data integrity
echo ""
echo -e "${YELLOW}Checking data integrity...${NC}"

# Check all leases have valid unit_id
ORPHAN_LEASES=$(run_sql "SELECT COUNT(*) FROM public.leases l WHERE NOT EXISTS (SELECT 1 FROM public.units u WHERE u.id = l.unit_id);")
if [ "$ORPHAN_LEASES" -eq 0 ]; then
  echo -e "${GREEN}✓${NC} All leases reference valid units"
else
  echo -e "${RED}✗${NC} Found $ORPHAN_LEASES leases with invalid unit_id"
  FAILED=1
fi

# Check all units have valid property_id
ORPHAN_UNITS=$(run_sql "SELECT COUNT(*) FROM public.units u WHERE NOT EXISTS (SELECT 1 FROM public.properties p WHERE p.id = u.property_id);")
if [ "$ORPHAN_UNITS" -eq 0 ]; then
  echo -e "${GREEN}✓${NC} All units reference valid properties"
else
  echo -e "${RED}✗${NC} Found $ORPHAN_UNITS units with invalid property_id"
  FAILED=1
fi

# Check all maintenance requests have valid unit_id
ORPHAN_MR=$(run_sql "SELECT COUNT(*) FROM public.maintenance_requests mr WHERE NOT EXISTS (SELECT 1 FROM public.units u WHERE u.id = mr.unit_id);")
if [ "$ORPHAN_MR" -eq 0 ]; then
  echo -e "${GREEN}✓${NC} All maintenance requests reference valid units"
else
  echo -e "${RED}✗${NC} Found $ORPHAN_MR maintenance requests with invalid unit_id"
  FAILED=1
fi

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}ALL CHECKS PASSED${NC}"
  echo -e "${BLUE}========================================${NC}"
  exit 0
else
  echo -e "${RED}SOME CHECKS FAILED${NC}"
  echo -e "${BLUE}========================================${NC}"
  exit 1
fi

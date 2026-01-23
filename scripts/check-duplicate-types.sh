#!/bin/bash
#
# Detect duplicate type/interface definitions in shared types
# Prevents NEW duplicate type names from being introduced
#
# Usage:
#   ./scripts/check-duplicate-types.sh          # Warn mode (default)
#   ./scripts/check-duplicate-types.sh --strict # Fail on any duplicate
#   ./scripts/check-duplicate-types.sh --count  # Just count duplicates
#

set -e

TYPES_DIR="packages/shared/src/types"
MODE="${1:-warn}"

# Known duplicates baseline - these existed before this check was added
# As duplicates are consolidated, remove them from this list
# Format: TypeName (sorted alphabetically)
KNOWN_DUPLICATES=(
  "ActivityItem"
  "ApiResponse"
  "CacheEntry"
  "CacheStats"
  "DashboardFinancialStats"
  "DashboardStats"
  "DateRange"
  "DocumentType"
  "ExpenseSummaryResponse"
  "Lease"
  "LeaseDetail"
  "LeaseListItem"
  "LeaseStats"
  "MaintenanceAnalyticsData"
  "MaintenanceRequest"
  "MaintenanceRequestDetail"
  "MaintenanceRequestItem"
  "MaintenanceRequestUpdate"
  "MaintenanceStats"
  "MaintenanceTrendPoint"
  "NotificationTypeValue"
  "OverduePayment"
  "PaymentAnalytics"
  "PaymentHistoryItem"
  "PaymentMethodResponseWithVersion"
  "PaymentMethodType"
  "PaymentStatus"
  "PropertyFilters"
  "PropertyInsert"
  "PropertyListItem"
  "PropertyPerformanceData"
  "PropertyPerformanceEntry"
  "PropertyStats"
  "PropertyWithVersion"
  "RequestStatus"
  "RevenueTrendPoint"
  "SecurityEvent"
  "SubscriptionStatus"
  "SupabaseAuthUser"
  "TenantDetail"
  "TenantInvitation"
  "TenantListItem"
  "TenantStats"
  "TenantSummary"
  "TenantWithLeaseInfo"
  "TenantWithLeaseInfoWithVersion"
  "TimelineEventType"
  "UnitDetail"
  "UnitStatisticEntry"
  "UnitStats"
  "UnitWithProperty"
  "UnitWithVersion"
  "UpdateSubscriptionRequest"
  "UserStats"
  "VisitorAnalyticsResponse"
)

# Skip if types directory doesn't exist
if [ ! -d "$TYPES_DIR" ]; then
  echo "Types directory not found: $TYPES_DIR"
  exit 0
fi

# Find all duplicate exported type/interface names
ALL_DUPLICATES=$(
  grep -rh "^export \(interface\|type\) [A-Z][A-Za-z0-9]*" "$TYPES_DIR" \
    --include="*.ts" \
    --exclude="supabase.ts" \
    --exclude="*.test.ts" \
    --exclude="*.spec.ts" \
  | sed -E 's/export (interface|type) ([A-Za-z0-9]+).*/\2/' \
  | sort \
  | uniq -d
)

# Count mode - just show counts
if [ "$MODE" = "--count" ]; then
  TOTAL=$(echo "$ALL_DUPLICATES" | grep -c . || echo 0)
  KNOWN=${#KNOWN_DUPLICATES[@]}
  echo "Total duplicate types: $TOTAL"
  echo "Known/baselined: $KNOWN"
  exit 0
fi

# Find NEW duplicates (not in baseline)
NEW_DUPLICATES=""
while IFS= read -r typename; do
  [ -z "$typename" ] && continue
  is_known=false
  for known in "${KNOWN_DUPLICATES[@]}"; do
    if [ "$typename" = "$known" ]; then
      is_known=true
      break
    fi
  done
  if [ "$is_known" = false ]; then
    NEW_DUPLICATES="${NEW_DUPLICATES}${typename}\n"
  fi
done <<< "$ALL_DUPLICATES"

# Remove trailing newline
NEW_DUPLICATES=$(echo -e "$NEW_DUPLICATES" | sed '/^$/d')

# Strict mode - fail on ANY duplicate
if [ "$MODE" = "--strict" ]; then
  if [ -n "$ALL_DUPLICATES" ]; then
    echo "❌ Duplicate type definitions found (strict mode):"
    echo ""
    echo "$ALL_DUPLICATES" | while read -r typename; do
      [ -z "$typename" ] && continue
      echo "  Type: $typename"
      grep -rl "^export \(interface\|type\) $typename" "$TYPES_DIR" \
        --include="*.ts" \
        --exclude="supabase.ts" 2>/dev/null \
      | sed 's/^/    - /'
    done
    exit 1
  fi
  echo "✅ No duplicate type definitions found"
  exit 0
fi

# Warn mode (default) - only fail on NEW duplicates
if [ -n "$NEW_DUPLICATES" ]; then
  echo "❌ NEW duplicate type definitions found:"
  echo ""
  echo "$NEW_DUPLICATES" | while read -r typename; do
    [ -z "$typename" ] && continue
    echo "  Type: $typename"
    echo "  Found in:"
    grep -rl "^export \(interface\|type\) $typename" "$TYPES_DIR" \
      --include="*.ts" \
      --exclude="supabase.ts" 2>/dev/null \
    | sed 's/^/    - /'
    echo ""
  done
  echo "Please consolidate these types into a single file."
  echo "See CLAUDE.md for type organization guidelines."
  exit 1
fi

# Show baseline info
KNOWN_COUNT=${#KNOWN_DUPLICATES[@]}
echo "✅ No NEW duplicate types introduced (${KNOWN_COUNT} known duplicates baselined)"
exit 0

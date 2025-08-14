#!/usr/bin/env bash
set -euo pipefail

# Blindado MVP Acceptance Test Runner (AT-1 .. AT-8)
# Usage: FN="https://<project-ref>.supabase.co/functions/v1" ./scripts/at.sh
# Optional env vars you can override:
#   CLIENT_ID, GUARD_ID, CITY, TIER, HOURS, ARMED, VEHICLE, VEHICLE_TYPE, SURGE_NIGHT, SURGE_EXPECT_MIN

FN=${FN:-"https://isnezquuwepqcjkaupjh.supabase.co/functions/v1"}
# Supply your project's anon key to satisfy the API gateway for Edge Functions
ANON=${ANON:-}
CLIENT_ID=${CLIENT_ID:-"1b387371-6711-485c-81f7-79b2174b90fb"}
GUARD_ID=${GUARD_ID:-"c38efbac-fd1e-426b-a0ab-be59fd908c8c"}
CITY=${CITY:-"CDMX"}
TIER=${TIER:-"direct"}
HOURS=${HOURS:-4}
ARMED=${ARMED:-0}
VEHICLE=${VEHICLE:-0}
VEHICLE_TYPE=${VEHICLE_TYPE:-suv}
SURGE_NIGHT=${SURGE_NIGHT:-0}
SURGE_EXPECT_MIN=${SURGE_EXPECT_MIN:-}

# If we expect a surge min (legacy test), pass that as explicit surge_mult to pricing (canonical pricing no longer auto-computes).
SURGE_MULT_OVERRIDE=""
if [ -n "${SURGE_EXPECT_MIN}" ]; then
  SURGE_MULT_OVERRIDE=${SURGE_EXPECT_MIN}
fi

if [ "$SURGE_NIGHT" = "1" ]; then
  start_ts="$(date -u +%Y-%m-%dT23:00:00Z)"
else
  start_ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
fi
end_ts=$(date -u -d "${start_ts} + ${HOURS} hour" +%Y-%m-%dT%H:%M:%SZ)

have_jq=1
command -v jq >/dev/null 2>&1 || have_jq=0

pass() { echo "[PASS] $1"; }
fail() { echo "[FAIL] $1"; echo "Last response:"; echo "$2" | sed 's/\\n/\n/g'; exit 1; }

# Strict extractors using jq; return empty on invalid/missing to trigger fail
extract_number() { # $1=json $2=field
  if [ $have_jq -eq 1 ]; then echo "$1" | jq -r "select(.$2 and (.$2|type==\"number\") and (.$2>0)) | .$2"; else echo ""; fi
}
extract_string() { # $1=json $2=field
  if [ $have_jq -eq 1 ]; then echo "$1" | jq -r "select(.$2 and (.$2|type==\"string\") and (.$2|length>0)) | .$2"; else echo ""; fi
}

# Build curl auth headers if ANON provided
AUTH=()
if [ -n "$ANON" ]; then
  AUTH+=( -H "apikey: $ANON" -H "Authorization: Bearer $ANON" )
fi

# Hard-require ANON to avoid 401 Invalid API key responses from the gateway
if [ -z "$ANON" ]; then
  echo "[ERROR] ANON is not set. Export your Supabase anon key:"
  echo "        export ANON=\"<YOUR_SUPABASE_PUBLIC_ANON_KEY>\""
  echo "        FN=\"$FN\" ./scripts/at.sh"
  exit 1
fi

echo "FN=$FN"
echo "Running acceptance tests..."; echo

# AT-1: Pricing quote
if [ -n "$SURGE_MULT_OVERRIDE" ]; then
  REQ_PRICING=$(cat <<JSON
{ "city":"$CITY", "tier":"$TIER", "armed_required":${ARMED}, "vehicle_required":${VEHICLE}, "vehicle_type":"$VEHICLE_TYPE", "surge_mult": ${SURGE_MULT_OVERRIDE}, "start_ts":"$start_ts", "end_ts":"$end_ts" }
JSON
)
else
  REQ_PRICING=$(cat <<JSON
{ "city":"$CITY", "tier":"$TIER", "armed_required":${ARMED}, "vehicle_required":${VEHICLE}, "vehicle_type":"$VEHICLE_TYPE", "start_ts":"$start_ts", "end_ts":"$end_ts" }
JSON
)
fi
R1=$(curl -s -S -X POST "$FN/pricing" -H 'Content-Type: application/json' "${AUTH[@]}" -d "$REQ_PRICING" || true)
quote_amount=$(extract_number "$R1" quote_amount)
[ -n "$quote_amount" ] || fail "AT-1 Pricing quote (no quote_amount)" "$R1"
surge_mult=$(extract_number "$R1" surge_mult)
if [ -n "$SURGE_EXPECT_MIN" ]; then
  awk_check=$(awk -v a="${surge_mult}" -v b="${SURGE_EXPECT_MIN}" 'BEGIN{ if (a+0 < b+0) print "fail"; }')
  [ -z "$awk_check" ] || fail "AT-1 Surge expectation (got $surge_mult, expected >= $SURGE_EXPECT_MIN)" "$R1"
fi
[ -n "$surge_mult" ] || surge_mult="1"
pass "AT-1 Pricing quote (quote_amount=$quote_amount surge=$surge_mult)"

# AT-2: Create booking
REQ_BOOKING=$(cat <<JSON
{ "client_id":"$CLIENT_ID", "city":"$CITY", "tier":"$TIER", "armed_required":${ARMED}, "vehicle_required":${VEHICLE}, "vehicle_type":"$VEHICLE_TYPE", "surge_mult": ${surge_mult}, "quote_amount": ${quote_amount}, "start_ts":"$start_ts", "end_ts":"$end_ts", "origin_lat":19.4326, "origin_lng":-99.1332, "notes":"AT flow A${ARMED}V${VEHICLE}T${VEHICLE_TYPE}" }
JSON
)
R2=$(curl -s -S -X POST "$FN/bookings" -H 'Content-Type: application/json' "${AUTH[@]}" -d "$REQ_BOOKING" || true)
booking_id=$(extract_string "$R2" booking_id)
[ -n "$booking_id" ] || fail "AT-2 Create booking (no booking_id)" "$R2"
pass "AT-2 Create booking (booking_id=$booking_id)"

# Verify booking status is 'quoted' (canonical flow) if we have service role key.
if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  API_ROOT="${FN%/functions/v1}"
  BSTAT=$(curl -s -S -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" "$API_ROOT/rest/v1/bookings?id=eq.$booking_id&select=status" || true)
  if [ $have_jq -eq 1 ]; then
    status_val=$(echo "$BSTAT" | jq -r '.[0].status // empty')
  else
    status_val=$(echo "$BSTAT" | sed -n 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
  fi
  if [ "$status_val" != "quoted" ]; then
    fail "Booking initial status not quoted (got '$status_val')" "$BSTAT"
  else
    pass "Booking initial status is quoted"
  fi
else
  echo "(Skipping booking status verification: SUPABASE_SERVICE_ROLE_KEY not set)"
fi

# AT-3: Preauth payment
preauth_amount=$(extract_number "$R1" preauth_amount)
[ -n "$preauth_amount" ] || preauth_amount=$quote_amount
R3=$(curl -s -S -X POST "$FN/payments_preauth" -H 'Content-Type: application/json' "${AUTH[@]}" -d "{\"booking_id\":\"$booking_id\",\"amount\":$preauth_amount}" || true)
ok3=$(echo "$R3" | jq -r '.ok // empty')
[ "$ok3" = "true" ] || fail "AT-3 Payment preauth" "$R3"
pass "AT-3 Payment preauth"

# AT-4: Confirm booking (move to matching)
R4=$(curl -s -S -X POST "$FN/bookings_confirm" -H 'Content-Type: application/json' "${AUTH[@]}" -d "{\"booking_id\":\"$booking_id\"}" || true)
ok4=$(echo "$R4" | jq -r '.ok // empty')
[ "$ok4" = "true" ] || fail "AT-4 Booking confirm" "$R4"
pass "AT-4 Booking confirm"

# AT-5: Run matching
R5=$(curl -s -S -X POST "$FN/matching" -H 'Content-Type: application/json' "${AUTH[@]}" -d "{\"booking_id\":\"$booking_id\"}" || true)
offered_count=$(echo "$R5" | jq '.offered_to | length // 0')
[ "$offered_count" -ge 1 ] || fail "AT-5 Matching offered guards" "$R5"
pass "AT-5 Matching (offered_to count=$offered_count)"

# AT-6: Guard lists jobs (status offered)
R6=$(curl -s -S "$FN/jobs/list?guard_id=$GUARD_ID" "${AUTH[@]}" || true)
assignment_id=""
if [ $have_jq -eq 1 ]; then
  assignment_id=$(echo "$R6" | jq -r '.items[0].assignment_id // .jobs[0].assignment_id // .jobs[0].id // empty')
else
  assignment_id=$(echo "$R6" | grep -o '"assignment_id" *: *"[^"]*"' | head -1 | sed 's/.*:"//;s/"$//')
  if [ -z "$assignment_id" ]; then assignment_id=$(echo "$R6" | grep -o '"id" *: *"[^"]*"' | head -1 | sed 's/.*:"//;s/"$//'); fi
fi
[ -n "$assignment_id" ] || fail "AT-6 Guard list jobs (no assignment_id)" "$R6"
pass "AT-6 Guard list jobs (assignment_id=$assignment_id)"

# AT-7: Guard accepts job
R7=$(curl -s -S -X POST "$FN/jobs/accept" -H 'Content-Type: application/json' "${AUTH[@]}" -d "{\"assignment_id\":\"$assignment_id\"}" || true)
ok7=$(echo "$R7" | jq -r '.ok // empty')
[ "$ok7" = "true" ] || fail "AT-7 Guard accept" "$R7"
pass "AT-7 Guard accept"

# AT-8: Progress statuses to completed
for st in check_in on_site in_progress check_out completed; do
  Ri=$(curl -s -S -X POST "$FN/jobs/status" -H 'Content-Type: application/json' "${AUTH[@]}" -d "{\"assignment_id\":\"$assignment_id\",\"status\":\"$st\"}" || true)
  oki=$(echo "$Ri" | jq -r '.ok // empty')
  [ "$oki" = "true" ] || fail "AT-8 status $st" "$Ri"
  echo "  -> progressed $st"
done
pass "AT-8 Status progression"

echo
echo "All acceptance tests PASSED"

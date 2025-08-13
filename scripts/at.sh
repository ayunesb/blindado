#!/usr/bin/env bash
set -euo pipefail

# Blindado MVP Acceptance Test Runner (AT-1 .. AT-8)
# Usage: FN="https://<project-ref>.supabase.co/functions/v1" ./scripts/at.sh
# Optional env vars you can override:
#   CLIENT_ID, GUARD_ID, CITY, TIER, HOURS

FN=${FN:-"https://isnezquuwepqcjkaupjh.supabase.co/functions/v1"}
CLIENT_ID=${CLIENT_ID:-"1b387371-6711-485c-81f7-79b2174b90fb"}
GUARD_ID=${GUARD_ID:-"c38efbac-fd1e-426b-a0ab-be59fd908c8c"}
CITY=${CITY:-"CDMX"}
TIER=${TIER:-"direct"}
HOURS=${HOURS:-4}

start_ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
end_ts=$(date -u -d "+${HOURS} hour" +%Y-%m-%dT%H:%M:%SZ)

have_jq=1
command -v jq >/dev/null 2>&1 || have_jq=0

pass() { echo "[PASS] $1"; }
fail() { echo "[FAIL] $1"; echo "Last response:"; echo "$2" | sed 's/\\n/\n/g'; exit 1; }
json_field() { # $1=json $2=field
  if [ $have_jq -eq 1 ]; then echo "$1" | jq -r ".$2"; else echo "$1" | grep -o '"'$2'"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:"//;s/"$//'; fi
}

echo "FN=$FN"
echo "Running acceptance tests..."; echo

# AT-1: Pricing quote
REQ_PRICING=$(cat <<JSON
{ "city":"$CITY", "tier":"$TIER", "armed_required":false, "vehicle_required":false, "start_ts":"$start_ts", "end_ts":"$end_ts" }
JSON
)
R1=$(curl -s -S -X POST "$FN/pricing" -H 'Content-Type: application/json' -d "$REQ_PRICING" || true)
quote_amount=$(json_field "$R1" quote_amount || echo "")
[ -n "$quote_amount" ] || fail "AT-1 Pricing quote" "$R1"
pass "AT-1 Pricing quote (quote_amount=$quote_amount)"

# AT-2: Create booking
REQ_BOOKING=$(cat <<JSON
{ "client_id":"$CLIENT_ID", "city":"$CITY", "tier":"$TIER", "armed_required":false, "vehicle_required":false, "start_ts":"$start_ts", "end_ts":"$end_ts", "origin_lat":19.4326, "origin_lng":-99.1332, "notes":"AT flow" }
JSON
)
R2=$(curl -s -S -X POST "$FN/bookings" -H 'Content-Type: application/json' -d "$REQ_BOOKING" || true)
booking_id=$(json_field "$R2" booking_id || echo "")
[ -n "$booking_id" ] || fail "AT-2 Create booking" "$R2"
pass "AT-2 Create booking (booking_id=$booking_id)"

# AT-3: Preauth payment
preauth_amount=$(json_field "$R1" preauth_amount || echo "")
[ -n "$preauth_amount" ] || preauth_amount=$quote_amount
R3=$(curl -s -S -X POST "$FN/payments_preauth" -H 'Content-Type: application/json' -d "{\"booking_id\":\"$booking_id\",\"amount\":$preauth_amount}" || true)
ok3=$(json_field "$R3" ok || echo "")
[ "$ok3" = "true" ] || fail "AT-3 Payment preauth" "$R3"
pass "AT-3 Payment preauth"

# AT-4: Confirm booking (move to matching)
R4=$(curl -s -S -X POST "$FN/bookings_confirm" -H 'Content-Type: application/json' -d "{\"booking_id\":\"$booking_id\"}" || true)
ok4=$(json_field "$R4" ok || echo "")
[ "$ok4" = "true" ] || fail "AT-4 Booking confirm" "$R4"
pass "AT-4 Booking confirm"

# AT-5: Run matching
R5=$(curl -s -S -X POST "$FN/matching" -H 'Content-Type: application/json' -d "{\"booking_id\":\"$booking_id\"}" || true)
offered_count=0
if [ $have_jq -eq 1 ]; then
  offered_count=$(echo "$R5" | jq '.offered_to | length')
else
  offered_count=$(echo "$R5" | grep -o 'c38efbac-fd1e-426b-a0ab-be59fd908c8c' | wc -l | tr -d ' ')
fi
[ "$offered_count" -ge 1 ] || fail "AT-5 Matching offered guards" "$R5"
pass "AT-5 Matching (offered_to count=$offered_count)"

# AT-6: Guard lists jobs (status offered)
R6=$(curl -s -S "$FN/jobs/list?guard_id=$GUARD_ID" || true)
assignment_id=""
if [ $have_jq -eq 1 ]; then
  assignment_id=$(echo "$R6" | jq -r '.jobs[0].id // empty')
else
  assignment_id=$(echo "$R6" | grep -o '"id" *: *"[^"]*"' | head -1 | sed 's/.*:"//;s/"$//')
fi
[ -n "$assignment_id" ] || fail "AT-6 Guard list jobs" "$R6"
pass "AT-6 Guard list jobs (assignment_id=$assignment_id)"

# AT-7: Guard accepts job
R7=$(curl -s -S -X POST "$FN/jobs/accept" -H 'Content-Type: application/json' -d "{\"assignment_id\":\"$assignment_id\"}" || true)
ok7=$(json_field "$R7" ok || echo "")
[ "$ok7" = "true" ] || fail "AT-7 Guard accept" "$R7"
pass "AT-7 Guard accept"

# AT-8: Progress statuses to completed
for st in check_in on_site in_progress check_out completed; do
  Ri=$(curl -s -S -X POST "$FN/jobs/status" -H 'Content-Type: application/json' -d "{\"assignment_id\":\"$assignment_id\",\"status\":\"$st\"}" || true)
  oki=$(json_field "$Ri" ok || echo "")
  [ "$oki" = "true" ] || fail "AT-8 status $st" "$Ri"
  echo "  -> progressed $st"
done
pass "AT-8 Status progression"

echo
echo "All acceptance tests PASSED"

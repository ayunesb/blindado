#!/usr/bin/env bash
set -euo pipefail

# Config (override via env)
FN="${FN:-https://isnezquuwepqcjkaupjh.supabase.co/functions/v1}"
CLIENT_ID="${CLIENT_ID:-1b387371-6711-485c-81f7-79b2174b90fb}"
GUARD_ID="${GUARD_ID:-c38efbac-fd1e-426b-a0ab-be59fd908c8c}"
CITY="${CITY:-CDMX}"
TIER="${TIER:-direct}"
DUR_HOURS="${DUR_HOURS:-4}"

# Optional: supply your project's anon key to satisfy the API gateway
# e.g., export ANON="$(op read supabase_anon_key)" or set in CI secrets
ANON="${ANON:-}"

# Build curl header array (includes apikey/Authorization when ANON is provided)
HEADERS=(-H 'content-type: application/json')
if [[ -n "$ANON" ]]; then
  HEADERS+=( -H "apikey: $ANON" -H "Authorization: Bearer $ANON" )
fi

# Timestamps (UTC ISO)
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
END="$(date -u -d "+${DUR_HOURS} hour" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || gdate -u -d "+${DUR_HOURS} hour" +%Y-%m-%dT%H:%M:%SZ)"

echo "FN          = $FN"
echo "CLIENT_ID   = $CLIENT_ID"
echo "GUARD_ID    = $GUARD_ID"
echo "CITY/TIER   = $CITY/$TIER"
echo "WINDOW      = $NOW → $END"
echo

# AT-1 Pricing
QUOTE_JSON=$(cat <<JSON
{"city":"$CITY","tier":"$TIER","armed_required":false,"vehicle_required":false,
 "start_ts":"$NOW","end_ts":"$END"}
JSON
)
echo "→ pricing"
PRICING=$(curl -fsS -X POST "$FN/pricing" "${HEADERS[@]}" -d "$QUOTE_JSON")
echo "$PRICING"
AMOUNT=$(echo "$PRICING" | jq -r '.quote_amount // .amount // 0')

# AT-2 Create Booking
CREATE_JSON=$(cat <<JSON
{"client_id":"$CLIENT_ID","city":"$CITY","tier":"$TIER",
 "armed_required":false,"vehicle_required":false,
 "start_ts":"$NOW","end_ts":"$END",
 "origin_lat":19.4326,"origin_lng":-99.1332}
JSON
)
echo
echo "→ bookings"
BOOKING_RES=$(curl -fsS -X POST "$FN/bookings" "${HEADERS[@]}" -d "$CREATE_JSON")
echo "$BOOKING_RES"
BOOKING_ID=$(echo "$BOOKING_RES" | jq -r '.booking_id // .id')
test -n "$BOOKING_ID"

# AT-3 Preauth (stub)
echo
echo "→ payments_preauth"
curl -fsS -X POST "$FN/payments_preauth" "${HEADERS[@]}" \
  -d "{\"booking_id\":\"$BOOKING_ID\",\"amount\":$AMOUNT}" | jq .

# AT-4 Confirm & Match
echo
echo "→ bookings_confirm"
curl -fsS -X POST "$FN/bookings_confirm" "${HEADERS[@]}" \
  -d "{\"booking_id\":\"$BOOKING_ID\"}" | jq .

echo
echo "→ matching"
curl -fsS -X POST "$FN/matching" "${HEADERS[@]}" \
  -d "{\"booking_id\":\"$BOOKING_ID\"}" | jq .

# AT-5 Jobs list & accept
echo
echo "→ jobs/list"
LIST=$(curl -fsS "$FN/jobs/list?guard_id=$GUARD_ID" "${HEADERS[@]}")
echo "$LIST" | jq .
ASSIGN_ID=$(echo "$LIST" | jq -r '.items[0].assignment_id // .items[0].id // .[0].assignment_id // .[0].id // empty')
test -n "$ASSIGN_ID"

echo
echo "→ jobs/accept"
curl -fsS -X POST "$FN/jobs/accept" "${HEADERS[@]}" \
  -d "{\"assignment_id\":\"$ASSIGN_ID\"}" | jq .

# AT-6 Status timeline
for s in check_in on_site in_progress check_out completed; do
  echo
  echo "→ jobs/status $s"
  curl -fsS -X POST "$FN/jobs/status" "${HEADERS[@]}" \
    -d "{\"assignment_id\":\"$ASSIGN_ID\",\"status\":\"$s\"}" | jq .
done

echo
echo "✅ Smoke OK — booking_id=$BOOKING_ID assignment_id=$ASSIGN_ID"

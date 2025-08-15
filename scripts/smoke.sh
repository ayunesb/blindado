#!/usr/bin/env bash
set -euo pipefail

# Resolve Functions base URL
if [[ -z "${FN:-}" ]]; then
  if [[ -n "${SUPABASE_URL:-}" ]]; then FN="$SUPABASE_URL/functions/v1"; fi
fi
if [[ -z "${FN:-}" && -n "${SUPABASE_PROJECT_REF:-}" ]]; then
  FN="https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1"
fi
FN="${FN:-https://isnezquuwepqcjkaupjh.supabase.co/functions/v1}"

# Config
CLIENT_ID="${CLIENT_ID:-1b387371-6711-485c-81f7-79b2174b90fb}"
GUARD_ID="${GUARD_ID:-c38efbac-fd1e-426b-a0ab-be59fd908c8c}"
CITY="${CITY:-CDMX}"
TIER="${TIER:-direct}"
DUR_HOURS="${DUR_HOURS:-4}"
ANON="${ANON:-${SUPABASE_ANON_KEY:-}}"
ADMIN="${ADMIN:-${ADMIN_API_SECRET:-}}"
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}"
STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY:-}"

# CI requires ANON for the Functions gateway
if [[ "${GITHUB_ACTIONS:-}" == "true" && -z "${ANON}" ]]; then
  echo "[ERROR] SUPABASE_ANON_KEY (ANON) is not set. Configure it in GitHub Settings → Secrets and variables → Actions."
  exit 1
fi

# Auth headers
AUTH_ARGS=()
if [[ -n "${ANON:-}" ]]; then AUTH_ARGS=(-H "apikey: $ANON" -H "Authorization: Bearer $ANON"); fi

# Timestamps (UTC ISO)
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
END="$(date -u -d "+${DUR_HOURS} hour" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || gdate -u -d "+${DUR_HOURS} hour" +%Y-%m-%dT%H:%M:%SZ)"

echo "FN=$FN"
echo "CLIENT_ID=$CLIENT_ID"
echo "GUARD_ID=$GUARD_ID"
echo "CITY/TIER=$CITY/$TIER"
echo "ANON set? $([[ -n "${ANON:-}" ]] && echo yes || echo no)"
echo

# AT-1: Pricing
QUOTE_JSON=$(cat <<JSON
{"city":"$CITY","tier":"$TIER","armed_required":false,"vehicle_required":false,
 "start_ts":"$NOW","end_ts":"$END"}
JSON
)
echo "→ pricing"
PRICING=$(curl -fsS "${AUTH_ARGS[@]}" -X POST "$FN/pricing" -H 'content-type: application/json' -d "$QUOTE_JSON")
echo "$PRICING"
AMOUNT=$(echo "$PRICING" | jq -r '.quote_amount // .amount // 0')

# AT-2: Create Booking
CREATE_JSON=$(cat <<JSON
{"client_id":"$CLIENT_ID","city":"$CITY","tier":"$TIER",
 "armed_required":false,"vehicle_required":false,
 "start_ts":"$NOW","end_ts":"$END",
 "origin_lat":19.4326,"origin_lng":-99.1332}
JSON
)
echo
echo "→ bookings"
BOOKING_RES=$(curl -fsS "${AUTH_ARGS[@]}" -X POST "$FN/bookings" -H 'content-type: application/json' -d "$CREATE_JSON")
echo "$BOOKING_RES"
BOOKING_ID=$(echo "$BOOKING_RES" | jq -r '.booking_id // .id')
test -n "$BOOKING_ID"

# AT-3: Preauth (stub)
echo
echo "→ payments_preauth"
curl -fsS "${AUTH_ARGS[@]}" -X POST "$FN/payments_preauth" -H 'content-type: application/json' \
  -d "{\"booking_id\":\"$BOOKING_ID\",\"amount\":$AMOUNT}" | jq .

# AT-4: Confirm & Match
echo
echo "→ bookings_confirm"
curl -fsS "${AUTH_ARGS[@]}" -X POST "$FN/bookings_confirm" -H 'content-type: application/json' \
  -d "{\"booking_id\":\"$BOOKING_ID\"}" | jq .

echo
echo "→ matching"
curl -fsS "${AUTH_ARGS[@]}" -X POST "$FN/matching" -H 'content-type: application/json' \
  -d "{\"booking_id\":\"$BOOKING_ID\"}" | jq .

# AT-5: Jobs list & accept
echo
echo "→ jobs/list"
LIST=$(curl -fsS "${AUTH_ARGS[@]}" "$FN/jobs/list?guard_id=$GUARD_ID")
echo "$LIST" | jq .
ASSIGN_ID=$(echo "$LIST" | jq -r '.items[0].assignment_id // .items[0].id // .[0].assignment_id // .[0].id // empty')
test -n "$ASSIGN_ID"

echo
echo "→ jobs/accept"
curl -fsS "${AUTH_ARGS[@]}" -X POST "$FN/jobs/accept" -H 'content-type: application/json' \
  -d "{\"assignment_id\":\"$ASSIGN_ID\"}" | jq .

# AT-6: Status timeline
for s in check_in on_site in_progress check_out completed; do
  echo
  echo "→ jobs/status $s"
  curl -fsS "${AUTH_ARGS[@]}" -X POST "$FN/jobs/status" -H 'content-type: application/json' \
    -d "{\"assignment_id\":\"$ASSIGN_ID\",\"status\":\"$s\"}" | jq .
done

echo
echo "✅ Smoke OK — booking_id=$BOOKING_ID assignment_id=$ASSIGN_ID"

# Optional Stripe create-intent check if Stripe keys are present
stripe_test() {
  echo "[stripe] payments_create_intent"
  local req
  req=$(cat <<JSON
{"amount": ${AMOUNT:-1000}, "currency": "mxn", "booking_id": "$BOOKING_ID"}
JSON
)
  local resp
  resp=$(curl -fsS "${AUTH_ARGS[@]}" -X POST "$FN/payments_create_intent" -H 'content-type: application/json' -d "$req")
  echo "$resp" | jq .
  local cs
  cs=$(echo "$resp" | jq -r '.client_secret // empty')
  test -n "$cs" || { echo "missing client_secret"; exit 1; }
}

if [[ -n "$STRIPE_SECRET_KEY" && -n "$STRIPE_PUBLISHABLE_KEY" ]]; then stripe_test; fi

# Locations (optional simple check)
echo
echo "→ locations heartbeat"
curl -fsS "${AUTH_ARGS[@]}" -X POST "$FN/locations" -H 'content-type: application/json' \
  -d "{\"op\":\"heartbeat\",\"guard_id\":\"$GUARD_ID\",\"lat\":19.44,\"lng\":-99.14}" | jq .

echo
echo "→ locations get guard"
curl -fsS "${AUTH_ARGS[@]}" "$FN/locations?guard_id=$GUARD_ID" | jq .

# Admin smoke (optional, gated by ADMIN)
if [[ -n "${ADMIN:-}" ]]; then
  echo
  echo "→ admin_documents (JSON signed URL)"
  TS=$(date +%s)
  DOC_PATH="smoke/${GUARD_ID}/${TS}.txt"
  ADMIN_DOCS_REQ=$(cat <<JSON
{"bucket":"avatars","path":"$DOC_PATH","contentType":"text/plain"}
JSON
)
  ADMIN_HEADERS=("${AUTH_ARGS[@]}" -H "x-admin-secret: $ADMIN" -H 'content-type: application/json')
  ADMIN_DOCS_RES=$(curl -fsS "${ADMIN_HEADERS[@]}" -X POST "$FN/admin_documents" -d "$ADMIN_DOCS_REQ")
  echo "$ADMIN_DOCS_RES" | jq .
  SIGNED_URL=$(echo "$ADMIN_DOCS_RES" | jq -r '.signedUrl // empty')
  test -n "$SIGNED_URL"
  # Upload a tiny payload to the signed URL
  curl -fsS -X PUT "$SIGNED_URL" -H 'x-upsert: true' -H 'content-type: text/plain' --data-binary $'smoke\n' >/dev/null

  echo
  echo "→ admin_licenses (JSON upsert)"
  ADMIN_LIC_REQ=$(cat <<JSON
{"guard_id":"$GUARD_ID","type":"id_card","files":[{"path":"$DOC_PATH"}],"status":"valid"}
JSON
)
  ADMIN_LIC_RES=$(curl -fsS "${ADMIN_HEADERS[@]}" -X POST "$FN/admin_licenses" -d "$ADMIN_LIC_REQ")
  echo "$ADMIN_LIC_RES" | jq .
  LIC_ID=$(echo "$ADMIN_LIC_RES" | jq -r '.license_id // empty')
  test -n "$LIC_ID"

  echo
  echo "✅ Admin smoke OK — license_id=$LIC_ID"
fi

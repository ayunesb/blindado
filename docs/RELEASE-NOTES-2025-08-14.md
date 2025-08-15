# Release: Edge Functions import-map hardening and redeploy (2025-08-14)

## Executive summary

Standardized all Edge Functions to short import specifiers via a central import map, fixed per-function import-map EOF errors, and redeployed every function. Core booking pipeline is green end-to-end in smoke. Remaining gap: /locations_heartbeat can return “Invalid API key” when the gateway omits/uses a bad ANON. Per-function import maps stay for now to keep CLI bundling stable.

## What changed

- Root config: deno.json now points to repo-level import_map.json.
- Root import_map.json: aliases for std/http/server.ts and @supabase/supabase-js.
- Migrated all functions to short specifiers.
- Normalized per-function import_map.json (fixed prior “EOF”).
- Redeployed (JWT disabled): admin_documents, admin_licenses, admin_seed, bookings, bookings_confirm, jobs, kyc_webhook, locations, locations_heartbeat, locations_token, matching, org_invites, org_portal, payments_preauth, pricing, uploads.
- Smoke: pricing → bookings → preauth → confirm → matching → jobs list/accept/status ✅
- Note: locations_heartbeat can 401/403 with “Invalid API key” if ANON header is absent/incorrect.

## Why it changed (problem → fix)

- Problem: inconsistent/empty per-function import maps caused “failed to parse import map: EOF” and brittle absolute imports.
- Fix: centralized aliases, switched to short imports, and standardized per-function maps for bundling.

## Risk / rollback

- Risks: import alias mismatch; CLI still prefers per-function maps; gateway calls fail without proper ANON.
- Rollback: revert this release and redeploy affected functions with:
  - supabase functions deploy <name> --no-verify-jwt

## Verification (exact commands)

```bash
export FN='https://isnezquuwepqcjkaupjh.supabase.co/functions/v1'
export SUPABASE_ANON_KEY='<your anon key>'
export ANON="$SUPABASE_ANON_KEY"

# Smoke (end-to-end)
ANON="$ANON" FN="$FN" ./scripts/smoke.sh

# Acceptance tests (subset)
ANON="$ANON" FN="$FN" ./scripts/at.sh

# Pricing (direct cURL with correct headers/quoting)
START=$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%SZ)
END=$(date -u -d '+5 hour' +%Y-%m-%dT%H:%M:%SZ)

curl -sS "$FN/pricing" \
  -H 'content-type: application/json' \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -d "$(jq -n \
        --arg city 'CDMX' \
        --arg tier 'direct' \
        --arg start "$START" \
        --arg end "$END" \
        --argjson origin '{lat:19.4326,lng:-99.1332}' \
        '{city:$city,tier:$tier,armed_required:false,vehicle_required:false,vehicle_type:null,start_ts:$start,end_ts:$end,origin:$origin}')"

# Admin seeder (for pricing rules)
export ADMIN='<your admin secret>'
curl -sS "$FN/admin_seed" \
  -H 'content-type: application/json' \
  -H "x-admin-secret: $ADMIN" \
  -d '{"seed":"pricing_rules"}'

# Heartbeat (ensure ANON headers present)
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
curl -sS -X POST "$FN/locations_heartbeat" \
  -H 'content-type: application/json' \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -d "{\"guard_id\":\"<GUID>\",\"lat\":19.4326,\"lng\":-99.1332,\"ts\":\"$NOW\"}"

# CORS preflight spot check
curl -i -X OPTIONS "$FN/pricing" \
  -H 'origin: https://app.escolta.services' \
  -H 'access-control-request-method: POST' \
  -H 'access-control-request-headers: content-type, authorization, apikey'
```

## Checklist

- [ ] SUPABASE_ANON_KEY configured in CI & local env
- [ ] All functions redeployed without bundler errors
- [ ] ./scripts/smoke.sh passes end-to-end
- [ ] locations_heartbeat verified (or DEV_ALLOW_PLAINTEXT_HEARTBEAT set in non-prod)
- [ ] PR reviewed/approved
- [ ] Rollback plan validated

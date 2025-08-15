// Lightweight Deno test harness to ping pricing (quote) and kyc_webhook (unauthorized case)
// Run with: deno test --allow-env --allow-net tests/edge_functions_test.ts
// Requires environment variables to point to a deployed project; tests are basic smoke checks.

const BASE = Deno.env.get('BLINDADO_BASE_URL'); // e.g. https://isnezquuwepqcjkaupjh.supabase.co/functions/v1
if (!BASE) {
  console.warn('Skipping tests: BLINDADO_BASE_URL not set');
  Deno.exit(0);
}

Deno.test('pricing quote basic', async () => {
  const body = {
    client_id: 'test-client',
    city: 'CDMX',
    tier: 'direct',
    armed_required: false,
    vehicle_required: false,
    start_ts: new Date().toISOString(),
    end_ts: new Date(Date.now() + 3600_000).toISOString(),
    origin: { lat: 19.43, lng: -99.13 },
    notes: 'test',
  };
  const r = await fetch(`${BASE}/pricing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('pricing failed ' + r.status);
  const json = await r.json();
  if (typeof json.total !== 'number') throw new Error('missing total');
});

Deno.test('kyc_webhook unauthorized without secret', async () => {
  const r = await fetch(`${BASE}/kyc_webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: 'x', status: 'pending' }),
  });
  if (r.status !== 401 && r.status !== 500) {
    // allow 500 if secret missing in deployed env
    throw new Error('expected unauthorized/500, got ' + r.status);
  }
});

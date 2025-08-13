// @ts-nocheck
// deno test --allow-env --allow-net tests/locations_test.ts
// Requires env: BLINDADO_BASE_URL (https://<ref>.supabase.co/functions/v1), BLINDADO_ANON, GUARD_ID

const BASE_LOC = Deno.env.get('BLINDADO_BASE_URL');
const ANON = Deno.env.get('BLINDADO_ANON') || Deno.env.get('ANON');
const GUARD_ID = Deno.env.get('GUARD_ID') || 'c38efbac-fd1e-426b-a0ab-be59fd908c8c';

if (!BASE_LOC || !ANON) {
  console.warn('Skipping locations tests: set BLINDADO_BASE_URL and BLINDADO_ANON');
  Deno.exit(0);
}

const auth = { 'content-type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` };

Deno.test('locations heartbeat', async () => {
  const body = { op: 'heartbeat', guard_id: GUARD_ID, lat: 19.44, lng: -99.14 };
  const r = await fetch(`${BASE_LOC}/locations`, { method: 'POST', headers: auth, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`heartbeat failed: ${r.status}`);
  const j = await r.json();
  if (!j.ok) throw new Error(`heartbeat not ok: ${JSON.stringify(j)}`);
});

Deno.test('locations get guard', async () => {
  const r = await fetch(`${BASE_LOC}/locations?guard_id=${GUARD_ID}`, { headers: auth });
  if (r.status === 404) return; // acceptable if guard not present
  if (!r.ok) throw new Error(`get guard failed: ${r.status}`);
  const j = await r.json();
  if (!('home_lat' in j)) throw new Error('missing home_lat');
});

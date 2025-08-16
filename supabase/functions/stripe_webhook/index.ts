import { serve } from 'std/http/server.ts';
import { preflight, badRequest, ok, withCors } from '../_shared/http.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, stripe-signature',
  'Content-Type': 'application/json',
};

function json(res: unknown, init: number | ResponseInit = 200) {
  const base = typeof init === 'number' ? { status: init } : init;
  return new Response(JSON.stringify(res), {
    ...base,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders,
      ...((base?.headers as Record<string, string>) ?? {}),
    },
  });
}

function bad(msg: string, status = 400) {
  return json({ error: msg }, status);
}

function env(name: string) {
  return Deno.env.get(name) ?? '';
}

function parseStripeSigHeader(h: string | null) {
  if (!h) return null;
  const parts = h.split(',').map((s) => s.trim());
  const out: Record<string, string> = {};
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (k && v) out[k] = v;
  }
  if (!out.t || !out.v1) return null;
  return { t: out.t, v1: out.v1 };
}

async function hmacSHA256Hex(secret: string, payload: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

type SplitsBps = {
  tax_bps: number;
  fee_bps: number;
  freelancer_bps: number;
  company_bps: number;
};

type PI = {
  id: string;
  amount: number;
  amount_received?: number;
  currency: string;
  metadata?: Record<string, string>;
  transfer_group?: string;
};

function computeSplit(amount: number, bps: SplitsBps) {
  const calc = (p: number) => Math.floor((amount * p) / 10_000);
  const parts: any = {
    taxes: calc(bps.tax_bps),
    fees: calc(bps.fee_bps),
    freelancers: calc(bps.freelancer_bps),
    companies: calc(bps.company_bps),
  };
  let sum = parts.taxes + parts.fees + parts.freelancers + parts.companies;
  if (sum !== amount) {
    const entries = Object.entries(parts).sort((a: any, b: any) => b[1] - a[1]);
    const [largestKey, largestVal] = entries[0];
    parts[largestKey] = largestVal + (amount - sum);
  }
  return parts as { taxes: number; fees: number; freelancers: number; companies: number };
}

function formEncode(obj: Record<string, string | number | boolean | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    sp.append(k, String(v));
  }
  return sp;
}

serve(withCors(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return badRequest('Method not allowed');

  const STRIPE_WEBHOOK_SECRET = env('STRIPE_WEBHOOK_SECRET');
  if (!STRIPE_WEBHOOK_SECRET) return badRequest('Webhook secret not configured');

  const sigHeader = req.headers.get('stripe-signature');
  const parsed = parseStripeSigHeader(sigHeader);
  if (!parsed) return badRequest('Missing/invalid Stripe-Signature');

  const payload = await req.text();
  const signedPayload = `${parsed.t}.${payload}`;
  const expected = await hmacSHA256Hex(STRIPE_WEBHOOK_SECRET, signedPayload);
  if (!constantTimeEqual(expected, parsed.v1)) return bad('Invalid signature');

  let event: any;
  try {
    event = JSON.parse(payload);
  } catch {
  return badRequest('Invalid JSON payload');
  }

  if (event.type !== 'payment_intent.succeeded') {
    // Acknowledge unrelated events (e.g., setup_intent.*, payment_intent.payment_failed)
  return ok({ ok: true, ignored: event.type });
  }

  // Handle Thin payloads by expanding the event to include data.object
  let STRIPE_SECRET_KEY = env('STRIPE_SECRET_KEY');
  let pi: PI | null =
    event?.data?.object &&
    typeof event.data.object === 'object' &&
    event.data.object.object === 'payment_intent'
      ? (event.data.object as PI)
      : null;

  if (!pi) {
    if (!STRIPE_SECRET_KEY) {
      return bad(
        'Thin payload received but STRIPE_SECRET_KEY not configured to expand event. Use Snapshot payload or set secret.',
        501,
      );
    }
    try {
      const res = await fetch(
        `https://api.stripe.com/v1/events/${encodeURIComponent(event.id)}?expand[]=data.object`,
        {
          headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
        },
      );
      if (!res.ok) {
        const txt = await res.text();
  return badRequest(`Failed to expand Stripe event: ${res.status} ${txt}`);
      }
      const expanded = await res.json();
      const obj = expanded?.data?.object;
      if (!obj || obj.object !== 'payment_intent')
  return badRequest('Expanded event missing PaymentIntent');
      event = expanded;
      pi = obj as PI;
    } catch (e) {
  return badRequest(`Error expanding Stripe event: ${String(e)}`);
    }
  }
  // Ensure secret key exists for transfers even if expansion happened
  STRIPE_SECRET_KEY = env('STRIPE_SECRET_KEY');
  if (!STRIPE_SECRET_KEY) return badRequest('Stripe secret not configured');

  const booking_id = pi?.metadata?.booking_id || pi.transfer_group || pi.id;
  const total = pi.amount_received ?? pi.amount ?? 0;
  const currency = (pi.currency || 'mxn').toLowerCase();
  let splitsBps: SplitsBps = {
    tax_bps: 1600,
    fee_bps: 1000,
    freelancer_bps: 6000,
    company_bps: 1400,
  };
  try {
    if (pi?.metadata?.splits_bps_json) splitsBps = JSON.parse(pi.metadata.splits_bps_json);
  } catch {}

  const parts = computeSplit(total, splitsBps);

  const DEST = {
    tax: env('CONNECT_ACCOUNT_TAX'),
    fees: env('CONNECT_ACCOUNT_FEES'),
    freelancers: env('CONNECT_ACCOUNT_FREELANCERS'),
    companies: env('CONNECT_ACCOUNT_COMPANIES'),
  };

  const transfers: any[] = [];
  const doTransfer = async (amount: number, destination: string, label: string) => {
    const body = formEncode({
      amount,
      currency,
      destination,
      description: `${booking_id} • ${label}`,
      transfer_group: booking_id,
    });
    const res = await fetch('https://api.stripe.com/v1/transfers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        // Idempotency per booking_id+bucket
        'Idempotency-Key': `${booking_id}:${label}`,
      },
      body,
    });
    const j = await res.json();
  if (!res.ok) throw new Error(`Transfer ${label} failed: ${JSON.stringify(j)}`);
    transfers.push({ label, id: j.id, amount: j.amount });
  };

  try {
    if (parts.taxes > 0 && DEST.tax) await doTransfer(parts.taxes, DEST.tax, 'taxes');
    if (parts.fees > 0 && DEST.fees) await doTransfer(parts.fees, DEST.fees, 'fees');
    if (parts.freelancers > 0 && DEST.freelancers)
      await doTransfer(parts.freelancers, DEST.freelancers, 'freelancers');
    if (parts.companies > 0 && DEST.companies)
      await doTransfer(parts.companies, DEST.companies, 'companies');
  } catch (e) {
    return ok({ ok: false, booking_id, error: String(e), partial_transfers: transfers });
  }

  return ok({ ok: true, booking_id, transfers });
}));

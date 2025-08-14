import { serve } from "std/http/server.ts";

type CreateReq = {
  booking_id?: string;
  currency?: string; // default "mxn"
  amount: number;    // smallest unit
  city?: string;
  tier?: string;
  customer_email?: string;
};

type SplitsBps = {
  tax_bps: number;
  fee_bps: number;
  freelancer_bps: number;
  company_bps: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, stripe-signature",
  "Content-Type": "application/json"
};

function json(res: unknown, init: number | ResponseInit = 200) {
  const base = typeof init === "number" ? { status: init } : init;
  return new Response(JSON.stringify(res), {
    ...base,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...(base?.headers as Record<string, string> ?? {}),
    },
  });
}

function bad(msg: string, status = 400) {
  return json({ error: msg }, status);
}

function env(name: string) {
  return Deno.env.get(name) ?? "";
}

// Flattens keys like "automatic_payment_methods[enabled]".
function formEncode(obj: Record<string, string | number | boolean | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    sp.append(k, String(v));
  }
  return sp;
}

function getSplits(): SplitsBps {
  const parse = (v: string | undefined, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : d;
  };
  return {
    tax_bps:        parse(Deno.env.get("SPLIT_TAX_BPS"),        1600), // 16.00%
    fee_bps:        parse(Deno.env.get("SPLIT_FEE_BPS"),        1000), // 10.00%
    freelancer_bps: parse(Deno.env.get("SPLIT_FREELANCER_BPS"), 6000), // 60.00%
    company_bps:    parse(Deno.env.get("SPLIT_COMPANY_BPS"),    1400), // 14.00%
  };
}

function normalizeCurrency(c?: string) {
  return (c || "mxn").toLowerCase();
}

function ensureBookingId(id?: string) {
  if (id && id.trim()) return id.trim();
  // Simple unique-ish id for grouping transfers.
  const rnd = crypto.getRandomValues(new Uint8Array(6));
  const hex = Array.from(rnd).map(b => b.toString(16).padStart(2, "0")).join("");
  return `bk_${hex}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return bad("Method not allowed", 405);
  }

  let body: CreateReq;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON");
  }

  const amount = Number(body.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return bad("amount must be a positive integer (smallest unit)");
  }
  const currency = normalizeCurrency(body.currency);
  const booking_id = ensureBookingId(body.booking_id);

  const STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY");
  const STRIPE_PUBLISHABLE_KEY = env("STRIPE_PUBLISHABLE_KEY");

  // If secrets missing, return demo mode so frontend can fallback gracefully.
  if (!STRIPE_SECRET_KEY || !STRIPE_PUBLISHABLE_KEY) {
    return json(
      {
        demo: true,
        reason: "Stripe keys not configured",
        publishable_key: STRIPE_PUBLISHABLE_KEY || null,
      },
      501,
    );
  }

  const splits = getSplits();
  const splits_bps_json = JSON.stringify(splits);

  // Create PaymentIntent
  const params = formEncode({
    amount,
    currency,
    "automatic_payment_methods[enabled]": true,
    receipt_email: body.customer_email || "",
    transfer_group: booking_id,
    "metadata[booking_id]": booking_id,
    "metadata[city]": body.city || "",
    "metadata[tier]": body.tier || "",
    "metadata[splits_bps_json]": splits_bps_json,
  });

  const res = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const pi = await res.json();
  if (!res.ok) {
    return json({ error: "stripe_error", details: pi }, 500);
  }

  return json({
    client_secret: pi.client_secret,
    publishable_key: STRIPE_PUBLISHABLE_KEY,
    transfer_group: booking_id,
    splits_bps: splits,
  });
});

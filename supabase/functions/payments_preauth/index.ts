// payments_preauth: stub preauth; writes payments+updates booking
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

function setCORSHeaders(headers: Headers) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Content-Type", "application/json");
}

serve(async (req) => {
  const headers = new Headers();
  setCORSHeaders(headers);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  const { booking_id, amount } = await req.json();
  if (!booking_id || !amount) {
    return new Response(JSON.stringify({ error: "Missing booking_id or amount" }), { status: 400, headers });
  }

  // Use service role key from env
  const supabaseUrl = Deno.env.get("BLINDADO_SUPABASE_URL");
  const supabaseKey = Deno.env.get("BLINDADO_SUPABASE_SERVICE_ROLE_KEY");
  const api = `${supabaseUrl}/rest/v1`;
  const authHeaders = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type": "application/json"
  };


  // Insert payment row with required fields
  const paymentRes = await fetch(`${api}/payments`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      booking_id,
      provider: "stub",
      amount_preauth: amount,
      status: "preauthorized"
    })
  });
  if (!paymentRes.ok) {
    return new Response(JSON.stringify({ error: "Failed to insert payment" }), { status: 500, headers });
  }

  // Update booking status
  const bookingRes = await fetch(`${api}/bookings?id=eq.${booking_id}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ status: "preauthorized" })
  });
  if (!bookingRes.ok) {
    return new Response(JSON.stringify({ error: "Failed to update booking" }), { status: 500, headers });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
});

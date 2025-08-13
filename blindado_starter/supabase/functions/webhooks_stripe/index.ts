
import { serve } from "serve";

// Placeholder; validate signatures in production
serve(async (req) => {
  const event = await req.json().catch(() => ({}));
  // TODO: handle payment_intent.succeeded/failed, charge.refunded, etc.
  console.log("stripe webhook", event?.type);
  return new Response("ok");
});

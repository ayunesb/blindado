// src/client/services/booking.ts
import type { SupabaseClient } from '@supabase/supabase-js';

// Submits a booking lead via the secured Edge Function only (no direct table inserts from browser)
export async function submitBookingLead(
  supabase: SupabaseClient,
  payload: { pickupLocation: string; pickupIso: string; durationHours: number }
) {
  const params = new URLSearchParams(window.location.search);
  const stub = params.has('stub') || (import.meta as any).env?.VITE_STUB_API === 'true';
  if (stub) {
    await new Promise((r) => setTimeout(r, 150));
    return { ok: true, data: { booking_id: 'stub-id' } } as const;
  }
  const start = new Date(payload.pickupIso);
  const end = new Date(start.getTime() + payload.durationHours * 60 * 60 * 1000);

  // Minimal payload expected by the 'bookings' function
  const body = {
    city: 'NYC', // Frontend demo targets NYC; backend accepts free-text city
    start_ts: start.toISOString(),
    end_ts: end.toISOString(),
    pickup_address: payload.pickupLocation,
    tier: 'direct',
    armed_required: false,
    vehicle_required: false,
  };

  const { data, error } = await supabase.functions.invoke('bookings', { body });
  if (error) throw error;
  return { ok: true, data } as const;
}

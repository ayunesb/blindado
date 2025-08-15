// src/client/services/booking.ts
import type { SupabaseClient } from '@supabase/supabase-js';

export async function submitBookingLead(
  supabase: SupabaseClient,
  payload: { pickupLocation: string; pickupIso: string; durationHours: number }
) {
  // Try edge function first
  try {
    const { data, error } = await supabase.functions.invoke('bookings', { body: payload });
    if (error) throw error;
    return { ok: true, data } as const;
  } catch (e) {
    // Fallback to direct insert (adjust table/columns per schema)
    const { data, error } = await supabase
      .from('booking_leads')
      .insert({
        pickup_location: payload.pickupLocation,
        pickup_at: payload.pickupIso,
        duration_hours: payload.durationHours,
        source: 'web',
      })
      .select()
      .single();
    if (error) throw error;
    return { ok: true, data } as const;
  }
}


# Blindado — Starter Monorepo (Supabase + Edge Functions + RN Apps)

## Structure
- `supabase/migrations/001_init.sql` — DB schema + RLS enablement
- `supabase/functions/*` — Deno edge function stubs
- `mobile/` — placeholder for React Native (Expo) apps (Client/Guard)
- `admin/` — placeholder for Admin web (React + Vite)

## Prereqs
- Supabase CLI
- Deno (for local edge function testing)
- Node 18+ (apps), Expo CLI

## Quickstart
1. Create a new Supabase project; set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your env.
2. Run migrations:
   ```bash
   supabase db push
   ```
3. Deploy Edge Functions:
   ```bash
   supabase functions deploy pricing matching jobs messages sos webhooks_stripe webhooks_kyc
   ```
4. Invoke locally:
   ```bash
   supabase functions serve pricing
   ```

## Environment
Set env vars for functions:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Next
- Replace pricing constants with DB-backed rule reads.
- Implement push notifications for matching offers.
- Add auth context and JWT verification to functions.
- Build Client/Guard mobile apps per spec.

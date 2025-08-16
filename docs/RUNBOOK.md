## Flip-the-switch runbook

This runbook sets the minimum env to get CI → Vercel deploy → post-deploy smoke running green.

### 1) Required GitHub Secrets

Set these in the repo settings → Secrets and variables → Actions → Secrets:

- SUPABASE_PROJECT_REF: your Supabase project ref, e.g. abcd1234
- SUPABASE_ACCESS_TOKEN: a Supabase personal access token with project access
- SUPABASE_DB_PASSWORD: your project database password
- SUPABASE_ANON_KEY: Supabase anon key
- SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
- SUPABASE_URL: https://<ref>.supabase.co
- ADMIN_API_SECRET: random string for admin endpoints
- STRIPE_SECRET_KEY: sk_live_... (or test)
- STRIPE_PUBLISHABLE_KEY: pk_live_... (or test)
- STRIPE_WEBHOOK_SECRET: whsec_...
- VERCEL_DEPLOY_HOOK_URL: Vercel Project → Settings → Deploy Hooks → copy the URL

Tip: you can set these with the GitHub CLI (script provided below).

### 2) Repo Variables (non-secret)

Set in repo settings → Secrets and variables → Actions → Variables:

- HEALTH_URL: https://<ref>.functions.supabase.co/health
- HEALTH_ORIGIN: https://your-site.vercel.app (optional; adds Origin header)
- SPA_URL: https://your-site.vercel.app/client.html (optional; hero text check)
- FUNCTION_FLAGS_JSON: {"default":"--no-verify-jwt"} (optional override per function)
- DEPLOY_ALL: true (optional, to deploy all functions after migrations)

### 3) Supabase Edge Function env

In Supabase Dashboard → Functions → Settings (or CLI env) set:

- ALLOWED_ORIGINS: comma-separated list of allowed web origins, e.g.
  https://your-site.vercel.app, https://localhost:5173

No ALLOWED_ORIGINS means “allow all” (useful for first smoke). Setting it locks CORS down via the shared withCors wrapper.

### 4) Vercel Project env

In Vercel Project → Settings → Environment Variables (Production and Preview):

- VITE_SUPABASE_URL: https://<ref>.supabase.co
- VITE_SUPABASE_ANON_KEY: <anon key>
- VITE_STUB_API: false (optional; omit in prod)

### 5) Kick the pipeline

- Push any commit to main (or click “Run workflow” on Supabase CI or Vercel Deploy)
- Order of operations:
  1) Supabase CI: migrations → smoke → deploy changed functions (matrix) → post-deploy smoke
  2) Vercel Deploy: triggered via Deploy Hook → post-deploy smoke (polls /health; optional SPA hero check)

Artifacts attached: smoke logs and deploy plan.

### 6) Troubleshooting

- Post-deploy smoke stuck at 403: Set HEALTH_ORIGIN to your site origin, or leave ALLOWED_ORIGINS empty temporarily.
- SPA hero check fails: Confirm SPA_URL points to the deployed client.html and the page contains “Book a Protector”.
- Stripe webhooks: ensure STRIPE_WEBHOOK_SECRET is set and the endpoint is configured in Stripe dashboard to your deployed stripe_webhook function URL.

### Helper: setup via GitHub CLI

Use the script below to set secrets/vars locally. It expects values via environment variables.

```
bash scripts/gh-setup.sh
```

See that file for the list of required variables.

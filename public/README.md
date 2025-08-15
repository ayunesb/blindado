# Supabase CLI

[![Coverage Status](https://coveralls.io/repos/github/supabase/cli/badge.svg?branch=main)](https://coveralls.io/github/supabase/cli?branch=main) [![Bitbucket Pipelines](https://img.shields.io/bitbucket/pipelines/supabase-cli/setup-cli/master?style=flat-square&label=Bitbucket%20Canary)](https://bitbucket.org/supabase-cli/setup-cli/pipelines) [![Gitlab Pipeline Status](https://img.shields.io/gitlab/pipeline-status/sweatybridge%2Fsetup-cli?label=Gitlab%20Canary)
](https://gitlab.com/sweatybridge/setup-cli/-/pipelines)

[Supabase](https://supabase.io) is an open source Firebase alternative. We're building the features of Firebase using enterprise-grade open source tools.

# Blindado Public Pages

Quick links and usage tips for the static demo and consoles.

Pages

- Client demo: `public/client.html`
  - Single-page booking flow (Details → Quote → Payment → Confirm → Acceptance sim).
  - Optional params: `?anon=SUPABASE_ANON_KEY` and `?gmaps=GOOGLE_MAPS_KEY`.
- Dispatcher: `public/dispatcher.html`
  - Guard jobs console with list/accept/status, heartbeat, auto-refresh, and copy-link.
  - Params: `?guard=GUARD_ID&anon=SUPABASE_ANON_KEY&lang=en` and optional `&gmaps=KEY`.
- Guard console: `public/guard.html`
  - Compact guard view to accept and progress jobs, with manual heartbeat.
  - Params: `?guard=GUARD_ID&anon=SUPABASE_ANON_KEY` and optional `&gmaps=KEY`.
- Org Admin: `public/org-admin.html`
  - Admin tools: signed upload URL, direct upload (multipart), license upsert.
  - Params: `?ref=PROJECT_REF&admin=ADMIN_API_SECRET`.

Function base

- All pages default to project: `isnezquuwepqcjkaupjh`.
- Functions base: `https://isnezquuwepqcjkaupjh.supabase.co/functions/v1`.

Notes

- ANON headers: when provided, pages include `apikey` and `Authorization: Bearer` in requests.
- Google Maps is optional; the UI works with No-Map mode by default.
- Heartbeat can be invoked via the Dispatcher/Guard pages to update locations.

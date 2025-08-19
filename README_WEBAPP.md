Blindado Web UI (Multi-page Vite)

Commands
- npm run dev — start Vite dev server (client.html and guard.html)
- npm run build — build to dist/
- npm run preview — preview dist/ on port 4173

Entrypoints
- public/client.html → mounts React at #app, source /src/client/main.tsx
- public/guard.html → mounts React at #app, source /src/guard/main.tsx

Tailwind
- Config: tailwind.config.js
- Styles: src/styles/index.css

URLs
- Keep using client.html?anon=&sb= and guard.html

Environment
- SUPABASE_URL and SUPABASE_ANON_KEY are required for live API; otherwise the app falls back to stub mode when you append `?stub=1` to URLs or set `VITE_STUB_API=true`.
- Edge Functions rely on SUPABASE_SERVICE_ROLE_KEY and a strict ALLOWED_ORIGINS allow-list (comma-separated). Preflight OPTIONS return 204 via a shared helper.

Typechecking
- The web app TypeScript config excludes `supabase/` so `npm run typecheck` stays focused on Vite code. Deno Edge Functions are checked by Deno in their own env; files include `// @ts-nocheck` to suppress VS Code mixed-env diagnostics.

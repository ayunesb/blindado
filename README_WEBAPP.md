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

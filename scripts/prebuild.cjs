#!/usr/bin/env node
// Fail build if required public env vars are missing; block accidental service role leakage
const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
if (missing.length) {
  console.error(`Missing required env: ${missing.join(', ')}. Set them in your env or Vercel project.`);
  process.exit(1);
}
// Extra safety: do not allow any service role key to slip into client env
for (const [k, v] of Object.entries(process.env)) {
  if (!v) continue;
  const ks = k.toLowerCase();
  if (ks.includes('service') && ks.includes('role')) {
    console.error(`Blocked env var ${k} in client build environment.`);
    process.exit(1);
  }
}
console.log('prebuild checks passed');

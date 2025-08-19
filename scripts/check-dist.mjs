#!/usr/bin/env node
// Simple grep guard to ensure no secrets or server-only keys leak into dist
// Exits non-zero if any disallowed patterns are found.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');

/** Recursively list files */
function listFiles(dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out = out.concat(listFiles(p));
    else out.push(p);
  }
  return out;
}

const patterns = [
  /service_role/i,
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /sk_live_[0-9a-zA-Z]+/i, // Stripe secret key
  /whsec_[0-9a-zA-Z]+/i,   // Stripe webhook secret
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, // PEM private keys
  /AWS_SECRET_ACCESS_KEY/i,
  /GCP_SERVICE_ACCOUNT/i,
];

function scan(file) {
  try {
    const buf = readFileSync(file);
    // Only scan reasonably-sized text-like files
    if (buf.length > 2000000) return null; // skip very large assets
    const text = buf.toString('utf8');
    for (const rx of patterns) {
      const m = text.match(rx);
      if (m) return { rx: String(rx), snippet: text.slice(Math.max(0, (m.index || 0) - 40), (m.index || 0) + 80) };
    }
    return null;
  } catch {
    return null;
  }
}

function main() {
  try {
    const files = listFiles(DIST);
    const hits = [];
    for (const f of files) {
      const res = scan(f);
      if (res) hits.push({ file: f, ...res });
    }
    if (hits.length) {
      console.error('Secret-like patterns found in dist:');
      for (const h of hits) {
        console.error(`- ${h.file} :: ${h.rx}\n  ...${h.snippet}...`);
      }
      process.exit(1);
    }
    console.log('Dist scan OK — no secret-like patterns found.');
  } catch (err) {
    console.error('check-dist failed:', err);
    process.exit(1);
  }
}

main();

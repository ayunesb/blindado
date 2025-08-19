#!/usr/bin/env node
// Generate production icons from vector brand assets
import sharp from 'sharp';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pngToIco from 'png-to-ico';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public');
const ICONS = join(PUBLIC, 'icons');
const BRAND = join(PUBLIC, 'brand');
const SRC_SVG = join(BRAND, 'blindado-greca.svg');

function ensureDir(p) { try { mkdirSync(p, { recursive: true }); } catch {} }

async function run() {
  ensureDir(ICONS);
  // Read and rasterize SVG to PNG at needed sizes
  const sizes = [192, 512];
  for (const s of sizes) {
    const out = await sharp(SRC_SVG, { density: 480 })
      .resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
    writeFileSync(join(ICONS, `icon-${s}.png`), out);
  }
  // Maskable 512: add padding per maskable guidelines
  const pad = 64; // ~12.5% padding
  const base512 = await sharp(readFileSync(join(ICONS, 'icon-512.png')))
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(512, 512)
    .png()
    .toBuffer();
  writeFileSync(join(ICONS, 'maskable-512.png'), base512);

  // Favicon .ico from 32/64 PNG layers
  const fav32 = await sharp(SRC_SVG, { density: 480 }).resize(32, 32).png().toBuffer();
  const fav64 = await sharp(SRC_SVG, { density: 480 }).resize(64, 64).png().toBuffer();
  const ico = await pngToIco([fav32, fav64]);
  writeFileSync(join(PUBLIC, 'favicon.ico'), ico);

  console.log('Icons generated: icon-192.png, icon-512.png, maskable-512.png, favicon.ico');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

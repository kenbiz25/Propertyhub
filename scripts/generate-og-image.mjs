/**
 * Generates public/og-image.png — the Open Graph / Twitter card image.
 * Run once:  node scripts/generate-og-image.mjs
 */

import sharp from "sharp";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/og-image.png");

// 1200 × 630 — standard OG image size
const W = 1200;
const H = 630;

const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Deep navy-to-slate background -->
    <linearGradient id="bg" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#0a0f1e"/>
      <stop offset="100%" stop-color="#0f2040"/>
    </linearGradient>

    <!-- Orange glow behind icon -->
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#FF7A00" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#FF7A00" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Subtle grid lines -->
  <g stroke="#ffffff" stroke-opacity="0.04" stroke-width="1">
    <line x1="0"    y1="210" x2="${W}" y2="210"/>
    <line x1="0"    y1="420" x2="${W}" y2="420"/>
    <line x1="300"  y1="0"   x2="300"  y2="${H}"/>
    <line x1="600"  y1="0"   x2="600"  y2="${H}"/>
    <line x1="900"  y1="0"   x2="900"  y2="${H}"/>
  </g>

  <!-- Orange glow circle (top-right) -->
  <circle cx="980" cy="160" r="260" fill="url(#glow)"/>

  <!-- Left accent bar -->
  <rect x="80" y="180" width="6" height="270" rx="3" fill="#FF7A00"/>

  <!-- House icon (top-right decorative) -->
  <g transform="translate(870, 60)" opacity="0.18" fill="#FF7A00">
    <polygon points="130,80 0,80 0,180 260,180 260,80" />
    <polygon points="130,0 -20,100 280,100" />
    <rect x="90" y="120" width="80" height="60" fill="#0f2040"/>
  </g>

  <!-- Brand name -->
  <text
    x="110" y="270"
    font-family="'Segoe UI', Inter, Helvetica, Arial, sans-serif"
    font-size="72"
    font-weight="800"
    letter-spacing="-1"
    fill="#ffffff"
  >Kenya Properties</text>

  <!-- Tagline -->
  <text
    x="114" y="340"
    font-family="'Segoe UI', Inter, Helvetica, Arial, sans-serif"
    font-size="30"
    font-weight="400"
    fill="#94a3b8"
  >Buy · Sell · Rent — Nairobi, Mombasa &amp; beyond</text>

  <!-- Divider -->
  <line x1="110" y1="380" x2="700" y2="380" stroke="#FF7A00" stroke-opacity="0.4" stroke-width="1.5"/>

  <!-- Domain -->
  <text
    x="114" y="430"
    font-family="'Segoe UI', Inter, Helvetica, Arial, sans-serif"
    font-size="26"
    font-weight="500"
    fill="#FF7A00"
  >kenyaproperties.co.ke</text>

  <!-- Bottom descriptor -->
  <text
    x="114" y="490"
    font-family="'Segoe UI', Inter, Helvetica, Arial, sans-serif"
    font-size="22"
    fill="#475569"
  >Verified listings · Free for agents &amp; developers · Kenya&apos;s trusted marketplace</text>

  <!-- Corner badge -->
  <rect x="980" y="520" width="160" height="46" rx="8" fill="#FF7A00" fill-opacity="0.15" stroke="#FF7A00" stroke-opacity="0.5" stroke-width="1"/>
  <text
    x="1060" y="549"
    font-family="'Segoe UI', Inter, Helvetica, Arial, sans-serif"
    font-size="20"
    font-weight="600"
    fill="#FF7A00"
    text-anchor="middle"
  >Free Listing</text>
</svg>
`.trim();

// Write SVG buffer → PNG via sharp
await sharp(Buffer.from(svg))
  .png({ quality: 95, compressionLevel: 8 })
  .toFile(OUT);

console.log(`OG image written to: ${OUT}`);

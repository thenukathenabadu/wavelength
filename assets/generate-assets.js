/**
 * Generates branded app icons and splash screen for Wavelength.
 *
 * Design: "Signal Wave" — EQ bars (music) + concentric rings (proximity/radar)
 *
 * Usage: node assets/generate-assets.js
 */

const sharp = require('sharp');
const path = require('path');

// ─── SVG Definitions ─────────────────────────────────────────────────────────

/**
 * Icon mark: 5 EQ bars (bell-curve heights) + 4 concentric rings.
 * Symmetric around cx/cy. All dimensions in the 1024×1024 coordinate space.
 * Pass cx/cy to recentre for the splash.
 */
function iconMarkSvg({ cx = 512, cy = 512, scale = 1 } = {}) {
  // Bar dimensions (in 1024-space, then scaled)
  const barW = 72 * scale;
  const gap  = 24 * scale;
  const totalW = barW * 5 + gap * 4; // 456 * scale
  const startX = cx - totalW / 2;

  const bars = [
    { h: 180 * scale },
    { h: 300 * scale },
    { h: 400 * scale },
    { h: 300 * scale },
    { h: 180 * scale },
  ];

  const barRects = bars.map((b, i) => {
    const x = startX + i * (barW + gap);
    const y = cy - b.h / 2;
    const rx = (barW / 2);
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${b.h.toFixed(1)}" rx="${rx.toFixed(1)}" fill="url(#barGrad)"/>`;
  }).join('\n      ');

  const rings = [110, 200, 290, 380].map((r, i) => {
    const opacity = [0.35, 0.25, 0.18, 0.12][i];
    const sw = (2 * scale).toFixed(1);
    return `<circle cx="${cx}" cy="${cy}" r="${(r * scale).toFixed(1)}" fill="none" stroke="#7C3AED" stroke-width="${sw}" opacity="${opacity}"/>`;
  }).join('\n      ');

  return { barRects, rings };
}

// ─── Icon SVG (1024×1024) ─────────────────────────────────────────────────────

function buildIconSvg() {
  const { barRects, rings } = iconMarkSvg({ cx: 512, cy: 512, scale: 1 });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E0A3C"/>
      <stop offset="100%" stop-color="#0A0A0F"/>
    </linearGradient>
    <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#C084FC"/>
      <stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="1024" height="1024" rx="230" fill="url(#bgGrad)"/>
  <!-- Concentric rings -->
      ${rings}
  <!-- EQ bars -->
      ${barRects}
</svg>`;
}

// ─── Adaptive Icon SVG (1024×1024, no rounded corners — Android clips it) ────

function buildAdaptiveIconSvg() {
  const { barRects, rings } = iconMarkSvg({ cx: 512, cy: 512, scale: 1 });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E0A3C"/>
      <stop offset="100%" stop-color="#0A0A0F"/>
    </linearGradient>
    <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#C084FC"/>
      <stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>
  </defs>
  <!-- Background (no rounded corners — Android handles clipping) -->
  <rect width="1024" height="1024" fill="url(#bgGrad)"/>
  <!-- Concentric rings -->
      ${rings}
  <!-- EQ bars -->
      ${barRects}
</svg>`;
}

// ─── Splash SVG (1284×2778) ───────────────────────────────────────────────────

function buildSplashSvg() {
  // Icon mark centred slightly above vertical centre
  const cx = 642;
  const cy = 980;
  const { barRects, rings } = iconMarkSvg({ cx, cy, scale: 0.55 });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1284 2778" width="1284" height="2778">
  <defs>
    <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#C084FC"/>
      <stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="1284" height="2778" fill="#0A0A0F"/>
  <!-- Concentric rings -->
      ${rings}
  <!-- EQ bars -->
      ${barRects}
  <!-- Wordmark -->
  <text
    x="642" y="1270"
    font-family="Arial, Helvetica, sans-serif"
    font-size="84"
    font-weight="bold"
    fill="#FFFFFF"
    text-anchor="middle"
    letter-spacing="-2"
  >Wavelength</text>
  <!-- Tagline -->
  <text
    x="642" y="1350"
    font-family="Arial, Helvetica, sans-serif"
    font-size="36"
    fill="#6B6B8A"
    text-anchor="middle"
    letter-spacing="0.5"
  >Tune into what&#x2019;s around you</text>
</svg>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const assets = [
    { file: 'icon.png',          svg: buildIconSvg(),         w: 1024, h: 1024 },
    { file: 'adaptive-icon.png', svg: buildAdaptiveIconSvg(), w: 1024, h: 1024 },
    { file: 'splash.png',        svg: buildSplashSvg(),       w: 1284, h: 2778 },
  ];

  for (const { file, svg, w, h } of assets) {
    const dest = path.join(__dirname, file);
    try {
      await sharp(Buffer.from(svg, 'utf8'))
        .resize(w, h)
        .png()
        .toFile(dest);
      console.log(`✓ ${file}  (${w}×${h})`);
    } catch (err) {
      console.error(`✗ ${file}: ${err.message}`);
    }
  }
}

main().catch(console.error);

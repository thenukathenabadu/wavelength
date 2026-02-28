/**
 * Run this script once to generate placeholder app icons.
 * Requires: npm install -g sharp-cli  OR  npx @squoosh/cli
 *
 * Usage: node assets/generate-assets.js
 *
 * Replace the generated placeholders with your actual designed assets before store submission.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create a simple SVG and convert to PNG using sharp if available,
// otherwise create a minimal valid PNG programmatically.

const BRAND_COLOR = '#7C3AED'; // brand purple
const BG_COLOR = '#0A0A0F';   // dark background

function minimalPng(width, height, r, g, b) {
  // Use sharp if installed, otherwise fallback message
  try {
    const sharp = require('sharp');
    return sharp({
      create: { width, height, channels: 4, background: { r, g, b, alpha: 1 } },
    }).png().toBuffer();
  } catch {
    console.warn('sharp not installed. Run: npm install sharp');
    return null;
  }
}

async function main() {
  // Parse hex colors
  const bg = { r: 10, g: 10, b: 15 };
  const brand = { r: 124, g: 58, b: 237 };

  const sizes = [
    { file: 'icon.png',          width: 1024, height: 1024, color: brand },
    { file: 'splash.png',        width: 1284, height: 2778, color: bg },
    { file: 'adaptive-icon.png', width: 1024, height: 1024, color: brand },
  ];

  for (const { file, width, height, color } of sizes) {
    const dest = path.join(__dirname, file);
    if (fs.existsSync(dest)) {
      console.log(`Skipping ${file} (already exists)`);
      continue;
    }
    const buf = await minimalPng(width, height, color.r, color.g, color.b);
    if (buf) {
      fs.writeFileSync(dest, buf);
      console.log(`Created ${file} (${width}x${height})`);
    }
  }
}

main().catch(console.error);

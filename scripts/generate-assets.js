#!/usr/bin/env node
/**
 * Generates placeholder pixel art app icon and splash screen for Sleep Suivour.
 * Creates SVG files that can be converted to PNG for App Store submission.
 *
 * The icon is a pixel art green heart (matching the favicon) on a dark background.
 * The splash screen is the app name with the heart icon on a dark background.
 */

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');

// App Icon - 1024x1024 pixel art green heart on dark bg
const iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#0a0a0a"/>
  <!-- Pixel art heart, scaled from 32x32 to center in 1024x1024 -->
  <!-- Each pixel = 24px, offset to center: (1024 - 32*24)/2 = 128 -->
  <g transform="translate(128, 128) scale(24)">
    <rect x="2" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="2" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="6" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="6" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="6" y="16" width="4" height="4" fill="#22c55e"/>
    <rect x="10" y="4" width="4" height="4" fill="#22c55e"/>
    <rect x="10" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="10" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="10" y="16" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="4" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="16" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="20" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="24" width="4" height="4" fill="#22c55e"/>
    <rect x="18" y="4" width="4" height="4" fill="#22c55e"/>
    <rect x="18" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="18" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="18" y="16" width="4" height="4" fill="#22c55e"/>
    <rect x="18" y="20" width="4" height="4" fill="#22c55e"/>
    <rect x="22" y="4" width="4" height="4" fill="#22c55e"/>
    <rect x="22" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="22" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="22" y="16" width="4" height="4" fill="#22c55e"/>
    <rect x="26" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="26" y="12" width="4" height="4" fill="#22c55e"/>
  </g>
  <!-- Subtle glow effect -->
  <circle cx="512" cy="512" r="300" fill="none" stroke="#22c55e" stroke-width="2" opacity="0.15"/>
</svg>`;

// Splash Screen - 2732x2732 centered heart + app name
const splashSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="#0a0a0a"/>
  <!-- Centered pixel heart (smaller) -->
  <g transform="translate(1166, 1066) scale(16)">
    <rect x="2" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="2" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="6" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="6" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="6" y="16" width="4" height="4" fill="#22c55e"/>
    <rect x="10" y="4" width="4" height="4" fill="#22c55e"/>
    <rect x="10" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="10" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="10" y="16" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="4" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="16" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="20" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="24" width="4" height="4" fill="#22c55e"/>
    <rect x="18" y="4" width="4" height="4" fill="#22c55e"/>
    <rect x="18" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="18" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="18" y="16" width="4" height="4" fill="#22c55e"/>
    <rect x="18" y="20" width="4" height="4" fill="#22c55e"/>
    <rect x="22" y="4" width="4" height="4" fill="#22c55e"/>
    <rect x="22" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="22" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="22" y="16" width="4" height="4" fill="#22c55e"/>
    <rect x="26" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="26" y="12" width="4" height="4" fill="#22c55e"/>
  </g>
  <!-- App name text -->
  <text x="1366" y="1600" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="80" fill="#22c55e" letter-spacing="4">SLEEP SUIVOUR</text>
  <text x="1366" y="1660" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="300" font-size="32" fill="#4ade80" opacity="0.6">Health &amp; Wellness Tracker</text>
</svg>`;

// Watch App Icon - dark forest green bg so circular mask is visible on black Watch face
const watchIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#1a3a2a"/>
  <!-- Same pixel art heart as iOS icon -->
  <g transform="translate(128, 128) scale(24)">
    <rect x="2" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="2" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="6" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="6" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="6" y="16" width="4" height="4" fill="#22c55e"/>
    <rect x="10" y="4" width="4" height="4" fill="#22c55e"/>
    <rect x="10" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="10" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="10" y="16" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="4" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="16" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="20" width="4" height="4" fill="#22c55e"/>
    <rect x="14" y="24" width="4" height="4" fill="#22c55e"/>
    <rect x="18" y="4" width="4" height="4" fill="#22c55e"/>
    <rect x="18" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="18" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="18" y="16" width="4" height="4" fill="#22c55e"/>
    <rect x="18" y="20" width="4" height="4" fill="#22c55e"/>
    <rect x="22" y="4" width="4" height="4" fill="#22c55e"/>
    <rect x="22" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="22" y="12" width="4" height="4" fill="#22c55e"/>
    <rect x="22" y="16" width="4" height="4" fill="#22c55e"/>
    <rect x="26" y="8" width="4" height="4" fill="#22c55e"/>
    <rect x="26" y="12" width="4" height="4" fill="#22c55e"/>
  </g>
  <!-- Subtle glow effect -->
  <circle cx="512" cy="512" r="300" fill="none" stroke="#22c55e" stroke-width="2" opacity="0.15"/>
</svg>`;

fs.writeFileSync(path.join(assetsDir, 'icon-only.svg'), iconSVG);
fs.writeFileSync(path.join(assetsDir, 'icon-watch.svg'), watchIconSVG);
fs.writeFileSync(path.join(assetsDir, 'splash.svg'), splashSVG);

console.log('Generated placeholder assets:');
console.log('  assets/icon-only.svg (1024x1024 iOS app icon)');
console.log('  assets/icon-watch.svg (1024x1024 Watch app icon, dark green bg)');
console.log('  assets/splash.svg (2732x2732 splash screen)');
console.log('');
console.log('To convert to PNG (required for App Store):');
console.log('  Option 1: Open in browser, screenshot at correct size');
console.log('  Option 2: Use rsvg-convert or ImageMagick:');
console.log('    rsvg-convert -w 1024 -h 1024 assets/icon-only.svg > assets/icon-only.png');
console.log('    rsvg-convert -w 1024 -h 1024 assets/icon-watch.svg > assets/icon-watch.png');
console.log('    rsvg-convert -w 2732 -h 2732 assets/splash.svg > assets/splash.png');
console.log('');
console.log('Then run: npx capacitor-assets generate --ios');
console.log('And copy Watch icon: cp assets/icon-watch.png "ios/App/WatchApp Watch App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"');

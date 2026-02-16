#!/usr/bin/env node
/**
 * Patches index.html for Capacitor builds:
 * - Replaces CDN Firebase SDK with local vendor copies
 * - Replaces Google Fonts CDN with local font files
 * - Removes preconnect/prefetch hints (assets are local)
 * - Updates CSP for Capacitor's capacitor://localhost origin
 *
 * Usage: node patch-index.js <input.html> <output.html>
 */

const fs = require('fs');

const [,, inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
    console.error('Usage: node patch-index.js <input.html> <output.html>');
    process.exit(1);
}

let html = fs.readFileSync(inputPath, 'utf-8');

// Remove preconnect and dns-prefetch links
html = html.replace(/\s*<link rel="preconnect"[^>]*>\s*/g, '\n');
html = html.replace(/\s*<link rel="dns-prefetch"[^>]*>\s*/g, '\n');

// Replace Google Fonts CDN link with local font CSS
html = html.replace(
    /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]*">/,
    '<link rel="stylesheet" href="vendor/fonts/inter.css">'
);

// Replace Firebase SDK CDN scripts (multi-line with integrity attributes) with local copies
html = html.replace(
    /\s*<script src="https:\/\/www\.gstatic\.com\/firebasejs\/9\.22\.0\/firebase-app-compat\.js"[\s\S]*?<\/script>/,
    '\n    <script src="vendor/firebase/firebase-app-compat.js"></script>'
);
html = html.replace(
    /\s*<script src="https:\/\/www\.gstatic\.com\/firebasejs\/9\.22\.0\/firebase-auth-compat\.js"[\s\S]*?<\/script>/,
    '\n    <script src="vendor/firebase/firebase-auth-compat.js"></script>'
);
html = html.replace(
    /\s*<script src="https:\/\/www\.gstatic\.com\/firebasejs\/9\.22\.0\/firebase-database-compat\.js"[\s\S]*?<\/script>/,
    '\n    <script src="vendor/firebase/firebase-database-compat.js"></script>'
);

// Update CSP for Capacitor:
// - Remove CDN script-src for gstatic/googleapis (Firebase SDK now local)
// - KEEP https://*.firebaseio.com in script-src — Firebase Realtime DB uses
//   long-polling (.lp) script requests as WebSocket fallback on iOS WKWebView
// - Remove CDN font-src and style-src for Google Fonts (now local)
// - Keep Firebase API connect-src (still needed for runtime)
// - Keep frame-src for auth popups
html = html.replace(
    /script-src 'self' 'unsafe-inline' https:\/\/www\.gstatic\.com https:\/\/apis\.google\.com https:\/\/\*\.firebaseio\.com;/,
    "script-src 'self' 'unsafe-inline' https://*.firebaseio.com;"
);
html = html.replace(
    /style-src 'self' 'unsafe-inline' https:\/\/fonts\.googleapis\.com;/,
    "style-src 'self' 'unsafe-inline';"
);
html = html.replace(
    /font-src 'self' https:\/\/fonts\.gstatic\.com;/,
    "font-src 'self';"
);

// Remove version cache busters from local script references (not needed in Capacitor)
html = html.replace(/src="(firebase-config\.js|firebase-sync\.js|app\.js)\?v=\d+"/g, 'src="$1"');

fs.writeFileSync(outputPath, html, 'utf-8');
console.log('  index.html patched for Capacitor');

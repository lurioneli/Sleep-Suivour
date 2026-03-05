#!/usr/bin/env node

/**
 * Post-install patch: Remove Facebook SDK from @capacitor-firebase/authentication
 *
 * The plugin's Package.swift unconditionally includes Facebook SDK as a dependency,
 * but Sleep Suivour only uses Google and Apple sign-in. The Facebook SDK:
 * - Adds ~3 frameworks to the binary (FBSDKCoreKit, FBSDKLoginKit, FBAEMKit)
 * - Collects device data on initialization
 * - Requires additional privacy manifest declarations
 *
 * The plugin's Swift code already uses #if RGCFA_INCLUDE_FACEBOOK guards,
 * so removing the flag and dependency is safe.
 */

const fs = require('fs');
const path = require('path');

const pkgPath = path.join(
  __dirname, '..', 'node_modules', '@capacitor-firebase', 'authentication', 'Package.swift'
);

if (!fs.existsSync(pkgPath)) {
  console.log('[patch] @capacitor-firebase/authentication not installed, skipping.');
  process.exit(0);
}

let content = fs.readFileSync(pkgPath, 'utf8');

// Check if already patched
if (!content.includes('facebook-ios-sdk')) {
  console.log('[patch] Facebook SDK already removed from Firebase Auth plugin.');
  process.exit(0);
}

// Remove Facebook package dependency line
content = content.replace(
  /,?\s*\.package\(url:\s*"https:\/\/github\.com\/facebook\/facebook-ios-sdk\.git"[^)]*\)/,
  ''
);

// Remove FacebookCore and FacebookLogin product dependencies
content = content.replace(
  /,?\s*\.product\(name:\s*"FacebookCore"[^)]*\)/,
  ''
);
content = content.replace(
  /,?\s*\.product\(name:\s*"FacebookLogin"[^)]*\)/,
  ''
);

// Remove RGCFA_INCLUDE_FACEBOOK define
content = content.replace(
  /,?\s*\.define\("RGCFA_INCLUDE_FACEBOOK"\)/,
  ''
);

fs.writeFileSync(pkgPath, content, 'utf8');
console.log('[patch] Removed Facebook SDK from @capacitor-firebase/authentication Package.swift');

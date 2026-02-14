#!/bin/bash
# Build script for Capacitor (iOS/Android)
# Copies web assets to www/ and patches CDN references to use local bundles

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WWW_DIR="$PROJECT_DIR/www"

echo "Building Capacitor web assets..."

# Clean previous build
rm -rf "$WWW_DIR"
mkdir -p "$WWW_DIR/dist"
mkdir -p "$WWW_DIR/vendor/firebase"
mkdir -p "$WWW_DIR/vendor/fonts"

# Build Tailwind CSS
echo "  Compiling Tailwind CSS..."
npm run build:css --prefix "$PROJECT_DIR"

# Copy core web files
echo "  Copying web assets..."
cp "$PROJECT_DIR/app.js" "$WWW_DIR/"
cp "$PROJECT_DIR/firebase-config.js" "$WWW_DIR/"
cp "$PROJECT_DIR/firebase-sync.js" "$WWW_DIR/"
cp "$PROJECT_DIR/dist/output.css" "$WWW_DIR/dist/"

# Copy local vendor bundles
echo "  Copying vendor bundles (Firebase SDK, fonts)..."
cp "$PROJECT_DIR/vendor/firebase/"*.js "$WWW_DIR/vendor/firebase/"
cp "$PROJECT_DIR/vendor/fonts/inter-latin.woff2" "$WWW_DIR/vendor/fonts/"
cp "$PROJECT_DIR/vendor/fonts/inter.css" "$WWW_DIR/vendor/fonts/"

# Patch index.html for Capacitor using Node (handles multi-line replacements)
echo "  Patching index.html for Capacitor..."
node "$PROJECT_DIR/scripts/patch-index.js" "$PROJECT_DIR/index.html" "$WWW_DIR/index.html"

echo "Build complete! Assets in $WWW_DIR"
echo ""
echo "Next steps:"
echo "  npx cap sync ios    # Sync to iOS project"
echo "  npx cap open ios    # Open in Xcode"

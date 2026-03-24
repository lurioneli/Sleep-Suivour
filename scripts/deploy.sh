#!/bin/bash
# =============================================================================
# Sleep-Suivour Deployment Pipeline
# =============================================================================
# Builds web assets and syncs to iOS and/or Android via Capacitor.
#
# Usage:
#   bash scripts/deploy.sh              # Build + sync iOS first, then Android
#   bash scripts/deploy.sh --ios        # Build + sync iOS only
#   bash scripts/deploy.sh --android    # Build + sync Android only
#   bash scripts/deploy.sh --build      # Build web assets only (no sync)
#
# This script is the SINGLE SOURCE OF TRUTH for deploying code changes
# to native platforms. It handles:
#   1. Pre-flight checks (required files, dependencies)
#   2. Tailwind CSS compilation
#   3. Web asset bundling into www/
#   4. index.html patching for Capacitor (CDN → local vendor)
#   5. Capacitor sync to iOS (always first)
#   6. Capacitor sync to Android (after iOS)
#   7. Verification at every step
# =============================================================================

set -e  # Exit on any error

# ─── Configuration ───────────────────────────────────────────────────────────

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WWW_DIR="$PROJECT_DIR/www"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ─── Parse Arguments ─────────────────────────────────────────────────────────

SYNC_IOS=true
SYNC_ANDROID=true
BUILD_ONLY=false

for arg in "$@"; do
    case $arg in
        --ios)
            SYNC_IOS=true
            SYNC_ANDROID=false
            ;;
        --android)
            SYNC_IOS=false
            SYNC_ANDROID=true
            ;;
        --build)
            BUILD_ONLY=true
            SYNC_IOS=false
            SYNC_ANDROID=false
            ;;
        --help|-h)
            echo "Usage: bash scripts/deploy.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --ios       Build + sync iOS only"
            echo "  --android   Build + sync Android only"
            echo "  --build     Build web assets only (no platform sync)"
            echo "  --help      Show this help message"
            echo ""
            echo "Default (no flags): Build + sync iOS first, then Android"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $arg${NC}"
            echo "Use --help for usage information."
            exit 1
            ;;
    esac
done

# ─── Helper Functions ────────────────────────────────────────────────────────

step() {
    echo ""
    echo -e "${BLUE}${BOLD}▸ $1${NC}"
}

success() {
    echo -e "  ${GREEN}✓ $1${NC}"
}

warn() {
    echo -e "  ${YELLOW}⚠ $1${NC}"
}

fail() {
    echo -e "  ${RED}✗ $1${NC}"
    exit 1
}

check_file() {
    if [ ! -f "$1" ]; then
        fail "Missing required file: $1"
    fi
}

check_dir() {
    if [ ! -d "$1" ]; then
        fail "Missing required directory: $1"
    fi
}

# ─── Banner ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║      Sleep-Suivour Deploy Pipeline       ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════╝${NC}"

if $BUILD_ONLY; then
    echo -e "  Mode: ${YELLOW}Build only${NC}"
elif $SYNC_IOS && $SYNC_ANDROID; then
    echo -e "  Mode: ${YELLOW}iOS + Android${NC} (iOS first)"
elif $SYNC_IOS; then
    echo -e "  Mode: ${YELLOW}iOS only${NC}"
elif $SYNC_ANDROID; then
    echo -e "  Mode: ${YELLOW}Android only${NC}"
fi

# ─── Step 1: Pre-flight Checks ──────────────────────────────────────────────

step "Pre-flight checks"

# Check Node.js
if ! command -v node &> /dev/null; then
    fail "Node.js is not installed"
fi
success "Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    fail "npm is not installed"
fi
success "npm $(npm --version)"

# Check node_modules
check_dir "$PROJECT_DIR/node_modules"
success "node_modules present"

# Check required source files
check_file "$PROJECT_DIR/app.js"
check_file "$PROJECT_DIR/index.html"
check_file "$PROJECT_DIR/firebase-config.js"
check_file "$PROJECT_DIR/firebase-sync.js"
check_file "$PROJECT_DIR/xhr-proxy.js"
check_file "$PROJECT_DIR/src/input.css"
check_file "$PROJECT_DIR/scripts/patch-index.js"
success "All source files present"

# Check vendor bundles
check_file "$PROJECT_DIR/vendor/firebase/firebase-app-compat.js"
check_file "$PROJECT_DIR/vendor/firebase/firebase-auth-compat.js"
check_file "$PROJECT_DIR/vendor/firebase/firebase-database-compat.js"
check_file "$PROJECT_DIR/vendor/fonts/inter-latin.woff2"
check_file "$PROJECT_DIR/vendor/fonts/inter.css"
success "Vendor bundles present (Firebase SDK, fonts)"

# Check legal pages
check_file "$PROJECT_DIR/terms.html"
check_file "$PROJECT_DIR/privacy.html"
check_file "$PROJECT_DIR/support.html"
success "Legal pages present"

# Check splash image
check_file "$PROJECT_DIR/assets/splash.png"
success "Splash image present"

# Platform-specific checks
if $SYNC_IOS; then
    check_dir "$PROJECT_DIR/ios"
    check_dir "$PROJECT_DIR/ios/App/App.xcodeproj"
    success "iOS project exists"
fi

if $SYNC_ANDROID; then
    check_dir "$PROJECT_DIR/android"
    check_file "$PROJECT_DIR/android/app/build.gradle"
    success "Android project exists"
fi

# ─── Step 2: Clean Previous Build ───────────────────────────────────────────

step "Cleaning previous build"

rm -rf "$WWW_DIR"
mkdir -p "$WWW_DIR/dist"
mkdir -p "$WWW_DIR/vendor/firebase"
mkdir -p "$WWW_DIR/vendor/fonts"
success "Cleaned www/ directory"

# ─── Step 3: Compile Tailwind CSS ────────────────────────────────────────────

step "Compiling Tailwind CSS"

npm run build:css --prefix "$PROJECT_DIR" 2>&1 | tail -1
check_file "$PROJECT_DIR/dist/output.css"
CSS_SIZE=$(wc -c < "$PROJECT_DIR/dist/output.css" | tr -d ' ')
success "Tailwind compiled ($(( CSS_SIZE / 1024 ))KB)"

# ─── Step 4: Copy Web Assets ────────────────────────────────────────────────

step "Copying web assets to www/"

# Core files
cp "$PROJECT_DIR/app.js" "$WWW_DIR/"
cp "$PROJECT_DIR/xhr-proxy.js" "$WWW_DIR/"
cp "$PROJECT_DIR/firebase-config.js" "$WWW_DIR/"
cp "$PROJECT_DIR/firebase-sync.js" "$WWW_DIR/"
cp "$PROJECT_DIR/dist/output.css" "$WWW_DIR/dist/"
cp "$PROJECT_DIR/assets/splash.png" "$WWW_DIR/"

# Vendor bundles
cp "$PROJECT_DIR/vendor/firebase/"*.js "$WWW_DIR/vendor/firebase/"
cp "$PROJECT_DIR/vendor/fonts/inter-latin.woff2" "$WWW_DIR/vendor/fonts/"
cp "$PROJECT_DIR/vendor/fonts/inter.css" "$WWW_DIR/vendor/fonts/"

# Legal pages
cp "$PROJECT_DIR/terms.html" "$WWW_DIR/"
cp "$PROJECT_DIR/privacy.html" "$WWW_DIR/"
cp "$PROJECT_DIR/support.html" "$WWW_DIR/"

APP_SIZE=$(wc -c < "$WWW_DIR/app.js" | tr -d ' ')
success "Core files copied (app.js: $(( APP_SIZE / 1024 ))KB)"
success "Vendor bundles copied (Firebase SDK, fonts)"
success "Legal pages copied"

# ─── Step 5: Patch index.html ────────────────────────────────────────────────

step "Patching index.html for Capacitor"

node "$PROJECT_DIR/scripts/patch-index.js" "$PROJECT_DIR/index.html" "$WWW_DIR/index.html"
check_file "$WWW_DIR/index.html"
HTML_SIZE=$(wc -c < "$WWW_DIR/index.html" | tr -d ' ')
success "index.html patched ($(( HTML_SIZE / 1024 ))KB)"

# ─── Step 6: Verify Build Output ────────────────────────────────────────────

step "Verifying build output"

EXPECTED_FILES=(
    "app.js"
    "xhr-proxy.js"
    "firebase-config.js"
    "firebase-sync.js"
    "index.html"
    "splash.png"
    "dist/output.css"
    "vendor/firebase/firebase-app-compat.js"
    "vendor/firebase/firebase-auth-compat.js"
    "vendor/firebase/firebase-database-compat.js"
    "vendor/fonts/inter-latin.woff2"
    "vendor/fonts/inter.css"
    "terms.html"
    "privacy.html"
    "support.html"
)

MISSING=0
for file in "${EXPECTED_FILES[@]}"; do
    if [ ! -f "$WWW_DIR/$file" ]; then
        fail "Missing from build: $file"
        MISSING=$((MISSING + 1))
    fi
done

if [ $MISSING -eq 0 ]; then
    TOTAL_SIZE=$(du -sh "$WWW_DIR" | cut -f1)
    FILE_COUNT=${#EXPECTED_FILES[@]}
    success "All $FILE_COUNT files verified ($TOTAL_SIZE total)"
else
    fail "$MISSING files missing from build output"
fi

# Verify patched index.html doesn't reference CDN
if grep -q "cdn.tailwindcss.com" "$WWW_DIR/index.html" 2>/dev/null; then
    warn "index.html still references Tailwind CDN — patch may have failed"
fi
if grep -q "fonts.googleapis.com" "$WWW_DIR/index.html" 2>/dev/null; then
    warn "index.html still references Google Fonts CDN — patch may have failed"
fi
success "No CDN references in patched index.html"

# ─── Build Complete ─────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}  ✓ Web build complete!${NC}"

if $BUILD_ONLY; then
    echo ""
    echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}${BOLD}║           Build Complete!                ║${NC}"
    echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Web assets ready in www/"
    echo "  Run 'npm run deploy:ios' or 'npm run deploy:android' to sync."
    exit 0
fi

# ─── Step 7: Sync to iOS (Always First) ─────────────────────────────────────

if $SYNC_IOS; then
    step "Syncing to iOS (Capacitor)"

    cd "$PROJECT_DIR"
    npx cap sync ios 2>&1 | while IFS= read -r line; do
        # Show key lines, skip verbose noise
        if echo "$line" | grep -qiE "error|fail|warn|✔|✖|copying|updating|found"; then
            echo "  $line"
        fi
    done

    # Verify sync worked - check that public/ dir in iOS project has our files
    IOS_PUBLIC="$PROJECT_DIR/ios/App/App/public"
    if [ -d "$IOS_PUBLIC" ] && [ -f "$IOS_PUBLIC/app.js" ] && [ -f "$IOS_PUBLIC/index.html" ]; then
        IOS_SIZE=$(du -sh "$IOS_PUBLIC" | cut -f1)
        success "iOS sync verified — public/ has web assets ($IOS_SIZE)"
    else
        fail "iOS sync failed — public/ directory missing or incomplete"
    fi

    echo ""
    echo -e "${GREEN}${BOLD}  ✓ iOS ready! Open Xcode: npx cap open ios${NC}"
fi

# ─── Step 8: Sync to Android ────────────────────────────────────────────────

if $SYNC_ANDROID; then
    step "Syncing to Android (Capacitor)"

    cd "$PROJECT_DIR"
    npx cap sync android 2>&1 | while IFS= read -r line; do
        if echo "$line" | grep -qiE "error|fail|warn|✔|✖|copying|updating|found"; then
            echo "  $line"
        fi
    done

    # Verify sync worked
    ANDROID_PUBLIC="$PROJECT_DIR/android/app/src/main/assets/public"
    if [ -d "$ANDROID_PUBLIC" ] && [ -f "$ANDROID_PUBLIC/app.js" ] && [ -f "$ANDROID_PUBLIC/index.html" ]; then
        ANDROID_SIZE=$(du -sh "$ANDROID_PUBLIC" | cut -f1)
        success "Android sync verified — assets/public/ has web assets ($ANDROID_SIZE)"
    else
        fail "Android sync failed — assets/public/ directory missing or incomplete"
    fi

    echo ""
    echo -e "${GREEN}${BOLD}  ✓ Android ready! Open Android Studio: npx cap open android${NC}"
fi

# ─── Final Summary ───────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║         Deploy Complete!                 ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

if $SYNC_IOS && $SYNC_ANDROID; then
    echo "  Both platforms synced. Next steps:"
    echo ""
    echo "  iOS:     npx cap open ios       → Build in Xcode"
    echo "  Android: npx cap open android   → Build in Android Studio"
elif $SYNC_IOS; then
    echo "  iOS synced. Next step:"
    echo ""
    echo "  npx cap open ios   → Build in Xcode"
elif $SYNC_ANDROID; then
    echo "  Android synced. Next step:"
    echo ""
    echo "  npx cap open android   → Build in Android Studio"
fi

echo ""

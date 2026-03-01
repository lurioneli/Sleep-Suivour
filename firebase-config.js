// Firebase Configuration
// Production project: sleep-suivour (real users)
// Staging project: sleep-suivour-dev (testing only)

const firebaseConfig = {
    apiKey: "AIzaSyBXpOcPNmaMwacB19_qonBM2rYe2Kb8emk",
    authDomain: "sleep-suivour.firebaseapp.com",
    databaseURL: "https://sleep-suivour-default-rtdb.firebaseio.com",
    projectId: "sleep-suivour",
    storageBucket: "sleep-suivour.firebasestorage.app",
    messagingSenderId: "948748012458",
    appId: "1:948748012458:web:1d078a9b7689ea055fb9d3"
};

// Staging Firebase config — replace with real credentials from Firebase Console
// Firebase Console > sleep-suivour-dev > Project Settings > Web app
const stagingFirebaseConfig = {
    apiKey: "YOUR_STAGING_API_KEY",
    authDomain: "sleep-suivour-dev.firebaseapp.com",
    databaseURL: "https://sleep-suivour-dev-default-rtdb.firebaseio.com",
    projectId: "sleep-suivour-dev",
    storageBucket: "sleep-suivour-dev.firebasestorage.app",
    messagingSenderId: "YOUR_STAGING_SENDER_ID",
    appId: "YOUR_STAGING_APP_ID"
};

// Environment detection
// Priority: localStorage override > URL param > Capacitor native (always production) > hostname
let _isStaging = null; // cached after first call

function isStagingEnvironment() {
    if (_isStaging !== null) return _isStaging;

    // 1. Capacitor native — uses GoogleService-Info.plist, web config is irrelevant
    //    (Debug/Release plist switching handled by Xcode build phase)
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        _isStaging = false;
        return false;
    }

    // 2. Explicit localStorage override (survives refresh)
    const override = localStorage.getItem('USE_STAGING');
    if (override === 'true') { _isStaging = true; return true; }
    if (override === 'false') { _isStaging = false; return false; }

    // 3. URL parameter (?staging)
    if (new URLSearchParams(window.location.search).has('staging')) {
        _isStaging = true;
        return true;
    }

    // 4. Localhost / 127.0.0.1 → staging by default
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
        _isStaging = true;
        return true;
    }

    // 5. Everything else (GitHub Pages, custom domains) → production
    _isStaging = false;
    return false;
}

function isStagingConfigured() {
    return stagingFirebaseConfig.apiKey !== "YOUR_STAGING_API_KEY" &&
           stagingFirebaseConfig.projectId !== "sleep-suivour-dev";
}

// Returns the right localStorage key based on environment
// Staging uses a separate key so test data never pollutes production state
function getStorageKey() {
    return isStagingEnvironment() ? 'fasting-tracker-state-staging' : 'fasting-tracker-state';
}

// Initialize Firebase (will be called from firebase-sync.js)
let firebaseApp = null;
let auth = null;
let database = null;

function isFirebaseConfigured() {
    if (isStagingEnvironment()) {
        return isStagingConfigured();
    }
    return firebaseConfig.apiKey !== "YOUR_API_KEY" &&
           firebaseConfig.projectId !== "YOUR_PROJECT_ID";
}

function initializeFirebase() {
    if (!isFirebaseConfigured()) {
        const env = isStagingEnvironment() ? 'STAGING' : 'PRODUCTION';
        console.warn(`Firebase not configured for ${env}. Please update firebase-config.js.`);
        return false;
    }

    try {
        const config = isStagingEnvironment() ? stagingFirebaseConfig : firebaseConfig;
        const env = isStagingEnvironment() ? 'STAGING' : 'PRODUCTION';
        firebaseApp = firebase.initializeApp(config);
        auth = firebase.auth();
        database = firebase.database();
        console.log(`Firebase: ${env} environment (${config.projectId})`);
        return true;
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        return false;
    }
}

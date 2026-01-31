// Firebase Configuration
// Replace these values with your own Firebase project credentials
// Get these from: Firebase Console > Project Settings > General > Your apps > Web app

const firebaseConfig = {
    apiKey: "AIzaSyBXpOcPNmaMwacB19_qonBM2rYe2Kb8emk",
    authDomain: "sleep-suivour.firebaseapp.com",
    databaseURL: "https://sleep-suivour-default-rtdb.firebaseio.com",
    projectId: "sleep-suivour",
    storageBucket: "sleep-suivour.firebasestorage.app",
    messagingSenderId: "948748012458",
    appId: "1:948748012458:web:1d078a9b7689ea055fb9d3"
};

// Initialize Firebase (will be called from app.js)
let firebaseApp = null;
let auth = null;
let database = null;

function isFirebaseConfigured() {
    return firebaseConfig.apiKey !== "YOUR_API_KEY" &&
           firebaseConfig.projectId !== "YOUR_PROJECT_ID";
}

function initializeFirebase() {
    // Check if Firebase is configured
    if (!isFirebaseConfigured()) {
        console.warn('Firebase not configured. Please update firebase-config.js with your Firebase credentials.');
        console.warn('See README.md for setup instructions.');
        return false;
    }

    try {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        database = firebase.database();

        // Set persistence to LOCAL to help with Safari ITP issues on iOS
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .then(() => {
                console.log('Auth persistence set to LOCAL');
            })
            .catch((error) => {
                console.warn('Could not set auth persistence:', error);
            });

        console.log('Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        console.error('Please check your Firebase configuration in firebase-config.js');
        return false;
    }
}

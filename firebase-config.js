// Firebase Configuration
// Replace these values with your own Firebase project credentials
// Get these from: Firebase Console > Project Settings > General > Your apps > Web app

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com"
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
        console.log('Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        console.error('Please check your Firebase configuration in firebase-config.js');
        return false;
    }
}

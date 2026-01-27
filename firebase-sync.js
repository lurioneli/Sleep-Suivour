// Firebase Sync Module
// Handles real-time data synchronization with Firebase

class FirebaseSync {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.dataRef = null;
        this.syncEnabled = false;
        this.lastSyncTimestamp = null;
        this.syncListeners = [];
    }

    // Initialize Firebase and set up auth state listener
    async initialize() {
        if (!window.firebase) {
            console.warn('Firebase SDK not loaded');
            this.updateSyncStatus('offline', 'Setup required');
            return false;
        }

        // Check if Firebase is configured
        if (!isFirebaseConfigured()) {
            console.warn('Firebase not configured - cloud sync disabled');
            this.updateSyncStatus('offline', 'Setup required');
            this.showSetupRequired();
            return false;
        }

        try {
            // Initialize Firebase with config
            const initialized = initializeFirebase();
            if (!initialized) {
                throw new Error('Failed to initialize Firebase');
            }

            this.isInitialized = true;
            this.showFirebaseReady();

            // Set up auth state listener
            auth.onAuthStateChanged((user) => {
                this.handleAuthStateChange(user);
            });

            console.log('Firebase sync initialized');
            return true;
        } catch (error) {
            console.error('Error initializing Firebase sync:', error);
            this.updateSyncStatus('offline', 'Setup error');
            this.showSetupRequired();
            return false;
        }
    }

    // Handle authentication state changes
    handleAuthStateChange(user) {
        this.currentUser = user;

        if (user) {
            console.log('User signed in:', user.email);
            this.setupSyncListeners();
            this.syncToCloud();
            this.updateSyncStatus('online', `Synced as ${user.email}`);
            this.updateUserInfo(user);
        } else {
            console.log('User signed out');
            this.teardownSyncListeners();
            this.syncEnabled = false;
            this.updateSyncStatus('offline', 'Sign in to sync');
            this.hideUserInfo();
        }

        // Notify listeners
        this.notifySyncListeners('auth-change', { user });
    }

    // Sign in with Google
    async signInWithGoogle() {
        if (!auth) {
            alert('Firebase is not configured. Please update firebase-config.js with your Firebase credentials.');
            return null;
        }

        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            console.log('Successfully signed in:', result.user.email);
            return result.user;
        } catch (error) {
            console.error('Error signing in:', error);

            // More helpful error messages
            if (error.code === 'auth/popup-closed-by-user') {
                // User closed the popup, no need to show error
                return null;
            } else if (error.code === 'auth/unauthorized-domain') {
                alert('This domain is not authorized. Please add it to your Firebase Console:\n\nAuthentication > Settings > Authorized domains');
            } else {
                alert(`Failed to sign in: ${error.message}\n\nPlease check the browser console for details.`);
            }
            throw error;
        }
    }

    // Sign out
    async signOut() {
        try {
            await auth.signOut();
            console.log('Successfully signed out');
        } catch (error) {
            console.error('Error signing out:', error);
            alert('Failed to sign out. Please try again.');
            throw error;
        }
    }

    // Set up real-time sync listeners
    setupSyncListeners() {
        if (!this.currentUser) return;

        const userId = this.currentUser.uid;
        this.dataRef = database.ref(`users/${userId}/fastingData`);

        // Listen for remote changes
        this.dataRef.on('value', (snapshot) => {
            const remoteData = snapshot.val();
            if (remoteData) {
                this.handleRemoteDataChange(remoteData);
            }
        });

        this.syncEnabled = true;
        console.log('Sync listeners set up for user:', userId);
    }

    // Tear down sync listeners
    teardownSyncListeners() {
        if (this.dataRef) {
            this.dataRef.off();
            this.dataRef = null;
        }
        this.syncEnabled = false;
    }

    // Handle remote data changes
    handleRemoteDataChange(remoteData) {
        // Check if remote data is newer than local data
        const localTimestamp = this.lastSyncTimestamp || 0;
        const remoteTimestamp = remoteData.lastModified || 0;

        if (remoteTimestamp > localTimestamp) {
            console.log('Applying remote changes...');
            this.updateSyncStatus('syncing', 'Syncing...');

            // Update local state with remote data
            if (remoteData.state) {
                // Merge remote state with local state
                this.notifySyncListeners('remote-update', {
                    remoteState: remoteData.state,
                    remoteTimestamp
                });
            }

            this.lastSyncTimestamp = remoteTimestamp;
            this.updateSyncStatus('online', 'Synced');
        }
    }

    // Sync local data to cloud
    async syncToCloud(localState) {
        if (!this.syncEnabled || !this.dataRef) {
            console.log('Sync not enabled or no data ref');
            return false;
        }

        try {
            this.updateSyncStatus('syncing', 'Syncing...');

            const syncData = {
                state: localState || state,
                lastModified: Date.now(),
                deviceInfo: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform
                }
            };

            await this.dataRef.set(syncData);
            this.lastSyncTimestamp = syncData.lastModified;

            console.log('Data synced to cloud successfully');
            this.updateSyncStatus('online', 'Synced');
            return true;
        } catch (error) {
            console.error('Error syncing to cloud:', error);
            this.updateSyncStatus('offline', 'Sync failed');
            return false;
        }
    }

    // Add a sync listener
    addSyncListener(callback) {
        this.syncListeners.push(callback);
    }

    // Notify all sync listeners
    notifySyncListeners(event, data) {
        this.syncListeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in sync listener:', error);
            }
        });
    }

    // Update sync status indicator in UI
    updateSyncStatus(status, message) {
        const indicator = document.querySelector('.sync-indicator');
        const text = document.getElementById('sync-text');

        if (!indicator || !text) return;

        // Remove all status classes
        indicator.classList.remove('sync-online', 'sync-offline', 'sync-syncing');

        // Add appropriate class
        switch (status) {
            case 'online':
                indicator.classList.add('sync-online');
                break;
            case 'offline':
                indicator.classList.add('sync-offline');
                break;
            case 'syncing':
                indicator.classList.add('sync-syncing');
                break;
        }

        text.textContent = message;
    }

    // Update user info in UI
    updateUserInfo(user) {
        const userInfo = document.getElementById('user-info');
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');
        const userPhoto = document.getElementById('user-photo');
        const authBtn = document.getElementById('auth-btn');

        if (userInfo && userName && userEmail && userPhoto) {
            userInfo.classList.remove('hidden');
            userName.textContent = user.displayName || 'User';
            userEmail.textContent = user.email;
            userPhoto.src = user.photoURL || 'https://via.placeholder.com/40';
            userPhoto.alt = user.displayName || 'User';
        }

        if (authBtn) {
            authBtn.textContent = 'Sign Out';
        }
    }

    // Hide user info in UI
    hideUserInfo() {
        const userInfo = document.getElementById('user-info');
        const authBtn = document.getElementById('auth-btn');

        if (userInfo) {
            userInfo.classList.add('hidden');
        }

        if (authBtn) {
            authBtn.textContent = 'Sign In';
        }
    }

    // Get current auth state
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Show setup required message
    showSetupRequired() {
        const notConfigured = document.getElementById('firebase-not-configured');
        const ready = document.getElementById('firebase-ready');

        if (notConfigured) notConfigured.classList.remove('hidden');
        if (ready) ready.classList.add('hidden');
    }

    // Show Firebase ready message
    showFirebaseReady() {
        const notConfigured = document.getElementById('firebase-not-configured');
        const ready = document.getElementById('firebase-ready');

        if (notConfigured) notConfigured.classList.add('hidden');
        if (ready) ready.classList.remove('hidden');
    }
}

// Create global instance
const firebaseSync = new FirebaseSync();

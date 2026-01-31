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

            // Handle redirect result (for mobile auth)
            try {
                console.log('Checking for redirect result...');
                const result = await auth.getRedirectResult();
                console.log('Redirect result:', result);
                if (result && result.user) {
                    console.log('Redirect sign-in successful');
                    // User will be handled by onAuthStateChanged
                } else {
                    console.log('No user in redirect result');
                }
            } catch (redirectError) {
                console.error('Redirect error:', redirectError.code, redirectError.message);
            }

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
            // SECURITY: Don't log email to console
            console.log('User signed in');
            this.setupSyncListeners();
            // NOTE: Don't call syncToCloud() here immediately!
            // The setupSyncListeners() will trigger handleRemoteDataChange() when remote data arrives.
            // After remote data is merged with local, THEN app.js will call syncToCloud() with the merged state.
            // This prevents overwriting cloud data with empty local defaults on fresh devices.
            // SECURITY: Use display name instead of email in status
            this.updateSyncStatus('online', `Synced as ${user.displayName || 'User'}`);
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

    // Detect if running on mobile
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Sign in with Google
    async signInWithGoogle() {
        if (!auth) {
            if (typeof showAchievementToast === 'function') {
                showAchievementToast(
                    '<span class="px-icon px-cloud"></span>',
                    'Firebase Not Configured',
                    'Please update firebase-config.js with your Firebase credentials.',
                    'warning'
                );
            }
            return null;
        }

        try {
            const provider = new firebase.auth.GoogleAuthProvider();

            // Always use popup - redirect fails on iOS Safari due to ITP blocking cookies
            console.log('Using popup auth');
            const result = await auth.signInWithPopup(provider);
            // SECURITY: Don't log email to console
            console.log('Successfully signed in');
            return result.user;
        } catch (error) {
            console.error('Error signing in:', error);

            // More helpful error messages
            if (error.code === 'auth/popup-closed-by-user') {
                // User closed the popup, no need to show error
                return null;
            } else if (error.code === 'auth/popup-blocked') {
                if (typeof showAchievementToast === 'function') {
                    showAchievementToast(
                        '<span class="px-icon px-danger"></span>',
                        'Popup Blocked',
                        'Please allow popups for this site and try again.',
                        'warning'
                    );
                }
            } else if (error.code === 'auth/unauthorized-domain') {
                if (typeof showAchievementToast === 'function') {
                    showAchievementToast(
                        '<span class="px-icon px-danger"></span>',
                        'Domain Not Authorized',
                        'Add this domain in Firebase Console: Authentication > Settings > Authorized domains',
                        'danger'
                    );
                }
            } else if (error.code === 'auth/network-request-failed') {
                if (typeof showAchievementToast === 'function') {
                    showAchievementToast(
                        '<span class="px-icon px-danger"></span>',
                        'Network Error',
                        'Please check your internet connection and try again.',
                        'danger'
                    );
                }
            } else {
                if (typeof showAchievementToast === 'function') {
                    showAchievementToast(
                        '<span class="px-icon px-danger"></span>',
                        'Sign In Failed',
                        error.message || 'Check the browser console for details.',
                        'danger'
                    );
                }
            }
            throw error;
        }
    }

    // Sign out
    async signOut() {
        if (!auth) {
            console.error('Auth not initialized');
            return;
        }

        try {
            console.log('Signing out from Firebase...');
            await auth.signOut();

            // Verify sign out worked
            const currentUser = auth.currentUser;
            if (currentUser) {
                console.error('Sign out may have failed - user still exists');
            } else {
                console.log('Successfully signed out');
            }

            // Clear internal state
            this.currentUser = null;
            this.syncEnabled = false;
            this.lastSyncTimestamp = null;

        } catch (error) {
            console.error('Error signing out:', error);
            if (typeof showAchievementToast === 'function') {
                showAchievementToast(
                    '<span class="px-icon px-danger"></span>',
                    'Sign Out Failed',
                    'Please try again.',
                    'danger'
                );
            }
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
            } else {
                // No cloud data yet (new user) - still need to signal initial sync complete
                console.log('No cloud data found - new user or first sync');
                this.notifySyncListeners('remote-update', {
                    remoteState: {},
                    remoteTimestamp: 0
                });
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

        // Ignore updates that are very close in time (within 2 seconds) to prevent sync loops
        const timeDiff = Math.abs(remoteTimestamp - localTimestamp);
        if (localTimestamp > 0 && timeDiff < 2000) {
            return;
        }

        // Apply remote data if it's newer OR if we have no local timestamp (fresh device)
        if (remoteTimestamp > localTimestamp || localTimestamp === 0) {
            this.updateSyncStatus('syncing', 'Syncing...');

            // Update local state with remote data
            if (remoteData.state) {
                // Merge remote state with local state
                this.notifySyncListeners('remote-update', {
                    remoteState: remoteData.state,
                    remoteTimestamp
                });
            } else {
                // Still notify so initialSyncComplete gets set
                this.notifySyncListeners('remote-update', {
                    remoteState: {},
                    remoteTimestamp: 0
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

            const stateToSync = localState || window.state;

            // SECURITY: Don't store device fingerprinting data (userAgent, platform)
            const syncData = {
                state: stateToSync,
                lastModified: Date.now()
            };

            await this.dataRef.set(syncData);
            this.lastSyncTimestamp = syncData.lastModified;
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
        const cloudSyncIntro = document.getElementById('cloud-sync-intro');
        const firebaseReady = document.getElementById('firebase-ready');

        if (userInfo && userName && userEmail && userPhoto) {
            userInfo.classList.remove('hidden');
            userName.textContent = user.displayName || 'User';
            userEmail.textContent = user.email;
            userPhoto.src = user.photoURL || 'https://via.placeholder.com/40';
            userPhoto.alt = user.displayName || 'User';
        }

        // Hide the intro message and firebase-ready message when signed in
        if (cloudSyncIntro) cloudSyncIntro.classList.add('hidden');
        if (firebaseReady) firebaseReady.classList.add('hidden');

        if (authBtn) {
            authBtn.textContent = 'Sign Out';
        }
    }

    // Hide user info in UI
    hideUserInfo() {
        const userInfo = document.getElementById('user-info');
        const authBtn = document.getElementById('auth-btn');
        const cloudSyncIntro = document.getElementById('cloud-sync-intro');
        const firebaseReady = document.getElementById('firebase-ready');
        const setUsernameSection = document.getElementById('set-username-section');
        const usernameDisplaySection = document.getElementById('username-display-section');

        if (userInfo) {
            userInfo.classList.add('hidden');
        }

        // Hide username sections when signed out
        if (setUsernameSection) {
            setUsernameSection.classList.add('hidden');
        }
        if (usernameDisplaySection) {
            usernameDisplaySection.classList.add('hidden');
        }

        // Show the intro message and firebase-ready message when signed out
        if (cloudSyncIntro) cloudSyncIntro.classList.remove('hidden');
        if (firebaseReady) firebaseReady.classList.remove('hidden');

        if (authBtn) {
            authBtn.textContent = 'Sign In';
        }
    }

    // Get current auth state
    isAuthenticated() {
        // Check both our tracked user and Firebase's auth state for robustness
        // Also sync up our currentUser if Firebase has a user but we don't (race condition fix)
        if (!this.currentUser && auth && auth.currentUser) {
            this.currentUser = auth.currentUser;
        }
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
window.firebaseSync = firebaseSync;

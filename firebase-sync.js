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
        this.isConnected = false; // Track actual Firebase connection state
        this.connectionRef = null; // Reference to .info/connected listener
        this._signInInProgress = false; // Guard against concurrent sign-in attempts
        this._lastSuccessfulSync = 0; // Timestamp of last successful data operation
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
            this.setupConnectionListener(); // Start monitoring connection state
            this.setupSyncListeners();
            // NOTE: Don't call syncToCloud() here immediately!
            // The setupSyncListeners() will trigger handleRemoteDataChange() when remote data arrives.
            // After remote data is merged with local, THEN app.js will call syncToCloud() with the merged state.
            // This prevents overwriting cloud data with empty local defaults on fresh devices.
            // No status shown on sign-in — sync operations will set it when they succeed
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

    // Detect if running inside Capacitor native app
    isNative() {
        return window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
    }

    // Sign in with Google
    async signInWithGoogle() {
        if (this._signInInProgress) {
            console.warn('Sign-in already in progress, skipping');
            return null;
        }
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

        this._signInInProgress = true;
        try {
            // In Capacitor native app, use native Google Sign-In plugin
            if (this.isNative()) {
                const user = await this._signInWithGoogleNative();
                return user;
            }

            // Web: use popup auth (redirect fails on iOS Safari due to ITP)
            const provider = new firebase.auth.GoogleAuthProvider();
            console.log('Using popup auth');
            const result = await auth.signInWithPopup(provider);
            console.log('Successfully signed in');
            return result.user;
        } catch (error) {
            this._handleAuthError(error);
            throw error;
        } finally {
            this._signInInProgress = false;
        }
    }

    // Sign in with Apple (required by App Store Guideline 4.8 when offering Google Sign-In)
    async signInWithApple() {
        if (this._signInInProgress) {
            console.warn('Sign-in already in progress, skipping');
            return null;
        }
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

        this._signInInProgress = true;
        try {
            // In Capacitor native app, use native Apple Sign-In plugin
            if (this.isNative()) {
                const user = await this._signInWithAppleNative();
                return user;
            }

            // Web: use popup auth with Apple provider
            const provider = new firebase.auth.OAuthProvider('apple.com');
            provider.addScope('email');
            provider.addScope('name');
            console.log('Using Apple popup auth');
            const result = await auth.signInWithPopup(provider);
            console.log('Successfully signed in with Apple');
            return result.user;
        } catch (error) {
            this._handleAuthError(error);
            throw error;
        } finally {
            this._signInInProgress = false;
        }
    }

    // Native Google Sign-In via Capacitor Firebase Auth plugin
    async _signInWithGoogleNative() {
        const FirebaseAuthentication = window.Capacitor.Plugins.FirebaseAuthentication;
        if (!FirebaseAuthentication) {
            throw new Error('FirebaseAuthentication plugin not available');
        }

        console.log('Using native Google Sign-In');
        const result = await FirebaseAuthentication.signInWithGoogle();

        // Get the credential and sign into the web Firebase SDK
        const credential = firebase.auth.GoogleAuthProvider.credential(
            result.credential?.idToken
        );
        const userCredential = await auth.signInWithCredential(credential);
        console.log('Successfully signed in with native Google');
        return userCredential.user;
    }

    // Native Apple Sign-In via Capacitor Firebase Auth plugin
    async _signInWithAppleNative() {
        const FirebaseAuthentication = window.Capacitor.Plugins.FirebaseAuthentication;
        if (!FirebaseAuthentication) {
            throw new Error('FirebaseAuthentication plugin not available');
        }

        console.log('Using native Apple Sign-In');
        const result = await FirebaseAuthentication.signInWithApple();
        console.log('Native Apple Sign-In result:', JSON.stringify(result, null, 2));

        // Get the credential and sign into the web Firebase SDK
        const idToken = result.credential?.idToken;
        const nonce = result.credential?.nonce;
        if (!idToken) {
            throw new Error('No idToken returned from native Apple Sign-In');
        }
        const provider = new firebase.auth.OAuthProvider('apple.com');
        const credential = provider.credential({ idToken, rawNonce: nonce });
        console.log('Signing into web Firebase SDK with Apple credential...');
        const userCredential = await auth.signInWithCredential(credential);
        console.log('Successfully signed in with native Apple:', userCredential.user?.displayName);
        return userCredential.user;
    }

    // Centralized auth error handling
    _handleAuthError(error) {
        console.error('Error signing in:', error);

        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            return; // User cancelled, no error toast needed
        }

        const errorMessages = {
            'auth/popup-blocked': { title: 'Popup Blocked', msg: 'Please allow popups for this site and try again.', type: 'warning' },
            'auth/unauthorized-domain': { title: 'Domain Not Authorized', msg: 'Add this domain in Firebase Console: Authentication > Settings > Authorized domains', type: 'danger' },
            'auth/network-request-failed': { title: 'Network Error', msg: 'Please check your internet connection and try again.', type: 'danger' },
        };

        const errInfo = errorMessages[error.code] || { title: 'Sign In Failed', msg: error.message || 'Check the browser console for details.', type: 'danger' };

        if (typeof showAchievementToast === 'function') {
            showAchievementToast(
                '<span class="px-icon px-danger"></span>',
                errInfo.title,
                errInfo.msg,
                errInfo.type
            );
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
            this._lastSuccessfulSync = 0;

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
        if (this.connectionRef) {
            this.connectionRef.off();
            this.connectionRef = null;
        }
        this.syncEnabled = false;
        this.isConnected = false;
    }

    // Set up connection state listener - CRITICAL for honest sync status
    setupConnectionListener() {
        if (!database) return;

        this.connectionRef = database.ref('.info/connected');
        this.connectionRef.on('value', (snapshot) => {
            const wasConnected = this.isConnected;
            this.isConnected = snapshot.val() === true;

            console.log('Firebase connection state:', this.isConnected ? 'connected' : 'disconnected');

            // Update UI to reflect actual connection state
            this.updateConnectionStatus();

            // Notify listeners of connection change
            if (wasConnected !== this.isConnected) {
                this.notifySyncListeners('connection-change', { connected: this.isConnected });
            }
        });
    }

    // Update sync status based on ACTUAL connection + auth state
    // Sync operations own this status. The connection listener can only
    // downgrade it if no successful sync happened recently.
    updateConnectionStatus() {
        if (!this.currentUser) {
            this.updateSyncStatus('offline', 'Sign in to sync');
        } else if (!this.isConnected) {
            const recentSyncAge = Date.now() - this._lastSuccessfulSync;
            if (this._lastSuccessfulSync > 0 && recentSyncAge < 30000) {
                // Data synced recently — WebSocket flicker doesn't matter
                return;
            }
            this.updateSyncStatus('offline', 'Disconnected');
        } else {
            this.updateSyncStatus('online', `Synced as ${this.currentUser.displayName || 'User'}`);
        }
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
            this._lastSuccessfulSync = Date.now();
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

            // DATA PROTECTION: Validate state before syncing to prevent accidental data loss
            // If state has no history and no skills, it's likely a fresh/empty state that shouldn't overwrite cloud data
            const hasFastingHistory = stateToSync.fastingHistory && stateToSync.fastingHistory.length > 0;
            const hasSleepHistory = stateToSync.sleepHistory && stateToSync.sleepHistory.length > 0;
            const hasSkillData = stateToSync.skills && Object.values(stateToSync.skills).some(xp => xp > 0);
            const hasActiveSession = (stateToSync.currentFast && stateToSync.currentFast.isActive) ||
                                     (stateToSync.currentSleep && stateToSync.currentSleep.isActive);

            // If no meaningful data exists, check if we're potentially overwriting cloud data
            if (!hasFastingHistory && !hasSleepHistory && !hasSkillData && !hasActiveSession) {
                // Check if cloud already has data (via lastSyncTimestamp from previous successful reads)
                if (this.lastSyncTimestamp > 0) {
                    console.warn('Blocking sync: Local state appears empty but cloud has data. This may prevent data loss.');
                    this.updateSyncStatus('online', 'Synced');
                    return false;
                }
            }

            // SECURITY: Don't store device fingerprinting data (userAgent, platform)
            const syncData = {
                state: stateToSync,
                lastModified: Date.now()
            };

            await this.dataRef.set(syncData);
            this.lastSyncTimestamp = syncData.lastModified;
            this._lastSuccessfulSync = Date.now();
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

        // Show danger zone section when signed in
        const dangerZone = document.getElementById('danger-zone-section');
        if (dangerZone) dangerZone.classList.remove('hidden');

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

        // Hide danger zone section when signed out
        const dangerZone = document.getElementById('danger-zone-section');
        if (dangerZone) dangerZone.classList.add('hidden');

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

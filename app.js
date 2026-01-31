// State Management
const STATE_KEY = 'fasting-tracker-state';
let state = {
    currentFast: {
        startTime: null,
        goalHours: 16,
        isActive: false,
        powerups: [] // Track powerups during fast
    },
    fastingHistory: [],
    currentSleep: {
        startTime: null,
        goalHours: 8,
        isActive: false
    },
    sleepHistory: [],
    // Last meal time (when fast ended)
    lastMealTime: null,
    // Sleep powerups for pre-sleep routine
    sleepPowerups: [],
    // Eating powerups for breaking fast
    eatingPowerups: [],
    // Skills XP tracking
    skills: {
        water: 0,
        hotwater: 0,
        coffee: 0,
        tea: 0,
        exercise: 0,
        hanging: 0,
        grip: 0,
        walk: 0,
        doctorwin: 0,
        flatstomach: 0,
        broth: 0,
        protein: 0,
        fiber: 0,
        homecooked: 0,
        sloweating: 0,
        chocolate: 0,
        mealwalk: 0,
        sleep: 0
    },
    // Settings/Preferences
    settings: {
        showFastingGoals: true,
        showSleepGoals: true,
        showFastingFuture: true,
        showBreakingFastGuide: true,
        showExerciseGuide: true,
        showEatingGuide: true,
        showSleepGuide: true,
        showMealSleepQuality: true,
        showHungerTracker: true,
        showTrends: true
    },
    // Custom powerup (1 per month)
    customPowerup: {
        name: null,
        createdMonth: null // YYYY-MM format to track monthly limit
    },
    // First-time user tutorial
    hasSeenTutorial: false,
    // Current tab (for syncing across devices)
    currentTab: 'timer',
    // Living Life - guilt-free days off (5 per rolling 30/60 days)
    livingLife: {
        isActive: false,        // Currently in Living Life mode?
        activatedAt: null,      // When was it activated?
        expiresAt: null,        // When does the 24h period end?
        history: []             // Array of { activatedAt, expiresAt } for tracking usage
    }
};

// Expose state globally for debugging and cross-module access
window.state = state;

// DOM element cache for frequently accessed elements (performance optimization)
// Initialized in DOMContentLoaded to ensure elements exist
const domCache = {
    timerDisplay: null,
    progressBar: null,
    sleepTimerDisplay: null,
    sleepProgressBar: null
};

function initDomCache() {
    domCache.timerDisplay = document.getElementById('timer-display');
    domCache.progressBar = document.getElementById('progress-bar');
    domCache.sleepTimerDisplay = document.getElementById('sleep-timer-display');
    domCache.sleepProgressBar = document.getElementById('sleep-progress-bar');
}

// ==========================================
// SECURITY UTILITIES
// ==========================================

/**
 * HTML-escape a string to prevent XSS attacks
 * @param {string} str - The string to escape
 * @returns {string} - HTML-escaped string
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

/**
 * Sanitize a string for use in HTML attributes
 * @param {string} str - The string to sanitize
 * @returns {string} - Sanitized string safe for attributes
 */
function sanitizeAttribute(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Validate and sanitize numeric input
 * @param {any} value - The value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {number} defaultValue - Default if invalid
 * @returns {number} - Validated number
 */
function sanitizeNumber(value, min, max, defaultValue = 0) {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) return defaultValue;
    return Math.max(min, Math.min(max, num));
}

/**
 * Validate username format
 * @param {string} username - The username to validate
 * @returns {boolean} - Whether the username is valid
 */
function isValidUsername(username) {
    if (typeof username !== 'string') return false;
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

/**
 * Sanitize imported data to prevent malicious content
 * @param {object} data - The data object to sanitize
 * @returns {object} - Sanitized data object
 */
function sanitizeImportedData(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
    }

    // Deep clone to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(data));

    // Validate currentFast
    if (sanitized.currentFast) {
        sanitized.currentFast.goalHours = sanitizeNumber(sanitized.currentFast.goalHours, 1, 72, 16);
        sanitized.currentFast.isActive = Boolean(sanitized.currentFast.isActive);
        if (sanitized.currentFast.startTime) {
            const time = new Date(sanitized.currentFast.startTime).getTime();
            if (isNaN(time) || time < 0 || time > Date.now() + 86400000) {
                sanitized.currentFast.startTime = null;
                sanitized.currentFast.isActive = false;
            }
        }
        if (Array.isArray(sanitized.currentFast.powerups)) {
            sanitized.currentFast.powerups = sanitized.currentFast.powerups
                .filter(p => typeof p === 'string' && p.length <= 50)
                .slice(0, 20);
        } else {
            sanitized.currentFast.powerups = [];
        }
    }

    // Validate currentSleep
    if (sanitized.currentSleep) {
        sanitized.currentSleep.goalHours = sanitizeNumber(sanitized.currentSleep.goalHours, 1, 24, 8);
        sanitized.currentSleep.isActive = Boolean(sanitized.currentSleep.isActive);
        if (sanitized.currentSleep.startTime) {
            const time = new Date(sanitized.currentSleep.startTime).getTime();
            if (isNaN(time) || time < 0 || time > Date.now() + 86400000) {
                sanitized.currentSleep.startTime = null;
                sanitized.currentSleep.isActive = false;
            }
        }
    }

    // Validate fastingHistory
    if (Array.isArray(sanitized.fastingHistory)) {
        sanitized.fastingHistory = sanitized.fastingHistory
            .filter(entry => {
                if (!entry || typeof entry !== 'object') return false;
                const start = new Date(entry.startTime).getTime();
                const end = new Date(entry.endTime).getTime();
                if (isNaN(start) || isNaN(end)) return false;
                if (start < 0 || end < start) return false;
                // Cap duration at 7 days (168 hours)
                if ((end - start) > 604800000) return false;
                return true;
            })
            .slice(0, 1000) // Limit history entries
            .map(entry => ({
                ...entry,
                id: String(entry.id || Date.now()).slice(0, 50),
                goalHours: sanitizeNumber(entry.goalHours, 1, 72, 16),
                duration: sanitizeNumber(entry.duration, 0, 168, 0),
                powerups: Array.isArray(entry.powerups)
                    ? entry.powerups.filter(p => typeof p === 'string' && p.length <= 50).slice(0, 20)
                    : []
            }));
    } else {
        sanitized.fastingHistory = [];
    }

    // Validate sleepHistory
    if (Array.isArray(sanitized.sleepHistory)) {
        sanitized.sleepHistory = sanitized.sleepHistory
            .filter(entry => {
                if (!entry || typeof entry !== 'object') return false;
                const start = new Date(entry.startTime).getTime();
                const end = new Date(entry.endTime).getTime();
                if (isNaN(start) || isNaN(end)) return false;
                if (start < 0 || end < start) return false;
                // Cap duration at 24 hours
                if ((end - start) > 86400000) return false;
                return true;
            })
            .slice(0, 1000) // Limit history entries
            .map(entry => ({
                ...entry,
                id: String(entry.id || Date.now()).slice(0, 50),
                goalHours: sanitizeNumber(entry.goalHours, 1, 24, 8),
                duration: sanitizeNumber(entry.duration, 0, 24, 0)
            }));
    } else {
        sanitized.sleepHistory = [];
    }

    // Validate skills
    if (sanitized.skills && typeof sanitized.skills === 'object') {
        const validSkills = ['water', 'coffee', 'tea', 'exercise', 'hanging', 'grip', 'walk',
                           'broth', 'protein', 'fiber', 'homecooked', 'sloweating', 'chocolate', 'mealwalk', 'sleep'];
        for (const skill of validSkills) {
            sanitized.skills[skill] = sanitizeNumber(sanitized.skills[skill], 0, 1000000, 0);
        }
    }

    // Validate customPowerup
    if (sanitized.customPowerup) {
        if (typeof sanitized.customPowerup.name === 'string') {
            sanitized.customPowerup.name = sanitized.customPowerup.name.slice(0, 50);
        } else {
            sanitized.customPowerup.name = null;
        }
    }

    // Validate settings
    if (sanitized.settings && typeof sanitized.settings === 'object') {
        const validSettings = ['showFastingGoals', 'showSleepGoals', 'showFastingFuture',
                              'showBreakingFastGuide', 'showExerciseGuide', 'showEatingGuide',
                              'showSleepGuide', 'showMealSleepQuality', 'showHungerTracker', 'showTrends'];
        for (const setting of validSettings) {
            sanitized.settings[setting] = Boolean(sanitized.settings[setting]);
        }
    }

    return sanitized;
}

let timerInterval = null;
let sleepTimerInterval = null;
let constitutionInterval = null; // Track constitution update interval to prevent memory leaks
let mealSleepInterval = null; // Track meal/sleep status interval
let constitutionCheckInterval = null; // Track constitution check interval when not fasting
let livingLifeInterval = null; // Track Living Life status check interval
let initialSyncComplete = false; // Flag to prevent overwriting cloud data before initial sync
let isMergingRemoteData = false; // Flag to prevent sync loops during remote data merge

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    // Don't show toast for every error to avoid spam, just log
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Prevent the default handling (which would show in console anyway)
    event.preventDefault();
});

// Save state when user leaves or switches tabs (for mobile browsers)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        // Save state immediately when tab becomes hidden
        saveState();
    }
});

// Save state before page unload (browser close/refresh)
window.addEventListener('beforeunload', () => {
    saveState();
});

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    initDomCache(); // Initialize DOM element cache first
    loadState();
    initEventListeners();
    initUsernameListeners();
    initLeaderboardListeners();
    initTutorialListener();
    initSettings();
    updateUI();
    updatePowerupDisplay();
    updateHungerDisplay();
    updateEatingPowerupDisplay();
    updateMealQuality();
    updateConstitution();
    updateSkills();
    updateCustomPowerupDisplay();
    updatePowerupStates();
    updateLivingLifeUI();

    // Restore last active tab
    if (state.currentTab) {
        switchTab(state.currentTab);
    }

    if (state.currentFast.isActive) {
        startTimer();
    }

    if (state.currentSleep && state.currentSleep.isActive) {
        startSleepTimer();
    }

    // Update meal-sleep status every minute (store reference for cleanup)
    mealSleepInterval = setInterval(updateMealSleepStatus, 60000);

    // Note: Heart Points is updated by startTimer() every 30 seconds when fasting is active
    // Only need periodic update when NOT fasting (for sleep/eating scores)
    constitutionCheckInterval = setInterval(() => {
        if (!state.currentFast.isActive) {
            updateConstitution();
        }
    }, 60000);

    // Initialize Firebase sync
    await initializeFirebaseSync();

    // Check for username if already signed in
    if (firebaseSync && firebaseSync.isAuthenticated()) {
        await checkUsernameAfterSignIn();
    }

    // Check and show tutorial for first-time users
    checkFirstTimeTutorial();

    // Global Escape key handler to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close modals in order of z-index priority (highest first)
            const modalsToClose = [
                { id: 'tutorial-modal', fn: hideTutorial },
                { id: 'leaderboard-modal', fn: closeLeaderboard },
                { id: 'feeling-modal', fn: () => document.getElementById('feeling-modal')?.classList.add('hidden') },
                { id: 'custom-powerup-modal', fn: () => document.getElementById('custom-powerup-modal')?.classList.add('hidden') },
                { id: 'username-modal', fn: () => document.getElementById('username-modal')?.classList.add('hidden') },
                { id: 'guide-modal', fn: () => document.getElementById('guide-modal')?.classList.add('hidden') },
                { id: 'levelup-modal', fn: () => document.getElementById('levelup-modal')?.classList.add('hidden') },
                { id: 'living-life-video-modal', fn: () => { document.getElementById('living-life-video')?.pause(); document.getElementById('living-life-video-modal')?.classList.add('hidden'); } },
                { id: 'living-life-modal', fn: () => document.getElementById('living-life-modal')?.classList.add('hidden') },
                { id: 'visceral-fat-modal', fn: () => document.getElementById('visceral-fat-modal')?.classList.add('hidden') },
                { id: 'insulin-dragon-modal', fn: () => document.getElementById('insulin-dragon-modal')?.classList.add('hidden') }
            ];

            for (const modal of modalsToClose) {
                const el = document.getElementById(modal.id);
                if (el && !el.classList.contains('hidden')) {
                    modal.fn();
                    break; // Only close one modal at a time
                }
            }
        }
    });
});

// localStorage utilities with fallback for private browsing
let localStorageAvailable = true;

function saveState() {
    if (localStorageAvailable) {
        try {
            localStorage.setItem(STATE_KEY, JSON.stringify(state));
        } catch (e) {
            // localStorage might be full or unavailable (private browsing)
            console.warn('Could not save to localStorage:', e.message);
            localStorageAvailable = false;
        }
    }

    // Sync to cloud if enabled (works even if localStorage fails)
    // IMPORTANT: Only sync after initial cloud data has been received to prevent overwriting
    // Also don't sync while we're in the middle of merging remote data (prevents loops)
    if (firebaseSync && firebaseSync.isAuthenticated() && initialSyncComplete && !isMergingRemoteData) {
        firebaseSync.syncToCloud(state);
        // Update leaderboard entry
        updateLeaderboardEntry();
    }
}

function loadState() {
    let saved = null;

    try {
        saved = localStorage.getItem(STATE_KEY);
    } catch (e) {
        // localStorage unavailable (private browsing mode)
        console.warn('localStorage unavailable:', e.message);
        localStorageAvailable = false;
        return; // Use default state
    }

    if (saved) {
        try {
            const parsed = JSON.parse(saved);

            // Validate critical state structure before assigning
            if (!parsed || typeof parsed !== 'object') {
                throw new Error('Invalid state: not an object');
            }
            if (!parsed.currentFast || typeof parsed.currentFast !== 'object') {
                throw new Error('Invalid state: missing currentFast');
            }
            if (!Array.isArray(parsed.fastingHistory)) {
                throw new Error('Invalid state: fastingHistory is not an array');
            }

            state = parsed;

            // Ensure sleep data exists (backward compatibility)
            if (!state.currentSleep) {
                state.currentSleep = { startTime: null, goalHours: 8, isActive: false };
            }
            if (!state.sleepHistory) {
                state.sleepHistory = [];
            }
            // Ensure skills data exists (backward compatibility)
            if (!state.skills) {
                state.skills = {
                    water: 0,
                    coffee: 0,
                    tea: 0,
                    exercise: 0,
                    hanging: 0,
                    grip: 0,
                    walk: 0,
                    broth: 0,
                    protein: 0,
                    fiber: 0,
                    homecooked: 0,
                    sloweating: 0,
                    chocolate: 0,
                    mealwalk: 0
                };
            }
            // Add new eating skills if missing
            if (!state.skills.broth) state.skills.broth = 0;
            if (!state.skills.protein) state.skills.protein = 0;
            if (!state.skills.fiber) state.skills.fiber = 0;
            if (!state.skills.homecooked) state.skills.homecooked = 0;
            if (!state.skills.sloweating) state.skills.sloweating = 0;
            if (!state.skills.chocolate) state.skills.chocolate = 0;
            if (!state.skills.mealwalk) state.skills.mealwalk = 0;
            // Ensure eating powerups exists
            if (!state.eatingPowerups) {
                state.eatingPowerups = [];
            }
            // Ensure sleep powerups exists
            if (!state.sleepPowerups) {
                state.sleepPowerups = [];
            }
            // Ensure sleep skill exists
            if (!state.skills.sleep) {
                state.skills.sleep = 0;
            }
            // Ensure settings exists (backward compatibility)
            if (!state.settings) {
                state.settings = {};
            }
            // Ensure all setting keys exist (preserve user's saved values, default new ones to true)
            const defaultSettings = {
                showFastingGoals: true,
                showSleepGoals: true,
                showFastingFuture: true,
                showBreakingFastGuide: true,
                showExerciseGuide: true,
                showEatingGuide: true,
                showSleepGuide: true,
                showMealSleepQuality: true,
                showHungerTracker: true,
                showTrends: true
            };
            for (const [key, defaultValue] of Object.entries(defaultSettings)) {
                if (state.settings[key] === undefined) {
                    state.settings[key] = defaultValue;
                }
            }
            // Ensure livingLife exists (backward compatibility)
            if (!state.livingLife) {
                state.livingLife = { isActive: false, activatedAt: null, expiresAt: null, history: [] };
            }
            if (!state.livingLife.history) {
                state.livingLife.history = [];
            }
            // Existing users who have data should not see the tutorial (backward compatibility)
            if (state.hasSeenTutorial === undefined) {
                // If they have any history, they're an existing user - skip tutorial
                if ((state.fastingHistory && state.fastingHistory.length > 0) ||
                    (state.sleepHistory && state.sleepHistory.length > 0)) {
                    state.hasSeenTutorial = true;
                } else {
                    state.hasSeenTutorial = false;
                }
            }
        } catch (e) {
            console.error('Error loading state:', e);
            // Corrupted data - backup and reset to defaults
            try {
                const backupKey = `${STATE_KEY}-corrupted-${Date.now()}`;
                localStorage.setItem(backupKey, saved);
                console.warn(`Corrupted state backed up to ${backupKey}`);
            } catch (backupError) {
                // Couldn't backup either
            }

            // Reset to default state (already initialized at top of file)
            // Notify user of the issue
            setTimeout(() => {
                showAchievementToast(
                    '<span class="px-icon px-danger"></span>',
                    'Data Corrupted',
                    'Your saved data was corrupted and has been reset. A backup was saved. Use Export regularly to prevent data loss.',
                    'danger'
                );
            }, 1000);
        }
    }
}

// Event Listeners
function initEventListeners() {
    // Tab navigation
    document.getElementById('tab-timer').addEventListener('click', () => switchTab('timer'));
    document.getElementById('tab-eating').addEventListener('click', () => switchTab('eating'));
    document.getElementById('tab-sleep').addEventListener('click', () => switchTab('sleep'));
    document.getElementById('tab-history').addEventListener('click', () => switchTab('history'));
    document.getElementById('tab-stats').addEventListener('click', () => switchTab('stats'));
    document.getElementById('tab-slayer')?.addEventListener('click', () => switchTab('slayer'));

    // Keyboard navigation for tabs (Arrow keys)
    const tabList = document.querySelector('nav[role="tablist"], nav');
    if (tabList) {
        tabList.addEventListener('keydown', (e) => {
            const tabs = Array.from(tabList.querySelectorAll('button[role="tab"]'));
            const currentIndex = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
            let newIndex = currentIndex;

            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                newIndex = (currentIndex + 1) % tabs.length;
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            } else if (e.key === 'Home') {
                e.preventDefault();
                newIndex = 0;
            } else if (e.key === 'End') {
                e.preventDefault();
                newIndex = tabs.length - 1;
            }

            if (newIndex !== currentIndex) {
                const tabId = tabs[newIndex].id.replace('tab-', '');
                switchTab(tabId);
                tabs[newIndex].focus();
            }
        });
    }

    // Fasting Goal selection
    document.querySelectorAll('.goal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const hours = parseInt(e.currentTarget.dataset.hours, 10);
            if (!isNaN(hours)) setGoal(hours);
        });
    });

    // Fasting Future toggle
    document.getElementById('fasting-future-btn')?.addEventListener('click', toggleFastingFuture);

    const setCustomFastingGoal = () => {
        const customInput = document.getElementById('custom-goal');
        if (!customInput) return;
        const hours = parseInt(customInput.value, 10);
        if (!isNaN(hours) && hours > 0 && hours <= 72) {
            setGoal(hours);
            customInput.value = '';
        }
    };
    document.getElementById('set-custom-goal')?.addEventListener('click', setCustomFastingGoal);
    // Allow Enter key to set custom goal
    document.getElementById('custom-goal')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setCustomFastingGoal();
        }
    });

    // Sleep Goal selection
    document.querySelectorAll('.sleep-goal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const hours = parseInt(e.currentTarget.dataset.hours, 10);
            if (!isNaN(hours)) setSleepGoal(hours);
        });
    });

    const setCustomSleepGoal = () => {
        const customInput = document.getElementById('custom-sleep-goal');
        if (!customInput) return;
        const hours = parseInt(customInput.value, 10);
        if (!isNaN(hours) && hours > 0 && hours <= 24) {
            setSleepGoal(hours);
            customInput.value = '';
        }
    };
    document.getElementById('set-custom-sleep-goal')?.addEventListener('click', setCustomSleepGoal);
    // Allow Enter key to set custom sleep goal
    document.getElementById('custom-sleep-goal')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setCustomSleepGoal();
        }
    });

    // Fasting Timer controls
    document.getElementById('start-btn').addEventListener('click', startFast);
    document.getElementById('stop-btn').addEventListener('click', stopFast);

    // Sleep Timer controls
    document.getElementById('start-sleep-btn').addEventListener('click', startSleep);
    document.getElementById('stop-sleep-btn').addEventListener('click', stopSleep);

    // History toggle buttons
    document.getElementById('history-fasting-btn').addEventListener('click', () => switchHistoryView('fasting'));
    document.getElementById('history-sleep-btn').addEventListener('click', () => switchHistoryView('sleep'));

    // History list delete buttons - using event delegation for better performance
    document.getElementById('history-list')?.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-fast-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.deleteFast;
            if (id) deleteFast(id);
        }
    });
    document.getElementById('sleep-history-list')?.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-sleep-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.deleteSleep;
            if (id) deleteSleep(id);
        }
    });

    // Data sync controls
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    document.getElementById('import-merge-btn').addEventListener('click', () => {
        document.getElementById('import-file').dataset.merge = 'true';
        document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', handleImport);

    // Firebase auth controls
    document.getElementById('auth-btn').addEventListener('click', handleAuthClick);
    document.getElementById('sign-out-btn')?.addEventListener('click', handleSignOut);

    // Powerup buttons
    document.getElementById('powerup-water')?.addEventListener('click', () => addPowerup('water'));
    document.getElementById('powerup-hotwater')?.addEventListener('click', () => addPowerup('hotwater'));
    document.getElementById('powerup-coffee')?.addEventListener('click', () => addPowerup('coffee'));
    document.getElementById('powerup-tea')?.addEventListener('click', () => addPowerup('tea'));
    document.getElementById('powerup-exercise')?.addEventListener('click', () => addExercisePowerup());
    document.getElementById('powerup-hanging')?.addEventListener('click', () => addHangingPowerup());
    document.getElementById('powerup-grip')?.addEventListener('click', () => addGripPowerup());
    document.getElementById('powerup-walk')?.addEventListener('click', () => addWalkPowerup());
    document.getElementById('powerup-doctorwin')?.addEventListener('click', () => addDoctorWinPowerup('fasting'));
    document.getElementById('powerup-flatstomach')?.addEventListener('click', () => addPowerup('flatstomach'));
    document.getElementById('powerup-custom')?.addEventListener('click', () => addPowerup('custom'));
    document.getElementById('add-custom-powerup-btn')?.addEventListener('click', showCustomPowerupModal);
    document.getElementById('cancel-custom-powerup')?.addEventListener('click', hideCustomPowerupModal);
    document.getElementById('create-custom-powerup')?.addEventListener('click', createCustomPowerup);
    // Allow Enter key to create custom powerup
    document.getElementById('custom-powerup-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            createCustomPowerup();
        }
    });
    document.getElementById('reset-powerups-btn')?.addEventListener('click', resetPowerups);

    // Living Life button
    document.getElementById('living-life-btn')?.addEventListener('click', showLivingLifeModal);
    document.getElementById('living-life-confirm')?.addEventListener('click', activateLivingLife);
    document.getElementById('living-life-cancel')?.addEventListener('click', hideLivingLifeModal);
    document.getElementById('living-life-close')?.addEventListener('click', hideLivingLifeModal);
    document.getElementById('living-life-video-close')?.addEventListener('click', hideLivingLifeVideoModal);

    // Eating powerup buttons
    document.getElementById('eating-broth')?.addEventListener('click', () => addEatingPowerup('broth'));
    document.getElementById('eating-protein')?.addEventListener('click', () => addEatingPowerup('protein'));
    document.getElementById('eating-fiber')?.addEventListener('click', () => addEatingPowerup('fiber'));
    document.getElementById('eating-homecooked')?.addEventListener('click', () => addEatingPowerup('homecooked'));
    document.getElementById('eating-sloweating')?.addEventListener('click', () => addEatingPowerup('sloweating'));
    document.getElementById('eating-chocolate')?.addEventListener('click', () => addEatingPowerup('chocolate'));
    document.getElementById('eating-walk')?.addEventListener('click', () => addEatingPowerup('mealwalk'));
    document.getElementById('eating-nosugar')?.addEventListener('click', () => addEatingPowerup('nosugar'));
    document.getElementById('eating-doctorwin')?.addEventListener('click', () => addEatingPowerup('doctorwin'));
    // Bad eating choices
    document.getElementById('eating-eatenout')?.addEventListener('click', () => addEatingPowerup('eatenout'));
    document.getElementById('eating-toofast')?.addEventListener('click', () => addEatingPowerup('toofast'));
    document.getElementById('eating-junkfood')?.addEventListener('click', () => addEatingPowerup('junkfood'));
    document.getElementById('eating-bloated')?.addEventListener('click', () => addEatingPowerup('bloated'));
    document.getElementById('reset-eating-powerups-btn')?.addEventListener('click', resetEatingPowerups);

    // Sleep powerup buttons
    document.getElementById('sleep-darkness')?.addEventListener('click', () => addSleepPowerup('darkness'));
    document.getElementById('sleep-reading')?.addEventListener('click', () => addSleepPowerup('reading'));
    document.getElementById('sleep-cuddling')?.addEventListener('click', () => addSleepPowerup('cuddling'));
    document.getElementById('sleep-doctorwin')?.addEventListener('click', () => addSleepPowerup('doctorwin'));
    // Bad sleep choices
    document.getElementById('sleep-screen')?.addEventListener('click', () => addSleepPowerup('screen'));
    document.getElementById('sleep-smoking')?.addEventListener('click', () => addSleepPowerup('smoking'));
    document.getElementById('reset-sleep-powerups-btn')?.addEventListener('click', resetSleepPowerups);

    // Hunger tracking buttons
    document.getElementById('hunger-1')?.addEventListener('click', () => addHungerLog('hunger1'));
    document.getElementById('hunger-2')?.addEventListener('click', () => addHungerLog('hunger2'));
    document.getElementById('hunger-3')?.addEventListener('click', () => addHungerLog('hunger3'));
    document.getElementById('hunger-4')?.addEventListener('click', () => addHungerLog('hunger4'));
    document.getElementById('reset-hunger-btn')?.addEventListener('click', resetHungerLogs);

    // Settings toggle listeners
    document.getElementById('toggle-fasting-goals')?.addEventListener('change', (e) => updateSetting('showFastingGoals', e.target.checked));
    document.getElementById('toggle-sleep-goals')?.addEventListener('change', (e) => updateSetting('showSleepGoals', e.target.checked));
    document.getElementById('toggle-fasting-future')?.addEventListener('change', (e) => updateSetting('showFastingFuture', e.target.checked));
    document.getElementById('toggle-breaking-fast-guide')?.addEventListener('change', (e) => updateSetting('showBreakingFastGuide', e.target.checked));
    document.getElementById('toggle-exercise-guide')?.addEventListener('change', (e) => updateSetting('showExerciseGuide', e.target.checked));
    document.getElementById('toggle-eating-guide')?.addEventListener('change', (e) => updateSetting('showEatingGuide', e.target.checked));
    document.getElementById('toggle-sleep-guide')?.addEventListener('change', (e) => updateSetting('showSleepGuide', e.target.checked));
    document.getElementById('toggle-meal-sleep-quality')?.addEventListener('change', (e) => updateSetting('showMealSleepQuality', e.target.checked));
    document.getElementById('toggle-hunger-tracker')?.addEventListener('change', (e) => updateSetting('showHungerTracker', e.target.checked));
    document.getElementById('toggle-trends')?.addEventListener('change', (e) => updateSetting('showTrends', e.target.checked));

    // Feeling modal buttons
    document.querySelectorAll('.feeling-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const feeling = btn.dataset.feeling;
            handleFeelingSelection(feeling);
        });
    });
    document.getElementById('feeling-skip')?.addEventListener('click', () => {
        handleFeelingSelection(null);
    });

    // Guide modal close button
    document.getElementById('guide-modal-close')?.addEventListener('click', hideGuideModal);
    // Also close when clicking the backdrop
    document.getElementById('guide-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'guide-modal') {
            hideGuideModal();
        }
    });

    // Long-press handlers for powerups with guides
    setupLongPressGuide('powerup-exercise', 'exercise');
    setupLongPressGuide('powerup-hanging', 'hanging');
    setupLongPressGuide('powerup-grip', 'grip');
    setupLongPressGuide('powerup-walk', 'walk');

    // Monster Battle modal buttons
    initMonsterBattleListeners();
}

// Tab switching
function switchTab(tab) {
    // Don't allow tab switching while sleeping (except to sleep tab)
    if (state.currentSleep?.isActive && tab !== 'sleep') {
        return;
    }

    // Don't allow switching to eating tab while fasting
    if (state.currentFast?.isActive && tab === 'eating') {
        return;
    }

    // Save current tab to state
    state.currentTab = tab;
    saveState();

    // Update tab buttons - Matrix green theme
    document.querySelectorAll('nav button[role="tab"]').forEach(btn => {
        btn.classList.remove('text-white', 'text-black');
        btn.style.background = '';
        btn.style.color = 'var(--matrix-400)';
        btn.setAttribute('aria-selected', 'false');
    });
    const activeTab = document.getElementById(`tab-${tab}`);
    if (!activeTab) return; // Guard against invalid tab names

    // Use different gradients for each tab type
    if (tab === 'sleep') {
        activeTab.classList.add('text-white');
        activeTab.style.background = 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)';
        activeTab.style.color = 'white';
    } else if (tab === 'eating') {
        activeTab.classList.add('text-white');
        activeTab.style.background = 'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)';
        activeTab.style.color = 'white';
    } else if (tab === 'slayer') {
        activeTab.classList.add('text-white');
        activeTab.style.background = 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)';
        activeTab.style.color = 'white';
    } else {
        activeTab.classList.add('text-black');
        activeTab.style.background = 'linear-gradient(135deg, var(--matrix-500) 0%, var(--matrix-400) 100%)';
        activeTab.style.color = 'black';
    }
    activeTab.setAttribute('aria-selected', 'true');

    // Update views
    document.querySelectorAll('.view-container').forEach(view => {
        view.classList.add('hidden');
    });
    const viewElement = document.getElementById(`view-${tab}`);
    if (viewElement) viewElement.classList.remove('hidden');

    // Refresh data for the tab
    if (tab === 'history') {
        renderHistory();
        renderSleepHistory();
    } else if (tab === 'stats') {
        renderStats();
        renderSleepStats();
        updateSkills();
    } else if (tab === 'sleep') {
        updateSleepUI();
    } else if (tab === 'eating') {
        updateEatingPowerupDisplay();
        updateMealQuality();
    } else if (tab === 'slayer') {
        updateMonsterBattleUI();
        startSlayerAnimations();
    }
}

// History view switching
function switchHistoryView(type) {
    const fastingBtn = document.getElementById('history-fasting-btn');
    const sleepBtn = document.getElementById('history-sleep-btn');
    const fastingContainer = document.getElementById('fasting-history-container');
    const sleepContainer = document.getElementById('sleep-history-container');

    if (type === 'fasting') {
        fastingBtn.classList.add('text-black');
        fastingBtn.style.background = 'linear-gradient(135deg, var(--matrix-500) 0%, var(--matrix-400) 100%)';
        fastingBtn.style.color = 'black';
        sleepBtn.classList.remove('text-white');
        sleepBtn.style.background = '';
        sleepBtn.style.color = '#818cf8';
        fastingContainer.classList.remove('hidden');
        sleepContainer.classList.add('hidden');
    } else {
        sleepBtn.classList.add('text-white');
        sleepBtn.style.background = 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)';
        sleepBtn.style.color = 'white';
        fastingBtn.classList.remove('text-black');
        fastingBtn.style.background = '';
        fastingBtn.style.color = 'var(--matrix-400)';
        sleepContainer.classList.remove('hidden');
        fastingContainer.classList.add('hidden');
    }
}

// Fasting Future toggle
function toggleFastingFuture() {
    const content = document.getElementById('fasting-future-content');
    const arrow = document.getElementById('future-arrow');
    const btn = document.getElementById('fasting-future-btn');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        arrow.style.transform = 'rotate(180deg)';
        btn.style.background = 'linear-gradient(135deg, var(--matrix-700) 0%, var(--matrix-500) 50%, var(--matrix-400) 100%)';
    } else {
        content.classList.add('hidden');
        arrow.style.transform = 'rotate(0deg)';
        btn.style.background = 'linear-gradient(135deg, var(--matrix-500) 0%, var(--matrix-400) 50%, var(--matrix-300) 100%)';
    }
}

// Goal management
function setGoal(hours) {
    state.currentFast.goalHours = hours;
    saveState();
    updateGoalUI();

    // Update visual selection - Matrix green theme
    document.querySelectorAll('.goal-btn').forEach(btn => {
        btn.style.borderColor = 'var(--dark-border)';
        btn.style.background = 'var(--dark-card)';
        if (parseInt(btn.dataset.hours, 10) === hours) {
            btn.style.borderColor = 'var(--matrix-500)';
            btn.style.background = 'rgba(34, 197, 94, 0.15)';
        }
    });
}

function updateGoalUI() {
    document.getElementById('current-goal').textContent = state.currentFast.goalHours;
    updateProgressBar();
}

// Timer functionality
function startFast() {
    // Don't allow starting a fast while sleeping
    if (state.currentSleep?.isActive) {
        return;
    }

    // Don't allow starting a fast while Living Life is active
    if (isLivingLifeActive()) {
        showLivingLifeModal();
        return;
    }

    state.currentFast.startTime = Date.now();
    state.currentFast.isActive = true;
    state.currentFast.powerups = []; // Clear powerups for new fast

    // Reset eating powerups when starting a new fast
    state.eatingPowerups = [];
    saveState();

    document.getElementById('start-btn').classList.add('hidden');
    document.getElementById('stop-btn').classList.remove('hidden');
    document.getElementById('goal-achieved').classList.add('hidden');

    // Hide fasting goal selector while fasting
    document.getElementById('fasting-goal-selector')?.classList.add('hidden');

    startTimer();
    updateStartInfo();
    updatePowerupDisplay();
    updateHungerDisplay();
    updateConstitution();
    updatePowerupStates(); // Update powerup enable/disable states
    updateEatingPowerupDisplay(); // Update eating display (should be reset)
    updateMealQuality();

    // Show Sui the Sleep God
    showSuiGhost('Your fast has begun...', 'fasting');
}

// Feeling modal state
let pendingFeelingCallback = null;
let pendingFeelingType = null; // 'fasting' or 'sleep'

// Show feeling modal and return promise with selected feeling
function showFeelingModal(type) {
    pendingFeelingType = type;
    const modal = document.getElementById('feeling-modal');
    const title = document.getElementById('feeling-modal-title');
    const subtitle = document.getElementById('feeling-modal-subtitle');
    const icon = document.getElementById('feeling-modal-icon');

    if (type === 'fasting') {
        title.textContent = 'HOW DO YOU FEEL?';
        subtitle.textContent = 'Track your post-fast energy to see trends!';
        icon.className = 'px-icon px-icon-xl px-lightning';
    } else {
        title.textContent = 'HOW DID YOU SLEEP?';
        subtitle.textContent = 'Track your sleep quality to see trends!';
        icon.className = 'px-icon px-icon-xl px-moon';
    }

    modal.classList.remove('hidden');

    return new Promise((resolve) => {
        pendingFeelingCallback = resolve;
    });
}

// Handle feeling selection from modal
function handleFeelingSelection(feeling) {
    const modal = document.getElementById('feeling-modal');
    modal.classList.add('hidden');

    if (pendingFeelingCallback) {
        pendingFeelingCallback(feeling);
        pendingFeelingCallback = null;
    }
}

// Feeling labels for display
const feelingLabels = {
    soso: 'So-so',
    fine: 'Fine',
    prettygood: 'Pretty Good',
    ready: 'Ready!'
};

const feelingEmojis = {
    soso: '<span class="px-icon px-soso"></span>',
    fine: '<span class="px-icon px-fine"></span>',
    prettygood: '<span class="px-icon px-prettygood"></span>',
    ready: '<span class="px-icon px-ready"></span>'
};

async function stopFast() {
    if (!state.currentFast.isActive) return;

    const endTime = Date.now();
    const duration = (endTime - state.currentFast.startTime) / 1000 / 60 / 60; // hours

    // Show feeling modal and wait for selection
    const feeling = await showFeelingModal('fasting');

    // Count powerups for summary
    const powerups = state.currentFast.powerups || [];
    const powerupCounts = { water: 0, coffee: 0, tea: 0, exercise: 0, hanging: 0, grip: 0, walk: 0, hotwater: 0, doctorwin: 0 };
    powerups.forEach(p => {
        if (powerupCounts[p.type] !== undefined) {
            powerupCounts[p.type]++;
        }
    });

    // Count hunger logs for summary
    const hungerLogs = state.currentFast.hungerLogs || [];
    const hungerCounts = { hunger1: 0, hunger2: 0, hunger3: 0, hunger4: 0 };
    hungerLogs.forEach(log => {
        if (hungerCounts[log.level] !== undefined) {
            hungerCounts[log.level]++;
        }
    });

    // Save to history (including powerups, hunger logs, and feeling)
    state.fastingHistory.unshift({
        id: generateId(),
        startTime: state.currentFast.startTime,
        endTime: endTime,
        duration: duration,
        goalHours: state.currentFast.goalHours,
        powerups: powerupCounts,
        hungerLogs: hungerCounts,
        hungerDetails: hungerLogs, // Store full details for trend analysis
        feeling: feeling // Post-fast feeling (soso, fine, prettygood, ready, or null)
    });

    // Track last meal time (when fast ends = eating begins)
    state.lastMealTime = endTime;

    // Reset current fast
    state.currentFast.startTime = null;
    state.currentFast.isActive = false;
    state.currentFast.powerups = [];
    state.currentFast.hungerLogs = [];
    saveState();

    stopTimer();
    resetTimerUI();
    updatePowerupDisplay();
    updateHungerDisplay();
    updateConstitution();
    updatePowerupStates(); // Update powerup enable/disable states

    // Show fasting goal selector again (if settings allow)
    if (state.settings?.showFastingGoals !== false) {
        document.getElementById('fasting-goal-selector')?.classList.remove('hidden');
    }

    // Show Sui the Sleep God
    showSuiGhost('Your fast has ended...', 'fasting');

    // Calculate hours until ideal bedtime (9 PM)
    const now = new Date(endTime);
    const bedtime = new Date(endTime);
    bedtime.setHours(21, 0, 0, 0); // 9 PM

    // If it's already past 9 PM, set bedtime for tomorrow
    if (now.getHours() >= 21) {
        bedtime.setDate(bedtime.getDate() + 1);
    }

    const hoursUntilBed = (bedtime - now) / 1000 / 60 / 60;

    let sleepAdvice = '';
    if (hoursUntilBed < 4) {
        sleepAdvice = `\n\n Warning: Only ${formatDuration(hoursUntilBed)} until bedtime!\nEating this late may disrupt your sleep quality.`;
    } else if (hoursUntilBed < 6) {
        sleepAdvice = `\n\n You have ${formatDuration(hoursUntilBed)} until bedtime.\nGood, but eating earlier would be even better for sleep!`;
    } else {
        sleepAdvice = `\n\n Excellent! ${formatDuration(hoursUntilBed)} until bedtime.\nPlenty of time for digestion before sleep!`;
    }

    // Breaking fast advice based on duration
    let breakingFastTips = '';

    if (duration >= 36) {
        // 36+ hour fast
        breakingFastTips = `\n\n BREAKING A 36+ HOUR FAST:\n Your stomach has shrunk significantly!\n\n1. Sip broth slowly every few hours\n2. Wait 8+ HOURS before any solid food\n3. When ready: protein & fiber, eat very slowly\n4. Gentle walk after eating - aids digestion! \n\nBe extremely patient with your gut!`;
    } else if (duration >= 24) {
        // 24-36 hour fast
        breakingFastTips = `\n\n BREAKING A 24+ HOUR FAST:\n Your stomach has shrunk!\n\n1. Sip broth over 30 minutes\n2. Wait 3-4 HOURS before solid food\n3. Then: protein & fiber, eat slowly\n4. Walk 30 min after eating! \n\nThe stomach shrinks quick - be patient!`;
    } else {
        // Under 24 hours
        breakingFastTips = `\n\n BREAKING YOUR FAST:\n• Start with broth (bone marrow is best!)\n• Include protein & fiber\n• Eat slowly - be gentle with your gut\n• Walk 30 min after eating - helps digestion! `;
    }

}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    if (constitutionInterval) clearInterval(constitutionInterval);

    timerInterval = setInterval(() => {
        updateTimerDisplay();
        updateProgressBar();
        checkGoalAchieved();
        updateFastingGuides();
    }, 1000);

    // Update Heart Points every 30 seconds while fasting
    // Store reference to prevent memory leak
    constitutionInterval = setInterval(() => {
        if (state.currentFast.isActive) {
            updateConstitution();
        }
    }, 30000);

    updateTimerDisplay();
    updateFastingGuides();
}

// Track which guides have been shown to avoid repeated alerts
let guidesShown = {
    breaking: false,
    extended24: false,
    extended36: false
};

function updateFastingGuides() {
    const breakingGuide = document.getElementById('breaking-fast-guide');
    const extended24Guide = document.getElementById('extended-fast-guide-24');
    const extended36Guide = document.getElementById('extended-fast-guide-36');

    if (!breakingGuide || !extended24Guide || !extended36Guide) return;

    // Check if user has disabled these guides
    const showGuides = state.settings?.showBreakingFastGuide !== false;

    // Hide all guides by default
    breakingGuide.classList.add('hidden');
    extended24Guide.classList.add('hidden');
    extended36Guide.classList.add('hidden');

    if (!state.currentFast.isActive || !showGuides) {
        // Reset guide tracking when not fasting or guides disabled
        guidesShown = { breaking: false, extended24: false, extended36: false };
        return;
    }

    const elapsed = Date.now() - state.currentFast.startTime;
    const elapsedHours = elapsed / 1000 / 60 / 60;
    const goalHours = state.currentFast.goalHours;
    const progress = elapsedHours / goalHours;

    // 36+ hour fast guide
    if (elapsedHours >= 36) {
        extended36Guide.classList.remove('hidden');
        if (!guidesShown.extended36) {
            guidesShown.extended36 = true;
            showNotification('36+ Hour Fast!', 'Check the critical refeeding guide - your stomach has shrunk significantly!');
        }
        return;
    }

    // 24+ hour fast guide
    if (elapsedHours >= 24) {
        extended24Guide.classList.remove('hidden');
        if (!guidesShown.extended24) {
            guidesShown.extended24 = true;
            showNotification('24+ Hour Fast!', 'Check the extended fast guide - your stomach is shrinking!');
        }
        return;
    }

    // Show breaking fast guide when at 80% of goal or more
    if (progress >= 0.8) {
        breakingGuide.classList.remove('hidden');
        if (!guidesShown.breaking) {
            guidesShown.breaking = true;
            showNotification('Almost there!', 'Check out the guide for breaking your fast properly.');
        }
    }
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (constitutionInterval) {
        clearInterval(constitutionInterval);
        constitutionInterval = null;
    }
}

function updateTimerDisplay() {
    const display = domCache.timerDisplay || document.getElementById('timer-display');
    if (!display) return;

    if (!state.currentFast.isActive) {
        display.textContent = '00:00:00';
        // Reset document title when not fasting
        if (document.title !== 'Sleep Suivour') {
            document.title = 'Sleep Suivour';
        }
        return;
    }

    // Guard against negative elapsed time (system clock changed backwards)
    const elapsed = Math.max(0, Date.now() - state.currentFast.startTime);
    const hours = Math.floor(elapsed / 1000 / 60 / 60);
    const minutes = Math.floor((elapsed / 1000 / 60) % 60);
    const seconds = Math.floor((elapsed / 1000) % 60);

    const timeString = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    display.textContent = timeString;

    // Update document title to show timer (useful when tab is in background)
    document.title = `⏱️ ${timeString} - Fasting`;
}

function updateProgressBar() {
    const progressBar = domCache.progressBar || document.getElementById('progress-bar');
    if (!progressBar) return;

    if (!state.currentFast.isActive) {
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
        return;
    }

    // Guard against negative elapsed time (system clock changed backwards)
    const elapsed = Math.max(0, Date.now() - state.currentFast.startTime);
    const elapsedHours = elapsed / 1000 / 60 / 60;
    const progress = Math.min((elapsedHours / state.currentFast.goalHours) * 100, 100);

    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', Math.round(progress).toString());

    if (progress >= 100) {
        progressBar.classList.add('bg-green-500');
        progressBar.classList.remove('bg-blue-500');
    } else {
        progressBar.classList.add('bg-blue-500');
        progressBar.classList.remove('bg-green-500');
    }
}

let goalAchievedNotified = false;

function checkGoalAchieved() {
    if (!state.currentFast.isActive) return;

    const elapsed = Date.now() - state.currentFast.startTime;
    const elapsedHours = elapsed / 1000 / 60 / 60;

    if (elapsedHours >= state.currentFast.goalHours && !goalAchievedNotified) {
        document.getElementById('goal-achieved').classList.remove('hidden');
        showNotification('Goal Achieved!', `You've reached your ${state.currentFast.goalHours} hour fasting goal!`);
        goalAchievedNotified = true;
    }
}

function resetTimerUI() {
    const timerDisplay = domCache.timerDisplay || document.getElementById('timer-display');
    const progressBar = domCache.progressBar || document.getElementById('progress-bar');
    if (timerDisplay) timerDisplay.textContent = '00:00:00';
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
    }
    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('stop-btn').classList.add('hidden');
    document.getElementById('goal-achieved').classList.add('hidden');
    document.getElementById('start-info').textContent = 'Select a goal and start your fast';
    goalAchievedNotified = false;

    // Hide all fasting guides
    const breakingGuide = document.getElementById('breaking-fast-guide');
    const extended24Guide = document.getElementById('extended-fast-guide-24');
    const extended36Guide = document.getElementById('extended-fast-guide-36');
    if (breakingGuide) breakingGuide.classList.add('hidden');
    if (extended24Guide) extended24Guide.classList.add('hidden');
    if (extended36Guide) extended36Guide.classList.add('hidden');

    // Reset guide tracking
    guidesShown = { breaking: false, extended24: false, extended36: false };
}

function updateStartInfo() {
    if (state.currentFast.isActive) {
        const startDate = new Date(state.currentFast.startTime);
        document.getElementById('start-info').textContent =
            `Started: ${startDate.toLocaleString()}`;
    }
}

function updateUI() {
    setGoal(state.currentFast.goalHours);
    if (state.currentFast.isActive) {
        document.getElementById('start-btn').classList.add('hidden');
        document.getElementById('stop-btn').classList.remove('hidden');
        updateStartInfo();
    }
    updatePowerupStates();
}

// Enable/disable powerups based on current state
function updatePowerupStates() {
    const isFasting = state.currentFast?.isActive || false;
    const isSleeping = state.currentSleep?.isActive || false;
    const isLivingLife = isLivingLifeActive();

    // Fasting powerups - only enabled when fasting AND not sleeping AND not Living Life
    const fastingPowerups = ['powerup-water', 'powerup-hotwater', 'powerup-coffee', 'powerup-tea',
        'powerup-exercise', 'powerup-hanging', 'powerup-grip', 'powerup-walk',
        'powerup-doctorwin', 'powerup-flatstomach', 'powerup-custom', 'add-custom-powerup-btn'];

    // Hunger buttons - only enabled when fasting AND not sleeping
    const hungerButtons = ['hunger-1', 'hunger-2', 'hunger-3', 'hunger-4'];

    // Eating powerups - disabled when fasting OR sleeping
    const eatingPowerups = ['eating-broth', 'eating-protein', 'eating-fiber', 'eating-homecooked',
        'eating-sloweating', 'eating-chocolate', 'eating-walk', 'eating-nosugar', 'eating-doctorwin',
        'eating-eatenout', 'eating-toofast', 'eating-junkfood', 'eating-bloated'];

    // Sleep powerups - only enabled when sleeping
    const sleepPowerups = ['sleep-darkness', 'sleep-reading', 'sleep-cuddling', 'sleep-doctorwin',
        'sleep-screen', 'sleep-smoking'];

    // Fasting controls - disabled when sleeping
    const fastingControls = ['start-btn', 'stop-btn'];

    // Update fasting powerups - only enabled when fasting AND not sleeping AND not Living Life
    fastingPowerups.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (isFasting && !isSleeping && !isLivingLife) {
                el.disabled = false;
                el.style.opacity = '1';
                el.style.cursor = 'pointer';
                el.style.pointerEvents = 'auto';
            } else {
                el.disabled = true;
                el.style.opacity = '0.4';
                el.style.cursor = 'not-allowed';
                el.style.pointerEvents = 'none';
            }
        }
    });

    // Update hunger buttons - only enabled when fasting AND not sleeping AND not Living Life
    hungerButtons.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (isFasting && !isSleeping && !isLivingLife) {
                el.disabled = false;
                el.style.opacity = '1';
                el.style.cursor = 'pointer';
                el.style.pointerEvents = 'auto';
            } else {
                el.disabled = true;
                el.style.opacity = '0.4';
                el.style.cursor = 'not-allowed';
                el.style.pointerEvents = 'none';
            }
        }
    });

    // Update eating powerups - disabled when fasting OR sleeping OR Living Life
    eatingPowerups.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (!isFasting && !isSleeping && !isLivingLife) {
                el.disabled = false;
                el.style.opacity = '1';
                el.style.cursor = 'pointer';
                el.style.pointerEvents = 'auto';
            } else {
                el.disabled = true;
                el.style.opacity = '0.4';
                el.style.cursor = 'not-allowed';
                el.style.pointerEvents = 'none';
            }
        }
    });

    // Update sleep powerups - only enabled when sleeping AND not Living Life
    sleepPowerups.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (isSleeping && !isLivingLife) {
                el.disabled = false;
                el.style.opacity = '1';
                el.style.cursor = 'pointer';
                el.style.pointerEvents = 'auto';
            } else {
                el.disabled = true;
                el.style.opacity = '0.4';
                el.style.cursor = 'not-allowed';
                el.style.pointerEvents = 'none';
            }
        }
    });

    // Update fasting controls - disabled when sleeping
    fastingControls.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (isSleeping || isLivingLife) {
                el.disabled = true;
                el.style.opacity = '0.4';
                el.style.cursor = 'not-allowed';
                el.style.pointerEvents = 'none';
            } else {
                el.disabled = false;
                el.style.opacity = '1';
                el.style.cursor = 'pointer';
                el.style.pointerEvents = 'auto';
            }
        }
    });

    // Disable reset buttons when sleeping
    const resetButtons = ['reset-powerups-btn', 'reset-eating-powerups-btn', 'reset-hunger-btn', 'reset-sleep-powerups-btn'];
    resetButtons.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (isSleeping) {
                el.disabled = true;
                el.style.opacity = '0.4';
                el.style.cursor = 'not-allowed';
                el.style.pointerEvents = 'none';
            } else {
                el.disabled = false;
                el.style.opacity = '1';
                el.style.cursor = 'pointer';
                el.style.pointerEvents = 'auto';
            }
        }
    });

    // Disable tabs based on state:
    // - Sleeping: disable ALL tabs except sleep tab
    // - Fasting: disable ONLY eating tab
    const allTabs = ['tab-timer', 'tab-eating', 'tab-history', 'tab-stats', 'tab-slayer'];
    allTabs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            let shouldDisable = false;

            if (isSleeping && id !== 'tab-sleep') {
                // Sleeping: disable all except sleep tab
                shouldDisable = true;
            } else if (isFasting && id === 'tab-eating') {
                // Fasting: disable only eating tab
                shouldDisable = true;
            }

            if (shouldDisable) {
                el.disabled = true;
                el.style.opacity = '0.4';
                el.style.cursor = 'not-allowed';
                el.style.pointerEvents = 'none';
            } else {
                el.disabled = false;
                el.style.opacity = '1';
                el.style.cursor = 'pointer';
                el.style.pointerEvents = 'auto';
            }
        }
    });

    // Disable goal selectors when sleeping
    const goalControls = ['fasting-goal-selector', 'sleep-goal-selector'];
    goalControls.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (isSleeping) {
                el.style.opacity = '0.4';
                el.style.pointerEvents = 'none';
            } else {
                el.style.opacity = '1';
                el.style.pointerEvents = 'auto';
            }
        }
    });

    // Disable history view toggle buttons when sleeping
    const historyButtons = ['history-fasting-btn', 'history-sleep-btn'];
    historyButtons.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (isSleeping) {
                el.disabled = true;
                el.style.opacity = '0.4';
                el.style.pointerEvents = 'none';
            } else {
                el.disabled = false;
                el.style.opacity = '1';
                el.style.pointerEvents = 'auto';
            }
        }
    });

    // Disable Fasting Future button when sleeping
    const fastingFutureBtn = document.getElementById('fasting-future-btn');
    if (fastingFutureBtn) {
        if (isSleeping) {
            fastingFutureBtn.disabled = true;
            fastingFutureBtn.style.opacity = '0.4';
            fastingFutureBtn.style.pointerEvents = 'none';
        } else {
            fastingFutureBtn.disabled = false;
            fastingFutureBtn.style.opacity = '1';
            fastingFutureBtn.style.pointerEvents = 'auto';
        }
    }

    // Disable start sleep button when already sleeping (just in case)
    const startSleepBtn = document.getElementById('start-sleep-btn');
    if (startSleepBtn) {
        if (isSleeping) {
            startSleepBtn.style.pointerEvents = 'none';
        } else {
            // Ensure start sleep button is ALWAYS enabled when not sleeping
            // (fasting does NOT block sleep)
            startSleepBtn.disabled = false;
            startSleepBtn.style.opacity = '1';
            startSleepBtn.style.cursor = 'pointer';
            startSleepBtn.style.pointerEvents = 'auto';
        }
    }

    // Ensure stop sleep button works when sleeping (even if fasting)
    const stopSleepBtn = document.getElementById('stop-sleep-btn');
    if (stopSleepBtn) {
        if (isSleeping) {
            stopSleepBtn.disabled = false;
            stopSleepBtn.style.opacity = '1';
            stopSleepBtn.style.cursor = 'pointer';
            stopSleepBtn.style.pointerEvents = 'auto';
        }
    }

    // Ensure sleep tab is always accessible (fasting does NOT block sleep tab)
    const sleepTab = document.getElementById('tab-sleep');
    if (sleepTab && !isSleeping) {
        sleepTab.disabled = false;
        sleepTab.style.opacity = '1';
        sleepTab.style.cursor = 'pointer';
        sleepTab.style.pointerEvents = 'auto';
    }
}

// History management
function renderHistory() {
    const historyList = document.getElementById('history-list');

    if (state.fastingHistory.length === 0) {
        historyList.innerHTML = '<p class="text-gray-500 text-center py-8">No fasting history yet. Start your first fast!</p>';
        return;
    }

    // Sanitize ID to prevent XSS - only allow alphanumeric characters
    const sanitizeId = (id) => String(id).replace(/[^a-zA-Z0-9]/g, '');

    historyList.innerHTML = state.fastingHistory.map(fast => {
        const achieved = fast.duration >= fast.goalHours;
        const startDate = new Date(fast.startTime);
        const endDate = new Date(fast.endTime);
        const safeId = sanitizeId(fast.id);
        const feelingDisplay = fast.feeling ? `<span class="ml-2">${feelingEmojis[fast.feeling] || ''} ${feelingLabels[fast.feeling] || ''}</span>` : '';

        return `
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <div class="font-medium text-gray-800">
                            ${formatDuration(fast.duration)}
                            ${achieved ? '<span class="text-green-600 ml-2"></span>' : ''}
                            ${feelingDisplay}
                        </div>
                        <div class="text-sm text-gray-500">
                            Goal: ${fast.goalHours} hours
                        </div>
                    </div>
                    <button data-delete-fast="${safeId}" class="delete-fast-btn text-red-500 hover:text-red-700 text-sm font-medium" aria-label="Delete fasting record from ${startDate.toLocaleDateString()}">
                        Delete
                    </button>
                </div>
                <div class="text-xs text-gray-400">
                    ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}
                </div>
            </div>
        `;
    }).join('');
    // Event delegation is set up in initEventListeners() for delete buttons
}

async function deleteFast(id) {
    if (!id) return;
    const confirmed = await showConfirmModal('Delete this fasting record?', 'Delete Record');
    if (confirmed) {
        state.fastingHistory = state.fastingHistory.filter(f => f.id !== id);
        saveState();
        renderHistory();
        renderStats();
    }
}

// Statistics
function renderStats() {
    const history = state.fastingHistory;

    // Total fasts
    document.getElementById('stat-total').textContent = history.length;

    if (history.length === 0) {
        document.getElementById('stat-average').textContent = '0h';
        document.getElementById('stat-longest').textContent = '0h';
        document.getElementById('stat-success').textContent = '0%';
        document.getElementById('stat-week').textContent = '0h';
        return;
    }

    // Average duration
    const avgDuration = history.reduce((sum, f) => sum + f.duration, 0) / history.length;
    document.getElementById('stat-average').textContent = formatDuration(avgDuration);

    // Longest fast
    const longest = Math.max(...history.map(f => f.duration));
    document.getElementById('stat-longest').textContent = formatDuration(longest);

    // Success rate
    const successful = history.filter(f => f.duration >= f.goalHours).length;
    const successRate = (successful / history.length * 100).toFixed(0);
    document.getElementById('stat-success').textContent = `${successRate}%`;

    // Current week average
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const weekFasts = history.filter(f => f.endTime >= weekAgo);
    if (weekFasts.length > 0) {
        const weekAvg = weekFasts.reduce((sum, f) => sum + f.duration, 0) / weekFasts.length;
        document.getElementById('stat-week').textContent = formatDuration(weekAvg);
    } else {
        document.getElementById('stat-week').textContent = '0h';
    }

    // Update trends
    renderTrends();
}

// ==========================================
// SLEEP TRACKER FUNCTIONS
// ==========================================

// Sleep Goal management
function setSleepGoal(hours) {
    if (!state.currentSleep) {
        state.currentSleep = { startTime: null, goalHours: 8, isActive: false };
    }
    state.currentSleep.goalHours = hours;
    saveState();
    updateSleepGoalUI();

    // Update visual selection - indigo theme for sleep
    document.querySelectorAll('.sleep-goal-btn').forEach(btn => {
        btn.style.borderColor = 'var(--dark-border)';
        btn.style.background = 'var(--dark-card)';
        if (parseInt(btn.dataset.hours, 10) === hours) {
            btn.style.borderColor = '#6366f1';
            btn.style.background = 'rgba(99, 102, 241, 0.15)';
        }
    });
}

function updateSleepGoalUI() {
    if (!state.currentSleep) return;
    document.getElementById('current-sleep-goal').textContent = state.currentSleep.goalHours;
    updateSleepProgressBar();
}

// Track early sleep warnings
let earlySleepWarnings = 0;

// Get context-aware sleep warning message
function getEarlySleepWarning(isFirstWarning) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const hour = now.getHours();

    // Check sleep history for context
    const history = state.sleepHistory || [];
    const lastSleep = history.length > 0 ? history[0] : null;

    // Check if user has slept outside optimal hours before
    let rebelCount = 0;
    let lastRebelDaysAgo = null;

    if (history.length > 0) {
        const now = Date.now();
        for (const sleep of history) {
            const sleepStart = new Date(sleep.startTime);
            const sleepHour = sleepStart.getHours();
            if (sleepHour < 21 || sleepHour >= 23) {
                rebelCount++;
                if (lastRebelDaysAgo === null) {
                    lastRebelDaysAgo = Math.floor((now - sleep.startTime) / (1000 * 60 * 60 * 24));
                }
            }
        }
    }

    // Different scenarios for first warning
    if (isFirstWarning) {
        // Super early (before noon) - concerned
        if (hour < 12) {
            return `Uhh... it's ${timeStr}?! \n\nAre you okay? The sun is literally still out!\n\nIf you're genuinely exhausted, click again. But maybe consider coffee first? `;
        }

        // Afternoon nap attempt (12-5 PM)
        if (hour >= 12 && hour < 17) {
            if (rebelCount > 3 && lastRebelDaysAgo !== null && lastRebelDaysAgo <= 3) {
                return `Another afternoon nap, huh? \n\nYou've done this ${rebelCount} times now... I'm starting to think you're a cat! \n\nClick again if you must, but your night sleep is judging you!`;
            }
            return `Afternoon siesta at ${timeStr}? \n\nThe sleep gods prefer 9-11 PM, but I get it - sometimes you just need a power nap!\n\nClick again if you promise to still sleep tonight! `;
        }

        // Evening but too early (5-9 PM)
        if (hour >= 17 && hour < 21) {
            const hoursUntil9 = 21 - hour;
            if (lastRebelDaysAgo !== null && lastRebelDaysAgo <= 1) {
                return `Back at it again? You literally did this yesterday! \n\nIt's only ${timeStr} - just ${hoursUntil9} more hour${hoursUntil9 > 1 ? 's' : ''} until optimal bedtime!\n\nFine, click again if you're THAT tired... `;
            }
            if (lastRebelDaysAgo === null || lastRebelDaysAgo > 7) {
                return `Sleepy at ${timeStr}? No worries, it happens! \n\nOptimal bedtime is 9-11 PM, but you've been good lately!\n\nClick again and I'll let this one slide! `;
            }
            return `It's ${timeStr} - so close to 9 PM! ⏰\n\nCan you hang in there for ${hoursUntil9} more hour${hoursUntil9 > 1 ? 's' : ''}?\n\nOr click again if today was just TOO much! `;
        }

        // Late night (11 PM+)
        if (hour >= 23) {
            if (rebelCount > 5) {
                return `Night owl mode activated AGAIN at ${timeStr}! \n\nYou've been a late sleeper ${rebelCount} times... are you secretly a vampire? \n\nClick again, Dracula - I won't stop you! `;
            }
            return `Burning the midnight oil at ${timeStr}? \n\n11 PM was technically the cutoff, but hey - better late than never!\n\nClick again to start your fashionably late slumber! `;
        }
    }

    // Second warning - allowing with fun context
    if (rebelCount === 0) {
        return `Your first time breaking the rules! \n\nEveryone needs a rebel moment. Welcome to the dark side!\n\nSweet dreams, rule-breaker! `;
    } else if (rebelCount > 10) {
        return `At this point, I should just change the rules for you! \n\nSleep rebel #${rebelCount + 1} incoming...\n\nYou do you, night warrior! `;
    } else if (lastRebelDaysAgo !== null && lastRebelDaysAgo <= 1) {
        return `Two days in a row? You're on a STREAK! \n\nI'm choosing to believe you have a good reason.\n\nSleep tight, you beautiful chaos agent! `;
    } else {
        return `Fine, you win! \n\nJust don't blame me if you're up at 3 AM questioning your life choices! \n\nSweet dreams! `;
    }
}

// Matthew Walker Sleep Quotes
const matthewWalkerQuotes = {
    starting: [
        '"The best bridge between despair and hope is a good night\'s sleep." — Dr. Matthew Walker',
        '"Sleep is Mother Nature\'s best effort yet at contra-death." — Dr. Matthew Walker',
        '"Sleep is the Swiss army knife of health." — Dr. Matthew Walker',
        '"Sleep is not an optional lifestyle luxury. It is your life support system." — Dr. Matthew Walker',
        '"When sleep is abundant, minds flourish." — Dr. Matthew Walker',
        '"Practice does not make perfect. It is practice, followed by sleep, that leads to perfection." — Dr. Matthew Walker',
        '"Regularity is king. Go to bed at the same time every night." — Dr. Matthew Walker',
        '"Human beings are the only species that deliberately deprive themselves of sleep." — Dr. Matthew Walker',
        '"We have stigmatized sleep with the label of laziness. It\'s time to change that." — Dr. Matthew Walker',
        '"I give myself a non-negotiable eight-hour sleep opportunity every night." — Dr. Matthew Walker'
    ],
    waking: [
        '"Your brain just did its cleaning. 60% more active during sleep!" — Dr. Matthew Walker',
        '"REM sleep heals emotional wounds. You just got therapy." — Dr. Matthew Walker',
        '"Sleep consolidates memories. Your brain just filed everything." — Dr. Matthew Walker',
        '"Sleep builds connections between ideas. Creativity boost unlocked!" — Dr. Matthew Walker',
        '"You went to bed with puzzle pieces and woke up with wisdom." — Dr. Matthew Walker',
        '"Your immune system just got recharged. Natural killer cells: activated!" — Dr. Matthew Walker',
        '"Sleep is probably the most significant factor in preventing Alzheimer\'s." — Dr. Matthew Walker',
        '"Your glymphatic system just cleared metabolic detritus. Brain cleaned!" — Dr. Matthew Walker',
        '"REM collides memories with your life\'s autobiography. New insights await!" — Dr. Matthew Walker',
        '"A good night\'s sleep makes learning possible. Go learn something new!" — Dr. Matthew Walker'
    ],
    warning: [
        '"The shorter your sleep, the shorter your life." — Dr. Matthew Walker',
        '"After 16 hours awake, the brain begins to fail." — Dr. Matthew Walker',
        '"Sleep deprivation causes a 40% deficit in making new memories." — Dr. Matthew Walker',
        '"Routinely sleeping less than 6 hours demolishes your immune system." — Dr. Matthew Walker',
        '"Sleep debt cannot be repaid. It\'s an all-or-nothing event." — Dr. Matthew Walker',
        '"A single night of poor sleep impairs natural killer cells by 70%." — Dr. Matthew Walker',
        '"Adults sleeping fewer than 6 hours are 200% more likely to have a heart attack." — Dr. Matthew Walker',
        '"The old maxim \'I\'ll sleep when I\'m dead\' is unfortunate. You\'ll be dead sooner." — Dr. Matthew Walker',
        '"Inadequate sleep for one week classifies you as pre-diabetic." — Dr. Matthew Walker',
        '"Drowsy driving is worse than drunk driving. Please rest." — Dr. Matthew Walker'
    ]
};

function getRandomSleepQuote(type) {
    const quotes = matthewWalkerQuotes[type] || matthewWalkerQuotes.starting;
    return quotes[Math.floor(Math.random() * quotes.length)];
}

// Sleep Timer functionality
function startSleep() {
    // Don't allow starting sleep while Living Life is active
    if (isLivingLifeActive()) {
        showLivingLifeModal();
        return;
    }

    const now = new Date();
    const hour = now.getHours();

    // Check if it's outside 9 PM - 11 PM window
    if (hour < 21 || hour >= 23) {
        earlySleepWarnings++;

        if (earlySleepWarnings === 1) {
            // Show Sui with Matthew Walker warning quote
            showSuiGhost(getRandomSleepQuote('warning'), 'sleep');
            return;
        }

        // Second time - allow it, reset counter
        earlySleepWarnings = 0;
    }

    if (!state.currentSleep) {
        state.currentSleep = { startTime: null, goalHours: 8, isActive: false };
    }
    state.currentSleep.startTime = Date.now();
    state.currentSleep.isActive = true;
    saveState();

    document.getElementById('start-sleep-btn').classList.add('hidden');
    document.getElementById('stop-sleep-btn').classList.remove('hidden');
    document.getElementById('sleep-goal-achieved').classList.add('hidden');

    // Hide sleep goal selector while sleeping
    document.getElementById('sleep-goal-selector')?.classList.add('hidden');

    startSleepTimer();
    updateSleepStartInfo();
    updatePowerupStates(); // Update powerup enable/disable states

    // Show Sui the Sleep God with Matthew Walker quote
    showSuiGhost(getRandomSleepQuote('starting'), 'sleep');
}

// Track early wake warnings
let earlyWakeWarnings = 0;

// Get context-aware early wake warning message
function getEarlyWakeWarning(duration, isFirstWarning) {
    const remaining = 7 - duration;
    const remainingHours = Math.floor(remaining);
    const remainingMins = Math.floor((remaining - remainingHours) * 60);
    const sleptSoFar = formatDuration(duration);

    // Check sleep history for context
    const history = state.sleepHistory || [];

    // Count short sleeps (under 7 hours)
    let shortSleepCount = 0;
    let lastShortSleepDaysAgo = null;

    if (history.length > 0) {
        const now = Date.now();
        for (const sleep of history) {
            if (sleep.duration < 7) {
                shortSleepCount++;
                if (lastShortSleepDaysAgo === null) {
                    lastShortSleepDaysAgo = Math.floor((now - sleep.endTime) / (1000 * 60 * 60 * 24));
                }
            }
        }
    }

    if (isFirstWarning) {
        // Barely slept (under 3 hours) - very concerned
        if (duration < 3) {
            if (shortSleepCount > 3) {
                return `${sleptSoFar}?! Again?! \n\nYou've short-slept ${shortSleepCount} times now. Your body is NOT a machine!\n\nPlease try to sleep ${remainingHours}h ${remainingMins}m more... or click again if you absolutely must wake up.`;
            }
            return `Whoa whoa whoa! Only ${sleptSoFar}?! \n\nThat's barely a power nap! Your brain needs at least 7 hours to do its thing!\n\nTry to sleep ${remainingHours}h ${remainingMins}m more, or click again if it's an emergency!`;
        }

        // Slept 3-5 hours - concerned but understanding
        if (duration < 5) {
            if (lastShortSleepDaysAgo !== null && lastShortSleepDaysAgo <= 2) {
                return `${sleptSoFar} again? You just did this ${lastShortSleepDaysAgo === 0 ? 'today' : lastShortSleepDaysAgo === 1 ? 'yesterday' : '2 days ago'}! \n\nYour sleep debt is piling up like laundry!\n\nTry for ${remainingHours}h ${remainingMins}m more, or click again if you're being chased by a bear.`;
            }
            return `Only ${sleptSoFar}? That's rough, buddy. \n\nYour brain was just getting to the good REM cycles!\n\nCan you squeeze in ${remainingHours}h ${remainingMins}m more? Click again if today is chaos.`;
        }

        // Slept 5-6 hours - gentle nudge
        if (duration < 6) {
            if (shortSleepCount === 0) {
                return `${sleptSoFar} - not bad for a first timer! \n\nBut your body really wants that full 7 hours for optimal recovery.\n\nJust ${remainingHours}h ${remainingMins}m more! Or click again if duty calls.`;
            }
            return `${sleptSoFar}... so close to 7! ⏰\n\nYou're in the home stretch! Just ${remainingHours}h ${remainingMins}m to go!\n\nSnooze a bit more, or click again if the world needs you NOW.`;
        }

        // Slept 6-7 hours - almost there
        if (lastShortSleepDaysAgo !== null && lastShortSleepDaysAgo <= 1) {
            return `${sleptSoFar} - two days in a row of almost-enough sleep! \n\nYou're SO close! Just ${remainingMins} more minutes!\n\nClick again if you absolutely can't wait.`;
        }
        return `${sleptSoFar} - you're SO close! \n\nJust ${remainingMins} more minutes and you'd hit the golden 7 hours!\n\nWorth the snooze, or click again to rise and shine early!`;
    }

    // Second warning - allowing with fun context
    if (duration < 3) {
        return `Okay, you zombie, you win! \n\nPlease promise me you'll nap later or go to bed early tonight!\n\nGood luck out there, sleepy warrior! `;
    } else if (shortSleepCount > 5) {
        return `You and short sleep are becoming best friends, huh? \n\nThis is short sleep #${shortSleepCount + 1} for you...\n\nGo get 'em, tiger! But maybe take a nap later? `;
    } else if (lastShortSleepDaysAgo !== null && lastShortSleepDaysAgo <= 1) {
        return `Back-to-back short sleeps! You're speedrunning exhaustion! \n\nYour bed is going to miss you.\n\nGo conquer the day, you unstoppable force! `;
    } else {
        return `Fine, early bird! \n\nGo catch those worms! Just remember - coffee is your friend today!\n\nGood morning, champion! `;
    }
}

async function stopSleep() {
    if (!state.currentSleep || !state.currentSleep.isActive) return;

    const endTime = Date.now();
    const duration = (endTime - state.currentSleep.startTime) / 1000 / 60 / 60; // hours

    // Warn if under 7 hours but allow after 2 attempts
    if (duration < 7) {
        earlyWakeWarnings++;

        if (earlyWakeWarnings === 1) {
            // Show Sui with Matthew Walker warning quote
            showSuiGhost(getRandomSleepQuote('warning'), 'sleep');
            return;
        }

        // Second time - allow it, reset counter
        earlyWakeWarnings = 0;
    }

    // Show feeling modal and wait for selection
    const feeling = await showFeelingModal('sleep');

    // Initialize sleepHistory if it doesn't exist
    if (!state.sleepHistory) {
        state.sleepHistory = [];
    }

    // Save to history (including feeling)
    state.sleepHistory.unshift({
        id: generateId(),
        startTime: state.currentSleep.startTime,
        endTime: endTime,
        duration: duration,
        goalHours: state.currentSleep.goalHours,
        feeling: feeling // Post-sleep feeling (soso, fine, prettygood, ready, or null)
    });

    // Reset current sleep
    state.currentSleep.startTime = null;
    state.currentSleep.isActive = false;
    saveState();

    stopSleepTimer();
    resetSleepTimerUI();
    updateConstitution();
    updatePowerupStates(); // Update powerup enable/disable states

    // Show sleep goal selector again (if settings allow)
    if (state.settings?.showSleepGoals !== false) {
        document.getElementById('sleep-goal-selector')?.classList.remove('hidden');
    }

    // Show Sui the Sleep God with Matthew Walker quote
    showSuiGhost(getRandomSleepQuote('waking'), 'sleep');
}

function startSleepTimer() {
    if (sleepTimerInterval) clearInterval(sleepTimerInterval);

    sleepTimerInterval = setInterval(() => {
        updateSleepTimerDisplay();
        updateSleepProgressBar();
        checkSleepGoalAchieved();
    }, 1000);

    updateSleepTimerDisplay();
}

function stopSleepTimer() {
    if (sleepTimerInterval) {
        clearInterval(sleepTimerInterval);
        sleepTimerInterval = null;
    }
}

function updateSleepTimerDisplay() {
    const display = domCache.sleepTimerDisplay || document.getElementById('sleep-timer-display');
    if (!display) return;

    if (!state.currentSleep || !state.currentSleep.isActive) {
        display.textContent = '00:00:00';
        // Reset document title when not sleeping (only if not fasting)
        if (!state.currentFast?.isActive && document.title !== 'Sleep Suivour') {
            document.title = 'Sleep Suivour';
        }
        return;
    }

    // Guard against negative elapsed time (system clock changed backwards)
    const elapsed = Math.max(0, Date.now() - state.currentSleep.startTime);
    const hours = Math.floor(elapsed / 1000 / 60 / 60);
    const minutes = Math.floor((elapsed / 1000 / 60) % 60);
    const seconds = Math.floor((elapsed / 1000) % 60);

    const timeString = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    display.textContent = timeString;

    // Update document title to show timer (useful when tab is in background)
    document.title = `😴 ${timeString} - Sleeping`;
}

function updateSleepProgressBar() {
    const progressBar = domCache.sleepProgressBar || document.getElementById('sleep-progress-bar');
    if (!progressBar) return;

    if (!state.currentSleep || !state.currentSleep.isActive) {
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
        return;
    }

    // Guard against negative elapsed time (system clock changed backwards)
    const elapsed = Math.max(0, Date.now() - state.currentSleep.startTime);
    const elapsedHours = elapsed / 1000 / 60 / 60;
    const progress = Math.min((elapsedHours / state.currentSleep.goalHours) * 100, 100);

    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', Math.round(progress).toString());

    if (progress >= 100) {
        progressBar.classList.add('bg-green-500');
        progressBar.classList.remove('bg-indigo-500');
    } else {
        progressBar.classList.add('bg-indigo-500');
        progressBar.classList.remove('bg-green-500');
    }
}

let sleepGoalAchievedNotified = false;

function checkSleepGoalAchieved() {
    if (!state.currentSleep || !state.currentSleep.isActive) return;

    const elapsed = Date.now() - state.currentSleep.startTime;
    const elapsedHours = elapsed / 1000 / 60 / 60;

    if (elapsedHours >= state.currentSleep.goalHours && !sleepGoalAchievedNotified) {
        document.getElementById('sleep-goal-achieved').classList.remove('hidden');
        showNotification('Sleep Goal Achieved!', `You've reached your ${state.currentSleep.goalHours} hour sleep goal!`);
        sleepGoalAchievedNotified = true;
    }
}

function resetSleepTimerUI() {
    const sleepTimerDisplay = domCache.sleepTimerDisplay || document.getElementById('sleep-timer-display');
    const sleepProgressBar = domCache.sleepProgressBar || document.getElementById('sleep-progress-bar');
    if (sleepTimerDisplay) sleepTimerDisplay.textContent = '00:00:00';
    if (sleepProgressBar) {
        sleepProgressBar.style.width = '0%';
        sleepProgressBar.setAttribute('aria-valuenow', '0');
    }
    document.getElementById('start-sleep-btn')?.classList.remove('hidden');
    document.getElementById('stop-sleep-btn')?.classList.add('hidden');
    document.getElementById('sleep-goal-achieved')?.classList.add('hidden');
    const sleepStartInfo = document.getElementById('sleep-start-info');
    if (sleepStartInfo) sleepStartInfo.textContent = 'Select a goal and start tracking your sleep';
    sleepGoalAchievedNotified = false;
}

function updateSleepStartInfo() {
    if (state.currentSleep && state.currentSleep.isActive) {
        const startDate = new Date(state.currentSleep.startTime);
        document.getElementById('sleep-start-info').textContent =
            `Started: ${startDate.toLocaleString()}`;
    }
}

function updateSleepUI() {
    if (!state.currentSleep) {
        state.currentSleep = { startTime: null, goalHours: 8, isActive: false };
    }
    setSleepGoal(state.currentSleep.goalHours);
    if (state.currentSleep.isActive) {
        document.getElementById('start-sleep-btn').classList.add('hidden');
        document.getElementById('stop-sleep-btn').classList.remove('hidden');
        updateSleepStartInfo();
        startSleepTimer();
    }
    updateMealSleepStatus();
    updateSleepPowerupDisplay();
}

function updateMealSleepStatus() {
    const infoDiv = document.getElementById('meal-sleep-info');
    const statusDiv = document.getElementById('sleep-fasting-status');
    if (!infoDiv || !statusDiv) return;

    // Check if this section should be hidden
    if (state.settings?.showMealSleepQuality === false) {
        statusDiv.classList.add('hidden');
        return;
    }

    const now = new Date();
    const currentHour = now.getHours();

    // Calculate time until bedtime window (9 PM - 11 PM)
    // If it's within the bedtime window or past 11 PM, show appropriate message
    let bedtimeMessage = '';
    let hoursUntilBed = 0;

    if (currentHour >= 21 && currentHour < 23) {
        // Currently in optimal bedtime window (9-11 PM)
        bedtimeMessage = "It's bedtime! Go to sleep for optimal recovery.";
        hoursUntilBed = 0;
    } else if (currentHour >= 23 || currentHour < 5) {
        // Past optimal bedtime (11 PM - 5 AM)
        bedtimeMessage = "It's past bedtime! Get to sleep ASAP.";
        hoursUntilBed = 0;
    } else {
        // Before bedtime, calculate hours until 9 PM
        let bedtime = new Date(now);
        bedtime.setHours(21, 0, 0, 0);
        hoursUntilBed = (bedtime - now) / 1000 / 60 / 60;
        bedtimeMessage = `Bedtime is in ${formatDuration(hoursUntilBed)}.`;
    }

    // If currently fasting
    if (state.currentFast.isActive) {
        const fastingHours = (Date.now() - state.currentFast.startTime) / 1000 / 60 / 60;

        if (hoursUntilBed <= 6 || hoursUntilBed === 0) {
            statusDiv.className = 'rounded-lg p-4 mb-6';
            statusDiv.style.cssText = 'background: rgba(34, 197, 94, 0.1); border: 1px solid var(--matrix-500);';
            infoDiv.innerHTML = `
                <p class="font-medium" style="color: var(--matrix-400);"> Perfect! You're fasting ${formatDuration(fastingHours)} so far.</p>
                <p class="mt-1" style="color: var(--matrix-300);">${bedtimeMessage} Your sleep quality will be excellent!</p>
            `;
        } else {
            statusDiv.className = 'rounded-lg p-4 mb-6';
            statusDiv.style.cssText = 'background: rgba(99, 102, 241, 0.1); border: 1px solid #6366f1;';
            infoDiv.innerHTML = `
                <p class="font-medium" style="color: #818cf8;"> You're fasting - ${formatDuration(fastingHours)} so far.</p>
                <p class="mt-1" style="color: #a5b4fc;">${bedtimeMessage} Keep fasting for better sleep!</p>
            `;
        }
        return;
    }

    // If we have a last meal time recorded
    if (state.lastMealTime) {
        const hoursSinceLastMeal = (now - state.lastMealTime) / 1000 / 60 / 60;
        const lastMealDate = new Date(state.lastMealTime);

        // Calculate what fasting hours will be at bedtime
        const fastingAtBedtime = hoursSinceLastMeal + hoursUntilBed;

        if (fastingAtBedtime >= 6) {
            statusDiv.className = 'rounded-lg p-4 mb-6';
            statusDiv.style.cssText = 'background: rgba(34, 197, 94, 0.1); border: 1px solid var(--matrix-500);';
            infoDiv.innerHTML = `
                <p class="font-medium" style="color: var(--matrix-400);"> Excellent timing!</p>
                <p class="mt-1" style="color: var(--matrix-300);">Last meal: ${lastMealDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                <p style="color: var(--matrix-300);">By bedtime (9 PM), you'll have fasted ${formatDuration(fastingAtBedtime)}.</p>
                <p class="mt-2 font-medium" style="color: var(--matrix-400);">Your sleep quality will be optimal!</p>
            `;
        } else if (fastingAtBedtime >= 4) {
            statusDiv.className = 'rounded-lg p-4 mb-6';
            statusDiv.style.cssText = 'background: rgba(234, 179, 8, 0.1); border: 1px solid #eab308;';
            infoDiv.innerHTML = `
                <p class="font-medium" style="color: #facc15;"> Good, but could be better</p>
                <p class="mt-1" style="color: #fde047;">Last meal: ${lastMealDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                <p style="color: #fde047;">By bedtime (9 PM), you'll have fasted ${formatDuration(fastingAtBedtime)}.</p>
                <p class="mt-2" style="color: #facc15;">Next time, try to eat earlier for even better sleep!</p>
            `;
        } else {
            statusDiv.className = 'rounded-lg p-4 mb-6';
            statusDiv.style.cssText = 'background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444;';
            infoDiv.innerHTML = `
                <p class="font-medium" style="color: #f87171;"> Eating too close to bedtime!</p>
                <p class="mt-1" style="color: #fca5a5;">Last meal: ${lastMealDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                <p style="color: #fca5a5;">By bedtime (9 PM), only ${formatDuration(fastingAtBedtime)} fasted.</p>
                <p class="mt-2 font-medium" style="color: #f87171;">This will disrupt your deep sleep and recovery.</p>
                <p class="text-sm mt-1" style="color: #fca5a5;">Aim to finish eating by 3 PM for ideal sleep!</p>
            `;
        }
        return;
    }

    // Default state - no data
    statusDiv.className = 'rounded-lg p-4 mb-6';
    statusDiv.style.cssText = 'background: linear-gradient(135deg, #0a120a 0%, #0f1a0f 100%); border: 1px solid var(--matrix-700);';
    infoDiv.innerHTML = `
        <p style="color: var(--matrix-300);">Start and stop a fast to track your eating window.</p>
        <p class="mt-1" style="color: var(--matrix-500);">${bedtimeMessage}</p>
    `;
}

// Sleep History management
function renderSleepHistory() {
    const historyList = document.getElementById('sleep-history-list');

    if (!state.sleepHistory || state.sleepHistory.length === 0) {
        historyList.innerHTML = '<p class="text-gray-500 text-center py-8">No sleep history yet. Start tracking your sleep!</p>';
        return;
    }

    // Sanitize ID to prevent XSS - only allow alphanumeric characters
    const sanitizeId = (id) => String(id).replace(/[^a-zA-Z0-9]/g, '');

    historyList.innerHTML = state.sleepHistory.map(sleep => {
        const achieved = sleep.duration >= sleep.goalHours;
        const startDate = new Date(sleep.startTime);
        const endDate = new Date(sleep.endTime);
        const safeId = sanitizeId(sleep.id);
        const feelingDisplay = sleep.feeling ? `<span class="ml-2">${feelingEmojis[sleep.feeling] || ''} ${feelingLabels[sleep.feeling] || ''}</span>` : '';

        return `
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <div class="font-medium text-gray-800">
                            ${formatDuration(sleep.duration)}
                            ${achieved ? '<span class="text-green-600 ml-2"></span>' : ''}
                            ${feelingDisplay}
                        </div>
                        <div class="text-sm text-gray-500">
                            Goal: ${sleep.goalHours} hours
                        </div>
                    </div>
                    <button data-delete-sleep="${safeId}" class="delete-sleep-btn text-red-500 hover:text-red-700 text-sm font-medium" aria-label="Delete sleep record from ${startDate.toLocaleDateString()}">
                        Delete
                    </button>
                </div>
                <div class="text-xs text-gray-400">
                    ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}
                </div>
            </div>
        `;
    }).join('');
    // Event delegation is set up in initEventListeners() for delete buttons
}

async function deleteSleep(id) {
    if (!id) return;
    const confirmed = await showConfirmModal('Delete this sleep record?', 'Delete Record');
    if (confirmed) {
        state.sleepHistory = state.sleepHistory.filter(s => s.id !== id);
        saveState();
        renderSleepHistory();
        renderSleepStats();
    }
}

// Sleep Statistics
function renderSleepStats() {
    const history = state.sleepHistory || [];

    // Total sleeps
    document.getElementById('sleep-stat-total').textContent = history.length;

    if (history.length === 0) {
        document.getElementById('sleep-stat-average').textContent = '0h';
        document.getElementById('sleep-stat-longest').textContent = '0h';
        document.getElementById('sleep-stat-success').textContent = '0%';
        document.getElementById('sleep-stat-week').textContent = '0h';
        return;
    }

    // Average duration
    const avgDuration = history.reduce((sum, s) => sum + s.duration, 0) / history.length;
    document.getElementById('sleep-stat-average').textContent = formatDuration(avgDuration);

    // Longest sleep
    const longest = Math.max(...history.map(s => s.duration));
    document.getElementById('sleep-stat-longest').textContent = formatDuration(longest);

    // Success rate
    const successful = history.filter(s => s.duration >= s.goalHours).length;
    const successRate = (successful / history.length * 100).toFixed(0);
    document.getElementById('sleep-stat-success').textContent = `${successRate}%`;

    // Current week average
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const weekSleeps = history.filter(s => s.endTime >= weekAgo);
    if (weekSleeps.length > 0) {
        const weekAvg = weekSleeps.reduce((sum, s) => sum + s.duration, 0) / weekSleeps.length;
        document.getElementById('sleep-stat-week').textContent = formatDuration(weekAvg);
    } else {
        document.getElementById('sleep-stat-week').textContent = '0h';
    }

    // Update trends
    renderTrends();
}

// ==========================================
// TRENDS ANALYSIS FUNCTIONS
// ==========================================

function renderTrends() {
    renderSleepTrends();
    renderFastingTrends();
    renderHungerTrends();
    renderFeelingTrends();
}

function renderSleepTrends() {
    const history = state.sleepHistory || [];

    // Week over Week
    const wow = calculateTrend(history, 7, 7);
    updateTrendDisplay('sleep-trend-wow', 'sleep-trend-wow-detail', wow, 'sleep');

    // Month over Month
    const mom = calculateTrend(history, 30, 30);
    updateTrendDisplay('sleep-trend-mom', 'sleep-trend-mom-detail', mom, 'sleep');

    // 3 Month Trend (compare last month to 2-3 months ago)
    const threeMonth = calculateTrend(history, 30, 60);
    updateTrendDisplay('sleep-trend-3m', 'sleep-trend-3m-detail', threeMonth, 'sleep');
}

function renderFastingTrends() {
    const history = state.fastingHistory || [];

    // Week over Week
    const wow = calculateTrend(history, 7, 7);
    updateTrendDisplay('fast-trend-wow', 'fast-trend-wow-detail', wow, 'fasting');

    // Month over Month
    const mom = calculateTrend(history, 30, 30);
    updateTrendDisplay('fast-trend-mom', 'fast-trend-mom-detail', mom, 'fasting');

    // 3 Month Trend
    const threeMonth = calculateTrend(history, 30, 60);
    updateTrendDisplay('fast-trend-3m', 'fast-trend-3m-detail', threeMonth, 'fasting');
}

function renderHungerTrends() {
    const history = state.fastingHistory || [];

    // Calculate average hunger intensity from history
    // Higher numbers mean more hunger (hunger4 = 4 points, hunger1 = 1 point)
    function calculateHungerScore(item) {
        if (!item.hungerLogs) return 0;
        const counts = item.hungerLogs;
        return (counts.hunger1 || 0) * 1 + (counts.hunger2 || 0) * 2 +
               (counts.hunger3 || 0) * 3 + (counts.hunger4 || 0) * 4;
    }

    function calculateHungerTrend(history, currentPeriodDays, previousPeriodOffset) {
        const now = Date.now();
        const msPerDay = 24 * 60 * 60 * 1000;

        const currentStart = now - (currentPeriodDays * msPerDay);
        const currentItems = history.filter(item => item.endTime >= currentStart);

        const previousEnd = currentStart;
        const previousStart = previousEnd - (currentPeriodDays * msPerDay);
        const previousItems = history.filter(item => item.endTime >= previousStart && item.endTime < previousEnd);

        if (currentItems.length === 0 && previousItems.length === 0) {
            return { type: 'no-data', currentAvg: 0, previousAvg: 0, change: 0, percentChange: 0 };
        }

        if (previousItems.length === 0) {
            const currentAvg = currentItems.reduce((sum, item) => sum + calculateHungerScore(item), 0) / currentItems.length;
            return { type: 'new', currentAvg, previousAvg: 0, change: 0, percentChange: 0, currentCount: currentItems.length };
        }

        if (currentItems.length === 0) {
            const previousAvg = previousItems.reduce((sum, item) => sum + calculateHungerScore(item), 0) / previousItems.length;
            return { type: 'inactive', currentAvg: 0, previousAvg, change: -previousAvg, percentChange: -100 };
        }

        const currentAvg = currentItems.reduce((sum, item) => sum + calculateHungerScore(item), 0) / currentItems.length;
        const previousAvg = previousItems.reduce((sum, item) => sum + calculateHungerScore(item), 0) / previousItems.length;
        const change = currentAvg - previousAvg;
        const percentChange = previousAvg > 0 ? ((change / previousAvg) * 100) : 0;

        return {
            type: change > 0.5 ? 'up' : (change < -0.5 ? 'down' : 'stable'),
            currentAvg,
            previousAvg,
            change,
            percentChange,
            currentCount: currentItems.length,
            previousCount: previousItems.length
        };
    }

    // Week over Week
    const wow = calculateHungerTrend(history, 7, 7);
    updateHungerTrendDisplay('hunger-trend-wow', 'hunger-trend-wow-detail', wow);

    // Month over Month
    const mom = calculateHungerTrend(history, 30, 30);
    updateHungerTrendDisplay('hunger-trend-mom', 'hunger-trend-mom-detail', mom);

    // 3 Month Trend
    const threeMonth = calculateHungerTrend(history, 30, 60);
    updateHungerTrendDisplay('hunger-trend-3m', 'hunger-trend-3m-detail', threeMonth);
}

function updateHungerTrendDisplay(valueId, detailId, trend) {
    const valueEl = document.getElementById(valueId);
    const detailEl = document.getElementById(detailId);

    if (!valueEl || !detailEl) return;

    // For hunger, DOWN is good (less hungry), UP is concerning
    const upColor = '#ef4444';   // Red - more hunger is concerning
    const downColor = '#22c55e'; // Green - less hunger is good
    const stableColor = '#fb923c';

    if (trend.type === 'no-data') {
        valueEl.textContent = '--';
        valueEl.style.color = stableColor;
        detailEl.textContent = 'Need more data';
        return;
    }

    if (trend.type === 'new') {
        valueEl.textContent = trend.currentAvg.toFixed(1);
        valueEl.style.color = stableColor;
        detailEl.textContent = `New data (${trend.currentCount} fasts)`;
        return;
    }

    if (trend.type === 'inactive') {
        valueEl.textContent = '→';
        valueEl.style.color = stableColor;
        detailEl.textContent = 'No recent data';
        return;
    }

    // Show arrow and percentage
    const arrow = trend.type === 'up' ? '↑' : (trend.type === 'down' ? '↓' : '→');
    const color = trend.type === 'up' ? upColor : (trend.type === 'down' ? downColor : stableColor);
    const percent = Math.abs(trend.percentChange).toFixed(0);

    valueEl.innerHTML = `${arrow} <span style="font-size: 0.8em;">${percent}%</span>`;
    valueEl.style.color = color;
    detailEl.textContent = `${trend.currentAvg.toFixed(1)} vs ${trend.previousAvg.toFixed(1)} avg`;
}

// Feeling score mapping (higher = better)
const feelingScores = {
    soso: 1,
    fine: 2,
    prettygood: 3,
    ready: 4
};

function renderFeelingTrends() {
    renderFastFeelingTrends();
    renderSleepFeelingTrends();
}

function renderFastFeelingTrends() {
    const history = state.fastingHistory || [];

    // Week over Week
    const wow = calculateFeelingTrend(history, 7, 7);
    updateFeelingTrendDisplay('fast-feeling-trend-wow', 'fast-feeling-trend-wow-detail', wow, '#06b6d4');

    // Month over Month
    const mom = calculateFeelingTrend(history, 30, 30);
    updateFeelingTrendDisplay('fast-feeling-trend-mom', 'fast-feeling-trend-mom-detail', mom, '#06b6d4');

    // 3 Month Trend
    const threeMonth = calculateFeelingTrend(history, 30, 60);
    updateFeelingTrendDisplay('fast-feeling-trend-3m', 'fast-feeling-trend-3m-detail', threeMonth, '#06b6d4');
}

function renderSleepFeelingTrends() {
    const history = state.sleepHistory || [];

    // Week over Week
    const wow = calculateFeelingTrend(history, 7, 7);
    updateFeelingTrendDisplay('sleep-feeling-trend-wow', 'sleep-feeling-trend-wow-detail', wow, '#8b5cf6');

    // Month over Month
    const mom = calculateFeelingTrend(history, 30, 30);
    updateFeelingTrendDisplay('sleep-feeling-trend-mom', 'sleep-feeling-trend-mom-detail', mom, '#8b5cf6');

    // 3 Month Trend
    const threeMonth = calculateFeelingTrend(history, 30, 60);
    updateFeelingTrendDisplay('sleep-feeling-trend-3m', 'sleep-feeling-trend-3m-detail', threeMonth, '#8b5cf6');
}

function calculateFeelingTrend(history, currentPeriodDays, previousPeriodOffset) {
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;

    const currentStart = now - (currentPeriodDays * msPerDay);
    const currentItems = history.filter(item => item.endTime >= currentStart && item.feeling);

    const previousEnd = currentStart;
    const previousStart = previousEnd - (currentPeriodDays * msPerDay);
    const previousItems = history.filter(item => item.endTime >= previousStart && item.endTime < previousEnd && item.feeling);

    if (currentItems.length === 0 && previousItems.length === 0) {
        return { type: 'no-data', currentAvg: 0, previousAvg: 0, change: 0, percentChange: 0 };
    }

    if (previousItems.length === 0) {
        const currentAvg = currentItems.reduce((sum, item) => sum + (feelingScores[item.feeling] || 0), 0) / currentItems.length;
        return { type: 'new', currentAvg, previousAvg: 0, change: 0, percentChange: 0, currentCount: currentItems.length };
    }

    if (currentItems.length === 0) {
        const previousAvg = previousItems.reduce((sum, item) => sum + (feelingScores[item.feeling] || 0), 0) / previousItems.length;
        return { type: 'inactive', currentAvg: 0, previousAvg, change: -previousAvg, percentChange: -100 };
    }

    const currentAvg = currentItems.reduce((sum, item) => sum + (feelingScores[item.feeling] || 0), 0) / currentItems.length;
    const previousAvg = previousItems.reduce((sum, item) => sum + (feelingScores[item.feeling] || 0), 0) / previousItems.length;
    const change = currentAvg - previousAvg;
    const percentChange = previousAvg > 0 ? ((change / previousAvg) * 100) : 0;

    return {
        type: change > 0.2 ? 'up' : (change < -0.2 ? 'down' : 'stable'),
        currentAvg,
        previousAvg,
        change,
        percentChange,
        currentCount: currentItems.length,
        previousCount: previousItems.length
    };
}

function updateFeelingTrendDisplay(valueId, detailId, trend, color) {
    const valueEl = document.getElementById(valueId);
    const detailEl = document.getElementById(detailId);

    if (!valueEl || !detailEl) return;

    // For feeling, UP is good (feeling better), DOWN is concerning
    const upColor = '#22c55e';   // Green - feeling better is good
    const downColor = '#ef4444'; // Red - feeling worse is concerning
    const stableColor = color;

    if (trend.type === 'no-data') {
        valueEl.textContent = '--';
        valueEl.style.color = stableColor;
        detailEl.textContent = 'Need more data';
        return;
    }

    if (trend.type === 'new') {
        const label = feelingLabels[Object.keys(feelingScores).find(k => feelingScores[k] === Math.round(trend.currentAvg))] || trend.currentAvg.toFixed(1);
        valueEl.textContent = label;
        valueEl.style.color = stableColor;
        detailEl.textContent = `New data (${trend.currentCount} entries)`;
        return;
    }

    if (trend.type === 'inactive') {
        valueEl.textContent = '→';
        valueEl.style.color = stableColor;
        detailEl.textContent = 'No recent data';
        return;
    }

    // Show arrow and percentage
    const arrow = trend.type === 'up' ? '↑' : (trend.type === 'down' ? '↓' : '→');
    const displayColor = trend.type === 'up' ? upColor : (trend.type === 'down' ? downColor : stableColor);
    const percent = Math.abs(trend.percentChange).toFixed(0);

    valueEl.innerHTML = `${arrow} <span style="font-size: 0.8em;">${percent}%</span>`;
    valueEl.style.color = displayColor;

    // Convert averages to feeling labels
    const currentLabel = getFeelingLabel(trend.currentAvg);
    const previousLabel = getFeelingLabel(trend.previousAvg);
    detailEl.textContent = `${currentLabel} vs ${previousLabel}`;
}

function getFeelingLabel(score) {
    if (score >= 3.5) return 'Ready!';
    if (score >= 2.5) return 'Pretty Good';
    if (score >= 1.5) return 'Fine';
    return 'So-so';
}

function calculateTrend(history, currentPeriodDays, previousPeriodOffset) {
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;

    // Current period
    const currentStart = now - (currentPeriodDays * msPerDay);
    const currentItems = history.filter(item => item.endTime >= currentStart);

    // Previous period
    const previousEnd = currentStart;
    const previousStart = previousEnd - (currentPeriodDays * msPerDay);
    const previousItems = history.filter(item => item.endTime >= previousStart && item.endTime < previousEnd);

    if (currentItems.length === 0 && previousItems.length === 0) {
        return { type: 'no-data', currentAvg: 0, previousAvg: 0, change: 0, percentChange: 0 };
    }

    if (previousItems.length === 0) {
        const currentAvg = currentItems.reduce((sum, item) => sum + item.duration, 0) / currentItems.length;
        return { type: 'new', currentAvg, previousAvg: 0, change: 0, percentChange: 0, currentCount: currentItems.length };
    }

    if (currentItems.length === 0) {
        const previousAvg = previousItems.reduce((sum, item) => sum + item.duration, 0) / previousItems.length;
        return { type: 'inactive', currentAvg: 0, previousAvg, change: -previousAvg, percentChange: -100 };
    }

    const currentAvg = currentItems.reduce((sum, item) => sum + item.duration, 0) / currentItems.length;
    const previousAvg = previousItems.reduce((sum, item) => sum + item.duration, 0) / previousItems.length;
    const change = currentAvg - previousAvg;
    const percentChange = previousAvg > 0 ? ((change / previousAvg) * 100) : 0;

    return {
        type: change > 0.1 ? 'up' : (change < -0.1 ? 'down' : 'stable'),
        currentAvg,
        previousAvg,
        change,
        percentChange,
        currentCount: currentItems.length,
        previousCount: previousItems.length
    };
}

function updateTrendDisplay(valueId, detailId, trend, category) {
    const valueEl = document.getElementById(valueId);
    const detailEl = document.getElementById(detailId);

    if (!valueEl || !detailEl) return;

    const isSleep = category === 'sleep';
    const upColor = isSleep ? '#22c55e' : '#22c55e';  // Green for more sleep/fasting is good
    const downColor = isSleep ? '#ef4444' : '#ef4444'; // Red for less
    const stableColor = isSleep ? '#818cf8' : 'var(--matrix-400)';

    if (trend.type === 'no-data') {
        valueEl.textContent = '--';
        valueEl.style.color = stableColor;
        detailEl.textContent = 'Need more data';
        return;
    }

    if (trend.type === 'new') {
        valueEl.textContent = formatDuration(trend.currentAvg);
        valueEl.style.color = stableColor;
        detailEl.textContent = `${trend.currentCount} sessions tracked`;
        return;
    }

    if (trend.type === 'inactive') {
        valueEl.textContent = 'No activity';
        valueEl.style.color = downColor;
        detailEl.textContent = `Was ${formatDuration(trend.previousAvg)} avg`;
        return;
    }

    // Show trend with arrow
    const arrow = trend.type === 'up' ? '↑' : (trend.type === 'down' ? '↓' : '→');
    const absPercent = Math.abs(trend.percentChange).toFixed(0);

    if (trend.type === 'stable') {
        valueEl.innerHTML = `${arrow} Stable`;
        valueEl.style.color = stableColor;
        detailEl.textContent = `~${formatDuration(trend.currentAvg)} avg`;
    } else {
        valueEl.innerHTML = `${arrow} ${absPercent}%`;
        valueEl.style.color = trend.type === 'up' ? upColor : downColor;

        const changeDirection = trend.type === 'up' ? 'more' : 'less';
        const changeAmount = Math.abs(trend.change);
        if (changeAmount >= 1) {
            detailEl.textContent = `${formatDuration(changeAmount)} ${changeDirection}`;
        } else {
            const mins = Math.round(changeAmount * 60);
            detailEl.textContent = `${mins}m ${changeDirection}`;
        }
    }
}

// ==========================================
// END SLEEP TRACKER FUNCTIONS
// ==========================================

// Notifications - only request permission when actually needed
function showNotification(title, body) {
    if (!('Notification' in window)) return;

    const options = {
        body,
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌙</text></svg>',
        tag: 'sleep-suivour', // Prevents duplicate notifications
        renotify: true
    };

    if (Notification.permission === 'granted') {
        new Notification(title, options);
    } else if (Notification.permission === 'default') {
        // Request permission only when we actually need to show a notification
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, options);
            }
        });
    }
}

// Utility functions
function pad(num) {
    return num.toString().padStart(2, '0');
}

function formatDuration(hours) {
    // Handle invalid input
    if (typeof hours !== 'number' || isNaN(hours) || hours < 0) {
        return '0h 0m';
    }
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// ==========================================
// POWERUP FUNCTIONS
// ==========================================

const powerupEmojis = {
    water: '<span class="px-icon px-water"></span>',
    hotwater: '<span class="px-icon px-hotwater"></span>',
    coffee: '<span class="px-icon px-coffee"></span>',
    tea: '<span class="px-icon px-tea"></span>',
    exercise: '<span class="px-icon px-exercise"></span>',
    hanging: '<span class="px-icon px-monkey"></span>',
    grip: '<span class="px-icon px-grip"></span>',
    walk: '<span class="px-icon px-walk"></span>',
    doctorwin: '<span class="px-icon px-doctorwin"></span>',
    flatstomach: '<span class="px-icon px-flatstomach"></span>',
    custom: '<span class="px-icon px-star"></span>',
    hunger1: '<span class="px-icon px-hunger1"></span>',
    hunger2: '<span class="px-icon px-hunger2"></span>',
    hunger3: '<span class="px-icon px-hunger3"></span>',
    hunger4: '<span class="px-icon px-hunger4"></span>'
};

const powerupMessages = {
    water: [
        'Stay hydrated, champion! ',
        'Water is life! ',
        'Splash! Hydration level up! ',
        'Your cells are doing a happy dance! ',
        'H2O for the win! ',
        // Dr. Jason Fung quotes
        '"The price of fasting is zero." — Dr. Jason Fung',
        '"Fasting is so simple: Eat nothing. Drink water, tea, coffee, or bone broth." — Dr. Jason Fung',
        '"Your body is now burning fat. That\'s why you stored it!" — Dr. Jason Fung',
        '"Hunger comes in waves. When it passes, it passes." — Dr. Jason Fung',
        '"This is the ancient secret. Fasting follows feasting." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"No drug can provide the same benefit as fasting." — Dr. Pradip Jamnadas',
        '"You are genetically designed to fast." — Dr. Pradip Jamnadas',
        '"When you don\'t eat, your insulin plummets. That\'s the magic." — Dr. Pradip Jamnadas',
        '"Fasting is supposed to be normal. We evolved this way." — Dr. Pradip Jamnadas',
        '"Autophagy makes your cells younger. It\'s a reset switch." — Dr. Pradip Jamnadas'
    ],
    hotwater: [
        'Hot water flowing! Warming your core! ',
        'Steaming hydration activated! ',
        'Ancient remedy for hunger pangs! ',
        'Hot water soothes the stomach! ',
        'Warmth spreading through your system! ',
        'Hot water aids digestion and detox! ',
        'The simplest, most effective fast aid! ',
        'Calorie-free comfort in a cup! ',
        // Dr. Jason Fung quotes
        '"Fasting is so simple: Eat nothing. Drink water, tea, coffee, or bone broth." — Dr. Jason Fung',
        '"Hunger comes in waves. When it passes, it passes." — Dr. Jason Fung',
        '"The price of fasting is zero." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"When you don\'t eat, your insulin plummets. That\'s the magic." — Dr. Pradip Jamnadas',
        '"You are genetically designed to fast." — Dr. Pradip Jamnadas',
        '"Fasting is supposed to be normal. We evolved this way." — Dr. Pradip Jamnadas'
    ],
    coffee: [
        'Caffeine activated! ',
        'Black gold flowing! ',
        'Energy boost incoming! ',
        'The fasting fuel! ',
        'Brain cells are thanking you! ',
        // Dr. Jason Fung quotes
        '"When insulin is low, fat burning begins." — Dr. Jason Fung',
        '"During fasting, your body switches to burning stored fat." — Dr. Jason Fung',
        '"Fasting gives your body MORE energy, not less." — Dr. Jason Fung',
        '"As we burn body fat, our body gives us more energy. Survival response!" — Dr. Jason Fung',
        '"Practical experience shows hunger diminishes, not increases." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"Ketones can fuel every cell, including your brain. It\'s a cleaner burn." — Dr. Pradip Jamnadas',
        '"After 7 days fasting, 70% of brain energy comes from ketones!" — Dr. Pradip Jamnadas',
        '"The best thing you can do is fast. It drops insulin." — Dr. Pradip Jamnadas',
        '"You\'re 2.5 million years old genetically. You were made for this." — Dr. Pradip Jamnadas',
        '"Fasting is hormetic stress. It makes you stronger." — Dr. Pradip Jamnadas'
    ],
    tea: [
        'Zen mode engaged! ',
        'Antioxidants activated! ',
        'Sipping sophistication! ',
        'Tea time is power time! ',
        'The ancient elixir! ',
        // Dr. Jason Fung quotes
        '"Hunger is a state of mind, not a state of stomach." — Dr. Jason Fung',
        '"We are wired for feast and famine, not feast, feast, feast." — Dr. Jason Fung',
        '"Fasting has been part of human culture since the dawn of our species." — Dr. Jason Fung',
        '"Jesus, Mohammed, and Buddha agreed on one thing: the power of fasting." — Dr. Jason Fung',
        '"Fasting is not illness treatment. It\'s wellness treatment." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"Show me a drug that will make new brain cells. Only fasting does that." — Dr. Pradip Jamnadas',
        '"Fasting is not deprivation. It\'s healing and control." — Dr. Pradip Jamnadas',
        '"Your body is made to fast and feast. Trust it." — Dr. Pradip Jamnadas',
        '"Autophagy doesn\'t occur in a fed state. Only fasting activates it." — Dr. Pradip Jamnadas',
        '"After fasting, your cells work more efficiently. New mitochondria!" — Dr. Pradip Jamnadas'
    ],
    exercise: [
        'Grease the Groove! One set done! ',
        'Testosterone boost activated! ',
        'Visceral fat is shaking! ',
        'Autophagy + exercise = gains! ',
        'Body activated! ',
        'Another set in the bank! ',
        // Pavel Tsatsouline quotes
        '"Strength is a skill. Training must be approached as practice, not a workout." — Pavel Tsatsouline',
        '"You can be anything you want... But you must be strong first." — Pavel Tsatsouline',
        '"Strength has a greater purpose." — Pavel Tsatsouline',
        '"The kettlebell is an ancient Russian weapon against weakness." — Pavel Tsatsouline',
        '"Lift heavy and stay fresh. Grease the groove." — Pavel Tsatsouline',
        '"Never train to failure!" — Pavel Tsatsouline',
        '"Don\'t try to get yourself smoked; this will come soon enough." — Pavel Tsatsouline',
        '"A 30-minute practice should energize you, not wipe you out." — Pavel Tsatsouline',
        '"Strength cannot be divorced from health." — Pavel Tsatsouline',
        '"Everything in your body is interrelated. Isolation is a myth." — Pavel Tsatsouline',
        '"Fifty percent of very strong is strong. Fifty percent of weak is irrelevant." — Pavel Tsatsouline',
        '"Your gains are much more stable if you take some time off." — Pavel Tsatsouline',
        '"We do not tolerate weakness. You have a strong arm and a stronger one." — Pavel Tsatsouline',
        '"Train as often as possible while being as fresh as possible." — Pavel Tsatsouline',
        '"Strength is not a number. It\'s an attitude." — Pavel Tsatsouline'
    ],
    hanging: [
        'OOH OOH AH AH! Monkey mode! ',
        'Spine decompression activated! ',
        'Grip strength +10! ',
        'Hanging like a champ! ',
        'Tarzan would be proud! ',
        'Primal instincts unlocked! ',
        'Channel your inner ape! ',
        'Gravity is your friend today! ',
        'Decompressing that spine! ',
        'Shoulders saying thank you! ',
        // Pavel Tsatsouline quotes
        '"When in doubt, train your grip and your core." — Pavel Tsatsouline',
        '"The hanging leg raise is key to an extraordinarily strong six pack." — Pavel Tsatsouline',
        '"Keep reps to 5 and under. Focus on tension, not repetitions." — Pavel Tsatsouline',
        '"Strength is a skill. Practice it." — Pavel Tsatsouline',
        '"Train as often as possible while being as fresh as possible." — Pavel Tsatsouline',
        '"The burn from high reps does nothing for toning. Tension is king." — Pavel Tsatsouline',
        '"Everything in your body is interrelated. Isolation is a myth." — Pavel Tsatsouline',
        '"A back of iron and legs that never quit." — Pavel Tsatsouline',
        '"Doing builds the ability to do." — Pavel Tsatsouline',
        '"You will make the fastest gains with a few reps throughout the day." — Pavel Tsatsouline'
    ],
    grip: [
        'CRUSH IT! Captain of Crush mode! ',
        'Grip of steel activated! ',
        'Forearms are ON FIRE! ',
        'IronMind would be proud! ',
        'Handshake destroyer loading... ',
        'Crushing weakness, one rep at a time! ',
        'Gorilla grip unlocked! ',
        'Your forearms are growing! ',
        'That gripper never stood a chance! ',
        'Certified crush machine! ',
        // Pavel Tsatsouline quotes
        '"When in doubt, train your grip and your core." — Pavel Tsatsouline',
        '"Make a fist. Now make a white-knuckle fist. Feel the tension spread everywhere." — Pavel Tsatsouline',
        '"Your hands have massive representation in the motor cortex. Train grip, train your brain." — Pavel Tsatsouline',
        '"Grip strength correlates with longevity." — Pavel Tsatsouline',
        '"Certain areas of the body have great overflow of tension. Gripping muscles are among them." — Pavel Tsatsouline',
        '"Tensing your abs amplifies the intensity of any muscle contraction." — Pavel Tsatsouline',
        '"The kettlebell is an ancient Russian weapon against weakness." — Pavel Tsatsouline',
        '"Strength is a skill. The more you practice, the stronger you get." — Pavel Tsatsouline',
        '"Train as often as possible while being as fresh as possible." — Pavel Tsatsouline',
        '"Every time you activate a synaptic connection, it becomes stronger. Grease the groove." — Pavel Tsatsouline'
    ],
    walk: [
        'Step by step to victory! ',
        'Walking it off like a champ! ',
        'Digestion mode: ACTIVATED! ',
        'Those steps are adding up! ',
        'Movement is medicine! ',
        'Blood sugar dropping with each step! ',
        'Zone 2 cardio for the win! ',
        'Nature is calling! ',
        'The journey of 1000 miles... ',
        'Walking meditation unlocked! ',
        // Pavel Tsatsouline quotes
        '"The best, healthiest way to develop cardio is steady state exercise. Simple." — Pavel Tsatsouline',
        '"Walk it out. When your heart rate is high, don\'t suddenly stop moving." — Pavel Tsatsouline',
        '"Train at a metabolic intensity: low enough to maintain a conversation." — Pavel Tsatsouline',
        '"A back of iron and legs that never quit." — Pavel Tsatsouline',
        '"Doing builds the ability to do." — Pavel Tsatsouline',
        '"The heart is only a small part of endurance. Focus on mitochondria." — Pavel Tsatsouline',
        '"Strength cannot be divorced from health." — Pavel Tsatsouline',
        '"Train as often as possible while being as fresh as possible." — Pavel Tsatsouline',
        '"You will make the fastest gains with a few reps here and there throughout the day." — Pavel Tsatsouline',
        '"Deadlift two times your bodyweight. This ability will come in handy, even if civilization doesn\'t end." — Pavel Tsatsouline'
    ],
    doctorwin: [
        'DOCTOR WIN! Consulted with a licensed medical professional!',
        'Healthcare hero! Your doctor approves your journey!',
        'Medical checkup complete! Knowledge is power!',
        'Smart move! Always consult professionals for health advice!',
        'Doctor-approved fasting journey! Well done!',
        'Remember: This app is for FUN tracking only!',
        'DISCLAIMER: Only licensed medical professionals can give medical advice!',
        'Your health team supports you! Great job consulting them!',
        'Medical wisdom unlocked! Stay informed, stay healthy!',
        'Pro tip: Regular checkups + fasting = optimal health!'
    ],
    hunger1: [
        'Hunger noted! A little rumble is normal.',
        'Feeling peckish? Your body is just checking in.',
        'Mild hunger detected. Stay strong!',
        'The hunger whispers... you ignore it.',
        'A gentle reminder from your stomach.',
        '"Hunger is a state of mind, not a state of stomach." — Dr. Jason Fung',
        '"Hunger comes in waves. When it passes, it passes." — Dr. Jason Fung',
        'Drink some water - it often helps!',
        'This is your body adapting. Keep going!',
        'Level 1 hunger logged. You got this!'
    ],
    hunger2: [
        'Getting hungry! Your body wants fuel.',
        'The hunger grows... but so does your willpower!',
        'Moderate hunger alert! Stay focused.',
        'Your stomach is speaking louder now.',
        'Hunger wave incoming - ride it out!',
        '"The price of fasting is zero." — Dr. Jason Fung',
        '"You are genetically designed to fast." — Dr. Pradip Jamnadas',
        'Try some black coffee or tea to help!',
        'This hunger means fat-burning is active!',
        'Level 2 hunger. The battle intensifies!'
    ],
    hunger3: [
        'SUPER HUNGRY! Your willpower is being tested!',
        'Major hunger alert! You are in the trenches!',
        'The hunger beast awakens... FIGHT IT!',
        'Serious hunger mode! Stay strong, warrior!',
        'Your stomach is DEMANDING attention!',
        '"No drug can provide the same benefit as fasting." — Dr. Pradip Jamnadas',
        '"Fasting is not deprivation. It\'s healing and control." — Dr. Pradip Jamnadas',
        'Walk it off! Movement helps with hunger.',
        'This intense hunger means deep fat burning!',
        'Level 3 hunger! You are a fasting warrior!'
    ],
    hunger4: [
        'HORSE HUNGRY! Maximum hunger achieved!',
        'RAVENOUS! Could eat an entire horse!',
        'EXTREME HUNGER! You are a LEGEND for logging this!',
        'The hunger monster is at full power!',
        'MAXIMUM HUNGER LEVEL! Legendary willpower!',
        '"This is the ancient secret. Fasting follows feasting." — Dr. Jason Fung',
        '"Autophagy makes your cells younger. It\'s a reset switch." — Dr. Pradip Jamnadas',
        'Consider breaking your fast safely if needed!',
        'This level of hunger is RARE. You are incredible!',
        'HORSE HUNGRY logged! Absolute champion status!'
    ],
    flatstomach: [
        'Flat stomach achieved! Your gut is thanking you!',
        'Look at that flat belly! Fasting wins!',
        'Visceral fat is melting away!',
        'Your waistline is celebrating!',
        'The bloat is GONE! Keep up the great work!',
        '"Fasting shrinks your stomach naturally." — Dr. Jason Fung',
        '"When you don\'t eat, your body burns visceral fat first." — Dr. Pradip Jamnadas',
        'No bloat detected! This is the power of fasting!',
        'Your abs are thanking you right now!',
        'Flat stomach status: CONFIRMED!'
    ],
    custom: [
        'Custom powerup activated! You know what works for you!',
        'Your personal wellness routine logged!',
        'Custom activity completed! Keep it up!',
        'Personal powerup logged! You\'re building great habits!',
        'Your unique wellness practice matters!'
    ]
};

// Exercise-specific context messages
const exerciseContextMessages = {
    tooEarly: [
        "Hold up! You've only been fasting {hours}! \n\nExercise is best after 14+ hours when autophagy peaks and testosterone surges!\n\nWait a bit longer for maximum gains, or tap again if you must move NOW.",
        "Whoa, eager beaver! Only {hours} into your fast! \n\nThe magic happens after 14 hours - that's when your body becomes a fat-burning, muscle-building machine!\n\nPatience, grasshopper... or tap again to exercise anyway."
    ],
    optimal: [
        "PERFECT TIMING!  {hours} fasted!\n\nAutophagy is peaking, testosterone is surging!\n\nRemember: Keep it short (max 15 min), spread your sets throughout the day.\n\nGrease the Groove, warrior! ",
        "You're in the ZONE!  {hours} of fasting!\n\nYour body is primed for maximum gains right now!\n\nDo a quick set - pushups, squats, or just hang!\n\nLet's gooooo! "
    ],
    tooLateForBed: [
        "Careful! It's {time} - only {hoursUntilBed} until bedtime! \n\nExercise should be done 4-6 hours before sleep.\n\nIf you must, keep it VERY light - maybe just some gentle stretching?\n\nTap again to log it anyway.",
        "Night owl workout at {time}? \n\nYou've only got {hoursUntilBed} until bedtime. Exercise this late can mess with your sleep!\n\nMaybe just do some hanging or light stretches?\n\nTap again if you're committed."
    ],
    hungryWarning: [
        "Logged! But heads up... \n\nExercise while fasting = more hunger later!\n\nThe goal is burning visceral fat. Keep it moderate!\n\nPushups, squats, hanging - short sets spread throughout the day.",
        "Set logged! \n\n Remember: Hard exercise = harder hunger!\n\nGrease the Groove: 1 set now, another in a few hours.\n\nYou're burning visceral fat - stay the course! "
    ]
};

function addPowerup(type) {
    // Ensure powerups array exists
    if (!state.currentFast.powerups) {
        state.currentFast.powerups = [];
    }

    // Add the powerup with timestamp
    state.currentFast.powerups.push({
        type: type,
        time: Date.now()
    });

    saveState();
    updatePowerupDisplay();
    updateConstitution();

    // Add XP to skill (10 XP per action)
    const xpGained = addSkillXP(type, 10);

    // Show XP drop
    showPowerupToast(powerupEmojis[type], type, xpGained);
}

// Track exercise warnings
let exerciseWarnings = 0;

function addExercisePowerup() {
    const now = new Date();
    const currentHour = now.getHours();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Calculate fasting hours
    let fastingHours = 0;
    if (state.currentFast.isActive && state.currentFast.startTime) {
        fastingHours = (Date.now() - state.currentFast.startTime) / 1000 / 60 / 60;
    }

    // Calculate hours until bedtime (9 PM)
    let bedtime = new Date(now);
    bedtime.setHours(21, 0, 0, 0);
    if (currentHour >= 21) {
        bedtime.setDate(bedtime.getDate() + 1);
    }
    const hoursUntilBed = (bedtime - now) / 1000 / 60 / 60;

    // Check various conditions
    const isTooEarly = fastingHours < 14 && state.currentFast.isActive;
    const isTooLateForBed = hoursUntilBed < 4;
    const isOptimalTime = fastingHours >= 14 && hoursUntilBed >= 4;

    // Handle warnings
    if (isTooEarly && exerciseWarnings === 0) {
        exerciseWarnings++;
        const messages = exerciseContextMessages.tooEarly;
        const msg = messages[Math.floor(Math.random() * messages.length)]
            .replace('{hours}', formatDuration(fastingHours));
        showAchievementToast('<span class="px-icon px-warning"></span>', 'Hold Up, Warrior!', msg, 'warning');
        return;
    }

    if (isTooLateForBed && exerciseWarnings === 0) {
        exerciseWarnings++;
        const messages = exerciseContextMessages.tooLateForBed;
        const msg = messages[Math.floor(Math.random() * messages.length)]
            .replace('{time}', timeStr)
            .replace('{hoursUntilBed}', formatDuration(hoursUntilBed));
        showAchievementToast('<span class="px-icon px-moon"></span>', 'Sleep Approaches!', msg, 'warning');
        return;
    }

    // Reset warnings after second tap
    exerciseWarnings = 0;

    // Ensure powerups array exists
    if (!state.currentFast.powerups) {
        state.currentFast.powerups = [];
    }

    // Add the exercise powerup
    state.currentFast.powerups.push({
        type: 'exercise',
        time: Date.now(),
        fastingHours: fastingHours
    });

    saveState();
    updatePowerupDisplay();
    updateConstitution();

    // Add XP to Strength skill (10 XP per exercise)
    const xpGained = addSkillXP('exercise', 10);

    // Show XP drop
    showPowerupToast(powerupEmojis.exercise, 'exercise', xpGained);

    // Show appropriate message based on context
    let message;
    if (isOptimalTime) {
        const messages = exerciseContextMessages.optimal;
        message = messages[Math.floor(Math.random() * messages.length)]
            .replace('{hours}', formatDuration(fastingHours));
        showAchievementToast('<span class="px-icon px-exercise"></span>', 'Strength +10 XP!', message, 'success');
    } else {
        // Show regular powerup toast + hunger warning
        const messages = exerciseContextMessages.hungryWarning;
        message = messages[Math.floor(Math.random() * messages.length)];
        showAchievementToast('<span class="px-icon px-exercise"></span>', 'Strength +10 XP!', message, 'info');
    }

    // Show the exercise guide (if user hasn't disabled it)
    if (state.settings?.showExerciseGuide !== false) {
        const guideEl = document.getElementById('exercise-guide');
        if (guideEl) {
            guideEl.classList.remove('hidden');
        }
    }
}

// Hanging powerup - like a monkey! 
function addHangingPowerup() {
    // Ensure powerups array exists
    if (!state.currentFast.powerups) {
        state.currentFast.powerups = [];
    }

    // Calculate fasting hours for context
    let fastingHours = 0;
    if (state.currentFast.isActive && state.currentFast.startTime) {
        fastingHours = (Date.now() - state.currentFast.startTime) / 1000 / 60 / 60;
    }

    // Count existing hanging sessions today
    const hangingToday = state.currentFast.powerups.filter(p => p.type === 'hanging').length;

    // Add the hanging powerup
    state.currentFast.powerups.push({
        type: 'hanging',
        time: Date.now(),
        fastingHours: fastingHours
    });

    saveState();
    updatePowerupDisplay();

    // Fun contextual messages based on hanging count
    let contextMessage = '';
    if (hangingToday === 0) {
        contextMessage = "First hang of the day! Your spine is already celebrating! ";
    } else if (hangingToday === 1) {
        contextMessage = "Twice the hang, twice the benefits! You're a natural! ";
    } else if (hangingToday === 2) {
        contextMessage = "Three hangs?! Your grip strength is legendary now! ";
    } else if (hangingToday >= 3 && hangingToday < 5) {
        contextMessage = "You're practically living in the trees now! Tarzan approves! ";
    } else if (hangingToday >= 5 && hangingToday < 10) {
        contextMessage = "At this point, you might grow a tail! Keep swinging! ";
    } else {
        contextMessage = "THE MONKEY KING HAS ARRIVED! All hail the hang champion! ";
    }

    // Add XP to Agility skill (10 XP per hang)
    const xpGained = addSkillXP('hanging', 10);

    // Show XP drop
    showPowerupToast(powerupEmojis.hanging, 'hanging', xpGained);
    updateConstitution();

    // Show context message as toast for extra fun
    const toastType = hangingToday >= 5 ? 'epic' : hangingToday >= 2 ? 'success' : 'info';
    setTimeout(() => {
        showAchievementToast('<span class="px-icon px-monkey"></span>', `Hang #${hangingToday + 1} Complete!`, contextMessage, toastType);
    }, 300);
}

// Grip training powerup - Captain of Crush! 
function addGripPowerup() {
    // Ensure powerups array exists
    if (!state.currentFast.powerups) {
        state.currentFast.powerups = [];
    }

    // Calculate fasting hours for context
    let fastingHours = 0;
    if (state.currentFast.isActive && state.currentFast.startTime) {
        fastingHours = (Date.now() - state.currentFast.startTime) / 1000 / 60 / 60;
    }

    // Count existing grip sessions today
    const gripToday = state.currentFast.powerups.filter(p => p.type === 'grip').length;

    // Add the grip powerup
    state.currentFast.powerups.push({
        type: 'grip',
        time: Date.now(),
        fastingHours: fastingHours
    });

    saveState();
    updatePowerupDisplay();

    // Fun contextual messages based on grip count - Captain of Crush progression themed!
    let contextMessage = '';
    if (gripToday === 0) {
        contextMessage = "First crush of the day! Starting with the Guide? Smart! ";
    } else if (gripToday === 1) {
        contextMessage = "Two sets in! Sport level unlocked! ";
    } else if (gripToday === 2) {
        contextMessage = "Three crushes! You're at Trainer level now! ";
    } else if (gripToday === 3) {
        contextMessage = "Four sets?! Point Five territory - getting serious! ";
    } else if (gripToday === 4) {
        contextMessage = "FIVE! That's No. 1 energy right there! ";
    } else if (gripToday >= 5 && gripToday < 8) {
        contextMessage = "You're climbing the ranks! No. 1.5 vibes! ";
    } else if (gripToday >= 8 && gripToday < 12) {
        contextMessage = "No. 2 crusher in the making! Your handshake is now a weapon! ";
    } else if (gripToday >= 12 && gripToday < 15) {
        contextMessage = "No. 2.5 BEAST MODE! Forearms of steel! ";
    } else if (gripToday >= 15 && gripToday < 20) {
        contextMessage = "No. 3 LEGEND! You could crush a coconut! ";
    } else {
        contextMessage = "NO. 4 TERRITORY?! You're not human anymore... you're IRONMIND! ";
    }

    // Add XP to Grip skill (10 XP per crush)
    const xpGained = addSkillXP('grip', 10);

    // Show XP drop
    showPowerupToast(powerupEmojis.grip, 'grip', xpGained);
    updateConstitution();

    // Show context message as toast for extra motivation
    const toastType = gripToday >= 8 ? 'epic' : gripToday >= 4 ? 'success' : 'info';
    setTimeout(() => {
        showAchievementToast('<span class="px-icon px-grip"></span>', `Crush #${gripToday + 1} Complete!`, contextMessage, toastType);
    }, 300);
}

// Walking powerup - great for digestion and blood sugar! 
function addWalkPowerup() {
    // Ensure powerups array exists
    if (!state.currentFast.powerups) {
        state.currentFast.powerups = [];
    }

    // Calculate fasting hours for context
    let fastingHours = 0;
    if (state.currentFast.isActive && state.currentFast.startTime) {
        fastingHours = (Date.now() - state.currentFast.startTime) / 1000 / 60 / 60;
    }

    // Count existing walks today
    const walksToday = state.currentFast.powerups.filter(p => p.type === 'walk').length;

    // Add the walk powerup
    state.currentFast.powerups.push({
        type: 'walk',
        time: Date.now(),
        fastingHours: fastingHours
    });

    saveState();
    updatePowerupDisplay();

    // Fun contextual messages based on walk count
    let contextMessage = '';
    if (walksToday === 0) {
        contextMessage = "First walk of the day! Your body thanks you! ";
    } else if (walksToday === 1) {
        contextMessage = "Two walks! You're on a roll... literally! ";
    } else if (walksToday === 2) {
        contextMessage = "Three walks?! You're becoming a wanderer! ";
    } else if (walksToday === 3) {
        contextMessage = "Four walks! Your step counter is sweating! ";
    } else if (walksToday >= 4 && walksToday < 7) {
        contextMessage = "You're basically a nomad now! Keep roaming! ";
    } else if (walksToday >= 7 && walksToday < 10) {
        contextMessage = "Walking machine! Your ancestors would be proud! ";
    } else {
        contextMessage = "LEGENDARY WALKER! You've unlocked the path of the wanderer! ";
    }

    // Add XP to Endurance skill (10 XP per walk)
    const xpGained = addSkillXP('walk', 10);

    // Show XP drop
    showPowerupToast(powerupEmojis.walk, 'walk', xpGained);
    updateConstitution();

    // Show context message as toast for milestone walks
    const toastType = walksToday >= 7 ? 'epic' : walksToday >= 3 ? 'success' : 'info';
    setTimeout(() => {
        showAchievementToast('<span class="px-icon px-walk"></span>', `Walk #${walksToday + 1} Complete!`, contextMessage, toastType);
    }, 300);
}

// Doctor Win powerup - promotes consulting licensed medical professionals!
function addDoctorWinPowerup(context) {
    // This powerup works for fasting context
    if (!state.currentFast.powerups) {
        state.currentFast.powerups = [];
    }

    // Add the doctor win powerup
    state.currentFast.powerups.push({
        type: 'doctorwin',
        time: Date.now(),
        context: context
    });

    saveState();
    updatePowerupDisplay();

    // Get random message
    const messages = powerupMessages.doctorwin;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Add XP to a "health" or generic skill (20 XP - big reward for consulting doctors!)
    const xpGained = addSkillXP('doctorwin', 20);

    // Show XP drop
    showPowerupToast(powerupEmojis.doctorwin, 'doctorwin', xpGained);
    updateConstitution();

    // Show achievement toast
    setTimeout(() => {
        showAchievementToast('<span class="px-icon px-doctorwin"></span>', 'Doctor Win!', randomMessage, 'epic');
    }, 300);
}

function showPowerupToast(emoji, skillType, xpGained) {
    // Classic RPG XP drop!
    showXPDrop(emoji, skillType, xpGained);
}

// Fun achievement toast - replaces boring alerts!
function showAchievementToast(emoji, title, message, type = 'success') {
    // Remove any existing toast
    const existingToast = document.getElementById('achievement-toast');
    if (existingToast) existingToast.remove();

    // Color schemes based on type
    const colors = {
        success: { bg: 'rgba(34, 197, 94, 0.95)', border: '#22c55e', glow: 'rgba(34, 197, 94, 0.5)' },
        warning: { bg: 'rgba(234, 179, 8, 0.95)', border: '#eab308', glow: 'rgba(234, 179, 8, 0.5)' },
        danger: { bg: 'rgba(239, 68, 68, 0.95)', border: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)' },
        info: { bg: 'rgba(59, 130, 246, 0.95)', border: '#3b82f6', glow: 'rgba(59, 130, 246, 0.5)' },
        epic: { bg: 'rgba(168, 85, 247, 0.95)', border: '#a855f7', glow: 'rgba(168, 85, 247, 0.5)' }
    };

    const color = colors[type] || colors.success;

    const toast = document.createElement('div');
    toast.id = 'achievement-toast';
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 32px; filter: drop-shadow(0 0 8px ${color.glow}); display: flex; align-items: center;">${emoji}</div>
            <div>
                <div style="font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">${title}</div>
                <div style="font-size: 12px; opacity: 0.9;">${message}</div>
            </div>
        </div>
    `;

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        background: ${color.bg};
        border: 2px solid ${color.border};
        border-radius: 12px;
        padding: 16px 24px;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        z-index: 10000;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${color.glow}, inset 0 1px 0 rgba(255,255,255,0.2);
        animation: toastSlideIn 0.4s ease-out forwards;
        max-width: 90vw;
    `;

    // Add animation styles if not present
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes toastSlideIn {
                0% { transform: translateX(-50%) translateY(-100px) scale(0.8); opacity: 0; }
                50% { transform: translateX(-50%) translateY(10px) scale(1.05); }
                100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
            }
            @keyframes toastSlideOut {
                0% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
                100% { transform: translateX(-50%) translateY(-100px) scale(0.8); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Remove after delay
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// CONFIRMATION MODAL - Replace native confirm()
// ==========================================

/**
 * Shows a styled confirmation modal instead of native confirm()
 * @param {string} message - The confirmation message to display
 * @param {string} title - Optional title (default: 'Confirm')
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
function showConfirmModal(message, title = 'Confirm') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-modal-title');
        const messageEl = document.getElementById('confirm-modal-message');
        const confirmBtn = document.getElementById('confirm-modal-confirm');
        const cancelBtn = document.getElementById('confirm-modal-cancel');

        if (!modal || !confirmBtn || !cancelBtn) {
            // Fallback to native confirm if modal not found
            resolve(confirm(message));
            return;
        }

        // Store previously focused element to restore focus later
        const previouslyFocused = document.activeElement;

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;

        modal.classList.remove('hidden');

        // Clean up any existing listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        // Focus the cancel button by default (safer choice)
        newCancelBtn.focus();

        const closeModal = (result) => {
            modal.classList.add('hidden');
            // Restore focus to previously focused element
            if (previouslyFocused && previouslyFocused.focus) {
                previouslyFocused.focus();
            }
            resolve(result);
        };

        newConfirmBtn.addEventListener('click', () => closeModal(true));
        newCancelBtn.addEventListener('click', () => closeModal(false));

        // Close on backdrop click
        const backdropHandler = (e) => {
            if (e.target === modal) {
                modal.removeEventListener('click', backdropHandler);
                closeModal(false);
            }
        };
        modal.addEventListener('click', backdropHandler);

        // Handle keyboard navigation (Escape and Tab trap)
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', keyHandler);
                closeModal(false);
            } else if (e.key === 'Tab') {
                // Trap focus within modal
                const focusableElements = [newCancelBtn, newConfirmBtn];
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };
        document.addEventListener('keydown', keyHandler);
    });
}

// ==========================================
// SUI GHOST EASTER EGG - Click to get wisdom!
// ==========================================

let suiClickCount = 0;
let suiAnimationTimeout = null;
let suiIsStopped = false;
let suiCurrentType = 'fasting';

// YouTube video links for each expert (verified working links)
const suiVideoLinks = {
    fasting: [
        // Dr. Jason Fung videos
        { url: 'https://www.youtube.com/watch?v=PKfR6bAXr-c', title: 'The Science of Fasting', author: 'Dr. Jason Fung' },
        { url: 'https://www.youtube.com/watch?v=YpllomiDMX0', title: 'Intermittent Fasting for Weight Loss', author: 'Dr. Jason Fung' },
        { url: 'https://www.youtube.com/watch?v=mAwgdX5VxGc', title: 'The Obesity Code Lecture', author: 'Dr. Jason Fung' },
        { url: 'https://www.youtube.com/watch?v=eUiSCEBGxOk', title: 'Therapeutic Fasting', author: 'Dr. Jason Fung' },
        // Dr. Pradip Jamnadas videos
        { url: 'https://www.youtube.com/watch?v=RuOvn4UqznU', title: 'Fasting for Survival', author: 'Dr. Pradip Jamnadas' },
        { url: 'https://www.youtube.com/watch?v=Da8BH9pX9UE', title: 'The Fat Lies', author: 'Dr. Pradip Jamnadas' },
        { url: 'https://www.youtube.com/watch?v=sNz-gBgxNzs', title: 'Food as Medicine', author: 'Dr. Pradip Jamnadas' },
        // Pavel Tsatsouline videos
        { url: 'https://www.youtube.com/watch?v=nDgIVseTkuE', title: 'Joe Rogan #1399 - Strength Training', author: 'Pavel Tsatsouline' },
        { url: 'https://www.youtube.com/watch?v=5iNZGN9hXog', title: 'Simple & Sinister Kettlebell', author: 'Pavel Tsatsouline' }
    ],
    sleep: [
        // Matthew Walker videos
        { url: 'https://www.youtube.com/watch?v=pwaWilO_Pig', title: 'Why We Sleep', author: 'Dr. Matthew Walker' },
        { url: 'https://www.youtube.com/watch?v=5MuIMqhT8DM', title: 'Joe Rogan #1109 - Sleep Expert', author: 'Dr. Matthew Walker' },
        { url: 'https://www.youtube.com/watch?v=gbQFSMayJxk', title: 'TED: Sleep is Your Superpower', author: 'Dr. Matthew Walker' },
        { url: 'https://www.youtube.com/watch?v=nm1TxQj9IsQ', title: 'Huberman Lab: Master Your Sleep', author: 'Dr. Matthew Walker' },
        { url: 'https://www.youtube.com/watch?v=3bRUzLqEs7E', title: 'The Science of Better Sleep', author: 'Dr. Matthew Walker' }
    ],
    rickroll: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Special Wisdom from Sui...', author: 'Ancient Master' }
};

// Sui The Sleep God - ghostly figure animation (slides in from right, through center, exits left)
// type: 'fasting' (green) or 'sleep' (purple)
function showSuiGhost(message, type = 'fasting') {
    const container = document.getElementById('sui-container');
    const ghost = document.getElementById('sui-ghost');
    const messageEl = document.getElementById('sui-message');

    if (!container || !ghost || !messageEl) return;

    // Clear any existing timeout
    if (suiAnimationTimeout) {
        clearTimeout(suiAnimationTimeout);
    }

    // Track current type for easter egg
    suiCurrentType = type;
    suiIsStopped = false;

    // Reset ghost styles from any previous easter egg click
    ghost.style.transform = '';
    ghost.style.opacity = '';

    // Set message (use textContent to reset any HTML from easter egg)
    messageEl.textContent = message;

    // Set color based on type
    ghost.classList.remove('sui-fasting', 'sui-sleep');
    ghost.classList.add(type === 'sleep' ? 'sui-sleep' : 'sui-fasting');

    // Reset animation
    ghost.style.animation = 'none';
    ghost.offsetHeight; // Trigger reflow
    ghost.style.animation = 'suiSlideIn 3.5s cubic-bezier(0.4, 0, 0.6, 1) forwards';

    // Show container
    container.classList.remove('hidden');

    // Hide container after animation completes (3.5 seconds - stays visible for ~2 seconds in center)
    suiAnimationTimeout = setTimeout(() => {
        container.classList.add('hidden');
        suiIsStopped = false;
    }, 3500);
}

function handleSuiClick(event) {
    // If clicking on the video link, let it open normally
    if (event.target.tagName === 'A' || event.target.closest('a')) {
        return; // Don't prevent default, let the link work
    }

    event.stopPropagation();
    event.preventDefault();

    const container = document.getElementById('sui-container');
    const ghost = document.getElementById('sui-ghost');
    const messageEl = document.getElementById('sui-message');

    if (!container || !ghost || !messageEl) return;

    // If already stopped, don't process again
    if (suiIsStopped) return;

    suiClickCount++;

    // Stop the animation timeout
    if (suiAnimationTimeout) {
        clearTimeout(suiAnimationTimeout);
        suiAnimationTimeout = null;
    }

    // Pause the ghost animation and center it
    ghost.style.animationPlayState = 'paused';
    ghost.style.animation = 'none';
    ghost.style.transform = 'translateX(0) scale(1.1)';
    ghost.style.opacity = '1';
    suiIsStopped = true;

    // Determine which video to show
    let video;
    if (suiClickCount % 3 === 0) {
        // Every 3rd click is a rickroll!
        video = suiVideoLinks.rickroll;
    } else {
        // Get the current type from the ghost class
        const isSleep = ghost.classList.contains('sui-sleep');
        const videoList = isSleep ? suiVideoLinks.sleep : suiVideoLinks.fasting;
        video = videoList[Math.floor(Math.random() * videoList.length)];
    }

    // Update the message with video link
    messageEl.innerHTML = `
        <span style="font-size: 0.9rem; display: block; margin-bottom: 8px;">Sui says: "Watch this wisdom..."</span>
        <a href="${video.url}" target="_blank" rel="noopener noreferrer"
           style="color: #fbbf24; text-decoration: underline; font-size: 0.85rem; display: block; word-wrap: break-word;"
           class="sui-video-link">
            ${video.title}
        </a>
        <span style="font-size: 0.75rem; color: #86efac; display: block; margin-top: 6px;">— ${video.author}</span>
        <span style="font-size: 0.65rem; color: rgba(134, 239, 172, 0.6); display: block; margin-top: 8px;">(Click outside to dismiss)</span>
    `;

    // Add click handler to dismiss when clicking outside the link
    const dismissHandler = (e) => {
        // Don't dismiss if clicking the link or any child of the link
        if (e.target.tagName === 'A' || e.target.closest('a')) {
            return;
        }
        container.classList.add('hidden');
        suiIsStopped = false;
        ghost.style.transform = '';
        ghost.style.opacity = '';
        document.removeEventListener('click', dismissHandler);
    };

    // Delay adding the dismiss handler so the current click doesn't trigger it
    setTimeout(() => {
        document.addEventListener('click', dismissHandler);
    }, 100);
}

// Classic RPG XP drops - falling text!
function showXPDrop(emoji, skillType, xpGained) {
    // Create XP drop container if it doesn't exist
    let container = document.getElementById('xp-drop-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'xp-drop-container';
        container.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            z-index: 1000;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 4px;
        `;
        document.body.appendChild(container);
    }

    // Create the XP drop element - Red for Heart Points!
    const drop = document.createElement('div');
    drop.style.cssText = `
        font-family: 'Courier New', monospace;
        font-weight: bold;
        font-size: 14px;
        color: #ef4444;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.9), 0 0 8px rgba(239, 68, 68, 0.6);
        white-space: nowrap;
        opacity: 1;
        transform: translateY(0);
        display: flex;
        align-items: center;
        gap: 4px;
        animation: xpDropFall 2.5s ease-out forwards;
    `;

    // Add the animation keyframes if not already added
    if (!document.getElementById('xp-drop-styles')) {
        const style = document.createElement('style');
        style.id = 'xp-drop-styles';
        style.textContent = `
            @keyframes xpDropFall {
                0% {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
                20% {
                    opacity: 1;
                    transform: translateY(-10px) scale(1.1);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-80px) scale(0.8);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Skill names for XP drops
    const skillNames = {
        water: 'Hydration',
        coffee: 'Caffeine',
        tea: 'Zen',
        exercise: 'Strength',
        hanging: 'Agility',
        grip: 'Grip',
        walk: 'Endurance',
        // Eating skills
        broth: 'Broth',
        protein: 'Protein',
        fiber: 'Fiber',
        homecooked: 'Home Cook',
        sloweating: 'Chewing',
        chocolate: 'Chocolate',
        mealwalk: 'Digestion'
    };

    const xpAmount = xpGained || 10;
    const skillName = skillNames[skillType] || skillType;
    drop.innerHTML = `<span style="font-size: 16px;">${emoji}</span><span>+${xpAmount} ${skillName} XP</span>`;

    container.appendChild(drop);

    // Remove after animation completes
    setTimeout(() => {
        drop.remove();
    }, 2500);
}

async function resetPowerups() {
    if (!state.currentFast.powerups || state.currentFast.powerups.length === 0) {
        return;
    }

    const confirmed = await showConfirmModal('Reset all powerups for this fasting session?', 'Reset Powerups');
    if (confirmed) {
        state.currentFast.powerups = [];
        saveState();
        updatePowerupDisplay();
    }
}

// ==========================================
// CUSTOM POWERUP SYSTEM
// ==========================================

function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function canCreateCustomPowerup() {
    if (!state.customPowerup) {
        state.customPowerup = { name: null, createdMonth: null };
    }
    const currentMonth = getCurrentMonth();
    // Can create if no custom powerup exists OR it was created in a previous month
    return !state.customPowerup.name || state.customPowerup.createdMonth !== currentMonth;
}

function showCustomPowerupModal() {
    const modal = document.getElementById('custom-powerup-modal');
    const remainingEl = document.getElementById('custom-powerup-remaining');
    const input = document.getElementById('custom-powerup-input');

    if (canCreateCustomPowerup()) {
        if (remainingEl) {
            remainingEl.textContent = 'You have 1 custom powerup available this month.';
            remainingEl.style.color = '#67e8f9';
        }
        if (input) {
            input.disabled = false;
            input.value = '';
        }
        document.getElementById('create-custom-powerup').disabled = false;
    } else {
        if (remainingEl) {
            remainingEl.textContent = `You already created "${state.customPowerup.name}" this month. Try again next month!`;
            remainingEl.style.color = '#fca5a5';
        }
        if (input) {
            input.disabled = true;
            input.value = state.customPowerup.name || '';
        }
        document.getElementById('create-custom-powerup').disabled = true;
    }

    modal?.classList.remove('hidden');
}

function hideCustomPowerupModal() {
    document.getElementById('custom-powerup-modal')?.classList.add('hidden');
}

function createCustomPowerup() {
    const input = document.getElementById('custom-powerup-input');
    const name = input?.value?.trim();

    if (!name) {
        showAchievementToast(
            '<span class="px-icon px-warning"></span>',
            'Name Required',
            'Please enter a name for your custom powerup!',
            'warning'
        );
        return;
    }

    if (name.length > 20) {
        showAchievementToast(
            '<span class="px-icon px-warning"></span>',
            'Too Long',
            'Name must be 20 characters or less!',
            'warning'
        );
        return;
    }

    if (!canCreateCustomPowerup()) {
        showAchievementToast(
            '<span class="px-icon px-warning"></span>',
            'Monthly Limit',
            'You can only create 1 custom powerup per month!',
            'warning'
        );
        return;
    }

    // Save the custom powerup (sanitize the name)
    const sanitizedName = escapeHtml(name);
    state.customPowerup = {
        name: sanitizedName,
        createdMonth: getCurrentMonth()
    };
    saveState();

    // Update UI
    updateCustomPowerupDisplay();
    hideCustomPowerupModal();

    // Show confirmation toast (name is already escaped)
    showPowerupToast(`Custom powerup "${sanitizedName}" created! Use it wisely!`);
}

function updateCustomPowerupDisplay() {
    const customBtn = document.getElementById('powerup-custom');
    const addBtn = document.getElementById('add-custom-powerup-btn');
    const nameSpan = document.getElementById('custom-powerup-name');

    if (state.customPowerup?.name) {
        // Show the custom powerup button
        customBtn?.classList.remove('hidden');
        if (nameSpan) nameSpan.textContent = state.customPowerup.name;
        // Hide the "add custom" button
        addBtn?.classList.add('hidden');
    } else {
        // Hide custom powerup, show add button
        customBtn?.classList.add('hidden');
        addBtn?.classList.remove('hidden');
    }
}

// ==========================================
// HUNGER TRACKING SYSTEM
// ==========================================

function addHungerLog(level) {
    // Don't allow hunger logs while sleeping or not fasting
    if (state.currentSleep?.isActive || !state.currentFast?.isActive) {
        return;
    }

    // Ensure hungerLogs array exists in current fast
    if (!state.currentFast.hungerLogs) {
        state.currentFast.hungerLogs = [];
    }

    // Calculate fasting hours at time of hunger
    let fastingHours = 0;
    if (state.currentFast.isActive && state.currentFast.startTime) {
        fastingHours = (Date.now() - state.currentFast.startTime) / 1000 / 60 / 60;
    }

    // Add the hunger log with timestamp and context
    state.currentFast.hungerLogs.push({
        level: level,
        time: Date.now(),
        fastingHours: fastingHours,
        sleepHours: state.lastSleepDuration || 0
    });

    saveState();
    updateHungerDisplay();

    // Show toast with hunger message
    const messages = powerupMessages[level];
    const message = messages[Math.floor(Math.random() * messages.length)];
    const levelNum = level.replace('hunger', '');
    showAchievementToast(powerupEmojis[level], `Hunger Level ${levelNum}`, message, 'warning');
}

function updateHungerDisplay() {
    const stack = document.getElementById('hunger-stack');
    const emptyMsg = document.getElementById('hunger-empty');
    const stats = document.getElementById('hunger-stats');

    if (!stack) return;

    const logs = state.currentFast.hungerLogs || [];

    if (logs.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('hidden');
        if (stats) stats.classList.add('hidden');
        stack.innerHTML = '<span id="hunger-empty" class="text-xs italic" style="color: var(--dark-text-muted);">Your hunger logs will appear here...</span>';
        return;
    }

    if (emptyMsg) emptyMsg.classList.add('hidden');
    if (stats) stats.classList.remove('hidden');

    // Build the hunger stack display with timestamps
    let html = '';
    logs.forEach((log, index) => {
        const time = new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const emoji = powerupEmojis[log.level];
        const fastingInfo = log.fastingHours > 0 ? ` @ ${log.fastingHours.toFixed(1)}h` : '';
        html += `<span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs" style="background: rgba(251, 146, 60, 0.1);" title="${time} - ${log.fastingHours.toFixed(1)}h fasted">${emoji}<span style="color: var(--dark-text-muted); font-size: 10px;">${time}</span></span>`;
    });
    stack.innerHTML = html;

    // Update counts
    const counts = { hunger1: 0, hunger2: 0, hunger3: 0, hunger4: 0 };
    logs.forEach(log => {
        if (counts.hasOwnProperty(log.level)) {
            counts[log.level]++;
        }
    });

    document.getElementById('hunger1-count')?.textContent && (document.getElementById('hunger1-count').textContent = counts.hunger1);
    document.getElementById('hunger2-count')?.textContent && (document.getElementById('hunger2-count').textContent = counts.hunger2);
    document.getElementById('hunger3-count')?.textContent && (document.getElementById('hunger3-count').textContent = counts.hunger3);
    document.getElementById('hunger4-count')?.textContent && (document.getElementById('hunger4-count').textContent = counts.hunger4);
}

async function resetHungerLogs() {
    if (!state.currentFast.hungerLogs || state.currentFast.hungerLogs.length === 0) {
        return;
    }

    const confirmed = await showConfirmModal('Reset all hunger logs for this fasting session?', 'Reset Hunger Logs');
    if (confirmed) {
        state.currentFast.hungerLogs = [];
        saveState();
        updateHungerDisplay();
    }
}

// ==========================================
// SETTINGS SYSTEM
// ==========================================

function initSettings() {
    // Ensure settings exist
    if (!state.settings) {
        state.settings = {
            showFastingGoals: true,
            showSleepGoals: true,
            showFastingFuture: true,
            showBreakingFastGuide: true,
            showExerciseGuide: true,
            showEatingGuide: true,
            showSleepGuide: true,
            showMealSleepQuality: true,
            showHungerTracker: true,
            showTrends: true
        };
    }

    // Set checkbox states from saved settings
    const settingsMap = {
        'toggle-fasting-goals': 'showFastingGoals',
        'toggle-sleep-goals': 'showSleepGoals',
        'toggle-fasting-future': 'showFastingFuture',
        'toggle-breaking-fast-guide': 'showBreakingFastGuide',
        'toggle-exercise-guide': 'showExerciseGuide',
        'toggle-eating-guide': 'showEatingGuide',
        'toggle-sleep-guide': 'showSleepGuide',
        'toggle-meal-sleep-quality': 'showMealSleepQuality',
        'toggle-hunger-tracker': 'showHungerTracker',
        'toggle-trends': 'showTrends'
    };

    for (const [checkboxId, settingKey] of Object.entries(settingsMap)) {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            // Explicitly check for true/false, default to true only if undefined
            const settingValue = state.settings[settingKey];
            checkbox.checked = settingValue === true || settingValue === undefined;
        }
    }

    // Apply visibility settings
    applySettings();
}

function updateSetting(settingKey, value) {
    if (!state.settings) {
        state.settings = {};
    }
    state.settings[settingKey] = value;

    // Save to localStorage
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    localStorage.setItem('settings-modified-locally', 'true');

    // Apply visibility changes
    applySettings();

    // ALWAYS sync to cloud when user changes a setting (if connected)
    if (window.firebaseSync && window.firebaseSync.syncEnabled) {
        window.firebaseSync.syncToCloud(state).catch(err => {
            console.error('Settings sync failed:', err.message);
        });
    }
}

function applySettings() {
    const settings = state.settings || {};

    // Fasting goal selector - hide if actively fasting OR if disabled in settings
    const showFastingGoal = settings.showFastingGoals !== false && !state.currentFast?.isActive;
    toggleElement('fasting-goal-selector', showFastingGoal);

    // Sleep goal selector - hide if actively sleeping OR if disabled in settings
    const showSleepGoal = settings.showSleepGoals !== false && !state.currentSleep?.isActive;
    toggleElement('sleep-goal-selector', showSleepGoal);

    // Fasting Future guide
    toggleElement('fasting-future-section', settings.showFastingFuture !== false);

    // Dynamic breaking fast guides (these show based on fasting progress)
    // We'll store the preference and check it when showing guides
    window.showBreakingFastGuide = settings.showBreakingFastGuide !== false;

    // Exercise guide (shown when exercise powerup is used)
    window.showExerciseGuide = settings.showExerciseGuide !== false;
    if (!window.showExerciseGuide) {
        toggleElement('exercise-guide', false);
    }

    // Eating guide
    toggleElement('eating-guide-section', settings.showEatingGuide !== false);

    // Sleep guide (Laws of Sleep)
    toggleElement('sleep-guide-section', settings.showSleepGuide !== false);

    // Last Meal & Sleep Quality
    toggleElement('sleep-fasting-status', settings.showMealSleepQuality !== false);

    // Hunger tracker
    toggleElement('hunger-tracker-section', settings.showHungerTracker !== false);

    // Trends analysis
    toggleElement('trends-analysis-section', settings.showTrends !== false);
}

function toggleElement(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
        if (show) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    }
}

// ==========================================
// EATING POWERUPS SYSTEM
// ==========================================

const eatingPowerupEmojis = {
    broth: '<span class="px-icon px-potion"></span>',
    protein: '<span class="px-icon px-meat"></span>',
    fiber: '<span class="px-icon px-leaf"></span>',
    homecooked: '<span class="px-icon px-house"></span>',
    sloweating: '<span class="px-icon px-glass"></span>',
    chocolate: '<span class="px-icon px-chocolate"></span>',
    mealwalk: '<span class="px-icon px-walk"></span>',
    nosugar: '<span class="px-icon px-nosugar"></span>',
    doctorwin: '<span class="px-icon px-doctorwin"></span>',
    eatenout: '<span class="px-icon px-burger"></span>',
    toofast: '',
    junkfood: '<span class="px-icon px-fries"></span>',
    bloated: '<span class="px-icon px-bloat"></span>'
};

const eatingPowerupMessages = {
    broth: [
        "Bone broth consumed! +10 Gut Recovery!",
        "Liquid gold acquired! Your intestines rejoice!",
        "The ultimate fast-breaker! Wise choice, adventurer!",
        // Dr. Jason Fung quotes
        '"Start with a handful of nuts or a small salad to break your fast." — Dr. Jason Fung',
        '"Short fasts need no special breaking. Keep it simple." — Dr. Jason Fung',
        '"Your body was designed for this feast after famine." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"When you refeed, signals go to bone marrow to create new stem cells!" — Dr. Pradip Jamnadas',
        '"After fasting, your cells function at a much more efficient level." — Dr. Pradip Jamnadas',
        '"New mitochondria are ready. Much more efficient ATP production!" — Dr. Pradip Jamnadas'
    ],
    protein: [
        "Protein secured! +10 Muscle Restoration!",
        "Building blocks obtained! Your cells level up!",
        "Essential nutrients locked in! Gainz incoming!",
        // Dr. Jason Fung quotes
        '"Do you think Mother Nature designed us to burn protein over fat? No!" — Dr. Jason Fung',
        '"Protein is conserved during fasting. Fat is burned for fuel." — Dr. Jason Fung',
        '"Real foods, whether broccoli or beef, have no labels." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"Eat only natural foods in their natural state." — Dr. Pradip Jamnadas',
        '"If it\'s got a barcode on it, donate it." — Dr. Pradip Jamnadas',
        '"Stay away from anything your great-great-grandfather wouldn\'t eat." — Dr. Pradip Jamnadas'
    ],
    fiber: [
        "Fiber collected! +10 Digestive Flow!",
        "Your gut bacteria have formed an alliance!",
        "Systems operational! Smooth sailing ahead!",
        // Dr. Jason Fung quotes
        '"Eat whole, unprocessed foods. Avoid sugar. Avoid refined grains." — Dr. Jason Fung',
        '"Foods should be recognizable as something alive or from the ground." — Dr. Jason Fung',
        '"Boxes of Cheerios do not grow in the ground." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"Eat your vegetables, do not drink them." — Dr. Pradip Jamnadas',
        '"An anti-inflammatory food is one your body has known for millennia." — Dr. Pradip Jamnadas',
        '"Natural foods reduce inflammation. That\'s the goal." — Dr. Pradip Jamnadas'
    ],
    homecooked: [
        "Home cooked meal! +15 Quality Ingredients!",
        "Chef skill activated! You know what's in there!",
        "No mystery oils detected! Pure gains!",
        // Dr. Jason Fung quotes
        '"Eat real food. If it comes in a bag or box, avoid it." — Dr. Jason Fung',
        '"If it has a nutrition label, it should be avoided." — Dr. Jason Fung',
        '"The secret to healthy eating: eat real food." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"If it\'s got a barcode, donate it!" — Dr. Pradip Jamnadas',
        '"Eat only natural foods in their natural state." — Dr. Pradip Jamnadas',
        '"Your great-great-grandfather\'s diet is your guide." — Dr. Pradip Jamnadas'
    ],
    sloweating: [
        "Food successfully liquified! +20 Absorption Rate!",
        "Chewing mastery achieved! Your gut thanks you!",
        "Drink your food complete! Maximum nutrient extraction!",
        // Dr. Jason Fung quotes
        '"Different foods produce different levels of satiety. Some fill you, some don\'t." — Dr. Jason Fung',
        '"Food contains not just calories, but instructions for your body." — Dr. Jason Fung',
        '"All calories are not the same. All carbs are not the same." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"Every snack changes your hormonal physiology." — Dr. Pradip Jamnadas',
        '"Eat infrequently, only when you are hungry." — Dr. Pradip Jamnadas',
        '"Find pleasure in your life so you don\'t metabolize bad physiology." — Dr. Pradip Jamnadas'
    ],
    chocolate: [
        "95% Dark chocolate consumed! +10 Antioxidants!",
        "The healthy indulgence! 95% cocoa only!",
        "Brain boost AND mood boost activated!",
        // Dr. Jason Fung quotes
        '"There is a time to feast and a time to fast. This is the cycle of life." — Dr. Jason Fung',
        '"We cannot feast all the time. We cannot fast all the time." — Dr. Jason Fung',
        '"Balance feeding with fasting. That\'s the secret." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"Life is only expressed in this moment right now." — Dr. Pradip Jamnadas',
        '"Our body is made to fast and feast. Enjoy the feast!" — Dr. Pradip Jamnadas',
        '"Find pleasure in your life and activities." — Dr. Pradip Jamnadas'
    ],
    mealwalk: [
        "Post-meal walk complete! +25 Digestion Speed!",
        "Blood sugar stabilized! Excellent strategy!",
        "Ancient digestion technique mastered!",
        // Dr. Jason Fung quotes
        '"Eating more at breakfast and less at dinner reduces insulin effect." — Dr. Jason Fung',
        '"Diet is Batman, exercise is Robin. But movement still helps!" — Dr. Jason Fung',
        '"The natural tendency is to eat large amounts after fasting. Walk it off!" — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"Sleep at least seven hours. Walk after meals." — Dr. Pradip Jamnadas',
        '"Movement after eating stabilizes blood sugar." — Dr. Pradip Jamnadas',
        '"It\'s all about reducing inflammation. Walking helps." — Dr. Pradip Jamnadas'
    ],
    nosugar: [
        "No sugar consumed! +15 Insulin Sensitivity!",
        "Sugar-free meal achieved! Your pancreas thanks you!",
        "Avoided the sweet poison! Excellent discipline!",
        "Zero sugar = Zero inflammation spike! Well done!",
        "Sugar addiction defeated! You're in control!",
        // Dr. Jason Fung quotes
        '"Sugar and highly refined carbohydrates are the main culprits." — Dr. Jason Fung',
        '"Insulin is a fat-storage hormone. Sugar spikes insulin." — Dr. Jason Fung',
        '"Eat real food. Avoid sugar. Avoid refined grains. Simple." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"Sugar is the enemy. It spikes insulin and causes inflammation." — Dr. Pradip Jamnadas',
        '"If you\'re addicted to chocolate, use 100% dark chocolate." — Dr. Pradip Jamnadas',
        '"The fastest way to my surgical table is processed sugar." — Dr. Pradip Jamnadas'
    ],
    doctorwin: [
        'DOCTOR WIN! Discussed your nutrition with a healthcare professional!',
        'Medical consultation complete! Your eating plan is doctor-approved!',
        'Smart eater! Always consult professionals for dietary advice!',
        'Remember: This app is a FUN tracker, not medical advice!',
        'DISCLAIMER: Only licensed medical professionals can give nutritional medical advice!',
        'Your healthcare team supports your eating journey! Great job!',
        'Nutritional wisdom unlocked! Stay informed, eat healthy!',
        'Pro tip: Regular checkups + healthy eating = optimal wellness!'
    ],
    eatenout: [
        "Restaurant food... Hidden debuffs detected!",
        "Unknown ingredients consumed... -2 Heart Points!",
        "Ate out? The next meal is your redemption arc!",
        // Dr. Jason Fung quotes
        '"If it comes prepackaged in a bag or box, avoid it." — Dr. Jason Fung',
        '"Real foods have no labels. Restaurants add mystery ingredients." — Dr. Jason Fung',
        '"The mindset of failure: \'Now I can binge.\' Don\'t do it." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"Unknown ingredients increase inflammation." — Dr. Pradip Jamnadas',
        '"This is the fastest way to my surgical table." — Dr. Pradip Jamnadas',
        '"Restaurant food often contains alien ingredients your body doesn\'t recognize." — Dr. Pradip Jamnadas'
    ],
    toofast: [
        "Speed eating detected! -1 Digestion!",
        "Your gut couldn't keep up! Slow down next time!",
        "Food not liquified... absorption reduced!",
        // Dr. Jason Fung quotes
        '"The psychological need to eat after fasting is strong. Control it." — Dr. Jason Fung',
        '"If you create a mindset of deprivation, you\'ll binge. Change that." — Dr. Jason Fung',
        '"Eat real food. Give your body time. It\'s that simple." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"Eat infrequently, only when you are hungry." — Dr. Pradip Jamnadas',
        '"Any time you eat, you change your hormonal physiology." — Dr. Pradip Jamnadas',
        '"Learn to live in the moment. Slow down." — Dr. Pradip Jamnadas'
    ],
    junkfood: [
        "Junk food consumed... Your body takes the hit!",
        "Processed food detected! -2 Heart Points!",
        "We all slip. Rise again, warrior!",
        // Dr. Jason Fung quotes
        '"The healthy snack is one of the greatest weight-loss deceptions." — Dr. Jason Fung',
        '"If we were meant to graze, we would be cows." — Dr. Jason Fung',
        '"Insulin is a fat-storage hormone. Junk food spikes it." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"This is the fastest way to my surgical table." — Dr. Pradip Jamnadas',
        '"Bread is a survival food. Just empty calories." — Dr. Pradip Jamnadas',
        '"Processed food is alien to your body. It causes inflammation." — Dr. Pradip Jamnadas'
    ],
    bloated: [
        "Feeling bloated? Your gut is telling you something!",
        "Bloating detected! Consider your food choices.",
        "The bloat is real... time to review what you ate.",
        "Gut distress logged! Maybe too much, too fast?",
        // Tips
        "Bloating often means too much food, too fast.",
        "Try smaller portions and chew more next time.",
        "Bloating could indicate food sensitivities.",
        '"Your gut is your second brain. Listen to it." — Dr. Pradip Jamnadas',
        '"Bloating is inflammation. Your body is fighting something." — Dr. Pradip Jamnadas'
    ]
};

// Good eating powerups give points, bad ones subtract
const eatingPowerupValues = {
    broth: 2,
    protein: 2,
    fiber: 2,
    homecooked: 2,
    sloweating: 1,
    chocolate: 1,
    mealwalk: 2,
    nosugar: 2,
    doctorwin: 3,  // Bonus for consulting a doctor!
    eatenout: -2,
    toofast: -1,
    junkfood: -2
};

function addEatingPowerup(type) {
    // Don't allow eating powerups while fasting or sleeping
    if (state.currentFast?.isActive || state.currentSleep?.isActive) {
        return;
    }

    // Ensure eating powerups array exists
    if (!state.eatingPowerups) {
        state.eatingPowerups = [];
    }

    // Add the eating powerup with timestamp
    state.eatingPowerups.push({
        type: type,
        time: Date.now()
    });

    saveState();
    updateEatingPowerupDisplay();
    updateMealQuality();
    updateConstitution();

    // Only add XP for good eating habits (not bad ones)
    if (eatingPowerupValues[type] > 0) {
        const xpGained = addSkillXP(type, 10);
        showPowerupToast(eatingPowerupEmojis[type], type, xpGained);
        // Show achievement toast for good choices
        const messages = eatingPowerupMessages[type];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        setTimeout(() => {
            showAchievementToast(eatingPowerupEmojis[type], `+10 ${type.charAt(0).toUpperCase() + type.slice(1)} XP!`, randomMessage, 'success');
        }, 200);
    } else {
        // Show the message for bad choices - warning toast
        const messages = eatingPowerupMessages[type];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        showAchievementToast(eatingPowerupEmojis[type], 'Debuff Applied!', randomMessage, 'danger');
    }
}

async function resetEatingPowerups() {
    if (!state.eatingPowerups || state.eatingPowerups.length === 0) {
        return;
    }

    const confirmed = await showConfirmModal('Reset all eating powerups?', 'Reset Powerups');
    if (confirmed) {
        state.eatingPowerups = [];
        saveState();
        updateEatingPowerupDisplay();
        updateMealQuality();
        updateConstitution();
    }
}

// ==========================================
// SLEEP POWERUPS - Pre-sleep routine tracking
// ==========================================

const sleepPowerupEmojis = {
    darkness: '<span class="px-icon px-moon"></span>',
    reading: '<span class="px-icon px-book"></span>',
    cuddling: '<span class="px-icon px-heart"></span>',
    doctorwin: '<span class="px-icon px-doctorwin"></span>',
    screen: '<span class="px-icon px-screen"></span>',
    smoking: '<span class="px-icon px-smoke"></span>'
};

const sleepPowerupMessages = {
    darkness: [
        '"The best bridge between despair and hope is a good night\'s sleep." — Dr. Matthew Walker',
        '"Sleep is Mother Nature\'s best effort yet at contra-death." — Dr. Matthew Walker',
        '"Darkness signals melatonin release. You\'re priming your brain perfectly!" — Dr. Matthew Walker',
        '"Light is the most powerful zeitgeber. Darkness tells your brain: sleep time!" — Dr. Matthew Walker',
        '"An hour of darkness before bed can improve sleep quality by 50%." — Dr. Matthew Walker',
        '"Your circadian rhythm thanks you. Melatonin is flowing!" — Dr. Matthew Walker',
        '"Dim light in the evening is one of the most powerful sleep aids." — Dr. Matthew Walker',
        '"Sleep is not an optional lifestyle luxury. It is your life support system." — Dr. Matthew Walker'
    ],
    reading: [
        '"Reading before bed reduces stress by 68%. Better than music or tea!" — Dr. Matthew Walker',
        '"A book before bed is the perfect wind-down ritual for your brain." — Dr. Matthew Walker',
        '"Practice does not make perfect. It is practice, followed by sleep, that leads to perfection." — Dr. Matthew Walker',
        '"Reading engages the mind gently, preparing it for the dream state." — Dr. Matthew Walker',
        '"Your brain is transitioning from active to receptive mode. Perfect!" — Dr. Matthew Walker',
        '"We have stigmatized sleep with the label of laziness. Reading honors it." — Dr. Matthew Walker',
        '"A physical book (not a screen!) is the ideal pre-sleep companion." — Dr. Matthew Walker',
        '"When sleep is abundant, minds flourish. Reading sets the stage." — Dr. Matthew Walker'
    ],
    cuddling: [
        '"Human touch releases oxytocin, the bonding hormone that promotes deep sleep." — Dr. Matthew Walker',
        '"Social connection before sleep reduces cortisol and anxiety." — Dr. Matthew Walker',
        '"Oxytocin from cuddling is nature\'s sleep medicine." — Dr. Matthew Walker',
        '"Physical closeness signals safety to your brain. Sleep comes easier." — Dr. Matthew Walker',
        '"The warmth of human connection primes the body for restorative sleep." — Dr. Matthew Walker',
        '"REM sleep heals emotional wounds. Cuddling starts that healing early." — Dr. Matthew Walker',
        '"Connection before sleep strengthens both relationships and rest." — Dr. Matthew Walker',
        '"Your nervous system is calming. Parasympathetic mode: activated!" — Dr. Matthew Walker'
    ],
    doctorwin: [
        'DOCTOR WIN! Discussed your sleep health with a professional!',
        'Sleep consultation complete! Your rest is doctor-approved!',
        'Smart sleeper! Always consult professionals for sleep issues!',
        'Remember: This app is a FUN tracker, not medical advice!',
        'DISCLAIMER: Only licensed medical professionals can diagnose sleep disorders!',
        'Your healthcare team supports your sleep journey! Great job!',
        'Sleep wisdom unlocked! Stay informed, sleep better!',
        'Pro tip: If you have persistent sleep issues, see a sleep specialist!'
    ],
    screen: [
        '"Blue light from screens delays melatonin release by up to 3 hours." — Dr. Matthew Walker',
        '"Screen time before bed is like drinking 2 espressos for your brain." — Dr. Matthew Walker',
        '"The shorter your sleep, the shorter your life." — Dr. Matthew Walker',
        '"After 16 hours awake, the brain begins to fail. Screens make it worse." — Dr. Matthew Walker',
        '"LED screens punch a hole through your melatonin production." — Dr. Matthew Walker',
        '"Your brain thinks it\'s still daytime. Melatonin: blocked." — Dr. Matthew Walker',
        '"Screen light is the enemy of deep, restorative sleep." — Dr. Matthew Walker',
        '"Inadequate sleep for one week classifies you as pre-diabetic." — Dr. Matthew Walker'
    ],
    smoking: [
        '"Nicotine is a stimulant that fragments sleep architecture." — Dr. Matthew Walker',
        '"Smokers spend more time in light sleep, missing restorative deep sleep." — Dr. Matthew Walker',
        '"The shorter your sleep, the shorter your life." — Dr. Matthew Walker',
        '"Nicotine withdrawal during sleep causes micro-awakenings all night." — Dr. Matthew Walker',
        '"Smoking before bed steals your deep sleep and REM cycles." — Dr. Matthew Walker',
        '"Sleep deprivation causes a 40% deficit in making new memories." — Dr. Matthew Walker',
        '"Your body will spend the night processing toxins instead of healing." — Dr. Matthew Walker',
        '"Routinely sleeping less than 6 hours demolishes your immune system." — Dr. Matthew Walker'
    ]
};

// XP values: positive for good habits, negative for bad
const sleepPowerupValues = {
    darkness: 25,   // Biggest XP - most important
    reading: 15,    // Medium XP
    cuddling: 20,   // Great XP
    doctorwin: 30,  // Biggest XP - promotes medical consultation!
    screen: -15,    // Negative XP
    smoking: -20    // Negative XP
};

function addSleepPowerup(type) {
    // Ensure sleep powerups array exists
    if (!state.sleepPowerups) {
        state.sleepPowerups = [];
    }

    // Add the sleep powerup with timestamp
    state.sleepPowerups.push({
        type: type,
        time: Date.now()
    });

    saveState();
    updateSleepPowerupDisplay();
    updateConstitution();

    // Show toast with Matthew Walker quote
    const messages = sleepPowerupMessages[type];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    if (sleepPowerupValues[type] > 0) {
        // Good habit - add XP
        const xpGained = addSkillXP('sleep', sleepPowerupValues[type]);
        showPowerupToast(sleepPowerupEmojis[type], type, xpGained);
        setTimeout(() => {
            showAchievementToast(sleepPowerupEmojis[type], `+${sleepPowerupValues[type]} Sleep XP!`, randomMessage, 'success');
        }, 200);
    } else {
        // Bad habit - show warning
        showAchievementToast(sleepPowerupEmojis[type], 'Sleep Debuff!', randomMessage, 'danger');
    }
}

async function resetSleepPowerups() {
    if (!state.sleepPowerups || state.sleepPowerups.length === 0) {
        return;
    }

    const confirmed = await showConfirmModal('Reset all sleep powerups?', 'Reset Powerups');
    if (confirmed) {
        state.sleepPowerups = [];
        saveState();
        updateSleepPowerupDisplay();
        updateConstitution();
    }
}

function updateSleepPowerupDisplay() {
    const stackEl = document.getElementById('sleep-powerup-stack');
    const statsEl = document.getElementById('sleep-powerup-stats');

    if (!stackEl) return;

    const powerups = state.sleepPowerups || [];

    if (powerups.length === 0) {
        if (statsEl) statsEl.classList.add('hidden');
        stackEl.innerHTML = '<span id="sleep-powerup-empty" class="text-xs italic" style="color: var(--dark-text-muted);">Your sleep powerups will appear here...</span>';
        return;
    }

    // Show stats
    if (statsEl) statsEl.classList.remove('hidden');

    // Count each type
    const counts = { darkness: 0, reading: 0, cuddling: 0, doctorwin: 0, screen: 0, smoking: 0 };
    powerups.forEach(p => {
        if (counts[p.type] !== undefined) {
            counts[p.type]++;
        }
    });

    // Update count displays
    Object.keys(counts).forEach(type => {
        const countEl = document.getElementById(`${type === 'doctorwin' ? 'sleep-doctorwin' : type}-count`);
        if (countEl) countEl.textContent = counts[type];
    });

    // Build stack display
    let stackHTML = '';
    powerups.forEach((p, index) => {
        const emoji = sleepPowerupEmojis[p.type];
        const isBad = sleepPowerupValues[p.type] < 0;
        const opacity = 0.5 + (index / powerups.length) * 0.5;
        stackHTML += `<span class="inline-block transition-transform hover:scale-110" style="opacity: ${opacity}; ${isBad ? 'filter: grayscale(50%);' : ''}" title="${p.type}">${emoji}</span>`;
    });
    stackEl.innerHTML = stackHTML;
}

function updateEatingPowerupDisplay() {
    const stackEl = document.getElementById('eating-powerup-stack');
    const emptyEl = document.getElementById('eating-powerup-empty');
    const statsEl = document.getElementById('eating-powerup-stats');

    if (!stackEl) return;

    const powerups = state.eatingPowerups || [];

    if (powerups.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        if (statsEl) statsEl.classList.add('hidden');
        stackEl.innerHTML = '<span id="eating-powerup-empty" class="text-xs italic" style="color: var(--dark-text-muted);">Your eating powerups will appear here...</span>';
        return;
    }

    // Count each type
    const counts = { broth: 0, protein: 0, fiber: 0, homecooked: 0, sloweating: 0, chocolate: 0, mealwalk: 0, nosugar: 0, doctorwin: 0, eatenout: 0, toofast: 0, junkfood: 0 };
    powerups.forEach(p => {
        if (counts[p.type] !== undefined) {
            counts[p.type]++;
        }
    });

    // Update stats
    const brothCountEl = document.getElementById('broth-count');
    const proteinCountEl = document.getElementById('protein-count');
    const fiberCountEl = document.getElementById('fiber-count');
    const homecookedCountEl = document.getElementById('homecooked-count');
    const sloweatingCountEl = document.getElementById('sloweating-count');
    const chocolateCountEl = document.getElementById('chocolate-count');
    const mealwalkCountEl = document.getElementById('mealwalk-count');
    const nosugarCountEl = document.getElementById('nosugar-count');
    const eatingDoctorwinCountEl = document.getElementById('eating-doctorwin-count');

    if (brothCountEl) brothCountEl.textContent = counts.broth;
    if (proteinCountEl) proteinCountEl.textContent = counts.protein;
    if (fiberCountEl) fiberCountEl.textContent = counts.fiber;
    if (homecookedCountEl) homecookedCountEl.textContent = counts.homecooked;
    if (sloweatingCountEl) sloweatingCountEl.textContent = counts.sloweating;
    if (chocolateCountEl) chocolateCountEl.textContent = counts.chocolate;
    if (mealwalkCountEl) mealwalkCountEl.textContent = counts.mealwalk;
    if (nosugarCountEl) nosugarCountEl.textContent = counts.nosugar;
    if (eatingDoctorwinCountEl) eatingDoctorwinCountEl.textContent = counts.doctorwin;
    if (statsEl) statsEl.classList.remove('hidden');

    // Build the stack display
    let stackHTML = '';
    powerups.forEach((p) => {
        const emoji = eatingPowerupEmojis[p.type];
        const time = new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Color based on type - red for bad choices, other colors for good
        let bgColor = '';
        const isBad = eatingPowerupValues[p.type] < 0;
        if (isBad) {
            bgColor = 'rgba(239, 68, 68, 0.3)';
        } else if (p.type === 'broth') bgColor = 'rgba(180, 83, 9, 0.3)';
        else if (p.type === 'protein') bgColor = 'rgba(220, 38, 38, 0.3)';
        else if (p.type === 'fiber') bgColor = 'rgba(34, 197, 94, 0.3)';
        else if (p.type === 'homecooked') bgColor = 'rgba(234, 88, 12, 0.3)';
        else if (p.type === 'sloweating') bgColor = 'rgba(59, 130, 246, 0.3)';
        else if (p.type === 'chocolate') bgColor = 'rgba(92, 51, 23, 0.3)';
        else if (p.type === 'mealwalk') bgColor = 'rgba(34, 197, 94, 0.3)';
        else if (p.type === 'doctorwin') bgColor = 'rgba(251, 191, 36, 0.3)';

        stackHTML += `<span class="inline-flex items-center px-2 py-1 rounded text-sm cursor-default transition-transform hover:scale-110" style="background: ${bgColor};" title="${p.type} at ${time}">${emoji}</span>`;
    });

    stackEl.innerHTML = stackHTML;
}

function updateMealQuality() {
    const valueEl = document.getElementById('meal-quality-value');
    const fillEl = document.getElementById('meal-quality-fill');
    const messageEl = document.getElementById('meal-quality-message');

    if (!valueEl) return;

    const powerups = state.eatingPowerups || [];

    // Count each type (only count first occurrence for good items, but all bad items)
    const goodTypeCounts = {};
    const badTypeCounts = {};

    // Essential nutrients for a good meal (must have variety)
    const essentials = ['broth', 'protein', 'fiber', 'homecooked'];
    const bonuses = ['sloweating', 'mealwalk'];
    const treats = ['chocolate']; // Limited benefit
    const negatives = ['eatenout', 'toofast', 'junkfood'];

    powerups.forEach(p => {
        if (negatives.includes(p.type)) {
            badTypeCounts[p.type] = (badTypeCounts[p.type] || 0) + 1;
        } else {
            goodTypeCounts[p.type] = (goodTypeCounts[p.type] || 0) + 1;
        }
    });

    let score = 0;

    // Essentials: 2 points each (max once per type) = max 8 points
    essentials.forEach(type => {
        if (goodTypeCounts[type]) score += 2;
    });

    // Bonuses: 1 point each (max once per type) = max 2 points
    bonuses.forEach(type => {
        if (goodTypeCounts[type]) score += 1;
    });

    // Treats: Only 0.5 points (chocolate is tasty but not essential)
    treats.forEach(type => {
        if (goodTypeCounts[type]) score += 0.5;
    });

    // Negatives: Full penalty for each occurrence
    negatives.forEach(type => {
        const count = badTypeCounts[type] || 0;
        score += eatingPowerupValues[type] * count;
    });

    // Cap score between 0 and 10
    score = Math.max(0, Math.min(10, Math.round(score)));

    valueEl.textContent = score;
    if (fillEl) fillEl.style.width = `${score * 10}%`;

    // Fun messages based on score and variety
    const essentialCount = essentials.filter(t => goodTypeCounts[t]).length;
    const hasNegatives = negatives.some(t => badTypeCounts[t]);

    let message = '';
    if (powerups.length === 0) {
        message = "Log your eating powerups to see your meal quality!";
    } else if (hasNegatives && score <= 3) {
        message = "Debuffs are hurting you! Avoid junk & eating out.";
    } else if (essentialCount === 0) {
        message = "Add protein, fiber, or broth for a real meal!";
    } else if (essentialCount === 1) {
        message = "Good start! Add more variety - protein, fiber, broth.";
    } else if (essentialCount === 2) {
        message = "Not bad! A complete meal needs more variety.";
    } else if (essentialCount === 3) {
        message = "Great balance! Almost a perfect meal!";
    } else if (essentialCount === 4 && score >= 8) {
        message = "PERFECT MEAL! Protein, fiber, broth & home cooked!";
    } else {
        message = "Good meal quality! Keep it varied!";
    }

    if (messageEl) messageEl.textContent = message;

    return score;
}

function updatePowerupDisplay() {
    const stackEl = document.getElementById('powerup-stack');
    const emptyEl = document.getElementById('powerup-empty');
    const statsEl = document.getElementById('powerup-stats');
    const waterCountEl = document.getElementById('water-count');
    const coffeeCountEl = document.getElementById('coffee-count');
    const teaCountEl = document.getElementById('tea-count');
    const exerciseCountEl = document.getElementById('exercise-count');
    const hangingCountEl = document.getElementById('hanging-count');
    const gripCountEl = document.getElementById('grip-count');
    const walkCountEl = document.getElementById('walk-count');
    const exerciseGuideEl = document.getElementById('exercise-guide');

    if (!stackEl) return;

    const powerups = state.currentFast.powerups || [];

    if (powerups.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        if (statsEl) statsEl.classList.add('hidden');
        if (exerciseGuideEl) exerciseGuideEl.classList.add('hidden');
        stackEl.innerHTML = '<span id="powerup-empty" class="text-xs italic" style="color: var(--dark-text-muted);">Your powerups will appear here...</span>';
        return;
    }

    // Count each type
    const counts = { water: 0, hotwater: 0, coffee: 0, tea: 0, exercise: 0, hanging: 0, grip: 0, walk: 0, doctorwin: 0 };
    powerups.forEach(p => {
        if (counts[p.type] !== undefined) {
            counts[p.type]++;
        }
    });

    // Update stats
    if (waterCountEl) waterCountEl.textContent = counts.water;
    const hotwaterCountEl = document.getElementById('hotwater-count');
    if (hotwaterCountEl) hotwaterCountEl.textContent = counts.hotwater;
    if (coffeeCountEl) coffeeCountEl.textContent = counts.coffee;
    if (teaCountEl) teaCountEl.textContent = counts.tea;
    if (exerciseCountEl) exerciseCountEl.textContent = counts.exercise;
    if (hangingCountEl) hangingCountEl.textContent = counts.hanging;
    if (gripCountEl) gripCountEl.textContent = counts.grip;
    if (walkCountEl) walkCountEl.textContent = counts.walk;
    const doctorwinCountEl = document.getElementById('doctorwin-count');
    if (doctorwinCountEl) doctorwinCountEl.textContent = counts.doctorwin;
    if (statsEl) statsEl.classList.remove('hidden');

    // Show exercise guide if any exercise was done (and user hasn't disabled it)
    if (exerciseGuideEl) {
        if (counts.exercise > 0 && state.settings?.showExerciseGuide !== false) {
            exerciseGuideEl.classList.remove('hidden');
        } else {
            exerciseGuideEl.classList.add('hidden');
        }
    }

    // Build the stack display - show each powerup as a small icon
    let stackHTML = '';

    // Group consecutive powerups for cleaner display
    powerups.forEach((p, index) => {
        const emoji = powerupEmojis[p.type];
        const time = new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Color based on type
        let bgColor = '';
        if (p.type === 'water') bgColor = 'rgba(14, 165, 233, 0.3)';
        else if (p.type === 'hotwater') bgColor = 'rgba(239, 68, 68, 0.3)';
        else if (p.type === 'coffee') bgColor = 'rgba(217, 119, 6, 0.3)';
        else if (p.type === 'tea') bgColor = 'rgba(16, 185, 129, 0.3)';
        else if (p.type === 'exercise') bgColor = 'rgba(239, 68, 68, 0.3)';
        else if (p.type === 'hanging') bgColor = 'rgba(139, 92, 246, 0.3)';
        else if (p.type === 'grip') bgColor = 'rgba(251, 146, 60, 0.3)';
        else if (p.type === 'walk') bgColor = 'rgba(34, 197, 94, 0.3)';
        else if (p.type === 'doctorwin') bgColor = 'rgba(251, 191, 36, 0.3)';

        // Add extra info for exercise
        let title = `${p.type} at ${time}`;
        if (p.type === 'exercise' && p.fastingHours) {
            title += ` (${formatDuration(p.fastingHours)} fasted)`;
        }

        stackHTML += `<span class="inline-flex items-center px-2 py-1 rounded text-sm cursor-default transition-transform hover:scale-110" style="background: ${bgColor};" title="${title}">${emoji}</span>`;
    });

    stackEl.innerHTML = stackHTML;
}

// Clear powerups when starting a new fast
function clearPowerupsForNewFast() {
    state.currentFast.powerups = [];
    saveState();
    updatePowerupDisplay();
}

// ==========================================
// RUNESCAPE-STYLE SKILLS SYSTEM
// ==========================================

// XP required for each level (classic RPG-style curve)
// Level 1 = 0 XP, Level 99 = 13,034,431 XP (classic RS formula)
function xpForLevel(level) {
    if (level <= 1) return 0;
    let xp = 0;
    for (let i = 1; i < level; i++) {
        xp += Math.floor(i + 300 * Math.pow(2, i / 7));
    }
    return Math.floor(xp / 4);
}

// Get level from XP
function levelFromXP(xp) {
    for (let level = 99; level >= 1; level--) {
        if (xp >= xpForLevel(level)) {
            return level;
        }
    }
    return 1;
}

// Get XP progress percentage to next level
function xpProgressPercent(xp) {
    const currentLevel = levelFromXP(xp);
    if (currentLevel >= 99) return 100;

    const currentLevelXP = xpForLevel(currentLevel);
    const nextLevelXP = xpForLevel(currentLevel + 1);
    const xpInLevel = xp - currentLevelXP;
    const xpNeeded = nextLevelXP - currentLevelXP;

    return Math.min(100, (xpInLevel / xpNeeded) * 100);
}

// Add XP to a skill
function addSkillXP(skillType, amount) {
    if (!state.skills) {
        state.skills = { water: 0, hotwater: 0, coffee: 0, tea: 0, exercise: 0, hanging: 0, grip: 0, walk: 0, doctorwin: 0, flatstomach: 0, broth: 0, protein: 0, fiber: 0, homecooked: 0, sloweating: 0, chocolate: 0, mealwalk: 0, sleep: 0 };
    }

    // Initialize skill if missing (for existing users)
    if (state.skills[skillType] === undefined) {
        state.skills[skillType] = 0;
    }

    // Validate skill type exists
    if (!state.skills.hasOwnProperty(skillType)) {
        console.warn('Invalid skill type:', skillType);
        return 0;
    }

    // Validate and sanitize amount
    const sanitizedAmount = sanitizeNumber(amount, 0, 10000, 0);
    if (sanitizedAmount <= 0) return 0;

    const oldLevel = levelFromXP(state.skills[skillType] || 0);
    state.skills[skillType] = (state.skills[skillType] || 0) + sanitizedAmount;
    const newLevel = levelFromXP(state.skills[skillType]);

    saveState();
    updateSkills();

    // Check for level up!
    if (newLevel > oldLevel) {
        showLevelUp(skillType, newLevel);
    }

    return sanitizedAmount;
}

// Show level up celebration (RuneScape style)
function showLevelUp(skillType, newLevel) {
    const skillNames = {
        water: 'Hydration',
        hotwater: 'Hot Water',
        coffee: 'Caffeine',
        tea: 'Zen',
        exercise: 'Strength',
        hanging: 'Agility',
        grip: 'Grip',
        walk: 'Endurance',
        doctorwin: 'Medical',
        flatstomach: 'Flat Stomach',
        broth: 'Broth',
        protein: 'Protein',
        fiber: 'Fiber',
        homecooked: 'Home Cook',
        sloweating: 'Chewing',
        chocolate: 'Chocolate',
        mealwalk: 'Digestion',
        sleep: 'Sleep'
    };

    const skillEmojis = {
        water: '<span class="px-icon px-icon-xl px-water"></span>',
        hotwater: '<span class="px-icon px-icon-xl px-hotwater"></span>',
        coffee: '<span class="px-icon px-icon-xl px-coffee"></span>',
        tea: '<span class="px-icon px-icon-xl px-tea"></span>',
        exercise: '<span class="px-icon px-icon-xl px-exercise"></span>',
        hanging: '<span class="px-icon px-icon-xl px-monkey"></span>',
        grip: '<span class="px-icon px-icon-xl px-grip"></span>',
        walk: '<span class="px-icon px-icon-xl px-walk"></span>',
        doctorwin: '<span class="px-icon px-icon-xl px-doctorwin"></span>',
        flatstomach: '<span class="px-icon px-icon-xl px-flatstomach"></span>',
        broth: '<span class="px-icon px-icon-xl px-potion"></span>',
        protein: '<span class="px-icon px-icon-xl px-meat"></span>',
        fiber: '<span class="px-icon px-icon-xl px-leaf"></span>',
        homecooked: '<span class="px-icon px-icon-xl px-house"></span>',
        sloweating: '<span class="px-icon px-icon-xl px-glass"></span>',
        chocolate: '<span class="px-icon px-icon-xl px-chocolate"></span>',
        mealwalk: '<span class="px-icon px-icon-xl px-walk"></span>',
        sleep: '<span class="px-icon px-icon-xl px-moon"></span>'
    };

    // Show the RuneScape-style level up modal
    const modal = document.getElementById('levelup-modal');
    const iconEl = document.getElementById('levelup-icon');
    const skillEl = document.getElementById('levelup-skill');
    const levelEl = document.getElementById('levelup-level');

    if (modal && iconEl && skillEl && levelEl) {
        iconEl.innerHTML = skillEmojis[skillType];
        skillEl.textContent = skillNames[skillType];
        levelEl.textContent = newLevel;

        modal.classList.remove('hidden');

        // Auto-close after 3 seconds
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 3000);

        // Click anywhere to close
        modal.onclick = () => modal.classList.add('hidden');
    }

    // Also show the XP drop notification
    let container = document.getElementById('xp-drop-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'xp-drop-container';
        container.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            z-index: 1000;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 4px;
        `;
        document.body.appendChild(container);
    }

    const drop = document.createElement('div');
    drop.style.cssText = `
        font-family: 'Courier New', monospace;
        font-weight: bold;
        font-size: 16px;
        color: #fbbf24;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.9), 0 0 12px rgba(251, 191, 36, 0.8);
        white-space: nowrap;
        opacity: 1;
        transform: translateY(0);
        display: flex;
        align-items: center;
        gap: 4px;
        animation: xpDropFall 3s ease-out forwards;
        padding: 4px 8px;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 4px;
        border: 1px solid #fbbf24;
    `;

    drop.innerHTML = `<span style="font-size: 18px;">${skillEmojis[skillType].replace('px-icon-xl', 'px-icon')}</span><span>LEVEL UP! ${skillNames[skillType]} ${newLevel}!</span>`;
    container.appendChild(drop);

    setTimeout(() => drop.remove(), 3000);
}

// Update all skills display in Stats page
function updateSkills() {
    if (!state.skills) {
        state.skills = { water: 0, coffee: 0, tea: 0, exercise: 0, hanging: 0, grip: 0, walk: 0, broth: 0, protein: 0, fiber: 0, homecooked: 0, sloweating: 0, chocolate: 0, mealwalk: 0, sleep: 0 };
    }

    // Fasting skills
    const fastingSkillTypes = ['water', 'coffee', 'tea', 'exercise', 'hanging', 'grip', 'walk'];
    let fastingTotalXP = 0;
    let fastingTotalLevels = 0;

    fastingSkillTypes.forEach(skill => {
        const xp = state.skills[skill] || 0;
        const level = levelFromXP(xp);
        const progress = xpProgressPercent(xp);

        fastingTotalXP += xp;
        fastingTotalLevels += level;

        // Update level display
        const levelEl = document.getElementById(`skill-${skill}-level`);
        if (levelEl) levelEl.textContent = level;

        // Update XP display
        const xpEl = document.getElementById(`skill-${skill}-xp`);
        if (xpEl) xpEl.textContent = xp.toLocaleString();

        // Update progress bar
        const barEl = document.getElementById(`skill-${skill}-bar`);
        if (barEl) barEl.style.width = `${progress}%`;
    });

    // Update fasting total level
    const totalLevelEl = document.getElementById('skill-total-level');
    if (totalLevelEl) totalLevelEl.textContent = fastingTotalLevels;

    // Update fasting total XP
    const totalXPEl = document.getElementById('skill-total-xp');
    if (totalXPEl) totalXPEl.textContent = fastingTotalXP.toLocaleString();

    // Update fasting total bar (percentage of max possible: 693 levels)
    const totalBarEl = document.getElementById('skill-total-bar');
    if (totalBarEl) {
        const totalPercent = (fastingTotalLevels / 693) * 100;
        totalBarEl.style.width = `${totalPercent}%`;
    }

    // Eating skills
    const eatingSkillTypes = ['broth', 'protein', 'fiber', 'homecooked', 'sloweating', 'chocolate', 'mealwalk'];
    let eatingTotalXP = 0;
    let eatingTotalLevels = 0;

    eatingSkillTypes.forEach(skill => {
        const xp = state.skills[skill] || 0;
        const level = levelFromXP(xp);
        const progress = xpProgressPercent(xp);

        eatingTotalXP += xp;
        eatingTotalLevels += level;

        // Update level display
        const levelEl = document.getElementById(`skill-${skill}-level`);
        if (levelEl) levelEl.textContent = level;

        // Update XP display
        const xpEl = document.getElementById(`skill-${skill}-xp`);
        if (xpEl) xpEl.textContent = xp.toLocaleString();

        // Update progress bar
        const barEl = document.getElementById(`skill-${skill}-bar`);
        if (barEl) barEl.style.width = `${progress}%`;
    });

    // Update eating total level
    const eatingTotalLevelEl = document.getElementById('skill-eating-total-level');
    if (eatingTotalLevelEl) eatingTotalLevelEl.textContent = eatingTotalLevels;

    // Update eating total XP
    const eatingTotalXPEl = document.getElementById('skill-eating-total-xp');
    if (eatingTotalXPEl) eatingTotalXPEl.textContent = eatingTotalXP.toLocaleString();

    // Update eating total bar (percentage of max possible: 693 levels)
    const eatingTotalBarEl = document.getElementById('skill-eating-total-bar');
    if (eatingTotalBarEl) {
        const totalPercent = (eatingTotalLevels / 693) * 100;
        eatingTotalBarEl.style.width = `${totalPercent}%`;
    }
}

// Data Export/Import for syncing between devices
function exportData() {
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `fasting-tracker-${timestamp}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showAchievementToast(
        '<span class="px-icon px-check"></span>',
        'Data Exported!',
        'Transfer this file to your other device and import it there.',
        'success'
    );
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const shouldMerge = event.target.dataset.merge === 'true';
    event.target.dataset.merge = 'false'; // Reset

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const rawData = JSON.parse(e.target.result);

            // Validate the basic data structure first
            if (!rawData.currentFast || !Array.isArray(rawData.fastingHistory)) {
                throw new Error('Invalid data format');
            }

            // SECURITY: Sanitize all imported data to prevent malicious content
            const importedData = sanitizeImportedData(rawData);

            // Ensure sleep data exists (backward compatibility)
            if (!importedData.currentSleep) {
                importedData.currentSleep = { startTime: null, goalHours: 8, isActive: false };
            }
            if (!importedData.sleepHistory) {
                importedData.sleepHistory = [];
            }
            // Ensure skills data exists (backward compatibility)
            if (!importedData.skills) {
                importedData.skills = { water: 0, coffee: 0, tea: 0, exercise: 0, hanging: 0, grip: 0, walk: 0, broth: 0, protein: 0, fiber: 0, homecooked: 0, sloweating: 0, chocolate: 0, mealwalk: 0, sleep: 0 };
            }

            if (shouldMerge) {
                mergeData(importedData);
            } else {
                replaceData(importedData);
            }

            saveState();
            updateUI();
            updateSleepUI();
            renderHistory();
            renderSleepHistory();
            renderStats();
            renderSleepStats();
            updateSkills();

            const action = shouldMerge ? 'merged' : 'imported';
            showAchievementToast(
                '<span class="px-icon px-check"></span>',
                `Data ${action.charAt(0).toUpperCase() + action.slice(1)}!`,
                shouldMerge ? 'Your existing data has been combined with the imported data.' : 'Your data has been replaced.',
                'success'
            );
        } catch (error) {
            showAchievementToast(
                '<span class="px-icon px-danger"></span>',
                'Import Failed',
                'Invalid file format. Please select a valid tracker export file.',
                'danger'
            );
            console.error('Import error:', error);
        }
    };

    reader.onerror = function(error) {
        showAchievementToast(
            '<span class="px-icon px-danger"></span>',
            'Read Error',
            'Error reading file. Please try again.',
            'danger'
        );
        console.error('FileReader error:', error);
    };

    reader.readAsText(file);
    event.target.value = ''; // Reset file input
}

function replaceData(importedData) {
    state = importedData;
    window.state = state; // Update global reference for cross-module access

    // Ensure sleep data exists (backward compatibility)
    if (!state.currentSleep) {
        state.currentSleep = { startTime: null, goalHours: 8, isActive: false };
    }
    if (!state.sleepHistory) {
        state.sleepHistory = [];
    }
    // Ensure skills data exists (backward compatibility)
    if (!state.skills) {
        state.skills = { water: 0, coffee: 0, tea: 0, exercise: 0, hanging: 0, grip: 0, walk: 0, broth: 0, protein: 0, fiber: 0, homecooked: 0, sloweating: 0, chocolate: 0, mealwalk: 0, sleep: 0 };
    }

    // Stop any active fasting timer if we're replacing with non-active data
    if (!state.currentFast.isActive && timerInterval) {
        stopTimer();
        resetTimerUI();
    } else if (state.currentFast.isActive) {
        startTimer();
    }

    // Stop any active sleep timer if we're replacing with non-active data
    if (!state.currentSleep.isActive && sleepTimerInterval) {
        stopSleepTimer();
        resetSleepTimerUI();
    } else if (state.currentSleep.isActive) {
        startSleepTimer();
    }
}

async function mergeData(importedData) {
    // Merge fasting history, avoiding duplicates by ID
    const existingFastIds = new Set(state.fastingHistory.map(f => f.id));
    const newFasts = importedData.fastingHistory.filter(f => !existingFastIds.has(f.id));

    state.fastingHistory = [...state.fastingHistory, ...newFasts];
    state.fastingHistory.sort((a, b) => b.endTime - a.endTime);

    // Merge sleep history, avoiding duplicates by ID
    if (!state.sleepHistory) state.sleepHistory = [];
    if (importedData.sleepHistory) {
        const existingSleepIds = new Set(state.sleepHistory.map(s => s.id));
        const newSleeps = importedData.sleepHistory.filter(s => !existingSleepIds.has(s.id));

        state.sleepHistory = [...state.sleepHistory, ...newSleeps];
        state.sleepHistory.sort((a, b) => b.endTime - a.endTime);
    }

    // Don't merge active fast - keep the current one if active
    if (!state.currentFast.isActive && importedData.currentFast.isActive) {
        const confirmed = await showConfirmModal('The imported data has an active fast. Do you want to replace your current timer with it?', 'Import Active Fast');
        if (confirmed) {
            state.currentFast = importedData.currentFast;
            startTimer();
        }
    }

    // Don't merge active sleep - keep the current one if active
    if (!state.currentSleep) state.currentSleep = { startTime: null, goalHours: 8, isActive: false };
    if (!state.currentSleep.isActive && importedData.currentSleep && importedData.currentSleep.isActive) {
        const confirmed = await showConfirmModal('The imported data has an active sleep session. Do you want to replace your current sleep timer with it?', 'Import Active Sleep');
        if (confirmed) {
            state.currentSleep = importedData.currentSleep;
            startSleepTimer();
        }
    }

    // Merge skills XP - take the higher value for each skill
    if (!state.skills) state.skills = { water: 0, coffee: 0, tea: 0, exercise: 0, hanging: 0, grip: 0, walk: 0, broth: 0, protein: 0, fiber: 0, homecooked: 0, sloweating: 0, chocolate: 0, mealwalk: 0, sleep: 0 };
    if (importedData.skills) {
        Object.keys(importedData.skills).forEach(skill => {
            state.skills[skill] = Math.max(state.skills[skill] || 0, importedData.skills[skill] || 0);
        });
    }
}

// Firebase Sync Integration
async function initializeFirebaseSync() {
    if (!window.firebaseSync) {
        console.warn('Firebase sync module not loaded');
        // No cloud sync, allow local saves immediately
        initialSyncComplete = true;
        return;
    }

    const initialized = await firebaseSync.initialize();

    if (initialized) {
        // Set up sync listener to handle remote updates and auth changes
        firebaseSync.addSyncListener((event, data) => {
            if (event === 'remote-update') {
                handleRemoteDataUpdate(data.remoteState, data.remoteTimestamp);
            } else if (event === 'auth-change') {
                // When user signs in, reset flag to wait for cloud data
                if (data.user) {
                    initialSyncComplete = false;
                    // Check for username and show Set Username button if needed
                    checkUsernameAfterSignIn();
                } else {
                    // User signed out - allow local saves
                    initialSyncComplete = true;
                    // Clear username display
                    currentUsername = null;
                    updateUsernameDisplay(null);
                }
            }
        });

        // If user is not signed in, allow local saves immediately
        if (!firebaseSync.isAuthenticated()) {
            initialSyncComplete = true;
        }
        // If user IS signed in, initialSyncComplete will be set to true
        // after remote data is received in handleRemoteDataUpdate()
    } else {
        // Firebase not configured, allow local saves
        initialSyncComplete = true;
    }
}

function handleRemoteDataUpdate(remoteState, remoteTimestamp) {
    // Mark that we've received cloud data - now local saves can sync to cloud
    const wasInitialSync = !initialSyncComplete;
    initialSyncComplete = true;

    // Merge remote data with local data intelligently
    const localTimestampRaw = localStorage.getItem('last-local-update');
    const localTimestamp = localTimestampRaw ? parseInt(localTimestampRaw, 10) : 0;
    const remoteTs = remoteTimestamp || 0;

    // ALWAYS merge on initial sync (fresh device), OR if remote is newer
    if (wasInitialSync || remoteTs > localTimestamp) {
        // Set flag to prevent sync loops during merge
        isMergingRemoteData = true;

        // Merge settings - REMOTE settings are the source of truth when signed in
        // This ensures settings sync properly across all devices
        if (remoteState.settings) {
            // COMPLETELY REPLACE local settings with remote settings
            // This ensures all toggles match exactly what's in the cloud
            state.settings = {
                showFastingGoals: remoteState.settings.showFastingGoals !== undefined ? remoteState.settings.showFastingGoals : true,
                showSleepGoals: remoteState.settings.showSleepGoals !== undefined ? remoteState.settings.showSleepGoals : true,
                showFastingFuture: remoteState.settings.showFastingFuture !== undefined ? remoteState.settings.showFastingFuture : true,
                showBreakingFastGuide: remoteState.settings.showBreakingFastGuide !== undefined ? remoteState.settings.showBreakingFastGuide : true,
                showExerciseGuide: remoteState.settings.showExerciseGuide !== undefined ? remoteState.settings.showExerciseGuide : true,
                showEatingGuide: remoteState.settings.showEatingGuide !== undefined ? remoteState.settings.showEatingGuide : true,
                showSleepGuide: remoteState.settings.showSleepGuide !== undefined ? remoteState.settings.showSleepGuide : true,
                showMealSleepQuality: remoteState.settings.showMealSleepQuality !== undefined ? remoteState.settings.showMealSleepQuality : true,
                showHungerTracker: remoteState.settings.showHungerTracker !== undefined ? remoteState.settings.showHungerTracker : true,
                showTrends: remoteState.settings.showTrends !== undefined ? remoteState.settings.showTrends : true
            };
        }

        // Sync hasSeenTutorial - if user already saw tutorial on another device, don't show again
        if (remoteState.hasSeenTutorial !== undefined) {
            state.hasSeenTutorial = remoteState.hasSeenTutorial;
        }

        // Sync currentTab preference
        if (remoteState.currentTab !== undefined) {
            state.currentTab = remoteState.currentTab;
        }

        // Merge fasting history, avoiding duplicates
        if (remoteState.fastingHistory && remoteState.fastingHistory.length > 0) {
            if (!state.fastingHistory) state.fastingHistory = [];
            const existingFastIds = new Set(state.fastingHistory.map(f => f.id));
            const newFasts = remoteState.fastingHistory.filter(f => !existingFastIds.has(f.id));
            state.fastingHistory = [...state.fastingHistory, ...newFasts];
            state.fastingHistory.sort((a, b) => b.endTime - a.endTime);
        }

        // Merge sleep history, avoiding duplicates
        if (remoteState.sleepHistory && remoteState.sleepHistory.length > 0) {
            if (!state.sleepHistory) state.sleepHistory = [];
            const existingSleepIds = new Set(state.sleepHistory.map(s => s.id));
            const newSleeps = remoteState.sleepHistory.filter(s => !existingSleepIds.has(s.id));
            state.sleepHistory = [...state.sleepHistory, ...newSleeps];
            state.sleepHistory.sort((a, b) => b.endTime - a.endTime);
        }

        // Also merge skills/XP data
        if (remoteState.skills) {
            if (!state.skills) state.skills = {};
            for (const [skill, xp] of Object.entries(remoteState.skills)) {
                // Keep the higher XP value
                state.skills[skill] = Math.max(state.skills[skill] || 0, xp || 0);
            }
        }

        // Handle active fast - ALWAYS trust remote if local has no active fast
        // If both have active fasts, keep the one that started MOST RECENTLY (higher startTime = more recent)
        if (remoteState.currentFast && remoteState.currentFast.isActive) {
            if (!state.currentFast || !state.currentFast.isActive) {
                // Remote has active fast, local doesn't - use remote
                state.currentFast = { ...remoteState.currentFast };
                if (timerInterval) clearInterval(timerInterval);
                startTimer();
            } else {
                // Both have active fasts - use the most recent one (higher startTime)
                const remoteStart = remoteState.currentFast.startTime || 0;
                const localStart = state.currentFast.startTime || 0;
                if (remoteStart > localStart) {
                    state.currentFast = { ...remoteState.currentFast };
                    if (timerInterval) clearInterval(timerInterval);
                    startTimer();
                }
            }
        } else if (!remoteState.currentFast?.isActive && state.currentFast?.isActive) {
            // Remote says no active fast but local has one - this could mean fast was stopped on another device
            // Check if remote has this fast in history (meaning it was completed)
            const localFastStart = state.currentFast.startTime;
            const fastInRemoteHistory = remoteState.fastingHistory?.some(f => f.startTime === localFastStart);
            if (fastInRemoteHistory) {
                if (timerInterval) clearInterval(timerInterval);
                state.currentFast = { startTime: null, goalHours: state.currentFast.goalHours, isActive: false, powerups: [] };
                // Reset the timer UI to reflect the stopped state
                resetTimerUI();
                updatePowerupDisplay();
                updateConstitution();
            }
        }

        // Handle active sleep similarly

        if (remoteState.currentSleep && remoteState.currentSleep.isActive) {
            if (!state.currentSleep || !state.currentSleep.isActive) {
                // Remote has active sleep, local doesn't - use remote
                state.currentSleep = { ...remoteState.currentSleep };
                if (sleepTimerInterval) clearInterval(sleepTimerInterval);
                startSleepTimer();
            } else {
                // Both have active sleeps - use the most recent one
                const remoteStart = remoteState.currentSleep.startTime || 0;
                const localStart = state.currentSleep.startTime || 0;
                if (remoteStart > localStart) {
                    state.currentSleep = { ...remoteState.currentSleep };
                    if (sleepTimerInterval) clearInterval(sleepTimerInterval);
                    startSleepTimer();
                }
            }
        } else if (!remoteState.currentSleep?.isActive && state.currentSleep?.isActive) {
            // Remote says no active sleep but local has one
            const localSleepStart = state.currentSleep.startTime;
            const sleepInRemoteHistory = remoteState.sleepHistory?.some(s => s.startTime === localSleepStart);
            if (sleepInRemoteHistory) {
                if (sleepTimerInterval) clearInterval(sleepTimerInterval);
                state.currentSleep = { startTime: null, goalHours: state.currentSleep.goalHours, isActive: false };
                // Reset the sleep timer UI to reflect the stopped state
                resetSleepTimerUI();
            }
        }

        // Merge Living Life state - ALWAYS trust the most recent activation
        if (remoteState.livingLife) {
            // Initialize local livingLife if it doesn't exist
            if (!state.livingLife) {
                state.livingLife = { isActive: false, activatedAt: null, expiresAt: null, history: [] };
            }
            if (!state.livingLife.history) {
                state.livingLife.history = [];
            }

            // Merge Living Life history (combine both, remove duplicates by activatedAt)
            if (remoteState.livingLife.history && remoteState.livingLife.history.length > 0) {
                const existingTimes = new Set(state.livingLife.history.map(h => h.activatedAt));
                const newEntries = remoteState.livingLife.history.filter(h => !existingTimes.has(h.activatedAt));
                state.livingLife.history = [...state.livingLife.history, ...newEntries];
                // Sort by most recent first
                state.livingLife.history.sort((a, b) => b.activatedAt - a.activatedAt);
            }

            // Determine active state - use whichever was activated more recently
            const remoteActive = remoteState.livingLife.isActive;
            const localActive = state.livingLife.isActive;
            const remoteActivatedAt = remoteState.livingLife.activatedAt || 0;
            const localActivatedAt = state.livingLife.activatedAt || 0;

            if (remoteActive && localActive) {
                // Both active - use the one activated more recently
                if (remoteActivatedAt > localActivatedAt) {
                    state.livingLife.isActive = true;
                    state.livingLife.activatedAt = remoteState.livingLife.activatedAt;
                    state.livingLife.expiresAt = remoteState.livingLife.expiresAt;
                }
            } else if (remoteActive && !localActive) {
                // Only remote is active - check if it's still valid (not expired)
                if (remoteState.livingLife.expiresAt && Date.now() < remoteState.livingLife.expiresAt) {
                    state.livingLife.isActive = true;
                    state.livingLife.activatedAt = remoteState.livingLife.activatedAt;
                    state.livingLife.expiresAt = remoteState.livingLife.expiresAt;
                }
            } else if (!remoteActive && localActive) {
                // Local is active, remote is not - remote might have ended it early
                // Check if remote has the same activation in history but marked as ended
                if (remoteActivatedAt === localActivatedAt && !remoteActive) {
                    state.livingLife.isActive = false;
                    state.livingLife.activatedAt = null;
                    state.livingLife.expiresAt = null;
                }
            }
            // If neither is active, nothing to do
        }

        // Update Living Life UI after merge
        updateLivingLifeUI();
        updatePowerupStates();

        // Save merged state locally
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
        localStorage.setItem('last-local-update', Date.now().toString());

        // Update UI
        updateUI();
        updateSleepUI();
        renderHistory();
        renderSleepHistory();
        renderStats();
        renderSleepStats();

        // Re-apply settings to update checkboxes and visibility
        initSettings();
        applySettings();

        // Clear merge flag
        isMergingRemoteData = false;
    }
}

async function handleAuthClick() {
    if (!firebaseSync) return;

    // Check if Firebase is initialized
    if (!firebaseSync.isInitialized) {
        showAchievementToast(
            '<span class="px-icon px-cloud"></span>',
            'Cloud Sync Not Configured',
            'Set up Firebase to enable cloud sync. See README.md for instructions.',
            'warning'
        );
        return;
    }

    if (firebaseSync.isAuthenticated()) {
        // Already signed in, sign out
        await handleSignOut();
    } else {
        // Not signed in, sign in
        try {
            const user = await firebaseSync.signInWithGoogle();
            if (user) {
                // Check if user has a username, if not show modal
                await checkUsernameAfterSignIn();
            }
        } catch (error) {
            console.error('Sign in failed:', error);
        }
    }
}

async function handleSignOut() {
    if (!firebaseSync) return;

    const confirmed = await showConfirmModal('Are you sure you want to sign out? Your data will be cleared from this device. Sign back in to restore it.', 'Sign Out');
    if (confirmed) {
        try {
            await firebaseSync.signOut();

            // Clear local data on sign out
            localStorage.removeItem(STATE_KEY);
            localStorage.removeItem('last-local-update');
            localStorage.removeItem('settings-modified-locally');

            // Reset state to defaults - PRESERVE hasSeenTutorial (local preference, not cloud data)
            const preserveHasSeenTutorial = state.hasSeenTutorial;
            Object.assign(state, {
                currentFast: { startTime: null, goalHours: 16, isActive: false, powerups: [] },
                currentSleep: { startTime: null, goalHours: 8, isActive: false },
                fastingHistory: [],
                sleepHistory: [],
                lastMealTime: null,
                lastMealQuality: null,
                lastSleepQuality: null,
                skills: { fasting: 0, sleeping: 0, eating: 0 },
                settings: {
                    showFastingGoals: true,
                    showSleepGoals: true,
                    showFastingFuture: true,
                    showBreakingFastGuide: true,
                    showExerciseGuide: true,
                    showEatingGuide: true,
                    showSleepGuide: true,
                    showMealSleepQuality: true,
                    showHungerTracker: true,
                    showTrends: true
                },
                customPowerup: { name: null, createdMonth: null },
                hasSeenTutorial: preserveHasSeenTutorial, // Don't reset - user already saw tutorial
                currentTab: null
            });

            // Reset sync flag
            initialSyncComplete = false;

            // Update UI to reflect cleared state
            updateUI();
            updateSleepUI();
            renderHistory();
            renderSleepHistory();
            renderStats();
            renderSleepStats();
            initSettings();
            applySettings();

            // Stop any active timers
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            if (sleepTimerInterval) {
                clearInterval(sleepTimerInterval);
                sleepTimerInterval = null;
            }
            if (constitutionInterval) {
                clearInterval(constitutionInterval);
                constitutionInterval = null;
            }

            // Clear username
            currentUsername = null;
            const usernameEl = document.getElementById('user-username');
            if (usernameEl) usernameEl.textContent = '';

            // Reset global warning counters
            earlySleepWarnings = 0;
            earlyWakeWarnings = 0;
            goalAchievedNotified = false;
            sleepGoalAchievedNotified = false;
            guidesShown = { breaking: false, extended24: false, extended36: false };
            exerciseWarnings = 0;

            console.log('Sign out complete - all local data cleared');
            showAchievementToast(
                '<span class="px-icon px-check"></span>',
                'Signed Out',
                'You have been signed out successfully.',
                'info'
            );

        } catch (error) {
            console.error('Sign out failed:', error);
            showAchievementToast(
                '<span class="px-icon px-danger"></span>',
                'Sign Out Failed',
                error.message,
                'danger'
            );
        }
    }
}

// ==========================================
// CONSTITUTION STAT 
// ==========================================
// Sleep: 60% (max 60 points)
// Fasting: 20% (max 20 points)
// Eating: 10% (max 10 points)
// Powerups: 10% (max 10 points)

function updateConstitution() {
    const sleepScore = calculateSleepScore();
    const fastingScore = calculateFastingScore();
    const eatingScore = calculateEatingScore();
    const powerupScore = calculatePowerupScore();

    const totalScore = Math.min(100, Math.round(sleepScore + fastingScore + eatingScore + powerupScore));

    // Update UI
    const valueEl = document.getElementById('constitution-value');
    const fillEl = document.getElementById('constitution-fill');
    const sleepEl = document.getElementById('const-sleep');
    const fastingEl = document.getElementById('const-fasting');
    const eatingEl = document.getElementById('const-eating');
    const powerupsEl = document.getElementById('const-powerups');
    const messageEl = document.getElementById('constitution-message');

    if (!valueEl || !fillEl) return;

    valueEl.textContent = totalScore;
    fillEl.style.width = `${totalScore}%`;

    if (sleepEl) sleepEl.textContent = Math.round(sleepScore);
    if (fastingEl) fastingEl.textContent = Math.round(fastingScore);
    if (eatingEl) eatingEl.textContent = Math.round(eatingScore);
    if (powerupsEl) powerupsEl.textContent = Math.round(powerupScore);

    // Update color based on score
    if (totalScore >= 80) {
        fillEl.style.background = 'linear-gradient(90deg, #16a34a 0%, #22c55e 50%, #4ade80 100%)';
        valueEl.style.color = '#22c55e';
    } else if (totalScore >= 50) {
        fillEl.style.background = 'linear-gradient(90deg, #ca8a04 0%, #eab308 50%, #facc15 100%)';
        valueEl.style.color = '#eab308';
    } else {
        fillEl.style.background = 'linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #f87171 100%)';
        valueEl.style.color = '#ef4444';
    }

    // Fun messages based on Heart Points level
    if (messageEl) {
        messageEl.textContent = getConstitutionMessage(totalScore, sleepScore, fastingScore, eatingScore, powerupScore);
    }

    // Update the three new meters
    updateBloatMeter();
    updateBrainMeter();
    updateBrawnMeter();
}

// Calculate and update Bloat Meter (0-100, lower is better)
function updateBloatMeter() {
    let bloatScore = 0;

    // Eating factors (increase bloat)
    const eatingPowerups = state.eatingPowerups || [];
    const badEating = eatingPowerups.filter(p => ['eatenout', 'toofast', 'junkfood', 'bloated'].includes(p.type));
    bloatScore += badEating.length * 15;

    // Good eating reduces bloat
    const goodEating = eatingPowerups.filter(p => ['broth', 'fiber', 'sloweating', 'mealwalk'].includes(p.type));
    bloatScore -= goodEating.length * 10;

    // Sleep factors
    const history = state.sleepHistory || [];
    if (history.length > 0) {
        const lastSleep = history[0];
        const hoursSinceWake = (Date.now() - lastSleep.endTime) / 1000 / 60 / 60;
        if (hoursSinceWake <= 24) {
            // Poor sleep increases bloat
            if (lastSleep.duration < 6) bloatScore += 20;
            else if (lastSleep.duration < 7) bloatScore += 10;
            // Good sleep reduces bloat
            else if (lastSleep.duration >= 8) bloatScore -= 10;
        }
    }

    // Fasting factors
    if (state.currentFast.isActive) {
        const fastingHours = (Date.now() - state.currentFast.startTime) / 1000 / 60 / 60;
        // Fasting reduces bloat
        if (fastingHours >= 16) bloatScore -= 30;
        else if (fastingHours >= 12) bloatScore -= 20;
        else if (fastingHours >= 8) bloatScore -= 10;

        // Flat stomach powerup reduces bloat significantly
        const flatStomach = (state.currentFast.powerups || []).filter(p => p.type === 'flatstomach');
        bloatScore -= flatStomach.length * 15;
    }

    // Clamp to 0-100
    bloatScore = Math.max(0, Math.min(100, bloatScore));

    // Update UI
    const valueEl = document.getElementById('bloat-value');
    const fillEl = document.getElementById('bloat-fill');
    if (valueEl) valueEl.textContent = Math.round(bloatScore);
    if (fillEl) fillEl.style.width = `${bloatScore}%`;
}

// Calculate and update Brain Meter (0-100, higher is better)
function updateBrainMeter() {
    let brainScore = 50; // Start at baseline

    // Sleep is critical for brain function
    const history = state.sleepHistory || [];
    if (history.length > 0) {
        const lastSleep = history[0];
        const hoursSinceWake = (Date.now() - lastSleep.endTime) / 1000 / 60 / 60;
        if (hoursSinceWake <= 24) {
            if (lastSleep.duration >= 8) brainScore += 30;
            else if (lastSleep.duration >= 7) brainScore += 20;
            else if (lastSleep.duration >= 6) brainScore += 10;
            else if (lastSleep.duration < 5) brainScore -= 20;
            else brainScore -= 10;
        } else {
            brainScore -= 15; // No recent sleep data
        }
    } else {
        brainScore -= 10;
    }

    // Fasting improves mental clarity
    if (state.currentFast.isActive) {
        const fastingHours = (Date.now() - state.currentFast.startTime) / 1000 / 60 / 60;
        if (fastingHours >= 18) brainScore += 25; // Peak autophagy and clarity
        else if (fastingHours >= 14) brainScore += 20;
        else if (fastingHours >= 10) brainScore += 15;
        else if (fastingHours >= 6) brainScore += 10;
    }

    // Eating factors
    const eatingPowerups = state.eatingPowerups || [];
    // Good foods for brain
    const brainFoods = eatingPowerups.filter(p => ['protein', 'fiber', 'chocolate', 'nosugar'].includes(p.type));
    brainScore += brainFoods.length * 5;
    // Bad foods hurt brain
    const badFoods = eatingPowerups.filter(p => ['junkfood', 'toofast'].includes(p.type));
    brainScore -= badFoods.length * 10;

    // Clamp to 0-100
    brainScore = Math.max(0, Math.min(100, brainScore));

    // Update UI
    const valueEl = document.getElementById('brain-value');
    const fillEl = document.getElementById('brain-fill');
    if (valueEl) valueEl.textContent = Math.round(brainScore);
    if (fillEl) fillEl.style.width = `${brainScore}%`;
}

// Calculate and update Brawn Meter (0-100, higher is better)
function updateBrawnMeter() {
    let brawnScore = 40; // Start at baseline

    // Sleep is essential for muscle recovery
    const history = state.sleepHistory || [];
    if (history.length > 0) {
        const lastSleep = history[0];
        const hoursSinceWake = (Date.now() - lastSleep.endTime) / 1000 / 60 / 60;
        if (hoursSinceWake <= 24) {
            if (lastSleep.duration >= 8) brawnScore += 25;
            else if (lastSleep.duration >= 7) brawnScore += 15;
            else if (lastSleep.duration >= 6) brawnScore += 5;
            else brawnScore -= 15;
        }
    }

    // Fasting with exercise is great for brawn
    if (state.currentFast.isActive) {
        const powerups = state.currentFast.powerups || [];
        const exercise = powerups.filter(p => p.type === 'exercise');
        const hanging = powerups.filter(p => p.type === 'hanging');
        const grip = powerups.filter(p => p.type === 'grip');
        const walk = powerups.filter(p => p.type === 'walk');

        brawnScore += exercise.length * 10;
        brawnScore += hanging.length * 8;
        brawnScore += grip.length * 8;
        brawnScore += walk.length * 5;

        // Fasting in fat-burning mode helps body composition
        const fastingHours = (Date.now() - state.currentFast.startTime) / 1000 / 60 / 60;
        if (fastingHours >= 16) brawnScore += 10;
        else if (fastingHours >= 12) brawnScore += 5;
    }

    // Eating factors - protein is key
    const eatingPowerups = state.eatingPowerups || [];
    const protein = eatingPowerups.filter(p => p.type === 'protein');
    const mealwalk = eatingPowerups.filter(p => p.type === 'mealwalk');
    brawnScore += protein.length * 10;
    brawnScore += mealwalk.length * 5;
    // Junk food hurts gains
    const junk = eatingPowerups.filter(p => p.type === 'junkfood');
    brawnScore -= junk.length * 10;

    // Clamp to 0-100
    brawnScore = Math.max(0, Math.min(100, brawnScore));

    // Update UI
    const valueEl = document.getElementById('brawn-value');
    const fillEl = document.getElementById('brawn-fill');
    if (valueEl) valueEl.textContent = Math.round(brawnScore);
    if (fillEl) fillEl.style.width = `${brawnScore}%`;
}

function calculateSleepScore() {
    // Max 60 points for sleep
    // 7+ hours = full 60 points
    // Scale down from there

    const history = state.sleepHistory || [];
    if (history.length === 0) return 0;

    // Get the most recent sleep
    const lastSleep = history[0];
    const duration = lastSleep.duration || 0;

    // Check if sleep was within last 24 hours
    const hoursSinceWake = (Date.now() - lastSleep.endTime) / 1000 / 60 / 60;
    if (hoursSinceWake > 24) return 0; // Sleep data is stale

    // Calculate score
    if (duration >= 8) return 60; // Perfect sleep
    if (duration >= 7) return 55; // Great sleep
    if (duration >= 6) return 45; // Good sleep
    if (duration >= 5) return 30; // Okay sleep
    if (duration >= 4) return 20; // Poor sleep
    if (duration >= 3) return 10; // Very poor
    return 5; // Barely slept
}

function calculateFastingScore() {
    // Max 20 points for fasting
    // 16+ hours = full 20 points

    let score = 0;

    // Check if currently fasting
    if (state.currentFast.isActive && state.currentFast.startTime) {
        const fastingHours = (Date.now() - state.currentFast.startTime) / 1000 / 60 / 60;

        if (fastingHours >= 20) score = 20;
        else if (fastingHours >= 16) score = 17;
        else if (fastingHours >= 14) score = 14;
        else if (fastingHours >= 12) score = 10;
        else if (fastingHours >= 8) score = 6;
        else if (fastingHours >= 4) score = 3;
        else score = 1;

        return score;
    }

    // Check most recent completed fast
    const history = state.fastingHistory || [];
    if (history.length === 0) return 0;

    const lastFast = history[0];
    const hoursSinceFast = (Date.now() - lastFast.endTime) / 1000 / 60 / 60;

    // If last fast was within 24 hours, give partial credit
    if (hoursSinceFast <= 24) {
        const duration = lastFast.duration || 0;
        if (duration >= 16) score = 15;
        else if (duration >= 14) score = 12;
        else if (duration >= 12) score = 8;
        else score = 4;

        // Decay score based on time since fast
        const decayFactor = Math.max(0, 1 - (hoursSinceFast / 24));
        score = Math.round(score * decayFactor);
    }

    return Math.round(score);
}

function calculateEatingScore() {
    // Max 10 points for eating
    // Based on eating powerups quality AND variety

    const powerups = state.eatingPowerups || [];
    if (powerups.length === 0) return 0;

    // Count each type (only count first occurrence for good items)
    const goodTypeCounts = {};
    const badTypeCounts = {};

    const essentials = ['broth', 'protein', 'fiber', 'homecooked'];
    const bonuses = ['sloweating', 'mealwalk'];
    const treats = ['chocolate'];
    const negatives = ['eatenout', 'toofast', 'junkfood'];

    powerups.forEach(p => {
        if (negatives.includes(p.type)) {
            badTypeCounts[p.type] = (badTypeCounts[p.type] || 0) + 1;
        } else {
            goodTypeCounts[p.type] = (goodTypeCounts[p.type] || 0) + 1;
        }
    });

    let score = 0;

    // Essentials: 2 points each (max once) = max 8 points
    essentials.forEach(type => {
        if (goodTypeCounts[type]) score += 2;
    });

    // Bonuses: 1 point each (max once) = max 2 points
    bonuses.forEach(type => {
        if (goodTypeCounts[type]) score += 1;
    });

    // Treats: 0.5 points
    treats.forEach(type => {
        if (goodTypeCounts[type]) score += 0.5;
    });

    // Negatives: Full penalty for each occurrence
    negatives.forEach(type => {
        const count = badTypeCounts[type] || 0;
        score += eatingPowerupValues[type] * count;
    });

    // Cap between 0 and 10
    return Math.max(0, Math.min(10, Math.round(score)));
}

function calculatePowerupScore() {
    // Max 10 points for powerups
    // Based on variety and activity

    let score = 0;
    const powerups = state.currentFast.powerups || [];

    if (powerups.length === 0) {
        // Check if there were powerups in most recent completed fast
        const history = state.fastingHistory || [];
        if (history.length > 0 && history[0].powerups) {
            const lastPowerups = history[0].powerups;
            const hoursSinceFast = (Date.now() - history[0].endTime) / 1000 / 60 / 60;

            if (hoursSinceFast <= 12) {
                // Give credit for recent powerups
                if (lastPowerups.water > 0) score += 1;
                if (lastPowerups.coffee > 0) score += 0.5;
                if (lastPowerups.tea > 0) score += 0.5;
                if (lastPowerups.exercise > 0) score += 2;
                if (lastPowerups.hanging > 0) score += 2;
                if (lastPowerups.grip > 0) score += 1;
                if (lastPowerups.walk > 0) score += 3;

                // Decay based on time
                const decayFactor = Math.max(0, 1 - (hoursSinceFast / 12));
                score = score * decayFactor;
            }
        }
        return Math.min(10, score);
    }

    // Count current powerups
    const counts = { water: 0, coffee: 0, tea: 0, exercise: 0, hanging: 0, grip: 0, walk: 0 };
    powerups.forEach(p => {
        if (counts[p.type] !== undefined) counts[p.type]++;
    });

    // Water: 1 point (max)
    if (counts.water >= 3) score += 1;
    else if (counts.water >= 1) score += 0.5;

    // Coffee/Tea: 0.5 points each (max 1)
    if (counts.coffee >= 1) score += 0.5;
    if (counts.tea >= 1) score += 0.5;

    // Exercise: 2 points (best for Heart Points!)
    if (counts.exercise >= 3) score += 2;
    else if (counts.exercise >= 1) score += 1;

    // Hanging: 2 points
    if (counts.hanging >= 3) score += 2;
    else if (counts.hanging >= 1) score += 1;

    // Grip: 1 point
    if (counts.grip >= 2) score += 1;
    else if (counts.grip >= 1) score += 0.5;

    // Walk: 3 points (best powerup for Heart Points!)
    if (counts.walk >= 2) score += 3;
    else if (counts.walk >= 1) score += 2;

    return Math.min(10, score);
}

function getConstitutionMessage(total, sleep, fasting, eating, powerups) {
    // Fun RPG-inspired messages
    if (total >= 95) {
        return " MAXED OUT! You are a Heart Points LEGEND!";
    } else if (total >= 80) {
        return " Outstanding! Your body is a temple!";
    } else if (total >= 60) {
        return " Solid stats! Keep grinding, adventurer!";
    } else if (total >= 40) {
        return " You're on the path! More sleep & fasting = more gains!";
    } else if (total >= 20) {
        return " Room to grow! Focus on 7+ hours sleep tonight!";
    } else {
        // Give specific advice based on what's lacking
        if (sleep < 30) {
            return " Sleep is your biggest XP multiplier! Get 7+ hours!";
        } else if (fasting < 10) {
            return "⏱ Start a 16-hour fast to boost your Heart Points!";
        } else if (eating < 5) {
            return " Break your fast properly! Broth, protein, fiber!";
        } else {
            return " Add some powerups! Walk, exercise, or hang!";
        }
    }
}

// ==========================================
// USERNAME & LEADERBOARD SYSTEM
// ==========================================

let currentUsername = null;

// ==========================================
// FIRST-TIME TUTORIAL
// ==========================================

let tutorialStep = 0;
const TUTORIAL_STEPS = 6;

// Check and show tutorial for first-time users
function checkFirstTimeTutorial() {
    if (!state.hasSeenTutorial) {
        showTutorial();
    }
}

// Show the tutorial modal
function showTutorial() {
    tutorialStep = 0;
    updateTutorialStep();
    const modal = document.getElementById('tutorial-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Hide the tutorial modal and mark as seen
function hideTutorial() {
    const modal = document.getElementById('tutorial-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    state.hasSeenTutorial = true;
    saveState();
}

// Update tutorial step display
function updateTutorialStep() {
    // Hide all steps and reset dots
    for (let i = 0; i < TUTORIAL_STEPS; i++) {
        const step = document.getElementById(`tutorial-step-${i}`);
        const dot = document.getElementById(`tutorial-dot-${i}`);
        if (step) step.classList.add('hidden');
        if (dot) {
            dot.style.background = 'var(--dark-border)';
            dot.style.boxShadow = 'none';
        }
    }

    // Show current step with active dot styling
    const currentStep = document.getElementById(`tutorial-step-${tutorialStep}`);
    const currentDot = document.getElementById(`tutorial-dot-${tutorialStep}`);
    if (currentStep) currentStep.classList.remove('hidden');
    if (currentDot) {
        currentDot.style.background = 'var(--matrix-400)';
        currentDot.style.boxShadow = '0 0 8px rgba(74, 222, 128, 0.6)';
    }

    // Update buttons
    const prevBtn = document.getElementById('tutorial-prev');
    const nextBtn = document.getElementById('tutorial-next');

    if (prevBtn) {
        prevBtn.classList.toggle('hidden', tutorialStep === 0);
    }

    if (nextBtn) {
        nextBtn.textContent = tutorialStep === TUTORIAL_STEPS - 1 ? 'Start My Journey' : 'Next';
    }
}

// Go to next tutorial step
function nextTutorialStep() {
    if (tutorialStep < TUTORIAL_STEPS - 1) {
        tutorialStep++;
        updateTutorialStep();
    } else {
        hideTutorial();
    }
}

// Go to previous tutorial step
function prevTutorialStep() {
    if (tutorialStep > 0) {
        tutorialStep--;
        updateTutorialStep();
    }
}

// Initialize tutorial event listeners
function initTutorialListener() {
    const nextBtn = document.getElementById('tutorial-next');
    const prevBtn = document.getElementById('tutorial-prev');
    const skipBtn = document.getElementById('tutorial-skip');

    if (nextBtn) {
        nextBtn.addEventListener('click', nextTutorialStep);
    }
    if (prevBtn) {
        prevBtn.addEventListener('click', prevTutorialStep);
    }
    if (skipBtn) {
        skipBtn.addEventListener('click', hideTutorial);
    }
}

// ==========================================
// USERNAME MODAL FUNCTIONALITY
// ==========================================

// Initialize username event listeners
function initUsernameListeners() {
    const usernameInput = document.getElementById('username-input');
    const usernameSubmit = document.getElementById('username-submit');

    if (usernameSubmit) {
        usernameSubmit.addEventListener('click', submitUsername);
    }

    if (usernameInput) {
        // Prevent spaces while typing
        usernameInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\s/g, '');
            validateUsernameInput();
        });

        // Submit on Enter key
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitUsername();
            }
        });
    }

    // Copy username button
    const copyUsernameBtn = document.getElementById('copy-username-btn');
    if (copyUsernameBtn) {
        copyUsernameBtn.addEventListener('click', copyUsername);
    }

    // Set username button
    const setUsernameBtn = document.getElementById('set-username-btn');
    if (setUsernameBtn) {
        setUsernameBtn.addEventListener('click', showUsernameModal);
    }
}

// Initialize leaderboard event listeners
function initLeaderboardListeners() {
    const lbClose = document.getElementById('leaderboard-close');
    const lbTabDaily = document.getElementById('lb-tab-daily');
    const lbTabAlltime = document.getElementById('lb-tab-alltime');
    const lbTabFast = document.getElementById('lb-tab-fast');
    const lbTabSleep = document.getElementById('lb-tab-sleep');
    const lbTabMeal = document.getElementById('lb-tab-meal');
    const openLeaderboard = document.getElementById('open-leaderboard');

    if (lbClose) {
        lbClose.addEventListener('click', closeLeaderboard);
    }

    if (lbTabDaily) {
        lbTabDaily.addEventListener('click', () => switchLeaderboardTab('daily'));
    }

    if (lbTabAlltime) {
        lbTabAlltime.addEventListener('click', () => switchLeaderboardTab('alltime'));
    }

    if (lbTabFast) {
        lbTabFast.addEventListener('click', () => switchLeaderboardTab('fast'));
    }

    if (lbTabSleep) {
        lbTabSleep.addEventListener('click', () => switchLeaderboardTab('sleep'));
    }

    if (lbTabMeal) {
        lbTabMeal.addEventListener('click', () => switchLeaderboardTab('meal'));
    }

    if (openLeaderboard) {
        openLeaderboard.addEventListener('click', showLeaderboard);
    }
}

// Validate username input
function validateUsernameInput() {
    const input = document.getElementById('username-input');
    const error = document.getElementById('username-error');
    const value = input.value.trim();

    if (!error) return true;

    if (value.length === 0) {
        error.classList.add('hidden');
        return false;
    }

    if (value.includes(' ')) {
        error.textContent = 'No spaces allowed!';
        error.classList.remove('hidden');
        return false;
    }

    if (value.length < 3) {
        error.textContent = 'Username must be at least 3 characters';
        error.classList.remove('hidden');
        return false;
    }

    if (value.length > 16) {
        error.textContent = 'Username must be 16 characters or less';
        error.classList.remove('hidden');
        return false;
    }

    // Check for valid characters (alphanumeric and underscore only)
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
        error.textContent = 'Only letters, numbers, and underscore allowed';
        error.classList.remove('hidden');
        return false;
    }

    error.classList.add('hidden');
    return true;
}

// Show username modal
function showUsernameModal() {
    const modal = document.getElementById('username-modal');
    const input = document.getElementById('username-input');

    if (modal) {
        modal.classList.remove('hidden');
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

// Hide username modal
function hideUsernameModal() {
    const modal = document.getElementById('username-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Sources database - credit where it's due!
const sourcesData = {
    greaseTheGroove: {
        title: 'Grease the Groove',
        sources: [
            { author: 'Pavel Tsatsouline', work: 'Power to the People', url: 'https://www.strongfirst.com/' },
            { author: 'StrongFirst', work: 'GTG Protocol', url: 'https://www.strongfirst.com/greasing-the-groove/' }
        ]
    },
    deadHang: {
        title: 'Dead Hang Benefits',
        sources: [
            { author: 'Dr. John Kirsch', work: 'Shoulder Pain? The Solution & Prevention', url: 'https://kirschshoulder.com/' },
            { author: 'Ido Portal', work: 'Hanging Protocol', url: 'https://www.idoportal.com/' }
        ]
    },
    gripStrength: {
        title: 'Grip Strength & Longevity',
        sources: [
            { author: 'Leong et al.', work: 'Lancet Study: Grip strength and mortality', year: '2015', url: 'https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(14)62000-6/fulltext' },
            { author: 'Dr. Peter Attia', work: 'Outlive: Grip as longevity marker', url: 'https://peterattiamd.com/' }
        ]
    },
    zone2Walking: {
        title: 'Zone 2 Training & Walking',
        sources: [
            { author: 'Dr. Peter Attia', work: 'Zone 2 Training Protocol', url: 'https://peterattiamd.com/zone-2/' },
            { author: 'Dr. Iñigo San Millán', work: 'Metabolic efficiency research', url: 'https://www.ucdenver.edu/academics/colleges/medicalschool/departments/medicine/EndocrinologyMetabolismDiabetes' }
        ]
    },
    postMealWalking: {
        title: 'Post-Meal Walking & Blood Sugar',
        sources: [
            { author: 'Buffey et al.', work: 'Sports Medicine: Light walking after meals', year: '2022', url: 'https://link.springer.com/article/10.1007/s40279-022-01649-4' },
            { author: 'Dr. Andrew Huberman', work: 'Huberman Lab: Blood glucose control', url: 'https://hubermanlab.com/' }
        ]
    },
    fasting: {
        title: 'Intermittent Fasting & Autophagy',
        sources: [
            { author: 'Dr. Jason Fung', work: 'The Complete Guide to Fasting', url: 'https://thefastingmethod.com/' },
            { author: 'Yoshinori Ohsumi', work: 'Nobel Prize: Autophagy mechanisms', year: '2016', url: 'https://www.nobelprize.org/prizes/medicine/2016/ohsumi/facts/' },
            { author: 'de Cabo & Mattson', work: 'NEJM: Effects of Intermittent Fasting', year: '2019', url: 'https://www.nejm.org/doi/full/10.1056/NEJMra1905136' }
        ]
    },
    breakingFast: {
        title: 'Breaking a Fast Safely',
        sources: [
            { author: 'Dr. Jason Fung', work: 'The Complete Guide to Fasting', url: 'https://thefastingmethod.com/' },
            { author: 'Dr. Mindy Pelz', work: 'Fast Like a Girl', url: 'https://drmindypelz.com/' }
        ]
    },
    sleepTiming: {
        title: 'Sleep Timing & Circadian Rhythm',
        sources: [
            { author: 'Dr. Matthew Walker', work: 'Why We Sleep', url: 'https://www.sleepdiplomat.com/' },
            { author: 'Dr. Andrew Huberman', work: 'Huberman Lab: Sleep toolkit', url: 'https://hubermanlab.com/toolkit-for-sleep/' },
            { author: 'Dr. Satchin Panda', work: 'The Circadian Code', url: 'https://www.salk.edu/scientist/satchidananda-panda/' }
        ]
    },
    sleepFasting: {
        title: 'Fasting Before Sleep',
        sources: [
            { author: 'Dr. Satchin Panda', work: 'Time-Restricted Eating research', url: 'https://www.salk.edu/scientist/satchidananda-panda/' },
            { author: 'Kinsey & Ormsbee', work: 'Nutrients: Late-night eating effects', year: '2015', url: 'https://www.mdpi.com/2072-6643/7/4/2648' }
        ]
    },
    visceralFat: {
        title: 'Visceral Fat & Health',
        sources: [
            { author: 'Harvard Health', work: 'Abdominal fat and health', url: 'https://www.health.harvard.edu/staying-healthy/abdominal-fat-and-what-to-do-about-it' },
            { author: 'Dr. Peter Attia', work: 'Outlive: Visceral adiposity', url: 'https://peterattiamd.com/' }
        ]
    },
    insulinResistance: {
        title: 'Insulin Resistance',
        sources: [
            { author: 'Dr. Jason Fung', work: 'The Diabetes Code', url: 'https://thefastingmethod.com/' },
            { author: 'Dr. Benjamin Bikman', work: 'Why We Get Sick', url: 'https://benbikman.com/' }
        ]
    },
    eatingGuide: {
        title: 'Mindful Eating & Digestion',
        sources: [
            { author: 'Dr. Jason Fung', work: 'Breaking fast protocols', url: 'https://thefastingmethod.com/' },
            { author: 'Dr. Mark Hyman', work: 'Food: What the Heck Should I Eat?', url: 'https://drhyman.com/' }
        ]
    }
};

// Helper to generate source button HTML
// SECURITY: Uses data attribute instead of inline onclick for CSP compliance
function generateSourceButton(sourceKey, color = 'var(--matrix-400)') {
    // Validate sourceKey is a known key to prevent injection
    if (!sourcesData[sourceKey]) {
        console.error('Invalid source key:', sourceKey);
        return '';
    }
    return `<button data-source-key="${sanitizeAttribute(sourceKey)}" class="source-btn text-xs px-2 py-1 rounded-full flex items-center gap-1 mt-2 transition-all hover:scale-105" style="background: rgba(255,255,255,0.05); border: 1px solid ${color}; color: ${color};">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
        Sources
    </button>`;
}

// SECURITY: Event delegation for source buttons (avoids inline onclick)
document.addEventListener('click', (e) => {
    const sourceBtn = e.target.closest('[data-source-key]');
    if (sourceBtn) {
        const sourceKey = sourceBtn.dataset.sourceKey;
        // Validate sourceKey exists in our data before calling
        if (sourcesData[sourceKey]) {
            showSources(sourceKey);
        }
    }
});

// Show sources modal
function showSources(sourceKey) {
    const sourceData = sourcesData[sourceKey];
    if (!sourceData) return;

    // Create modal content
    let sourcesHtml = sourceData.sources.map(src => {
        let citation = `<strong>${src.author}</strong>`;
        if (src.work) citation += ` - "${src.work}"`;
        if (src.year) citation += ` (${src.year})`;
        return `
            <a href="${src.url}" target="_blank" rel="noopener noreferrer"
               class="block p-3 rounded-lg mb-2 transition-all hover:scale-[1.02]"
               style="background: rgba(255,255,255,0.03); border: 1px solid var(--dark-border);">
                <p class="text-xs" style="color: var(--dark-text);">${citation}</p>
                <p class="text-xs mt-1 flex items-center gap-1" style="color: var(--matrix-400);">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    Visit Source
                </p>
            </a>
        `;
    }).join('');

    // Use the existing guide modal or create a simple alert
    const modal = document.getElementById('guide-modal');
    const icon = document.getElementById('guide-modal-icon');
    const title = document.getElementById('guide-modal-title');
    const content = document.getElementById('guide-modal-content');

    if (modal && icon && title && content) {
        icon.className = 'px-icon px-icon-lg px-book';
        title.textContent = `SOURCES: ${sourceData.title}`;
        title.style.color = 'var(--matrix-400)';
        content.innerHTML = `
            <p class="text-xs mb-4" style="color: var(--dark-text-muted);">Credit where it's due. Tap to visit each source:</p>
            ${sourcesHtml}
            <p class="text-xs mt-4 text-center italic" style="color: var(--dark-text-muted);">Always consult a healthcare professional before making health decisions.</p>
        `;
        modal.classList.remove('hidden');
    }
}

// Guide modal definitions - content for each powerup with a guide
const guideContent = {
    exercise: {
        icon: 'px-exercise',
        title: 'EXERCISE GUIDE',
        color: '#ef4444',
        content: `
            <div class="mb-4">
                <div class="flex items-center gap-2 mb-2 pb-2" style="border-bottom: 1px solid rgba(239,68,68,0.3);">
                    <span class="px-icon px-scroll"></span>
                    <h4 class="font-bold text-sm" style="color: #f87171;">TECHNIQUE: Grease the Groove</h4>
                </div>
                <p class="text-xs mb-3 italic" style="color: #fca5a5;">Spread your training throughout the day for maximum gains!</p>
                <div class="grid grid-cols-2 gap-2 text-xs mb-3" style="color: var(--dark-text-muted);">
                    <div class="p-2 rounded" style="background: rgba(239,68,68,0.1);">
                        <p class="font-bold mb-1" style="color: #f87171;"><span class="px-icon px-sword"></span> Strength:</p>
                        <p>Pushups, burpees, squats, hanging</p>
                    </div>
                    <div class="p-2 rounded" style="background: rgba(239,68,68,0.1);">
                        <p class="font-bold mb-1" style="color: #f87171;"><span class="px-icon px-walk"></span> Cardio:</p>
                        <p>Light jog, sprints (keep moderate)</p>
                    </div>
                </div>
                <p class="text-xs px-2 py-1 rounded" style="background: rgba(239,68,68,0.1); color: #fca5a5;"><span class="px-icon px-clock"></span> Max 15 min per set • Finish 4-6h before sleep phase</p>
                ${generateSourceButton('greaseTheGroove', '#ef4444')}
            </div>
        `
    },
    hanging: {
        icon: 'px-monkey',
        title: 'HANGING GUIDE',
        color: '#8b5cf6',
        content: `
            <div class="mb-4">
                <div class="flex items-center gap-2 mb-2 pb-2" style="border-bottom: 1px solid rgba(139,92,246,0.3);">
                    <span class="px-icon px-scroll"></span>
                    <h4 class="font-bold text-sm" style="color: #a78bfa;">TECHNIQUE: Dead Hang Mastery</h4>
                </div>
                <p class="text-xs mb-3 italic" style="color: #c4b5fd;">Decompress your spine and build grip strength!</p>
                <div class="space-y-2 text-xs" style="color: var(--dark-text-muted);">
                    <div class="p-2 rounded" style="background: rgba(139,92,246,0.1);">
                        <p class="font-bold mb-1" style="color: #a78bfa;"><span class="px-icon px-star"></span> Benefits:</p>
                        <p>Spinal decompression, shoulder health, grip strength, improved posture</p>
                    </div>
                    <div class="p-2 rounded" style="background: rgba(139,92,246,0.1);">
                        <p class="font-bold mb-1" style="color: #a78bfa;"><span class="px-icon px-clock"></span> Duration:</p>
                        <p>Start with 10-30 seconds, work up to 1-2 minutes</p>
                    </div>
                </div>
                <p class="text-xs mt-3 px-2 py-1 rounded" style="background: rgba(139,92,246,0.1); color: #c4b5fd;"><span class="px-icon px-bulb"></span> Tip: Hang multiple times throughout the day for best results!</p>
                ${generateSourceButton('deadHang', '#8b5cf6')}
            </div>
        `
    },
    grip: {
        icon: 'px-grip',
        title: 'GRIP TRAINING GUIDE',
        color: '#fb923c',
        content: `
            <div class="mb-4">
                <div class="flex items-center gap-2 mb-2 pb-2" style="border-bottom: 1px solid rgba(251,146,60,0.3);">
                    <span class="px-icon px-scroll"></span>
                    <h4 class="font-bold text-sm" style="color: #fb923c;">TECHNIQUE: Crushing Grip</h4>
                </div>
                <p class="text-xs mb-3 italic" style="color: #fdba74;">Strong grip = strong body = longer life!</p>
                <div class="space-y-2 text-xs" style="color: var(--dark-text-muted);">
                    <div class="p-2 rounded" style="background: rgba(251,146,60,0.1);">
                        <p class="font-bold mb-1" style="color: #fb923c;"><span class="px-icon px-star"></span> Benefits:</p>
                        <p>Forearm strength, better deadlifts, longevity marker, functional strength</p>
                    </div>
                    <div class="p-2 rounded" style="background: rgba(251,146,60,0.1);">
                        <p class="font-bold mb-1" style="color: #fb923c;"><span class="px-icon px-grip"></span> Exercises:</p>
                        <p>Gripper squeezes, farmer's walks, towel hangs, plate pinches</p>
                    </div>
                </div>
                <p class="text-xs mt-3 px-2 py-1 rounded" style="background: rgba(251,146,60,0.1); color: #fdba74;"><span class="px-icon px-bulb"></span> Grip strength is linked to overall health and longevity!</p>
                ${generateSourceButton('gripStrength', '#fb923c')}
            </div>
        `
    },
    walk: {
        icon: 'px-walk',
        title: 'WALKING GUIDE',
        color: '#22c55e',
        content: `
            <div class="mb-4">
                <div class="flex items-center gap-2 mb-2 pb-2" style="border-bottom: 1px solid rgba(34,197,94,0.3);">
                    <span class="px-icon px-scroll"></span>
                    <h4 class="font-bold text-sm" style="color: #4ade80;">TECHNIQUE: Zone 2 Walking</h4>
                </div>
                <p class="text-xs mb-3 italic" style="color: #86efac;">The most underrated exercise for health and fat burning!</p>
                <div class="space-y-2 text-xs" style="color: var(--dark-text-muted);">
                    <div class="p-2 rounded" style="background: rgba(34,197,94,0.1);">
                        <p class="font-bold mb-1" style="color: #4ade80;"><span class="px-icon px-star"></span> Benefits:</p>
                        <p>Burns fat, improves mood, aids digestion, clears mind, low stress on body</p>
                    </div>
                    <div class="p-2 rounded" style="background: rgba(34,197,94,0.1);">
                        <p class="font-bold mb-1" style="color: #4ade80;"><span class="px-icon px-clock"></span> When to Walk:</p>
                        <p>After meals (30 min), morning (fasted), anytime you feel stressed</p>
                    </div>
                </div>
                <p class="text-xs mt-3 px-2 py-1 rounded" style="background: rgba(34,197,94,0.1); color: #86efac;"><span class="px-icon px-bulb"></span> Walking after eating helps with blood sugar control!</p>
                ${generateSourceButton('postMealWalking', '#22c55e')}
            </div>
        `
    }
};

// Show guide modal for a specific powerup
function showGuideModal(powerupType) {
    const guide = guideContent[powerupType];
    if (!guide) return;

    const modal = document.getElementById('guide-modal');
    const icon = document.getElementById('guide-modal-icon');
    const title = document.getElementById('guide-modal-title');
    const content = document.getElementById('guide-modal-content');

    if (!modal || !icon || !title || !content) return;

    icon.className = `px-icon px-icon-xl ${guide.icon}`;
    icon.style.filter = `drop-shadow(0 0 10px ${guide.color})`;
    title.textContent = guide.title;
    title.style.color = guide.color;
    title.style.textShadow = `0 0 10px ${guide.color}40`;
    content.innerHTML = guide.content;

    modal.classList.remove('hidden');
}

// Hide guide modal
function hideGuideModal() {
    const modal = document.getElementById('guide-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Set up long press to show guide for a powerup button
function setupLongPressGuide(buttonId, guideType) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    let longPressTimer = null;
    let isLongPress = false;

    // Touch events for mobile
    button.addEventListener('touchstart', (e) => {
        isLongPress = false;
        longPressTimer = setTimeout(() => {
            isLongPress = true;
            showGuideModal(guideType);
            // Vibrate if supported
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 500); // 500ms for long press
    }, { passive: true });

    button.addEventListener('touchend', () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }, { passive: true });

    button.addEventListener('touchmove', () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }, { passive: true });

    // Mouse events for desktop
    button.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only left click
        isLongPress = false;
        longPressTimer = setTimeout(() => {
            isLongPress = true;
            showGuideModal(guideType);
        }, 500);
    });

    button.addEventListener('mouseup', () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    });

    button.addEventListener('mouseleave', () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    });
}

// Submit username
async function submitUsername() {
    const input = document.getElementById('username-input');
    const error = document.getElementById('username-error');

    if (!input) return;

    const username = input.value.trim();

    if (!validateUsernameInput()) {
        return;
    }

    // Check if username is already taken
    const isTaken = await checkUsernameAvailability(username);
    if (isTaken) {
        if (error) {
            error.textContent = 'Username already taken! Choose another.';
            error.classList.remove('hidden');
        }
        return;
    }

    // Save username to Firebase
    try {
        await saveUsername(username);
        currentUsername = username;
        // Display username in UI
        updateUsernameDisplay(username);
        hideUsernameModal();
        showAchievementToast('<span class="px-icon px-sword"></span>', 'Welcome!', `Your journey begins, ${username}!`, 'epic');

        // Update leaderboard with initial stats
        await updateLeaderboardEntry();
    } catch (err) {
        console.error('Error saving username:', err);
        if (error) {
            error.textContent = 'Error saving username. Try again.';
            error.classList.remove('hidden');
        }
    }
}

// Check if username is available
async function checkUsernameAvailability(username) {
    if (!firebaseSync || !firebaseSync.isInitialized) return false;

    // SECURITY: Validate username format first
    if (!isValidUsername(username)) {
        return true; // Treat invalid usernames as "taken" to prevent saving
    }

    try {
        const snapshot = await database.ref('usernames').child(username.toLowerCase()).once('value');
        if (!snapshot.exists()) return false; // Not taken

        // Check if it belongs to current user (allow re-setting own username)
        const data = snapshot.val();
        const currentUserId = firebaseSync.currentUser?.uid;
        if (data && data.uid === currentUserId) {
            return false; // Current user's own username, not "taken"
        }

        return true; // Taken by someone else
    } catch (err) {
        console.error('Error checking username:', err);
        return false;
    }
}

// Save username to Firebase
async function saveUsername(username) {
    if (!firebaseSync || !firebaseSync.isAuthenticated()) return;

    // SECURITY: Validate username format before saving
    if (!isValidUsername(username)) {
        throw new Error('Invalid username format');
    }

    const userId = firebaseSync.currentUser.uid;
    const sanitizedUsername = username.toLowerCase();

    // SECURITY: Save username mapping with uid object (matches database rules)
    await database.ref('usernames').child(sanitizedUsername).set({
        uid: userId,
        createdAt: Date.now()
    });

    // Save username to user profile
    await database.ref(`users/${userId}/profile`).set({
        username: username,
        displayName: username,
        createdAt: Date.now()
    });
}

// Load username for current user
async function loadUsername() {
    if (!firebaseSync || !firebaseSync.isAuthenticated()) {
        return null;
    }

    if (!database) {
        return null;
    }

    try {
        const userId = firebaseSync.currentUser.uid;
        const snapshot = await database.ref(`users/${userId}/profile/username`).once('value');

        if (snapshot.exists()) {
            currentUsername = snapshot.val();
            return currentUsername;
        }
        return null;
    } catch (err) {
        console.error('Error loading username:', err.message);
        return null;
    }
}

// Check if user needs to set username after sign-in
async function checkUsernameAfterSignIn() {
    if (!firebaseSync || !firebaseSync.isAuthenticated()) {
        return;
    }

    const username = await loadUsername();

    if (!username) {
        // User needs to set username - show the Set Username button in Stats
        updateUsernameDisplay(null);
        // Also show the modal to prompt them
        showUsernameModal();
    } else {
        currentUsername = username;
        // Display username in UI
        updateUsernameDisplay(username);
        // Update leaderboard with current stats
        await updateLeaderboardEntry();
    }
}

// Update the username display in the UI
function updateUsernameDisplay(username) {
    const usernameEl = document.getElementById('user-username');
    const usernameSection = document.getElementById('username-display-section');
    const setUsernameSection = document.getElementById('set-username-section');

    if (usernameEl && username) {
        usernameEl.textContent = `@${username}`;
        if (usernameSection) {
            usernameSection.classList.remove('hidden');
        }
        if (setUsernameSection) {
            setUsernameSection.classList.add('hidden');
        }
    } else {
        if (usernameSection) {
            usernameSection.classList.add('hidden');
        }
        if (setUsernameSection) {
            setUsernameSection.classList.remove('hidden');
        }
    }
}

// Copy username to clipboard
function copyUsername() {
    if (!currentUsername) return;

    const showSuccess = () => {
        const btn = document.getElementById('copy-username-btn');
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            btn.style.background = 'rgba(34, 197, 94, 0.3)';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = 'var(--dark-border)';
            }, 2000);
        }
    };

    // Modern clipboard API (preferred)
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(currentUsername)
            .then(showSuccess)
            .catch(err => {
                console.error('Failed to copy username:', err);
                // Fallback for failed clipboard API
                fallbackCopyText(currentUsername, showSuccess);
            });
    } else {
        // Fallback for older browsers
        fallbackCopyText(currentUsername, showSuccess);
    }
}

// Fallback copy function for older browsers
function fallbackCopyText(text, onSuccess) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        if (onSuccess) onSuccess();
    } catch (err) {
        console.error('Fallback copy failed:', err);
    }
    document.body.removeChild(textarea);
}

// ==========================================
// LEADERBOARD SYSTEM
// ==========================================

// Show leaderboard modal
async function showLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    if (modal) {
        modal.classList.remove('hidden');

        // If we don't have currentUsername but are signed in, try to load it
        if (!currentUsername && firebaseSync && firebaseSync.isAuthenticated()) {
            await loadUsername();
        }

        // Always try to update leaderboard entry if we have username
        if (currentUsername) {
            await updateLeaderboardEntry();
        }

        // Always load leaderboard data
        await loadLeaderboardData();
    }
}

// Close leaderboard modal
function closeLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Switch leaderboard tab
function switchLeaderboardTab(tab) {
    // Main tabs (daily/alltime)
    const dailyTab = document.getElementById('lb-tab-daily');
    const alltimeTab = document.getElementById('lb-tab-alltime');

    // Category tabs
    const fastTab = document.getElementById('lb-tab-fast');
    const sleepTab = document.getElementById('lb-tab-sleep');
    const mealTab = document.getElementById('lb-tab-meal');

    // Content areas
    const dailyContent = document.getElementById('lb-daily');
    const alltimeContent = document.getElementById('lb-alltime');
    const fastContent = document.getElementById('lb-fast');
    const sleepContent = document.getElementById('lb-sleep');
    const mealContent = document.getElementById('lb-meal');

    // Hide all content first
    [dailyContent, alltimeContent, fastContent, sleepContent, mealContent].forEach(el => {
        if (el) el.classList.add('hidden');
    });

    // Reset all main tab styles
    [dailyTab, alltimeTab].forEach(el => {
        if (el) {
            el.style.background = 'transparent';
            el.style.color = '#fbbf24';
        }
    });

    // Reset all category tab styles
    if (fastTab) { fastTab.style.background = 'transparent'; fastTab.style.color = '#f97316'; }
    if (sleepTab) { sleepTab.style.background = 'transparent'; sleepTab.style.color = '#8b5cf6'; }
    if (mealTab) { mealTab.style.background = 'transparent'; mealTab.style.color = '#22c55e'; }

    // Activate selected tab
    if (tab === 'daily') {
        dailyTab.style.background = 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)';
        dailyTab.style.color = 'black';
        dailyContent.classList.remove('hidden');
    } else if (tab === 'alltime') {
        alltimeTab.style.background = 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)';
        alltimeTab.style.color = 'black';
        alltimeContent.classList.remove('hidden');
    } else if (tab === 'fast') {
        fastTab.style.background = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
        fastTab.style.color = 'black';
        fastContent.classList.remove('hidden');
    } else if (tab === 'sleep') {
        sleepTab.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
        sleepTab.style.color = 'white';
        sleepContent.classList.remove('hidden');
    } else if (tab === 'meal') {
        mealTab.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
        mealTab.style.color = 'black';
        mealContent.classList.remove('hidden');
    }
}

// Get today's date string for daily leaderboard
function getTodayDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Calculate total XP from skills
function calculateTotalXP() {
    if (!state.skills) return 0;
    return Object.values(state.skills).reduce((sum, xp) => sum + xp, 0);
}

// Calculate total level from skills
function calculateTotalLevel() {
    if (!state.skills) return 0;
    let totalLevel = 0;
    for (const skill in state.skills) {
        totalLevel += levelFromXP(state.skills[skill]);
    }
    return totalLevel;
}

// SECURITY: Rate limiting for leaderboard updates
let lastLeaderboardUpdate = 0;
const LEADERBOARD_UPDATE_COOLDOWN = 5000; // 5 seconds minimum between updates

// Update user's leaderboard entry
async function updateLeaderboardEntry() {
    // SECURITY: Rate limiting to prevent abuse
    const now = Date.now();
    if (now - lastLeaderboardUpdate < LEADERBOARD_UPDATE_COOLDOWN) {
        return; // Skip update if too soon
    }

    if (!firebaseSync || !firebaseSync.isAuthenticated() || !currentUsername) {
        return;
    }

    if (!database) {
        return;
    }

    // SECURITY: Validate username before sending to database
    if (!isValidUsername(currentUsername)) {
        console.error('Invalid username format');
        return;
    }

    try {
        const userId = firebaseSync.currentUser.uid;
        const today = getTodayDateString();

        // SECURITY: Sanitize and clamp all values before sending
        const constitution = sanitizeNumber(calculateConstitutionValue(), 0, 1000, 0);
        const totalXP = sanitizeNumber(calculateTotalXP(), 0, 100000000, 0);
        const totalLevel = sanitizeNumber(calculateTotalLevel(), 0, 10000, 0);
        const fastingScore = sanitizeNumber(calculateFastingScore(), 0, 100, 0);
        const sleepScore = sanitizeNumber(calculateSleepScore(), 0, 100, 0);
        const eatingScore = sanitizeNumber(calculateEatingScore(), 0, 100, 0);

        const leaderboardData = {
            username: currentUsername,
            constitution: constitution,
            totalXP: totalXP,
            totalLevel: totalLevel,
            fastingScore: fastingScore,
            sleepScore: sleepScore,
            mealScore: eatingScore,
            lastUpdated: now
        };

        // Update daily leaderboard
        await database.ref(`leaderboard/daily/${today}/${userId}`).set(leaderboardData);

        // Update all-time leaderboard
        await database.ref(`leaderboard/alltime/${userId}`).set(leaderboardData);

        // Update rate limit timestamp
        lastLeaderboardUpdate = now;

    } catch (err) {
        console.error('Error updating leaderboard:', err.message);
    }
}

// Calculate constitution value (for leaderboard)
function calculateConstitutionValue() {
    const sleepScore = calculateSleepScore();
    const fastingScore = calculateFastingScore();
    const eatingScore = calculateEatingScore();
    const powerupScore = calculatePowerupScore();
    return Math.min(100, Math.round(sleepScore + fastingScore + eatingScore + powerupScore));
}

// Load leaderboard data
async function loadLeaderboardData() {
    // Check if user is authenticated (required by database rules)
    if (!firebaseSync || !firebaseSync.isAuthenticated || !firebaseSync.isAuthenticated()) {
        renderLeaderboardPlaceholder('Sign in to view hiscores');
        return;
    }

    // Check if database is available
    if (typeof database === 'undefined' || database === null) {
        renderLeaderboardPlaceholder('Database not available');
        return;
    }

    // Show loading state
    renderLeaderboardLoading();

    try {
        // Load daily leaderboard
        const today = getTodayDateString();
        const dailyRef = database.ref(`leaderboard/daily/${today}`);
        const dailySnapshot = await dailyRef.orderByChild('constitution').limitToLast(50).once('value');
        const dailyData = dailySnapshot.val() || {};
        renderLeaderboard('daily', dailyData);

        // Load all-time leaderboard
        const alltimeRef = database.ref('leaderboard/alltime');
        const alltimeSnapshot = await alltimeRef.orderByChild('totalXP').limitToLast(50).once('value');
        const alltimeData = alltimeSnapshot.val() || {};
        renderLeaderboard('alltime', alltimeData);

        // Render category leaderboards using daily data (sorted by respective scores)
        renderLeaderboard('fast', dailyData);
        renderLeaderboard('sleep', dailyData);
        renderLeaderboard('meal', dailyData);

    } catch (err) {
        console.error('Error loading leaderboard:', err.message);
        renderLeaderboardPlaceholder('Error loading hiscores');
    }
}

// Render leaderboard placeholder
function renderLeaderboardPlaceholder(message) {
    const dailyContent = document.getElementById('lb-daily');
    const alltimeContent = document.getElementById('lb-alltime');

    const placeholderHTML = `
        <div class="text-center py-8" style="color: var(--dark-text-muted);">
            <span class="px-icon px-icon-lg px-scroll"></span>
            <p class="mt-2">${message}</p>
        </div>
    `;

    if (dailyContent) dailyContent.innerHTML = placeholderHTML;
    if (alltimeContent) alltimeContent.innerHTML = placeholderHTML;

    const fastContent = document.getElementById('lb-fast');
    const sleepContent = document.getElementById('lb-sleep');
    const mealContent = document.getElementById('lb-meal');
    if (fastContent) fastContent.innerHTML = placeholderHTML;
    if (sleepContent) sleepContent.innerHTML = placeholderHTML;
    if (mealContent) mealContent.innerHTML = placeholderHTML;
}

// Render leaderboard loading state
function renderLeaderboardLoading() {
    const loadingHTML = `
        <div class="text-center py-8" style="color: var(--dark-text-muted);">
            <div class="inline-block animate-spin mb-2" style="width: 24px; height: 24px; border: 2px solid var(--dark-border); border-top-color: var(--matrix-400); border-radius: 50%;"></div>
            <p class="mt-2">Loading hiscores...</p>
        </div>
    `;

    const containers = ['lb-daily', 'lb-alltime', 'lb-fast', 'lb-sleep', 'lb-meal'];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = loadingHTML;
    });
}

// Render leaderboard
function renderLeaderboard(type, data) {
    const container = document.getElementById(`lb-${type}`);
    if (!container) return;

    // Convert to array and sort
    const entries = Object.entries(data).map(([id, entry]) => ({
        id,
        ...entry
    }));

    // Sort by appropriate field based on type
    if (type === 'daily') {
        entries.sort((a, b) => b.constitution - a.constitution);
    } else if (type === 'alltime') {
        entries.sort((a, b) => b.totalXP - a.totalXP);
    } else if (type === 'fast') {
        entries.sort((a, b) => (b.fastingScore || 0) - (a.fastingScore || 0));
    } else if (type === 'sleep') {
        entries.sort((a, b) => (b.sleepScore || 0) - (a.sleepScore || 0));
    } else if (type === 'meal') {
        entries.sort((a, b) => (b.mealScore || 0) - (a.mealScore || 0));
    }

    if (entries.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8" style="color: var(--dark-text-muted);">
                <span class="px-icon px-icon-lg px-scroll"></span>
                <p class="mt-2">No entries yet. Be the first!</p>
            </div>
        `;
        return;
    }

    let html = '';

    entries.forEach((entry, index) => {
        const rank = index + 1;
        const isCurrentUser = currentUsername && entry.username === currentUsername;

        // Rank styling
        let rankIcon = '';
        let rankColor = '#9ca3af';
        if (rank === 1) {
            rankIcon = '<span class="px-icon px-star"></span>';
            rankColor = '#fbbf24';
        } else if (rank === 2) {
            rankColor = '#94a3b8';
        } else if (rank === 3) {
            rankColor = '#cd7f32';
        }

        const bgStyle = isCurrentUser
            ? 'background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.5);'
            : 'background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);';

        html += `
            <div class="flex items-center p-2 rounded-lg mb-1" style="${bgStyle}">
                <div class="w-10 text-center font-bold" style="color: ${rankColor};">
                    ${rankIcon || rank}
                </div>
                <div class="flex-1 font-bold truncate" style="color: ${isCurrentUser ? 'var(--matrix-400)' : 'var(--dark-text)'};">
                    ${escapeHtml(entry.username)}
                </div>
                <div class="text-right">
                    ${type === 'daily'
                        ? `<span class="font-bold" style="color: #22c55e;">${entry.constitution || 0}</span> <span class="text-xs" style="color: var(--dark-text-muted);">CON</span>`
                        : type === 'alltime'
                        ? `<span class="font-bold" style="color: #fbbf24;">${formatNumber(entry.totalXP || 0)}</span> <span class="text-xs" style="color: var(--dark-text-muted);">XP</span>`
                        : type === 'fast'
                        ? `<span class="font-bold" style="color: #f97316;">${entry.fastingScore || 0}</span> <span class="text-xs" style="color: var(--dark-text-muted);">PTS</span>`
                        : type === 'sleep'
                        ? `<span class="font-bold" style="color: #8b5cf6;">${entry.sleepScore || 0}</span> <span class="text-xs" style="color: var(--dark-text-muted);">PTS</span>`
                        : type === 'meal'
                        ? `<span class="font-bold" style="color: #22c55e;">${entry.mealScore || 0}</span> <span class="text-xs" style="color: var(--dark-text-muted);">PTS</span>`
                        : ''
                    }
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Format large numbers
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// ==========================================
// MONSTER BATTLE SYSTEM
// ==========================================

// Monster constants
const VISCERAL_FAT_MAX_HP = 1000; // HP per monster - represents burning visceral fat
const INSULIN_DRAGON_MAX_HP = 2000; // HP per dragon - harder to kill
const DAMAGE_PER_FAST_HOUR = 10; // Damage dealt per hour of fasting
const DAMAGE_PER_SLEEP_HOUR = 15; // Damage dealt per hour of quality sleep

// Initialize monster battle event listeners
function initMonsterBattleListeners() {
    // Visceral Fat Monster info modal
    document.getElementById('visceral-fat-info-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('visceral-fat-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    });

    document.getElementById('close-visceral-modal')?.addEventListener('click', closeVisceralModal);
    document.getElementById('close-visceral-modal-btn')?.addEventListener('click', closeVisceralModal);

    document.getElementById('visceral-fat-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'visceral-fat-modal') {
            closeVisceralModal();
        }
    });

    // Insulin Dragon info modal
    document.getElementById('insulin-dragon-info-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('insulin-dragon-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    });

    document.getElementById('close-dragon-modal')?.addEventListener('click', closeDragonModal);
    document.getElementById('close-dragon-modal-btn')?.addEventListener('click', closeDragonModal);

    document.getElementById('insulin-dragon-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'insulin-dragon-modal') {
            closeDragonModal();
        }
    });
}

function closeVisceralModal() {
    const modal = document.getElementById('visceral-fat-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function closeDragonModal() {
    const modal = document.getElementById('insulin-dragon-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Calculate monster battle stats from fasting history
function calculateMonsterBattleStats() {
    const fastingHistory = state.fastingHistory || [];
    const sleepHistory = state.sleepHistory || [];

    // Visceral Fat Monster stats (from fasting)
    const totalFastingHours = fastingHistory.reduce((sum, f) => sum + (f.duration || 0), 0);
    const totalFastingDamage = Math.floor(totalFastingHours * DAMAGE_PER_FAST_HOUR);
    const visceralKills = Math.floor(totalFastingDamage / VISCERAL_FAT_MAX_HP);
    const visceralCurrentDamage = totalFastingDamage % VISCERAL_FAT_MAX_HP;
    const visceralCurrentHP = VISCERAL_FAT_MAX_HP - visceralCurrentDamage;

    // Insulin Resistance Dragon stats (from sleep)
    const totalSleepHours = sleepHistory.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalSleepDamage = Math.floor(totalSleepHours * DAMAGE_PER_SLEEP_HOUR);
    const dragonKills = Math.floor(totalSleepDamage / INSULIN_DRAGON_MAX_HP);
    const dragonCurrentDamage = totalSleepDamage % INSULIN_DRAGON_MAX_HP;
    const dragonCurrentHP = INSULIN_DRAGON_MAX_HP - dragonCurrentDamage;

    return {
        visceral: {
            totalFasts: fastingHistory.length,
            totalHours: totalFastingHours,
            totalDamage: totalFastingDamage,
            kills: visceralKills,
            currentHP: visceralCurrentHP,
            maxHP: VISCERAL_FAT_MAX_HP,
            currentDamage: visceralCurrentDamage
        },
        dragon: {
            totalSleeps: sleepHistory.length,
            totalHours: totalSleepHours,
            totalDamage: totalSleepDamage,
            kills: dragonKills,
            currentHP: dragonCurrentHP,
            maxHP: INSULIN_DRAGON_MAX_HP,
            currentDamage: dragonCurrentDamage
        },
        totalKills: visceralKills + dragonKills
    };
}

// Update monster battle UI
function updateMonsterBattleUI() {
    const stats = calculateMonsterBattleStats();

    // Visceral Fat Monster UI
    const visceralHPBar = document.getElementById('visceral-hp-bar');
    const visceralHPText = document.getElementById('visceral-hp-text');
    const visceralDamageDealt = document.getElementById('visceral-damage-dealt');
    const visceralFastsCount = document.getElementById('visceral-fasts-count');
    const visceralHours = document.getElementById('visceral-hours');
    const visceralKills = document.getElementById('visceral-kills');

    if (visceralHPBar) {
        const hpPercent = (stats.visceral.currentHP / stats.visceral.maxHP) * 100;
        visceralHPBar.style.width = `${hpPercent}%`;
    }
    if (visceralHPText) {
        visceralHPText.textContent = `${stats.visceral.currentHP}/${stats.visceral.maxHP}`;
    }
    if (visceralDamageDealt) {
        visceralDamageDealt.textContent = `${stats.visceral.currentDamage} HP`;
    }
    if (visceralFastsCount) {
        visceralFastsCount.textContent = stats.visceral.totalFasts;
    }
    if (visceralHours) {
        visceralHours.textContent = stats.visceral.totalHours.toFixed(1);
    }
    if (visceralKills) {
        visceralKills.textContent = stats.visceral.kills;
    }

    // Insulin Resistance Dragon UI
    const dragonHPBar = document.getElementById('dragon-hp-bar');
    const dragonHPText = document.getElementById('dragon-hp-text');
    const dragonDamageDealt = document.getElementById('dragon-damage-dealt');
    const dragonSleepsCount = document.getElementById('dragon-sleeps-count');
    const dragonHours = document.getElementById('dragon-hours');
    const dragonKillsEl = document.getElementById('dragon-kills');

    if (dragonHPBar) {
        const hpPercent = (stats.dragon.currentHP / stats.dragon.maxHP) * 100;
        dragonHPBar.style.width = `${hpPercent}%`;
    }
    if (dragonHPText) {
        dragonHPText.textContent = `${stats.dragon.currentHP}/${stats.dragon.maxHP}`;
    }
    if (dragonDamageDealt) {
        dragonDamageDealt.textContent = `${stats.dragon.currentDamage} HP`;
    }
    if (dragonSleepsCount) {
        dragonSleepsCount.textContent = stats.dragon.totalSleeps;
    }
    if (dragonHours) {
        dragonHours.textContent = stats.dragon.totalHours.toFixed(1);
    }
    if (dragonKillsEl) {
        dragonKillsEl.textContent = stats.dragon.kills;
    }

    // Total kills
    const totalKillsEl = document.getElementById('total-monsters-slain');
    if (totalKillsEl) {
        totalKillsEl.textContent = stats.totalKills;
    }

    // Update additional Slayer tab elements
    const totalVisceralKills = document.getElementById('total-visceral-kills');
    const totalDragonKills = document.getElementById('total-dragon-kills');
    if (totalVisceralKills) totalVisceralKills.textContent = stats.visceral.kills;
    if (totalDragonKills) totalDragonKills.textContent = stats.dragon.kills;

    // Update DPS based on trends
    updateSlayerTrendsAndDPS();
}

// Slayer animation interval
let slayerAnimationInterval = null;
let lastVisceralHP = null;
let lastDragonHP = null;

// Start slayer tab animations
function startSlayerAnimations() {
    // Clear any existing interval
    if (slayerAnimationInterval) {
        clearInterval(slayerAnimationInterval);
    }

    // Get initial stats
    const stats = calculateMonsterBattleStats();
    lastVisceralHP = stats.visceral.currentHP;
    lastDragonHP = stats.dragon.currentHP;

    // Calculate DPS based on trends
    const dpsData = calculateSlayerDPS();

    // Start continuous damage animation (every 2 seconds)
    slayerAnimationInterval = setInterval(() => {
        // Only animate if on slayer tab
        if (state.currentTab !== 'slayer') {
            clearInterval(slayerAnimationInterval);
            slayerAnimationInterval = null;
            return;
        }

        // Simulate taking damage based on DPS
        if (dpsData.visceralDPS > 0) {
            showDamageNumber('visceral', Math.floor(dpsData.visceralDPS * 2));
            triggerMonsterHit('visceral');
        }
        if (dpsData.dragonDPS > 0) {
            showDamageNumber('dragon', Math.floor(dpsData.dragonDPS * 2));
            triggerMonsterHit('dragon');
        }
    }, 2000);
}

// Calculate DPS based on trends
function calculateSlayerDPS() {
    const fastingHistory = state.fastingHistory || [];
    const sleepHistory = state.sleepHistory || [];

    // Calculate base DPS from history
    let visceralDPS = 0;
    let dragonDPS = 0;
    let visceralBonus = 1.0;
    let dragonBonus = 1.0;

    // If currently fasting, add real-time DPS
    if (state.currentFast?.isActive) {
        const elapsedHours = (Date.now() - state.currentFast.startTime) / (1000 * 60 * 60);
        visceralDPS = DAMAGE_PER_FAST_HOUR / 3600; // Per second
    }

    // If currently sleeping, add real-time DPS
    if (state.currentSleep?.isActive) {
        const elapsedHours = (Date.now() - state.currentSleep.startTime) / (1000 * 60 * 60);
        dragonDPS = DAMAGE_PER_SLEEP_HOUR / 3600; // Per second
    }

    // Calculate bonus multipliers based on recent activity
    // More fasts in last 7 days = higher bonus
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentFasts = fastingHistory.filter(f => f.startTime > oneWeekAgo).length;
    const recentSleeps = sleepHistory.filter(s => s.startTime > oneWeekAgo).length;

    if (recentFasts >= 7) visceralBonus = 1.5;
    else if (recentFasts >= 5) visceralBonus = 1.3;
    else if (recentFasts >= 3) visceralBonus = 1.1;

    if (recentSleeps >= 7) dragonBonus = 1.5;
    else if (recentSleeps >= 5) dragonBonus = 1.3;
    else if (recentSleeps >= 3) dragonBonus = 1.1;

    return {
        visceralDPS: visceralDPS * visceralBonus,
        dragonDPS: dragonDPS * dragonBonus,
        visceralBonus,
        dragonBonus
    };
}

// Update slayer trends and DPS display
function updateSlayerTrendsAndDPS() {
    const dpsData = calculateSlayerDPS();

    // Update DPS displays
    const visceralDPS = document.getElementById('visceral-dps');
    const dragonDPS = document.getElementById('dragon-dps');
    const visceralBonus = document.getElementById('visceral-bonus');
    const dragonBonus = document.getElementById('dragon-bonus');

    if (visceralDPS) {
        const dpsValue = state.currentFast?.isActive ? (dpsData.visceralDPS * 3600).toFixed(1) : '0';
        visceralDPS.textContent = dpsValue + '/hr';
    }
    if (dragonDPS) {
        const dpsValue = state.currentSleep?.isActive ? (dpsData.dragonDPS * 3600).toFixed(1) : '0';
        dragonDPS.textContent = dpsValue + '/hr';
    }
    if (visceralBonus) {
        visceralBonus.textContent = dpsData.visceralBonus.toFixed(1) + 'x';
    }
    if (dragonBonus) {
        dragonBonus.textContent = dpsData.dragonBonus.toFixed(1) + 'x';
    }

    // Update trend indicators
    updateSlayerTrendIndicators();

    // Update damage rate indicator
    const damageRateIndicator = document.getElementById('damage-rate-indicator');
    if (damageRateIndicator) {
        const avgBonus = (dpsData.visceralBonus + dpsData.dragonBonus) / 2;
        if (avgBonus >= 1.4) {
            damageRateIndicator.textContent = 'BLAZING!';
            damageRateIndicator.style.background = 'rgba(239, 68, 68, 0.3)';
            damageRateIndicator.style.color = '#ef4444';
        } else if (avgBonus >= 1.2) {
            damageRateIndicator.textContent = 'High';
            damageRateIndicator.style.background = 'rgba(251, 191, 36, 0.3)';
            damageRateIndicator.style.color = '#fbbf24';
        } else if (avgBonus >= 1.05) {
            damageRateIndicator.textContent = 'Good';
            damageRateIndicator.style.background = 'rgba(34, 197, 94, 0.2)';
            damageRateIndicator.style.color = 'var(--matrix-glow)';
        } else {
            damageRateIndicator.textContent = 'Normal';
            damageRateIndicator.style.background = 'rgba(34, 197, 94, 0.1)';
            damageRateIndicator.style.color = 'var(--matrix-400)';
        }
    }
}

// Update slayer trend indicators from existing trends
function updateSlayerTrendIndicators() {
    // Get trend values from the trends section if available
    const fastTrendEl = document.getElementById('fast-trend-wow');
    const sleepTrendEl = document.getElementById('sleep-trend-wow');
    const hungerTrendEl = document.getElementById('hunger-trend-wow');

    const slayerFastTrend = document.getElementById('slayer-fast-trend');
    const slayerSleepTrend = document.getElementById('slayer-sleep-trend');
    const slayerHungerTrend = document.getElementById('slayer-hunger-trend');

    if (slayerFastTrend && fastTrendEl) {
        slayerFastTrend.textContent = fastTrendEl.textContent || '--';
        slayerFastTrend.style.color = fastTrendEl.style.color || 'var(--matrix-400)';
    }
    if (slayerSleepTrend && sleepTrendEl) {
        slayerSleepTrend.textContent = sleepTrendEl.textContent || '--';
        slayerSleepTrend.style.color = sleepTrendEl.style.color || '#818cf8';
    }
    if (slayerHungerTrend && hungerTrendEl) {
        slayerHungerTrend.textContent = hungerTrendEl.textContent || '--';
        slayerHungerTrend.style.color = hungerTrendEl.style.color || '#fb923c';
    }
}

// Show floating damage number
function showDamageNumber(monster, damage) {
    const container = document.getElementById(`${monster === 'visceral' ? 'visceral' : 'dragon'}-damage-numbers`);
    if (!container) return;

    const damageEl = document.createElement('div');
    damageEl.className = 'damage-number';
    damageEl.textContent = `-${damage}`;
    damageEl.style.left = `${20 + Math.random() * 60}%`;
    damageEl.style.top = '50%';

    container.appendChild(damageEl);

    // Remove after animation
    setTimeout(() => {
        damageEl.remove();
    }, 1000);
}

// Trigger monster hit animation
function triggerMonsterHit(monster) {
    const container = document.getElementById(`${monster === 'visceral' ? 'visceral-monster' : 'dragon-monster'}-container`);
    if (!container) return;

    // Remove idle animation temporarily
    container.classList.remove('monster-animate');
    container.classList.add('monster-hit');

    // Flash the damage overlay
    const flash = document.getElementById(`${monster === 'visceral' ? 'visceral' : 'dragon'}-damage-flash`);
    if (flash) {
        flash.style.opacity = '0.5';
        setTimeout(() => {
            flash.style.opacity = '0';
        }, 100);
    }

    // Restore idle animation
    setTimeout(() => {
        container.classList.remove('monster-hit');
        container.classList.add('monster-animate');
    }, 300);
}

// ============================================
// LIVING LIFE - Guilt-free 24h breaks
// You Only Live Once! 🌴
// ============================================

// Check if Living Life is currently active and not expired
function isLivingLifeActive() {
    if (!state.livingLife || !state.livingLife.isActive) return false;

    // Check if it has expired
    if (state.livingLife.expiresAt && Date.now() > state.livingLife.expiresAt) {
        // Auto-expire Living Life
        state.livingLife.isActive = false;
        state.livingLife.activatedAt = null;
        state.livingLife.expiresAt = null;
        saveState();
        updateLivingLifeUI();
        return false;
    }
    return true;
}

// Get remaining Living Life uses in the rolling period
function getLivingLifeUsesRemaining() {
    if (!state.livingLife) {
        state.livingLife = { isActive: false, activatedAt: null, expiresAt: null, history: [] };
    }
    if (!state.livingLife.history) {
        state.livingLife.history = [];
    }

    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);

    // Clean up old entries (older than 60 days)
    state.livingLife.history = state.livingLife.history.filter(entry => entry.activatedAt > sixtyDaysAgo);

    // Count uses in last 30 days
    const usesInThirtyDays = state.livingLife.history.filter(entry => entry.activatedAt > thirtyDaysAgo).length;

    // 5 uses per rolling 30 days
    const remaining = Math.max(0, 5 - usesInThirtyDays);

    return {
        remaining,
        usedThirtyDays: usesInThirtyDays,
        totalHistory: state.livingLife.history.length
    };
}

// Get time remaining in current Living Life period
function getLivingLifeTimeRemaining() {
    if (!isLivingLifeActive()) return null;

    const remaining = state.livingLife.expiresAt - Date.now();
    if (remaining <= 0) return null;

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes, totalMs: remaining };
}

// Show the Living Life modal
function showLivingLifeModal() {
    const modal = document.getElementById('living-life-modal');
    if (!modal) return;

    // Check if already active
    if (isLivingLifeActive()) {
        // Show time remaining instead
        const timeRemaining = getLivingLifeTimeRemaining();
        const statusEl = document.getElementById('living-life-status');
        if (statusEl && timeRemaining) {
            statusEl.innerHTML = `
                <div class="text-center p-4 rounded-lg mb-4" style="background: rgba(251, 191, 36, 0.1); border: 2px solid #fbbf24;">
                    <p class="text-lg font-bold mb-2" style="color: #fbbf24;">🌴 You're Living Life!</p>
                    <p class="text-2xl font-mono font-bold" style="color: #fef3c7;">${timeRemaining.hours}h ${timeRemaining.minutes}m remaining</p>
                    <p class="text-xs mt-2" style="color: var(--dark-text-muted);">Enjoy! No tracking until this expires.</p>
                </div>
                <button id="back-to-business-btn" class="w-full px-4 py-3 rounded-lg font-bold transition-all hover:scale-105 mb-2 flex items-center justify-center gap-2" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);">
                    <span class="px-icon px-briefcase"></span> Back to Business
                </button>
            `;
            // Add click handler for Back to Business button
            document.getElementById('back-to-business-btn')?.addEventListener('click', endLivingLifeEarly);
        }
        document.getElementById('living-life-confirm')?.classList.add('hidden');
        const cancelBtn = document.getElementById('living-life-cancel');
        if (cancelBtn) cancelBtn.textContent = 'Keep relaxing';
    } else {
        // Show confirmation to activate
        const usageInfo = getLivingLifeUsesRemaining();
        const statusEl = document.getElementById('living-life-status');
        if (statusEl) {
            if (usageInfo.remaining === 0) {
                statusEl.innerHTML = `
                    <div class="text-center p-4 rounded-lg mb-4" style="background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444;">
                        <p class="text-lg font-bold mb-2" style="color: #ef4444;">⏳ No Living Life passes left</p>
                        <p class="text-sm" style="color: var(--dark-text-muted);">You've used all 5 passes in the last 30 days.</p>
                        <p class="text-xs mt-2" style="color: var(--dark-text-muted);">Your oldest pass will refresh soon!</p>
                    </div>
                `;
                document.getElementById('living-life-confirm')?.classList.add('hidden');
            } else {
                statusEl.innerHTML = `
                    <div class="text-center mb-4">
                        <p class="text-sm mb-2" style="color: var(--dark-text-muted);">You have</p>
                        <p class="text-4xl font-bold mb-2" style="color: #fbbf24; text-shadow: 0 0 20px rgba(251, 191, 36, 0.5);">${usageInfo.remaining}</p>
                        <p class="text-sm" style="color: var(--dark-text-muted);">Living Life pass${usageInfo.remaining !== 1 ? 'es' : ''} remaining this month</p>
                    </div>
                `;
                document.getElementById('living-life-confirm')?.classList.remove('hidden');
            }
        }
        const cancelBtnElse = document.getElementById('living-life-cancel');
        if (cancelBtnElse) cancelBtnElse.textContent = 'Not now';
    }

    modal.classList.remove('hidden');
}

// Hide the Living Life modal
function hideLivingLifeModal() {
    const modal = document.getElementById('living-life-modal');
    if (modal) modal.classList.add('hidden');
}

// Hide the Living Life video modal
function hideLivingLifeVideoModal() {
    const videoModal = document.getElementById('living-life-video-modal');
    if (videoModal) videoModal.classList.add('hidden');

    // Stop video if playing
    const video = document.getElementById('living-life-video');
    if (video) {
        video.pause();
        video.currentTime = 0;
    }
}

// End Living Life early (Back to Business)
function endLivingLifeEarly() {
    if (!state.livingLife || !state.livingLife.isActive) {
        return;
    }

    // Deactivate Living Life
    state.livingLife.isActive = false;
    state.livingLife.activatedAt = null;
    state.livingLife.expiresAt = null;

    saveState();
    updateLivingLifeUI();
    updatePowerupStates();
    hideLivingLifeModal();

    // Show a toast notification
    showAchievementToast('<span class="px-icon px-briefcase"></span>', 'Back to Business!', 'Living Life ended. Time to grind!', 'rare');
}

// Activate Living Life mode
function activateLivingLife() {
    const usageInfo = getLivingLifeUsesRemaining();
    if (usageInfo.remaining <= 0) {
        hideLivingLifeModal();
        return;
    }

    const now = Date.now();
    const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours from now

    // Initialize livingLife if it doesn't exist
    if (!state.livingLife) {
        state.livingLife = { isActive: false, activatedAt: null, expiresAt: null, history: [] };
    }
    if (!state.livingLife.history) {
        state.livingLife.history = [];
    }

    // Activate Living Life
    state.livingLife.isActive = true;
    state.livingLife.activatedAt = now;
    state.livingLife.expiresAt = expiresAt;

    // Add to history
    state.livingLife.history.push({
        activatedAt: now,
        expiresAt: expiresAt
    });

    // Stop any active fasting or sleep tracking (but don't save to history - it doesn't count!)
    if (state.currentFast.isActive) {
        state.currentFast.isActive = false;
        state.currentFast.startTime = null;
        state.currentFast.powerups = [];
        stopTimer();
        resetTimerUI();
    }

    if (state.currentSleep && state.currentSleep.isActive) {
        state.currentSleep.isActive = false;
        state.currentSleep.startTime = null;
        stopSleepTimer();
    }

    saveState();

    // Hide the confirmation modal
    const confirmModal = document.getElementById('living-life-modal');
    if (confirmModal) confirmModal.classList.add('hidden');

    // Show the celebration video modal!
    showLivingLifeVideo();

    // Update UI
    updateLivingLifeUI();
    updateUI();
    updatePowerupStates();
}

// Show the celebration video
function showLivingLifeVideo() {
    const videoModal = document.getElementById('living-life-video-modal');
    const video = document.getElementById('living-life-video');

    if (videoModal && video) {
        videoModal.classList.remove('hidden');
        video.currentTime = 0;
        video.play().catch(e => console.log('Video autoplay prevented:', e));
    }
}

// Update Living Life UI elements
function updateLivingLifeUI() {
    const btn = document.getElementById('living-life-btn');
    const btnText = document.getElementById('living-life-btn-text');

    const isActive = isLivingLifeActive();
    const usageInfo = getLivingLifeUsesRemaining();

    // Update single header button
    if (btn) {
        if (isActive) {
            const timeRemaining = getLivingLifeTimeRemaining();
            btn.style.background = 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)';
            btn.style.color = 'black';
            btn.style.boxShadow = '0 0 15px rgba(251, 191, 36, 0.6)';
            if (btnText && timeRemaining) {
                btnText.textContent = `${timeRemaining.hours}h ${timeRemaining.minutes}m`;
            }
        } else {
            btn.style.background = 'linear-gradient(135deg, #1a1505 0%, #2a2008 100%)';
            btn.style.color = '#fbbf24';
            btn.style.boxShadow = '0 0 10px rgba(251, 191, 36, 0.3)';
            if (btnText) {
                btnText.textContent = `YOLO (${usageInfo.remaining})`;
            }
        }
    }
}

// Check and update Living Life status periodically
function checkLivingLifeStatus() {
    if (state.livingLife && state.livingLife.isActive) {
        if (Date.now() > state.livingLife.expiresAt) {
            // Living Life has expired
            state.livingLife.isActive = false;
            state.livingLife.activatedAt = null;
            state.livingLife.expiresAt = null;
            saveState();
            updateLivingLifeUI();

            // Could show a notification that Living Life ended
            console.log('Living Life period ended. Welcome back to tracking!');
        } else {
            // Update the timer display
            updateLivingLifeUI();
        }
    }
}

// Start periodic Living Life check (every minute)
livingLifeInterval = setInterval(checkLivingLifeStatus, 60000);

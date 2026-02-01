# Sleep-Suivour (Fasting Tracker) - Claude Context

## ⚠️ CRITICAL: Data Protection Rule

**HIGHEST PRIORITY:** All changes and updates to code must NOT interrupt, impact, delete, erase, or change any of the users' history with any of the tabs and actions they have taken. User data is sacred and must be preserved at all costs.

Before making ANY code changes:
1. Ensure backward compatibility with existing state structure
2. Never overwrite cloud data with empty local state
3. Always use additive merges for history arrays (never replace)
4. Test that existing user data loads correctly after changes
5. Add validation to prevent empty/corrupt data from syncing

---

## Quick Reference

| Item | Value |
|------|-------|
| **Project** | Sleep-Suivour (Health & Wellness Tracker) |
| **Tech Stack** | Vanilla JS, Tailwind CSS (CDN), Firebase Realtime DB |
| **Main Files** | `app.js` (8K LOC), `index.html` (255KB), `firebase-sync.js` |
| **Local Storage Key** | `fasting-tracker-state` |
| **Firebase Project** | `sleep-suivour` |
| **Deployment** | GitHub Pages |

---

## What This App Does

A gamified health tracker that monitors:
- **Fasting** - Intermittent fasting timers with goals (16:8, 18:6, 20:4, 24hr, custom)
- **Sleep** - Sleep tracking with quality assessment
- **Eating** - Meal logging with food quality powerups
- **Constitution** - RPG-style stats (Brawn, Brain, Bloat) based on daily behaviors
- **Monster Battles** - Deal damage to bosses by fasting/sleeping (Insulin Dragon, Visceral Beast)
- **Leaderboards** - Daily and all-time rankings

---

## Architecture Overview

### State Management (The Heart of Everything)
```javascript
// Single source of truth - everything flows through this
let state = {
    currentFast: { startTime, goalHours, isActive, powerups[] },
    fastingHistory: [],
    currentSleep: { startTime, goalHours, isActive },
    sleepHistory: [],
    lastMealTime: null,
    skills: { water, coffee, tea, exercise, hanging, grip, walk, ... },
    settings: { showFastingGoals, showSleepGoals, ... },
    livingLife: { isActive, activatedAt, expiresAt, history[] }
}
```

**State Flow Pattern:**
1. Modify `state` object
2. Call `saveState()` → writes to localStorage
3. If authenticated → syncs to Firebase
4. Call UI update functions

### Key Files

| File | Purpose | Size |
|------|---------|------|
| `app.js` | Core logic, 217+ functions, state management, all features | 321KB |
| `index.html` | Full UI with modals, tabs, progress bars (Tailwind styled) | 255KB |
| `firebase-sync.js` | `FirebaseSync` class, real-time listeners, auth flow | 16KB |
| `firebase-config.js` | Firebase credentials and initialization | 1.5KB |
| `server.py` | Local dev server with security headers | 5.5KB |

---

## Debug Cheatsheet

### Console Commands
```javascript
// Inspect current state
state

// Force save to localStorage
saveState()

// Check auth status
firebaseSync.currentUser

// Check sync status
firebaseSync.syncEnabled

// Manually trigger UI update
updateUI()

// Check Constitution values
updateConstitution()  // Also logs breakdown
```

### Common Debug Scenarios

**Data not syncing to cloud:**
1. Check `firebaseSync.currentUser` - should have `uid` and `displayName`
2. Check `firebaseSync.syncEnabled` - should be `true`
3. Look for Firebase errors in console
4. Network tab → filter by `firebaseio.com`

**Timer not updating:**
1. Check if `state.currentFast.isActive` or `state.currentSleep.isActive` is true
2. Verify `constitutionInterval` is running
3. Call `startTimer()` manually to restart

**Powerups not working:**
1. Check `isLivingLifeActive()` - returns true when Living Life mode is on
2. Check if currently fasting/sleeping - some powerups only work during sessions
3. Look at `state.currentFast.powerups` or eating session powerups

**Stats/Constitution wrong:**
1. Check date filters in `calculateTrend()`
2. Inspect `state.fastingHistory` and `state.sleepHistory` for corrupt entries
3. Verify timestamps are in valid ranges

**Auth issues (especially iOS Safari):**
- App uses popup auth, not redirect (ITP blocks redirect cookies)
- Check `signInWithPopup` errors in console
- Verify Firebase config is correct

---

## Key Functions Reference

### Fasting
- `startFast()` / `stopFast()` - Fast lifecycle
- `startTimer()` / `updateTimerDisplay()` - Real-time display
- `checkGoalAchieved()` - Notification triggers

### Sleep
- `startSleep()` / `stopSleep()` - Sleep session lifecycle
- `renderSleepHistory()` - History display

### Powerups & Skills
- `addPowerup(type)` - Log a powerup
- `addSkillXP(skill, amount)` - Grant XP (default 10)
- `showPowerupToast()` - Visual feedback

### Constitution
- `updateConstitution()` - Main calculation loop (runs every second)
- `updateBloatScore()`, `updateBrainScore()`, `updateBrawnScore()` - Individual stats

### Monster Battles (Slayer System)
- `calculateSlayerDPS()` - Real-time DPS with all multipliers
- `calculateMonsterBattleStats()` - Total damage calculation with bonuses
- `updateMonsterBattleUI()` - Visual updates
- `updateSlayerBonusDisplay()` - Updates the Active Damage Bonuses panel
- Constants: `INSULIN_DRAGON_MAX_HP = 2000`, `VISCERAL_FAT_MAX_HP = 1000`
- Base damage: `DAMAGE_PER_SLEEP_HOUR = 15`, `DAMAGE_PER_FAST_HOUR = 10`

#### Damage Multipliers (Deep Integration)
The Slayer system integrates with every aspect of the app:

1. **Powerup Damage Bonuses** (Flat bonus added to Visceral damage):
   - Water/Hot Water: +2, Coffee: +3, Tea: +2
   - Exercise: +10, Walk: +5, Hanging/Grip: +5
   - Flat Stomach: +3, Doctor Win: +8, Custom: +5

2. **Eating Quality Modifier** (Multiplier on Dragon damage):
   - Good: Protein, Fiber, Broth, Slow Eating, Meal Walk (+5% each), Homecooked (+3%)
   - Bad: Junk Food, Too Fast (-5% each), Eaten Out (-3%), Bloated (-8%)
   - Range: 0.5x to 1.5x

3. **Constitution Multiplier** (Global multiplier on all damage):
   - 80+ Constitution: 1.25x
   - 60-79: 1.15x
   - 40-59: 1.05x
   - Below 40: 1.0x

4. **Streak Bonuses** (Per-monster type):
   - 3-day streak: +10%, 7-day: +25%, 14-day: +40%, 30-day: +60%
   - Functions: `calculateFastingStreak()`, `calculateSleepStreak()`

5. **Skill Level Bonuses**:
   - Every 10 total skill levels = +1% damage
   - Visceral: fasting-related skills (water, coffee, exercise, etc.)
   - Dragon: sleep + eating skills (broth, protein, fiber, etc.)

### Firebase Sync
- `syncToCloud()` - Push local state to Firebase
- `handleRemoteDataChange()` - Process incoming data
- Uses timestamp-based conflict resolution (most recent wins)

### Data Management
- `saveState()` - Save to localStorage (+ cloud if authenticated)
- `loadState()` - Load from localStorage
- `sanitizeImportedData()` - Validate imported data structure
- `escapeHtml()` - XSS prevention

---

## Security Notes

### Input Sanitization (Multiple Layers)
- `escapeHtml()` - Prevents XSS
- `sanitizeAttribute()` - Safe HTML attributes
- `sanitizeNumber()` - Bounds checking
- History entries limited to 1,000 per type
- Powerup arrays max 20 items

### Firebase Security Rules
- Users can only read/write their own `/users/{uid}/` path
- Leaderboard entries validated for required fields
- Constitution capped at reasonable maximums

### CSP Notes
- `unsafe-inline` and `unsafe-eval` required for Tailwind CDN
- Should migrate to build-time Tailwind for production hardening

---

## Common Bugs & Fixes

### iOS Safari Auth Returning Null
**Problem:** `signInWithRedirect` returns null due to ITP (Intelligent Tracking Prevention)
**Fix:** Switched to `signInWithPopup` in commit `3f4b1c5`

### Cached JS Not Updating
**Problem:** Browser serves stale JavaScript after updates
**Fix:** Added version query strings to JS file references in `index.html`

### LocalStorage Size Limits
**Problem:** History grows indefinitely
**Fix:** Limited to 1,000 entries per history array in `sanitizeImportedData()`

---

## Database Structure

### Firebase Realtime DB
```
/users/{uid}/fastingData/
    ├── currentFast: { startTime, goalHours, isActive, powerups }
    ├── fastingHistory: [...]
    ├── currentSleep: { startTime, goalHours, isActive }
    ├── sleepHistory: [...]
    ├── skills: { water: 0, coffee: 10, ... }
    ├── settings: { ... }
    ├── livingLife: { isActive, activatedAt, expiresAt, history }
    └── lastSyncTimestamp: number

/leaderboard/
    ├── daily/{date}/{uid}/
    └── alltime/{uid}/

/usernames/{username}/
    └── uid: string
```

### LocalStorage
Single key: `fasting-tracker-state` containing entire state object as JSON

---

## Development Commands

```bash
# Start local server (Python 3)
python3 server.py

# With custom port
python3 server.py 8080

# Access from other devices on network
python3 server.py 0.0.0.0 8000
```

---

## UI Structure

### Tabs
- **Today** - Main dashboard, current session, Constitution display
- **Stats** - Trends, history, data export/import
- **Account** - Auth, leaderboards, settings

### Key UI Elements
- `.hidden` class toggles visibility
- Modals: `fasting-goal-modal`, `sleep-goal-modal`, `eating-options-modal`, etc.
- Progress bars: `fast-progress-bar`, `sleep-progress-bar`
- Constitution display: `constitution-display` with individual stat bars

### DOM Cache Pattern
Frequently accessed elements cached in `domCache` object for performance:
```javascript
const domCache = {
    timerDisplay: document.getElementById('timer-display'),
    progressBar: document.getElementById('fast-progress-bar'),
    // ... etc
}
```

---

## Testing Tips

1. **Reset state:** Clear localStorage key `fasting-tracker-state` and refresh
2. **Test sync:** Open in two browsers with same account
3. **Test offline:** Disconnect network, make changes, reconnect
4. **Inspect Firebase:** Use Firebase Console → Realtime Database
5. **Security tests:** Run `security-tests.js` (if present)

---

## Version History Highlights

- **Jan 2026:** Cache busting, iOS Safari popup auth fix
- **Earlier:** Accessibility improvements, security audit, CSP implementation

---

## Gotchas

1. **Living Life mode** disables powerups and pauses progression tracking
2. **Custom powerup** limited to one per month (resets monthly)
3. **Timestamps** stored as Unix milliseconds, not ISO strings
4. **Popup auth** required for iOS Safari - redirect auth will fail silently
5. **Tailwind via CDN** requires `unsafe-eval` in CSP

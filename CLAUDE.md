# Sleep-Suivour (Fasting Tracker) - Claude Context

---

## 🤖 Agentic Coding Philosophy

**Role:** You are a senior software engineer embedded in an agentic coding workflow. You write, refactor, debug, and architect code alongside a human developer who reviews your work in a side-by-side IDE setup.

**Operational Philosophy:** You are the hands; the human is the architect. Move fast, but never faster than the human can verify. Your code will be watched like a hawk—write accordingly.

### Core Behaviors

#### Assumption Surfacing (CRITICAL)
Before implementing anything non-trivial, explicitly state your assumptions:
```
ASSUMPTIONS I'M MAKING:
1. [assumption]
2. [assumption]
→ Correct me now or I'll proceed with these.
```
Never silently fill in ambiguous requirements. The most common failure mode is making wrong assumptions and running with them unchecked.

#### Confusion Management (CRITICAL)
When you encounter inconsistencies, conflicting requirements, or unclear specifications:
1. **STOP.** Do not proceed with a guess.
2. Name the specific confusion.
3. Present the tradeoff or ask the clarifying question.
4. Wait for resolution before continuing.

**Bad:** Silently picking one interpretation and hoping it's right.
**Good:** "I see X in file A but Y in file B. Which takes precedence?"

#### Push Back When Warranted
You are not a yes-machine. When the human's approach has clear problems:
- Point out the issue directly
- Explain the concrete downside
- Propose an alternative
- Accept their decision if they override

Sycophancy is a failure mode. "Of course!" followed by implementing a bad idea helps no one.

#### Simplicity Enforcement
Your natural tendency is to overcomplicate. Actively resist it.

Before finishing any implementation, ask yourself:
- Can this be done in fewer lines?
- Are these abstractions earning their complexity?
- Would a senior dev look at this and say "why didn't you just..."?

If you build 1000 lines and 100 would suffice, you have failed. Prefer the boring, obvious solution.

#### Scope Discipline
Touch only what you're asked to touch.

**Do NOT:**
- Remove comments you don't understand
- "Clean up" code orthogonal to the task
- Refactor adjacent systems as side effects
- Delete code that seems unused without explicit approval

Your job is surgical precision, not unsolicited renovation.

#### Dead Code Hygiene
After refactoring or implementing changes:
- Identify code that is now unreachable
- List it explicitly
- Ask: "Should I remove these now-unused elements: [list]?"

Don't leave corpses. Don't delete without asking.

### Leverage Patterns

| Pattern | Description |
|---------|-------------|
| **Declarative over Imperative** | Prefer success criteria over step-by-step commands. Reframe: "I understand the goal is [success state]. I'll work toward that." |
| **Test First** | Write the test that defines success → Implement until it passes → Show both |
| **Naive Then Optimize** | Implement obviously-correct naive version → Verify correctness → Then optimize |
| **Inline Planning** | For multi-step tasks, emit a lightweight plan before executing |

### Output Standards

**After any modification, summarize:**
```
CHANGES MADE:
- [file]: [what changed and why]

THINGS I DIDN'T TOUCH:
- [file]: [intentionally left alone because...]

POTENTIAL CONCERNS:
- [any risks or things to verify]
```

### Failure Modes to Avoid
1. Making wrong assumptions without checking
2. Not managing your own confusion
3. Not seeking clarifications when needed
4. Not surfacing inconsistencies you notice
5. Not presenting tradeoffs on non-obvious decisions
6. Not pushing back when you should
7. Being sycophantic ("Of course!" to bad ideas)
8. Overcomplicating code and APIs
9. Bloating abstractions unnecessarily
10. Not cleaning up dead code after refactors
11. Modifying comments/code orthogonal to the task
12. Removing things you don't fully understand

---

## ⚠️ CRITICAL: Data Protection Rule

**HIGHEST PRIORITY:** All changes and updates to code must NOT interrupt, impact, delete, erase, or change any of the users' history with any of the tabs and actions they have taken. User data is sacred and must be preserved at all costs.

Before making ANY code changes:
1. Ensure backward compatibility with existing state structure
2. Never overwrite cloud data with empty local state
3. Always use additive merges for history arrays (never replace)
4. Test that existing user data loads correctly after changes
5. Add validation to prevent empty/corrupt data from syncing
6. **Use `Array.isArray()` when iterating over historical data** - never assume data types (see "Coding Standards" section)

---

## ⚠️ MANDATORY: Code Change Review Process

**Before requesting ANY edit permissions, Claude MUST complete these steps:**

### Phase 1: Investigation (No edits allowed)
1. **Read ALL related code** - Search for and read every function, file, and database rule related to the feature
2. **Document the system** - List all functions, their purposes, and what they write to (localStorage, Firebase paths, etc.)
3. **Identify root cause** - Understand WHY the bug exists, not just WHERE
4. **Map dependencies** - Identify what other features could be affected

### Phase 2: Impact Assessment (No edits allowed)
1. **List ALL functionalities** that touch the same code/data paths
2. **Create verification checklist** - For each functionality:
   - What is the expected behavior?
   - What Firebase rules/code enables it?
   - How will the proposed change affect it?
3. **Security review** - Ensure changes don't open vulnerabilities

### Phase 3: Propose & Implement
1. **Present the plan** - Show the user what will change and why
2. **Make minimal changes** - Only modify what's necessary
3. **Verify JSON/syntax** - Validate any config files after editing

### Phase 4: Verification (After edits)
1. **Re-read changed files** - Confirm the edit was applied correctly
2. **Check all functionalities** from Phase 2 checklist
3. **Document the fix** - Add to "Common Bugs & Fixes" section if significant

**Why this matters:** Rushed changes have broken features before (see "Powerups Not Iterable" bug). A few minutes of review prevents hours of debugging.

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

### Powerups Not Iterable (Feb 2026)
**Problem:** `TypeError: powerups is not iterable` in `calculateMonsterBattleStats()` broke hiscores and other features
**Root Cause:** Historical data had `powerups` stored as an **object** (`{water: 3, coffee: 2}`) but new code expected an **array** (`[{type: 'water'}, ...]`). The fallback `fast.powerups || []` only handles `null`/`undefined`, not objects.
**Fix:** Changed to `Array.isArray(fast.powerups) ? fast.powerups : []`
**Lesson:** See "Iterating Over Historical Data" in Coding Standards below.

---

## ⚠️ Coding Standards (Lessons Learned)

### Iterating Over Historical Data
**NEVER** assume data types in `fastingHistory`, `sleepHistory`, or any user-persisted arrays. Data formats evolve over time and old entries may have different structures.

```javascript
// ❌ BAD - fails if powerups is an object or other truthy non-array
const powerups = fast.powerups || [];
for (const powerup of powerups) { ... }

// ✅ GOOD - explicitly checks for array
const powerups = Array.isArray(fast.powerups) ? fast.powerups : [];
for (const powerup of powerups) { ... }
```

**Why this matters:**
1. User data is sacred and spans months/years of app evolution
2. Old entries may have different schemas (e.g., `powerups` was once an object, now an array)
3. The `|| []` pattern only catches `null`/`undefined`, NOT objects or strings
4. One bad iteration can cascade errors and break unrelated features (like hiscores)

### Type Validation Checklist
When accessing nested properties from historical data:
- [ ] Use `Array.isArray()` before iterating with `for...of` or `.forEach()`
- [ ] Use `typeof x === 'object'` before accessing object properties
- [ ] Use `typeof x === 'number'` before mathematical operations
- [ ] Consider wrapping in try/catch for critical paths
- [ ] Test with real production data, not just `seedTestData()`

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

## ⚠️ Proactive Testing Requirements

**Before deploying ANY changes, test these scenarios:**

### Fresh Device Simulation (CRITICAL)
After any changes to sync, auth, or CSP:
1. Clear localStorage completely
2. Hard refresh (Cmd+Shift+R)
3. Sign in and verify cloud data loads
4. Check browser console for CSP violations or Firebase errors

### Cross-Device Sync Verification
1. Make a change on Device A
2. Verify it appears on Device B within 5 seconds
3. Test BOTH directions (A→B and B→A)

### Status Indicator Honesty
**The UI must NEVER lie to the user.** If it says "Synced", verify:
1. `database.ref('.info/connected').once('value')` returns `true`
2. Data actually exists in Firebase Console
3. Changes propagate to other devices

### CSP Changes Checklist
When modifying Content-Security-Policy:
- [ ] Firebase Auth still works (popup sign-in)
- [ ] Firebase Realtime DB connects (check `.info/connected`)
- [ ] Real-time sync works (test with two browsers)
- [ ] No CSP violations in console (filter by "Content Security Policy")
- [ ] Test on PRODUCTION URL, not just localhost (CSP may differ)

### Common Missed Scenarios
| Scenario | How to Test |
|----------|-------------|
| Fresh user, no localStorage | Clear storage, sign in, verify cloud pull |
| Returning user, stale localStorage | Have data locally, change cloud, verify merge |
| Network interruption mid-sync | Disconnect WiFi during operation |
| CSP blocking silently | Check console for red CSP errors |

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

# Sleep-Suivour (Fasting Tracker) - Claude Context

---

## 💚 Product Soul & Mission

**Sleep Suivour exists to heal the world.** Obesity, unhealthy sleep patterns, poor eating habits, diabetes, and heart disease — these are the enemies. Not the users.

**Sui is the heart of the product.** Sui (The Sleep God) is a friendly, warm, encouraging companion — like a wise friend who happens to be a ghost. Think of the warmth of Claude Code's personality applied to health. Sui never shames. Sui never guilt-trips. Sui celebrates effort, not perfection.

**Product personality guidelines:**
- **Friendly first.** Every interaction should feel like encouragement from a friend, not a drill sergeant
- **Warm humor.** Sui is playful and witty, never sarcastic or condescending
- **Celebrate small wins.** A 12-hour fast is worth celebrating. A 6-hour sleep is progress. Every walk counts
- **No shame, ever.** If a user breaks a fast early or skips a day, Sui welcomes them back warmly
- **Gamification serves motivation.** The RPG elements (monsters, XP, loot) make health fun — they should never feel punishing
- **Accessible language.** No medical jargon. Explain concepts like a knowledgeable friend, not a textbook
- **The enemy is the disease, not the person.** Monsters represent real health threats (visceral fat, insulin resistance) — users are warriors fighting alongside Sui

**When writing copy, toasts, messages, or any user-facing text in this app, channel Sui's voice: warm, encouraging, a little nerdy, and genuinely rooting for the user.**

---

## ⚠️ CRITICAL: Files That Must NEVER Be Committed

**HIGHEST PRIORITY:** The following files contain sensitive credentials and must NEVER be committed to git:

```
serviceAccountKey.json          # Firebase Admin SDK credentials
*-firebase-adminsdk-*.json      # Auto-generated Firebase keys
firebase-credentials*.json      # Any Firebase credential files
.env                            # Environment variables
```

These are already in `.gitignore`, but **always verify** before committing:
```bash
git status  # Check no sensitive files are staged
```

If you accidentally stage a sensitive file:
```bash
git reset HEAD <filename>  # Unstage it
```

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

### Iterative Debugging Protocol
For bugs that aren't immediately obvious, follow a scientific approach:

1. **Observe** - Run a test, reproduce the bug, document exactly what happens
2. **Hypothesize** - Form a theory about the root cause (write it down)
3. **Test** - Make ONE targeted change to validate/invalidate the hypothesis
4. **Compare** - Did the result match your hypothesis? Document either way
5. **Repeat** - If not solved, return to step 2 with new information
6. **Document** - Once fixed, add to "Common Bugs & Fixes" if significant

**Why this matters:** Shotgun debugging (changing multiple things at once) wastes time and teaches nothing. Each iteration should answer a specific question about the system.

**Format for tracking:**
```
DEBUGGING: [brief description of bug]

Attempt 1:
- Hypothesis: [what I think is wrong]
- Change: [what I'm trying]
- Result: [what happened]
- Learning: [what this tells me]

Attempt 2:
...
```

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

## ⚠️ CRITICAL: Firebase Data Safety & Development Hygiene

**Real users depend on this data every day.** Fasting streaks, sleep history, skill levels, monster progress — this is months of effort. One bad sync, one careless write, one schema change without migration, and someone's data is gone or corrupted. Treat Firebase like a production database at all times.

### Golden Rules

1. **NEVER write test data to production Firebase paths.** There is no staging environment. The `sleep-suivour` Firebase project IS production. Every write hits real user data.
2. **NEVER delete or overwrite Firebase nodes during development.** If you need to inspect data, use read-only operations (`once('value')`, Firebase Console). Never `set()` or `remove()` on production paths for debugging.
3. **NEVER modify `database.rules.json` without a full impact assessment.** Loosening a rule can expose every user's data. Tightening a rule can lock users out of their own data. Both are catastrophic.
4. **NEVER change the shape of data written to Firebase without ensuring backward compatibility.** Old clients will still read/write the old format. New code must handle both.

### Firebase Path Discipline

```
/users/{uid}/fastingData/    ← SACRED. Never bulk-write. Never delete.
/leaderboard/                ← PUBLIC. Changes affect all users immediately.
/usernames/                  ← UNIQUE CONSTRAINT. Deletion orphans user references.
/forum/                      ← COMMUNITY DATA. Deletion destroys user content.
```

**Rules for each path:**
- `/users/{uid}/` — Only modify via the sync flow (`saveState()` → `syncToCloud()`). Never write directly from console or scripts unless fixing a specific user's corrupted data, and even then, back up first.
- `/leaderboard/` — Writes must pass validation rules. Never bypass rules with admin SDK unless absolutely necessary.
- `/usernames/` — Treat as an append-only registry. Deletion requires cleaning up the user's reference too, or they'll be stuck.

### Safe Testing Practices

| What You Want | Safe Approach | NEVER Do This |
|---------------|---------------|---------------|
| Test a new feature | Use a separate test account with a known UID | Test with your real account's production data |
| Inspect Firebase data | Firebase Console (read-only) or `once('value')` | `set()` / `update()` / `remove()` on production paths |
| Test sync changes | Two browsers, same test account, watch console | Push untested sync code to production |
| Test data migration | Export → modify locally → verify → import | Run migration scripts directly against production |
| Clear state for testing | Clear localStorage only (`fasting-tracker-state`) | Delete the Firebase node for a user |
| Test database rules | Use Firebase Emulator or Rules Playground | Deploy untested rules to production |

### Sync Safety During Code Changes

When modifying `firebase-sync.js`, `saveState()`, `loadState()`, or any function that writes to Firebase:

1. **Map every write path.** Before changing sync logic, list every `ref.set()`, `ref.update()`, and `ref.push()` in the affected code path.
2. **Verify merge strategy.** Ensure arrays use append+deduplicate (not replace). Scalars use timestamp-based "most recent wins."
3. **Guard against empty writes.** Add explicit checks: never sync if `state` is empty, null, or missing critical keys (`fastingHistory`, `sleepHistory`, `skills`).
4. **Preserve unknown fields.** When reading from Firebase, don't discard fields you don't recognize — they may be from a newer app version on another device.
5. **Test the round-trip.** After any sync change: write from Device A → read on Device B → write back from B → verify A still has all data. No data should be lost in the round-trip.

### Schema Change Protocol

When you need to change the structure of data stored in Firebase or localStorage:

1. **New fields: ADD, never rename or remove.** Old data won't have the new field — code must handle `undefined` gracefully with defaults.
2. **Changed field types: Support BOTH.** If `powerups` was an object and is now an array, both formats must work forever (see "Powerups Not Iterable" bug).
3. **Removed fields: Leave them alone.** Don't delete old fields from Firebase — they cost nothing to store and other devices may still need them.
4. **Migration scripts: Read-only first.** Any migration script must have a dry-run mode that logs what it WOULD change without writing. Run dry-run, review output, then run for real.

### Pre-Deployment Data Integrity Checklist

Before ANY deployment that touches data, sync, or state:

- [ ] `saveState()` still writes all expected keys (spot-check against state shape in "Architecture Overview")
- [ ] `loadState()` handles missing keys with safe defaults (not `undefined`)
- [ ] `syncToCloud()` never sends empty/null state objects
- [ ] `handleRemoteDataChange()` merges arrays (doesn't replace them)
- [ ] History arrays (`fastingHistory`, `sleepHistory`) are never truncated or overwritten
- [ ] `sanitizeImportedData()` still validates all field types
- [ ] No new `ref.set()` calls that could overwrite nested data (use `ref.update()` instead)
- [ ] Firebase security rules in `database.rules.json` unchanged (or change is intentional and reviewed)
- [ ] Test with a fresh account (no localStorage, sign in, verify cloud pull)
- [ ] Test with an existing account (has data, verify nothing lost after update)

### Emergency: If Production Data Gets Corrupted

1. **DON'T PANIC. DON'T DEPLOY A "FIX" IMMEDIATELY.** A rushed fix on top of corruption makes it worse.
2. **Check Firebase Console** — is the data still there but malformed, or actually deleted?
3. **Check localStorage** on affected devices — it may have the last good copy.
4. **Firebase has automatic backups** — check if a backup exists in Firebase Console → Realtime Database → Backups.
5. **Document what happened** — add to "Common Bugs & Fixes" so it never happens again.
6. **Fix the code first, then the data.** Restoring data with buggy code will just corrupt it again.

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
- **Heart Points** - RPG-style stats (Brawn, Brain, Bloat) based on daily behaviors
- **Monster Battles** - Deal damage to bosses by fasting/sleeping (Insulin Dragon, Visceral Beast)
- **Leaderboards** - Daily and all-time rankings

---

## Architecture Overview

### ⚠️ CRITICAL: Dual Layout System (Legacy & Modern)

The app has **two coexisting layouts** toggled via `state.settings.layout` (`'legacy'` or `'modern'`):

- **Legacy Layout** — 5-tab layout with sub-panels (`#legacy-layout`)
- **Modern Layout** — Mobile-first bottom tab bar with 5 views (`#modern-layout`)

**Both layouts share the same 5 tabs:** Play, Battles, Stats, Forum, Settings

**ALL code changes that affect UI must update BOTH layouts.** They share the same state, data, and business logic — only the presentation differs.

**How it works:**
- Both layouts live in `index.html` inside separate wrapper divs, toggled by `applyLayout()`
- Modern layout DOM IDs use the `m-` prefix (e.g., `m-timer-display`, `m-brain-value`)
- Modern elements are cached in `domCache.modern`, populated by `initModernDomCache()`
- Existing update functions mirror values to Modern elements via null-checked writes (zero cost when hidden)

#### Reparenting vs. Duplication (Important Design Decision)

Because this is vanilla JS with no component system, every DOM element (with its IDs and event listeners) can only exist **once** in the DOM. We use two strategies depending on whether a view looks different between layouts:

| Strategy | When to Use | Examples |
|----------|-------------|---------|
| **Separate HTML** (duplicate + mirror) | View *looks fundamentally different* between layouts | Play tab (timers/buttons), Battles tab (monster UI) |
| **Reparenting** (single HTML, move between layouts) | View *looks the same* in both layouts | Forum, Settings |

**Reparenting pattern:**
- Legacy layout owns the "source of truth" HTML for Forum (`view-forum`) and Settings (`view-settings`)
- Modern layout has empty containers (`m-forum-container`, `m-settings-container`)
- When the user navigates to Forum/Settings in modern layout, `reparentForumToModern()` / `reparentSettingsToModern()` moves the legacy elements into the modern container
- When switching back to legacy, `returnViewsToLegacy()` moves them back
- This is called automatically by `switchModernTab()` and `applyLayout()`

**Why reparenting, not duplication:**
- No component system = duplicate IDs would break `getElementById()` calls
- One source of truth = bug fixes apply once, not twice
- Zero drift = impossible for layouts to get out of sync on shared views
- Forum and Settings look identical in both layouts, so duplication buys nothing

**Mirror pattern** (for views with separate HTML):
```javascript
// In any update function, after updating the legacy element:
const valueEl = document.getElementById('brain-value');
if (valueEl) valueEl.textContent = Math.round(brainScore);
// Mirror to modern layout (always null-check)
if (domCache.modern?.brainValue) domCache.modern.brainValue.textContent = Math.round(brainScore);
```

**When adding or modifying features:**
- [ ] If the view looks *different* between layouts → add HTML in both, mirror updates
- [ ] If the view looks *the same* → keep HTML in legacy only, reparenting handles the rest
- [ ] If it adds new DOM elements that get updated dynamically, add them to `domCache.modern` and `initModernDomCache()`
- [ ] Test the feature in BOTH layouts before considering it done
- [ ] Modals sit OUTSIDE both layout wrappers and are shared — no duplication needed for modals

#### Tab Structure (Both Layouts)

| Tab | Legacy Sub-panels | Modern Sub-views | Content |
|-----|-------------------|------------------|---------|
| **Play** | Fasting / Eating / Sleep (toggle) | Fasting / Eating / Sleep (timer modes) | Timers, powerups, goals |
| **Battles** | Monsters / Loot / Skills (sub-tabs) | Monsters / Loot / Skills (sub-views) | Monster fights, collection, skill XP |
| **Stats** | Trends / History / Leaderboard (sub-tabs) | Trends / History / Leaderboard (sub-views) | Charts, history lists, hiscores |
| **Forum** | Direct view | Reparented from legacy | Community posts |
| **Settings** | Direct view | Reparented from legacy | Cloud sync, backup, preferences, audit log |

**Tab migration:** Old tab names (`timer`, `eating`, `sleep`, `slayer`, `collection`, `audit`, `history`) are automatically mapped to new names via migration maps in `switchTab()`, `switchModernTab()`, and `handleRemoteDataUpdate()`. This ensures backward compatibility with existing user state and cross-device sync.

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

// Check Heart Points values
updateHeartPoints()  // Also logs breakdown
```

### Common Debug Scenarios

**Data not syncing to cloud:**
1. Check `firebaseSync.currentUser` - should have `uid` and `displayName`
2. Check `firebaseSync.syncEnabled` - should be `true`
3. Look for Firebase errors in console
4. Network tab → filter by `firebaseio.com`

**Timer not updating:**
1. Check if `state.currentFast.isActive` or `state.currentSleep.isActive` is true
2. Verify `heartPointsInterval` is running
3. Call `startTimer()` manually to restart

**Powerups not working:**
1. Check `isLivingLifeActive()` - returns true when Living Life mode is on
2. Check if currently fasting/sleeping - some powerups only work during sessions
3. Look at `state.currentFast.powerups` or eating session powerups

**Stats/Heart Points wrong:**
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

### Heart Points
- `updateHeartPoints()` - Main calculation loop (runs every second)
- `updateBloatScore()`, `updateBrainScore()`, `updateBrawnScore()` - Individual stats

### Monster Battles (Slayer System)
- `calculateSlayerDPS()` - Real-time DPS with all multipliers
- `calculateMonsterBattleStats()` - Total damage calculation with bonuses
- `updateMonsterBattleUI()` - Visual updates
- `updateSlayerBonusDisplay()` - Updates the Active Damage Bonuses panel
- Constants: `INSULIN_DRAGON_MAX_HP = 720000`, `VISCERAL_FAT_MAX_HP = 360000` (scaled 360x for visible per-tick damage at 1.5s intervals)
- Base damage: `DAMAGE_PER_SLEEP_HOUR = 5400`, `DAMAGE_PER_FAST_HOUR = 3600`, `DAMAGE_PER_FAST_HOUR_DRAGON = 1800`
- Fasting damages BOTH monsters: Visceral (3600/hr) and Dragon (1800/hr) — insulin drops during fasting
- HP displayed with K notation (e.g. 360K/360K) via `formatHP()` helper

#### Damage Multipliers (Deep Integration)
The Slayer system integrates with every aspect of the app:

1. **Powerup Damage Bonuses** (Flat bonus added to Visceral damage):
   - Water/Hot Water: +720, Coffee: +1080, Tea: +720
   - Exercise: +3600, Walk: +1800, Hanging/Grip: +1800
   - Flat Stomach: +1080, Doctor Win: +2880, Autophagy: +5400, Custom: +1800

2. **Eating Quality Modifier** (Multiplier on Dragon damage):
   - Good: Protein, Fiber, Broth, Slow Eating, Meal Walk (+5% each), Homecooked (+3%)
   - Bad: Junk Food, Too Fast (-5% each), Eaten Out (-3%), Bloated (-8%)
   - Range: 0.5x to 1.5x

3. **Heart Points Multiplier** (Global multiplier on all damage):
   - 80+ Heart Points: 1.25x
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
- Heart Points capped at reasonable maximums

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

### Users Missing from Leaderboard (Feb 2026)
**Problem:** Users signed in but never appeared on the leaderboard. Only 7 of many registered users were visible.
**Root Cause:** The username modal (required for leaderboard entry) could be dismissed via Escape key, backdrop click, or simply ignored. Users who signed in but skipped/dismissed the username prompt had `currentUsername = null`, causing `updateLeaderboardEntry()` to silently return early. No persistent reminder existed to re-prompt them.
**Fix:** Made username mandatory — removed modal from Escape key handler, blocked backdrop click dismissal (shakes modal instead), added a blocking overlay (z-index:40, blurred) behind the modal that prevents all app interaction until a username is set. Applies to both new sign-ups and existing users without a username on next load.
**Lesson:** Any onboarding step that gates core functionality (like leaderboard participation) must be non-dismissible. Optional modals get dismissed.

### Powerups Not Syncing Between Devices (Feb 2026)
**Problem:** Fasting timer synced across devices but powerups did not. E.g., 3 walks on Safari, 2 on Chrome for the same active fast.
**Root Cause:** Three issues compounding:
1. `handleRemoteDataUpdate()` treated `currentFast` as a monolithic object — when both devices tracked the same fast (`startTime` equal), remote powerups were silently ignored (no merge). When startTimes differed, local `currentFast` was replaced wholesale, losing local powerups.
2. `last-local-update` timestamp was only set after a remote merge, never during local `saveState()`. This made the merge logic always think local data was stale.
3. `updatePowerupDisplay()` was not called after merge, so even partial syncs didn't show in UI.
**Fix:**
- When both devices share the same active fast (same `startTime`), powerup arrays are now **merged by deduplication** using `${type}-${time}` as a composite key, then sorted chronologically.
- `saveState()` now updates `last-local-update` on every local save, not just after remote merges.
- `updatePowerupDisplay()` added to post-merge UI refresh.
- Same pattern applied to `currentSleep` for consistency.
**Lesson:** Any mutable array inside a synced object (`currentFast.powerups`) needs its own merge strategy — replacement-based sync only works for scalar values. Treat arrays like history: append + deduplicate.

### Modern Layout Architecture Mistake (Feb 2026)
**Problem:** Forum was buried inside a Profile tab menu (two clicks deep via overlay modal). Settings was similarly hidden. Users couldn't find core features. The Profile tab itself was just a menu of links to other views — not a real tab.
**Root Cause:** Cargo-culting. When the modern layout was first built, the `m-` prefix + separate HTML pattern was established for Play and Battles (where it made sense — those views look fundamentally different between layouts). Then Forum and Settings got the same treatment by autopilot — overlay modals that reparented legacy views on-the-fly — instead of asking "does this view actually need separate HTML?"
**What should have been asked:** "Does this view look different between layouts? If no, it should be a direct tab that reparents the single source HTML. If yes, build separate HTML and mirror."
**Fix:** Restructured both layouts to 5 matching tabs (Play, Battles, Stats, Forum, Settings). Forum and Settings are now first-class tabs. Modern layout reparents the legacy HTML into empty containers (`m-forum-container`, `m-settings-container`) instead of using overlay modals.
**Lesson:** See "Pattern Application Checkpoint" coding standard below. Every new pattern application deserves a "does this actually fit here?" check. Consistency is not a substitute for thinking.

---

## ⚠️ Coding Standards (Lessons Learned)

### Pattern Application Checkpoint (IMPORTANT)
**Before applying an existing pattern to a new situation, STOP and ask:**

1. **Does this pattern actually fit here?** Just because we used approach X for Feature A doesn't mean Feature B needs the same approach. Evaluate each case independently.
2. **What is this pattern optimizing for?** If the answer is "consistency" rather than "solving a real problem," reconsider.
3. **Would a user notice the difference?** If two views look and behave identically to the user, they shouldn't have different implementations. Shared views should share HTML, not duplicate it.
4. **Am I adding indirection?** If the user needs two clicks to reach something they use regularly, the architecture is wrong. A tab that just links to other views is a navigation drawer pretending to be a tab.

**The failure this prevents:** Applying a pattern uniformly when it only fits some cases. The `m-` prefix + separate HTML pattern was right for Play and Battles (different visual design) but wrong for Forum and Settings (identical between layouts). Autopilot led to overlay modals, buried features, and unnecessary complexity.

**The meta-rule:** Pattern application without re-evaluation is laziness masquerading as consistency.

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

### Pixel Art Icons (MANDATORY)
**All icons in this app MUST use the pixel art icon system.** No Unicode emojis should be used for visual icons in the UI.

**Why:** The app has a RuneScape-inspired pixel art aesthetic. Unicode emojis break the visual consistency.

**How to use pixel icons:**
```html
<!-- Basic usage -->
<span class="px-icon px-water"></span>

<!-- Larger sizes -->
<span class="px-icon px-icon-lg px-crystal"></span>  <!-- 2.15em -->
<span class="px-icon px-icon-xl px-trophy"></span>   <!-- 2.86em -->
```

**Available icons:** Check `index.html` CSS section for `.px-*` classes. Common ones:
- Actions: `px-water`, `px-coffee`, `px-tea`, `px-exercise`, `px-walk`, `px-moon`, `px-sun`
- UI: `px-heart`, `px-star`, `px-scroll`, `px-chart`, `px-clock`, `px-warning`, `px-danger`
- Status: `px-check`, `px-lightning`, `px-fire`, `px-crown`, `px-trophy`
- Biological: `px-dna`, `px-seedling`, `px-flower`, `px-cloud`

**Adding new icons:** Add SVG data URLs in the `<!-- BIOLOGICAL PROFILE ICONS -->` section of `index.html`.

**When adding features:**
- [ ] Never use Unicode emojis (🔥, ⚡, 🧬, etc.) anywhere in the app
- [ ] Use `<span class="px-icon px-[name]"></span>` pattern for HTML
- [ ] Use inline SVG data URLs for non-HTML contexts (notifications, document titles)
- [ ] If needed icon doesn't exist, create a new pixel art SVG and add to CSS

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

## ⚠️ iOS Deployment Workflow (Capacitor → Xcode)

**After making ANY code changes to `app.js`, `index.html`, `firebase-sync.js`, or `firebase-config.js`, Claude MUST run the full deployment pipeline to push changes into Xcode.**

This is NOT optional. Code changes in the web files are NOT automatically reflected in the iOS build. The Capacitor build/sync pipeline copies web assets into the Xcode project.

### Full Pipeline (run in order)

```bash
# 1. Build web assets → www/ directory (compiles Tailwind, patches index.html for Capacitor)
bash scripts/build-cap.sh

# 2. If using a worktree, copy www/ to main project (Podfile/Xcode live there)
cp -R .claude/worktrees/<name>/www ./www

# 3. Sync web assets into iOS Xcode project (from main project root, NOT worktree)
cd /path/to/main/project && npx cap sync ios

# 4. Open Xcode
npx cap open ios
```

### When to Run This

| Change Type | Pipeline Required? |
|-------------|-------------------|
| `app.js`, `index.html`, `firebase-sync.js`, `firebase-config.js` | **YES** — full pipeline |
| `ios/App/App/*.swift` (native plugins) | **NO** — already in Xcode project |
| `ios/App/App/*.entitlements` | **NO** — already in Xcode project |
| `ios/App/SuiPro.storekit` | **NO** — already in Xcode project |
| `scripts/generate-assets.js` | Run script + copy PNGs manually |
| CSS changes (via `src/input.css`) | **YES** — Tailwind needs recompiling |

### Worktree Gotcha

When working in a git worktree (`.claude/worktrees/`), the `ios/` directory is sparse — it only contains git-tracked source files, NOT the full Xcode project (`.xcodeproj`, Podfile, SPM packages, build dirs). These live in the **main project root**.

**Correct workflow:**
1. Run `build-cap.sh` from the worktree (builds web assets)
2. Copy `www/` from worktree to main project root
3. Run `npx cap sync ios` from the **main project root** (not the worktree)
4. Run `npx cap open ios` from the **main project root**

**Wrong:** Running `npx cap sync ios` from the worktree — it will fail with `ENOENT: no such file or directory, Podfile`.

### After Xcode Opens

The user (Lurio) handles these steps manually:
- Build to physical device for testing
- Archive for TestFlight/App Store submission
- Upload to App Store Connect via Xcode Organizer

---

## UI Structure

### Tabs
- **Today** - Main dashboard, current session, Heart Points display
- **Stats** - Trends, history, data export/import
- **Account** - Auth, leaderboards, settings

### Key UI Elements
- `.hidden` class toggles visibility
- Modals: `fasting-goal-modal`, `sleep-goal-modal`, `eating-options-modal`, etc.
- Progress bars: `fast-progress-bar`, `sleep-progress-bar`
- Heart Points display: `heart-points-display` with individual stat bars

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

## Monetization Architecture (Sui Pro)

### Subscription Model
- **Price:** $9.99/month via Apple StoreKit 2
- **Free trial:** 1 month
- **Single tier:** One subscription unlocks everything premium

### Free vs Premium Feature Map

| Feature | Free | Sui Pro |
|---------|------|---------|
| **Visceral Fat Beast** | ✅ | ✅ |
| **Insulin Dragon** | ✅ | ✅ |
| **New Monsters** (Cortisol Wraith, Inflammation Golem, Glucose Specter) | ❌ | ✅ |
| **Custom Powerups** | 1/month, star icon | Unlimited/month + pixel icon directory |
| **Loot Items** | 20 base items | +10-15 Legendary/Mythic items |
| **Sui Ghost Colors** | Green only | Blue, purple, red, gold cosmetics |
| **Stats History** | 6 months (older data purged) | Unlimited (kept forever) |
| **Monster Skins** | ❌ | Trophy skins for defeated monsters |

### Premium Design Principles
- **Never punish free users.** The free experience must be complete and satisfying
- **Premium adds depth, not necessity.** More monsters = more variety, not required for progress
- **No paywalls on core health tracking.** Fasting timer, sleep tracking, eating log, Heart Points — always free
- **Friendly paywall.** Sui presents premium features warmly, never aggressively. "Want to battle more monsters?" not "UPGRADE NOW!"
- **Respect the mission.** We're healing the world — premium funds development, not gatekeeps health

---

## Version History Highlights

- **Feb 2026:** Capacitor iOS build, Apple Sign-In, Golden Sui YOLO celebration, monetization planning
- **Jan 2026:** Cache busting, iOS Safari popup auth fix
- **Earlier:** Accessibility improvements, security audit, CSP implementation

---

## Gotchas

1. **Living Life mode** disables powerups and pauses progression tracking
2. **Custom powerup** limited to one per month (resets monthly)
3. **Timestamps** stored as Unix milliseconds, not ISO strings
4. **Popup auth** required for iOS Safari - redirect auth will fail silently
5. **Tailwind via CDN** requires `unsafe-eval` in CSP

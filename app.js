// State Management
// getStorageKey() is defined in firebase-config.js (loaded first)
// Returns 'fasting-tracker-state-staging' on localhost, 'fasting-tracker-state' in production
const STATE_KEY = (typeof getStorageKey === 'function') ? getStorageKey() : 'fasting-tracker-state';
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
    // Blocked forum users (array of { uid, username, blockedAt })
    blockedUsers: [],
    // Settings/Preferences
    settings: {
        showFastingGoals: true,
        showSleepGoals: true,
        showFastingFuture: true,
        showHeartHealth: true,
        showBreakingFastGuide: true,
        showExerciseGuide: true,
        showEatingGuide: true,
        showSleepGuide: true,
        showMealSleepQuality: true,
        showHungerTracker: true,
        showTrends: true,
        // Biological Profile (null = not set, 'male', 'female')
        biologicalSex: null,
        // Sui ghost color cosmetic (premium feature, default green for free)
        suiGhostColor: 'green',
        // Monster trophy skins (premium feature, unlocked per monster after defeating)
        monsterSkins: {}, // { visceral: 'trophy', dragon: 'trophy', ... }
        // Layout preference: 'legacy' (classic top tabs) or 'modern' (bottom tab bar)
        layout: 'legacy'
    },
    // Menstrual Cycle Tracking (for female biological profile)
    menstrualCycle: {
        lastPeriodStart: null,  // Unix timestamp of last period start
        cycleLength: 28,        // Average cycle length in days (default 28)
        trackingEnabled: false  // Whether user wants cycle-aware recommendations
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
    },
    // Precious Items Collection - fantasy-themed rare items
    collection: {
        unlockedItems: [],      // Array of item IDs that have been unlocked
        equippedItem: null,     // Currently equipped item ID (for bonus effects)
        newItems: []            // Array of item IDs not yet viewed (for notification dot)
    },
    // Sui Pro subscription state
    premium: {
        isActive: false,
        expiresAt: null,            // Unix ms timestamp when subscription expires
        productId: null,            // 'com.sleepsuivour.app.pro.monthly'
        originalPurchaseDate: null, // Unix ms when first subscribed
        source: null                // 'storekit' | 'restored'
    }
};

// Expose state globally for debugging and cross-module access
window.state = state;

// ==========================================
// PRECIOUS ITEMS COLLECTION
// ==========================================
// Fantasy-themed rare items themed around fasting, sleep, and metabolism

const ITEM_RARITIES = {
    common: { name: 'Common', color: '#9ca3af', glow: 'rgba(156, 163, 175, 0.5)' },
    uncommon: { name: 'Uncommon', color: '#22c55e', glow: 'rgba(34, 197, 94, 0.5)' },
    rare: { name: 'Rare', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.5)' },
    epic: { name: 'Epic', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.5)' },
    legendary: { name: 'Legendary', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)' },
    mythic: { name: 'Mythic', color: '#ec4899', glow: 'rgba(236, 72, 153, 0.6)' }
};

const PRECIOUS_ITEMS = {
    // ============ COMMON ITEMS ============
    'apprentice-flask': {
        id: 'apprentice-flask',
        name: "Apprentice's Flask",
        rarity: 'common',
        icon: 'px-flask-common',
        description: 'A simple water flask. Every journey begins with hydration.',
        lore: 'Given to those who take their first steps on the path of wellness.',
        effect: null,
        effectText: null,
        unlockCondition: { type: 'skill_level', skill: 'water', level: 5 },
        unlockText: 'Reach Hydration Level 5'
    },
    'dawn-pillow': {
        id: 'dawn-pillow',
        name: 'Dawn Pillow',
        rarity: 'common',
        icon: 'px-pillow-common',
        description: 'A comfortable pillow for those learning to rest.',
        lore: 'The first step to mastering sleep is simply... sleeping.',
        effect: null,
        effectText: null,
        unlockCondition: { type: 'skill_level', skill: 'sleep', level: 5 },
        unlockText: 'Reach Sleep Level 5'
    },
    'wooden-spoon': {
        id: 'wooden-spoon',
        name: 'Wooden Spoon',
        rarity: 'common',
        icon: 'px-spoon-common',
        description: 'A humble utensil for mindful eating.',
        lore: 'Even the greatest chefs started with a simple spoon.',
        effect: null,
        effectText: null,
        unlockCondition: { type: 'total_eating_powerups', count: 10 },
        unlockText: 'Log 10 eating powerups'
    },

    // ============ UNCOMMON ITEMS ============
    'fasting-pendant': {
        id: 'fasting-pendant',
        name: 'Fasting Pendant',
        rarity: 'uncommon',
        icon: 'px-pendant-uncommon',
        description: 'A pendant that glows faintly during extended fasts.',
        lore: 'Forged in the fires of hunger, tempered by discipline.',
        effect: { type: 'damage_bonus', target: 'visceral', amount: 2 },
        effectText: '+2 Visceral Damage',
        unlockCondition: { type: 'fasting_hours', hours: 100 },
        unlockText: 'Fast for 100 total hours'
    },
    'dreamcatcher-ring': {
        id: 'dreamcatcher-ring',
        name: 'Dreamcatcher Ring',
        rarity: 'uncommon',
        icon: 'px-ring-uncommon',
        description: 'Captures peaceful dreams and wards off restless nights.',
        lore: 'Woven from moonlight and the whispers of deep slumber.',
        effect: { type: 'damage_bonus', target: 'dragon', amount: 3 },
        effectText: '+3 Dragon Damage',
        unlockCondition: { type: 'sleep_hours', hours: 50 },
        unlockText: 'Log 50 hours of sleep'
    },
    'metabolism-stone': {
        id: 'metabolism-stone',
        name: 'Metabolism Stone',
        rarity: 'uncommon',
        icon: 'px-stone-uncommon',
        description: 'A warm stone that pulses with inner fire.',
        lore: 'Found in the belly of the Insulin Dragon, still warm.',
        effect: { type: 'heart_points_bonus', amount: 2 },
        effectText: '+2 Heart Points',
        unlockCondition: { type: 'streak', streakType: 'fasting', days: 7 },
        unlockText: 'Achieve a 7-day fasting streak'
    },
    'protein-gauntlets': {
        id: 'protein-gauntlets',
        name: 'Protein Gauntlets',
        rarity: 'uncommon',
        icon: 'px-gauntlets-uncommon',
        description: 'Strengthens your grip on healthy eating habits.',
        lore: 'Each finger inscribed with the amino acids of power.',
        effect: { type: 'skill_xp_bonus', skill: 'protein', amount: 5 },
        effectText: '+5 Protein XP per log',
        unlockCondition: { type: 'skill_level', skill: 'protein', level: 15 },
        unlockText: 'Reach Protein Level 15'
    },
    'circadian-compass': {
        id: 'circadian-compass',
        name: 'Circadian Compass',
        rarity: 'uncommon',
        icon: 'px-compass-uncommon',
        description: 'Always points toward your natural sleep cycle.',
        lore: 'Calibrated to the rhythm of the cosmos itself.',
        effect: { type: 'skill_xp_bonus', skill: 'sleep', amount: 5 },
        effectText: '+5 Sleep XP per session',
        unlockCondition: { type: 'streak', streakType: 'sleep', days: 7 },
        unlockText: 'Achieve a 7-day sleep streak'
    },

    // ============ RARE ITEMS ============
    'ketone-crystal': {
        id: 'ketone-crystal',
        name: 'Ketone Crystal',
        rarity: 'rare',
        icon: 'px-crystal-rare',
        description: 'A crystallized drop of pure ketosis energy.',
        lore: 'Forms only after 20+ hours of fasting in the deepest metabolic state.',
        effect: { type: 'damage_bonus', target: 'visceral', amount: 5 },
        effectText: '+5 Visceral Damage',
        unlockCondition: { type: 'single_fast', hours: 24 },
        unlockText: 'Complete a 24-hour fast'
    },
    'rem-scepter': {
        id: 'rem-scepter',
        name: 'REM Scepter',
        rarity: 'rare',
        icon: 'px-scepter-rare',
        description: 'Channels the power of deep REM sleep cycles.',
        lore: 'Only those who have mastered the art of slumber may wield it.',
        effect: { type: 'damage_bonus', target: 'dragon', amount: 8 },
        effectText: '+8 Dragon Damage',
        unlockCondition: { type: 'skill_level', skill: 'sleep', level: 30 },
        unlockText: 'Reach Sleep Level 30'
    },
    'autophagy-amulet': {
        id: 'autophagy-amulet',
        name: 'Autophagy Amulet',
        rarity: 'rare',
        icon: 'px-amulet-rare',
        description: 'Accelerates cellular renewal and cleansing.',
        lore: 'The cells inscribed upon it consume themselves to grow stronger.',
        effect: { type: 'heart_points_bonus', amount: 5 },
        effectText: '+5 Heart Points',
        unlockCondition: { type: 'fasting_hours', hours: 500 },
        unlockText: 'Fast for 500 total hours'
    },
    'fiber-weave-cloak': {
        id: 'fiber-weave-cloak',
        name: 'Fiber-Weave Cloak',
        rarity: 'rare',
        icon: 'px-cloak-rare',
        description: 'Woven from the strongest plant fibers known to healers.',
        lore: 'Each thread represents a vegetable eaten with intention.',
        effect: { type: 'eating_quality_bonus', amount: 5 },
        effectText: '+5% Eating Quality',
        unlockCondition: { type: 'skill_level', skill: 'fiber', level: 25 },
        unlockText: 'Reach Fiber Level 25'
    },
    'willpower-band': {
        id: 'willpower-band',
        name: 'Willpower Band',
        rarity: 'rare',
        icon: 'px-band-rare',
        description: 'A band of iron will that strengthens resolve.',
        lore: 'Built from the strength of new choices.',
        effect: { type: 'streak_bonus', amount: 5 },
        effectText: '+5% Streak Damage Bonus',
        unlockCondition: { type: 'streak', streakType: 'fasting', days: 14 },
        unlockText: 'Achieve a 14-day fasting streak'
    },

    // ============ EPIC ITEMS ============
    'insulin-bane-blade': {
        id: 'insulin-bane-blade',
        name: 'Insulin Bane Blade',
        rarity: 'epic',
        icon: 'px-blade-epic',
        description: 'A blade that cuts through insulin resistance like butter.',
        lore: 'Extracted from the claw of a defeated Insulin Dragon.',
        effect: { type: 'damage_bonus', target: 'dragon', amount: 15 },
        effectText: '+15 Dragon Damage',
        unlockCondition: { type: 'monster_defeated', monster: 'dragon', count: 1 },
        unlockText: 'Defeat the Insulin Dragon'
    },
    'visceral-vanquisher': {
        id: 'visceral-vanquisher',
        name: 'Visceral Vanquisher',
        rarity: 'epic',
        icon: 'px-hammer-epic',
        description: 'A warhammer forged specifically to crush visceral fat.',
        lore: 'The head is shaped from compressed adipose tissue—ironic justice.',
        effect: { type: 'damage_bonus', target: 'visceral', amount: 12 },
        effectText: '+12 Visceral Damage',
        unlockCondition: { type: 'monster_defeated', monster: 'visceral', count: 1 },
        unlockText: 'Defeat the Visceral Beast'
    },
    'melatonin-crown': {
        id: 'melatonin-crown',
        name: 'Melatonin Crown',
        rarity: 'epic',
        icon: 'px-crown-epic',
        description: 'A crown that radiates the calming essence of perfect sleep.',
        lore: 'Worn by the Dream Monarch who sleeps exactly 8 hours nightly.',
        effect: { type: 'all_damage_bonus', amount: 8 },
        effectText: '+8% All Damage',
        unlockCondition: { type: 'sleep_hours', hours: 500 },
        unlockText: 'Log 500 hours of sleep'
    },
    'metabolic-furnace': {
        id: 'metabolic-furnace',
        name: 'Metabolic Furnace',
        rarity: 'epic',
        icon: 'px-furnace-epic',
        description: 'A miniature furnace that burns calories at maximum efficiency.',
        lore: 'Ignited by 1,000 hours of fasted movement.',
        effect: { type: 'heart_points_bonus', amount: 10 },
        effectText: '+10 Heart Points',
        unlockCondition: { type: 'total_level', level: 200 },
        unlockText: 'Reach 200 Total Skill Levels'
    },
    'grandmaster-chef-hat': {
        id: 'grandmaster-chef-hat',
        name: "Grandmaster Chef's Hat",
        rarity: 'epic',
        icon: 'px-chefhat-epic',
        description: 'Only worn by those who have mastered home cooking.',
        lore: 'Blessed by ancient nutritionists, it knows the perfect meal.',
        effect: { type: 'eating_quality_bonus', amount: 10 },
        effectText: '+10% Eating Quality',
        unlockCondition: { type: 'skill_level', skill: 'homecooked', level: 50 },
        unlockText: 'Reach Home Cook Level 50'
    },

    // ============ LEGENDARY ITEMS ============
    'glucagon-greatsword': {
        id: 'glucagon-greatsword',
        name: 'Glucagon Greatsword',
        rarity: 'legendary',
        icon: 'px-godsword-legendary',
        description: 'The ultimate weapon against metabolic dysfunction.',
        lore: 'Forged in the fires of ketosis, cooled in the tears of insulin resistance. Only the most dedicated may wield its power.',
        effect: { type: 'all_damage_bonus', amount: 15 },
        effectText: '+15% All Damage',
        unlockCondition: { type: 'fasting_hours', hours: 1000 },
        unlockText: 'Fast for 1,000 total hours'
    },
    'circadian-crown': {
        id: 'circadian-crown',
        name: 'Circadian Crown',
        rarity: 'legendary',
        icon: 'px-partyhat-legendary',
        description: 'A radiant crown that celebrates perfect circadian rhythm.',
        lore: 'Worn by those who mastered the rhythm of day and night. Said to bring eternal energy and restful nights.',
        effect: { type: 'all_damage_bonus', amount: 12 },
        effectText: '+12% All Damage',
        unlockCondition: { type: 'streak', streakType: 'sleep', days: 30 },
        unlockText: 'Achieve a 30-day sleep streak'
    },
    'mitochondria-greaves': {
        id: 'mitochondria-greaves',
        name: 'Mitochondria Greaves',
        rarity: 'legendary',
        icon: 'px-tassets-legendary',
        description: 'Leg armor powered by the powerhouse of the cell.',
        lore: 'Each plate contains a living mitochondria, generating unlimited ATP. The ultimate symbol of metabolic mastery.',
        effect: { type: 'heart_points_bonus', amount: 15 },
        effectText: '+15 Heart Points',
        unlockCondition: { type: 'total_level', level: 500 },
        unlockText: 'Reach 500 Total Skill Levels'
    },
    'autophagy-halo': {
        id: 'autophagy-halo',
        name: 'Autophagy Halo',
        rarity: 'legendary',
        icon: 'px-halo-legendary',
        description: 'A divine ring of cellular renewal floating above the head.',
        lore: 'Appears only to those who have mastered the art of cellular self-cleaning. The ultimate symbol of fasting transcendence.',
        effect: { type: 'damage_bonus', target: 'visceral', amount: 20 },
        effectText: '+20 Visceral Damage',
        unlockCondition: { type: 'single_fast', hours: 48 },
        unlockText: 'Complete a 48-hour fast'
    },
    'spirit-of-discipline': {
        id: 'spirit-of-discipline',
        name: 'Spirit of Discipline',
        rarity: 'legendary',
        icon: 'px-spirit-legendary',
        description: 'An ethereal companion that embodies pure willpower.',
        lore: 'Born from 1,000 hours of dedication. It whispers encouragement during the hardest fasts and deepest sleeps.',
        effect: { type: 'streak_bonus', amount: 15 },
        effectText: '+15% Streak Damage Bonus',
        unlockCondition: { type: 'streak', streakType: 'fasting', days: 30 },
        unlockText: 'Achieve a 30-day fasting streak'
    },

    // ============ PREMIUM ITEMS (Sui Pro) ============
    'cortisol-slayer-scythe': {
        id: 'cortisol-slayer-scythe',
        name: "Cortisol Slayer's Scythe",
        rarity: 'legendary',
        icon: 'px-godsword-legendary',
        description: 'A spectral scythe that cleaves through stress hormones.',
        lore: 'Forged from the dreams of a thousand peaceful nights. Each swing banishes cortisol from your body.',
        effect: { type: 'damage_bonus', target: 'visceral', amount: 18 },
        effectText: '+18% Visceral Damage',
        premium: true,
        unlockCondition: { type: 'monster_kills', monster: 'wraith', kills: 1 },
        unlockText: 'Defeat the Cortisol Wraith (Sui Pro)'
    },
    'inflammation-ward': {
        id: 'inflammation-ward',
        name: 'Inflammation Ward',
        rarity: 'legendary',
        icon: 'px-shield-legendary',
        description: 'An enchanted ward that absorbs inflammatory damage.',
        lore: 'Carved from the cooled magma of a defeated Inflammation Golem. Radiates anti-inflammatory energy.',
        effect: { type: 'all_damage_bonus', amount: 10 },
        effectText: '+10% All Damage',
        premium: true,
        unlockCondition: { type: 'monster_kills', monster: 'golem', kills: 1 },
        unlockText: 'Defeat the Inflammation Golem (Sui Pro)'
    },
    'glucose-stabilizer': {
        id: 'glucose-stabilizer',
        name: 'Glucose Stabilizer Crystal',
        rarity: 'legendary',
        icon: 'px-crystal',
        description: 'A pulsing crystal that keeps blood sugar perfectly balanced.',
        lore: 'Extracted from the core of a Glucose Specter. Hums with metabolic harmony.',
        effect: { type: 'heart_points_bonus', amount: 10 },
        effectText: '+10 Heart Points',
        premium: true,
        unlockCondition: { type: 'monster_kills', monster: 'specter', kills: 1 },
        unlockText: 'Defeat the Glucose Specter (Sui Pro)'
    },
    'metabolic-mastery-crown': {
        id: 'metabolic-mastery-crown',
        name: 'Crown of Metabolic Mastery',
        rarity: 'mythic',
        icon: 'px-crown',
        description: 'The ultimate symbol of health mastery. Radiates with cosmic energy.',
        lore: 'Only those who have conquered all five monsters may wear this crown. It pulses with the combined power of every health system in your body, perfectly harmonized.',
        effect: { type: 'all_damage_bonus', amount: 25 },
        effectText: '+25% All Damage',
        premium: true,
        unlockCondition: { type: 'total_monster_kills', kills: 10 },
        unlockText: 'Slay 10 total monsters across all types (Sui Pro)'
    },
    'sui-golden-amulet': {
        id: 'sui-golden-amulet',
        name: "Sui's Golden Amulet",
        rarity: 'mythic',
        icon: 'px-star',
        description: "A gift from Sui himself. Glows brighter with every healthy choice.",
        lore: "The Sleep God rewards dedication with this sacred amulet. It connects you to Sui's power, amplifying every fast, every sleep, every healthy meal into a force that heals the world.",
        effect: { type: 'streak_bonus', amount: 25 },
        effectText: '+25% Streak Damage Bonus',
        premium: true,
        unlockCondition: { type: 'combined_streak', days: 14 },
        unlockText: '14-day combined fasting + sleep streak (Sui Pro)'
    }
};

// Get all items as an array for iteration
function getAllPreciousItems() {
    return Object.values(PRECIOUS_ITEMS);
}

// Get items by rarity
function getItemsByRarity(rarity) {
    return getAllPreciousItems().filter(item => item.rarity === rarity);
}

// Check if an item is unlocked
function isItemUnlocked(itemId) {
    return state.collection?.unlockedItems?.includes(itemId) || false;
}

// Get the currently equipped item
function getEquippedItem() {
    if (!state.collection?.equippedItem) return null;
    return PRECIOUS_ITEMS[state.collection.equippedItem] || null;
}

// Calculate total fasting hours from history
function getTotalFastingHours() {
    if (!state.fastingHistory || !Array.isArray(state.fastingHistory)) return 0;
    return state.fastingHistory.reduce((total, fast) => {
        const duration = (fast.duration || 0) / (1000 * 60 * 60); // Convert ms to hours
        return total + duration;
    }, 0);
}

// Calculate total sleep hours from history
function getTotalSleepHours() {
    if (!state.sleepHistory || !Array.isArray(state.sleepHistory)) return 0;
    return state.sleepHistory.reduce((total, sleep) => {
        const duration = (sleep.duration || 0) / (1000 * 60 * 60); // Convert ms to hours
        return total + duration;
    }, 0);
}

// Get longest single fast in hours
function getLongestFastHours() {
    if (!state.fastingHistory || !Array.isArray(state.fastingHistory)) return 0;
    const longest = state.fastingHistory.reduce((max, fast) => {
        const duration = (fast.duration || 0) / (1000 * 60 * 60);
        return Math.max(max, duration);
    }, 0);
    return longest;
}

// Count total eating powerups used
function getTotalEatingPowerups() {
    if (!state.fastingHistory || !Array.isArray(state.fastingHistory)) return 0;
    // Count powerups from breaking fast sessions
    let count = 0;
    state.fastingHistory.forEach(fast => {
        if (fast.eatingPowerups && Array.isArray(fast.eatingPowerups)) {
            count += fast.eatingPowerups.length;
        }
    });
    // Also count from current eating session if any
    if (state.eatingPowerups && Array.isArray(state.eatingPowerups)) {
        count += state.eatingPowerups.length;
    }
    return count;
}

// Check if item unlock condition is met
function checkItemUnlockCondition(item) {
    try {
        const condition = item.unlockCondition;
        if (!condition) return false;

        switch (condition.type) {
        case 'skill_level':
            const skillXP = state.skills?.[condition.skill] || 0;
            const currentLevel = levelFromXP(skillXP);
            return currentLevel >= condition.level;

        case 'fasting_hours':
            return getTotalFastingHours() >= condition.hours;

        case 'sleep_hours':
            return getTotalSleepHours() >= condition.hours;

        case 'single_fast':
            return getLongestFastHours() >= condition.hours;

        case 'streak':
            if (condition.streakType === 'fasting') {
                return calculateFastingStreak() >= condition.days;
            } else if (condition.streakType === 'sleep') {
                return calculateSleepStreak() >= condition.days;
            }
            return false;

        case 'total_level':
            return calculateTotalLevel() >= condition.level;

        case 'total_eating_powerups':
            return getTotalEatingPowerups() >= condition.count;

        case 'monster_defeated':
            // Check if monster was ever defeated (HP reached 0)
            // This requires tracking defeats in state - for now, check if damage dealt exceeds HP
            if (condition.monster === 'dragon') {
                const stats = typeof calculateMonsterBattleStats === 'function' ? calculateMonsterBattleStats() : null;
                return stats && stats.dragonDamage >= 720000; // INSULIN_DRAGON_MAX_HP
            } else if (condition.monster === 'visceral') {
                const stats = typeof calculateMonsterBattleStats === 'function' ? calculateMonsterBattleStats() : null;
                return stats && stats.visceralDamage >= 360000; // VISCERAL_FAT_MAX_HP
            }
            return false;

        case 'monster_kills': {
            // Premium monster kill count
            const premiumStats = typeof calculatePremiumMonsterStats === 'function' ? calculatePremiumMonsterStats() : null;
            if (!premiumStats) return false;
            const monsterMap = { wraith: premiumStats.wraith, golem: premiumStats.golem, specter: premiumStats.specter };
            const monster = monsterMap[condition.monster];
            return monster && monster.kills >= condition.kills;
        }

        case 'total_monster_kills': {
            // Total kills across ALL monsters (free + premium)
            const baseStats = typeof calculateMonsterBattleStats === 'function' ? calculateMonsterBattleStats() : null;
            const premStats = typeof calculatePremiumMonsterStats === 'function' ? calculatePremiumMonsterStats() : null;
            const baseKills = baseStats ? baseStats.totalKills : 0;
            const premKills = premStats ? premStats.totalPremiumKills : 0;
            return (baseKills + premKills) >= condition.kills;
        }

        case 'combined_streak':
            // Both fasting AND sleep streaks must meet the threshold
            return calculateFastingStreak() >= condition.days && calculateSleepStreak() >= condition.days;

        default:
            return false;
        }
    } catch (e) {
        console.warn('Error checking item unlock condition:', e);
        return false;
    }
}

// Get unlock progress for an item (0-100%)
function getItemUnlockProgress(item) {
    const condition = item.unlockCondition;
    if (!condition) return 0;

    let progress = 0;

    switch (condition.type) {
        case 'skill_level':
            const skillXP = state.skills?.[condition.skill] || 0;
            const currentLevel = levelFromXP(skillXP);
            progress = condition.level ? (currentLevel / condition.level) * 100 : 0;
            break;

        case 'fasting_hours':
            progress = condition.hours ? (getTotalFastingHours() / condition.hours) * 100 : 0;
            break;

        case 'sleep_hours':
            progress = condition.hours ? (getTotalSleepHours() / condition.hours) * 100 : 0;
            break;

        case 'single_fast':
            progress = condition.hours ? (getLongestFastHours() / condition.hours) * 100 : 0;
            break;

        case 'streak':
            const streak = condition.streakType === 'fasting'
                ? calculateFastingStreak()
                : calculateSleepStreak();
            progress = condition.days ? (streak / condition.days) * 100 : 0;
            break;

        case 'total_level':
            progress = condition.level ? (calculateTotalLevel() / condition.level) * 100 : 0;
            break;

        case 'total_eating_powerups':
            progress = condition.count ? (getTotalEatingPowerups() / condition.count) * 100 : 0;
            break;

        case 'monster_defeated':
            if (condition.monster === 'dragon') {
                const stats = typeof calculateMonsterBattleStats === 'function' ? calculateMonsterBattleStats() : null;
                progress = stats ? (stats.dragonDamage / 720000) * 100 : 0;
            } else if (condition.monster === 'visceral') {
                const stats = typeof calculateMonsterBattleStats === 'function' ? calculateMonsterBattleStats() : null;
                progress = stats ? (stats.visceralDamage / 360000) * 100 : 0;
            }
            break;
    }

    // Guard against NaN from corrupt data or division issues
    if (isNaN(progress) || !isFinite(progress)) return 0;
    return Math.min(100, progress);
}

// Unlock an item
function unlockItem(itemId) {
    if (!state.collection) {
        state.collection = { unlockedItems: [], equippedItem: null, newItems: [] };
    }
    if (!Array.isArray(state.collection.unlockedItems)) {
        state.collection.unlockedItems = [];
    }
    if (!Array.isArray(state.collection.newItems)) {
        state.collection.newItems = [];
    }

    if (!state.collection.unlockedItems.includes(itemId)) {
        state.collection.unlockedItems.push(itemId);
        state.collection.newItems.push(itemId);
        // Record unlock timestamp for audit log
        if (!state.collection.unlockTimestamps) state.collection.unlockTimestamps = {};
        state.collection.unlockTimestamps[itemId] = Date.now();
        invalidateCache('loot');
        saveState();

        const item = PRECIOUS_ITEMS[itemId];
        if (item) {
            showItemUnlockToast(item);
        }

        // Update collection UI if visible
        if (typeof updateCollectionUI === 'function') {
            updateCollectionUI();
        }

        return true;
    }
    return false;
}

// Equip an item
function equipItem(itemId) {
    if (!isItemUnlocked(itemId)) return false;

    // Ensure collection exists
    if (!state.collection) {
        state.collection = { unlockedItems: [], equippedItem: null, newItems: [] };
    }

    state.collection.equippedItem = itemId;
    saveState();

    if (typeof updateCollectionUI === 'function') {
        updateCollectionUI();
    }

    const item = PRECIOUS_ITEMS[itemId];
    if (item) {
        showAchievementToast(
            `<span class="px-icon ${item.icon}"></span>`,
            'Item Equipped!',
            `${item.name} - ${item.effectText || 'No effect'}`,
            'success'
        );
    }

    return true;
}

// Unequip the current item
function unequipItem() {
    // Ensure collection exists
    if (!state.collection) {
        state.collection = { unlockedItems: [], equippedItem: null, newItems: [] };
    }

    state.collection.equippedItem = null;
    saveState();

    if (typeof updateCollectionUI === 'function') {
        updateCollectionUI();
    }
}

// Check all items for unlocks (call this after major actions)
function checkAllItemUnlocks() {
    try {
        let newUnlocks = 0;

        getAllPreciousItems().forEach(item => {
            // Skip premium items for non-premium users
            if (item.premium && !isPremiumActive()) return;
            if (!isItemUnlocked(item.id) && checkItemUnlockCondition(item)) {
                if (unlockItem(item.id)) {
                    newUnlocks++;
                }
            }
        });

        return newUnlocks;
    } catch (e) {
        console.warn('Error checking item unlocks:', e);
        return 0;
    }
}

// Show unlock toast for a new item
function showItemUnlockToast(item) {
    const rarity = ITEM_RARITIES[item.rarity];

    // Create special unlock notification
    const toast = document.createElement('div');
    toast.className = 'item-unlock-toast';
    toast.innerHTML = `
        <div class="item-unlock-content" style="
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px 24px;
            background: linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,20,20,0.95) 100%);
            border: 2px solid ${rarity.color};
            border-radius: 12px;
            box-shadow: 0 0 30px ${rarity.glow}, inset 0 1px 0 rgba(255,255,255,0.1);
        ">
            <div class="item-icon" style="
                width: 64px;
                height: 64px;
                display: flex;
                align-items: center;
                justify-content: center;
                filter: drop-shadow(0 0 12px ${rarity.glow});
            ">
                <span class="px-icon px-icon-xl ${item.icon}"></span>
            </div>
            <div class="item-info">
                <div style="
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    color: ${rarity.color};
                    margin-bottom: 4px;
                ">${rarity.name} Item Unlocked!</div>
                <div style="
                    font-size: 18px;
                    font-weight: bold;
                    color: white;
                    margin-bottom: 4px;
                ">${escapeHtml(item.name)}</div>
                <div style="
                    font-size: 12px;
                    color: #9ca3af;
                ">${escapeHtml(item.description)}</div>
                ${item.effectText ? `<div style="
                    font-size: 12px;
                    color: ${rarity.color};
                    margin-top: 4px;
                    font-weight: 500;
                ">${escapeHtml(item.effectText)}</div>` : ''}
            </div>
        </div>
    `;

    toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.8);
        z-index: 10001;
        opacity: 0;
        animation: itemUnlockIn 0.5s ease-out forwards;
    `;

    // Add animation styles
    if (!document.getElementById('item-unlock-styles')) {
        const style = document.createElement('style');
        style.id = 'item-unlock-styles';
        style.textContent = `
            @keyframes itemUnlockIn {
                0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.1); }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
            @keyframes itemUnlockOut {
                0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
            }
            @keyframes itemGlow {
                0%, 100% { box-shadow: 0 0 20px currentColor; }
                50% { box-shadow: 0 0 40px currentColor; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Remove after delay
    setTimeout(() => {
        toast.style.animation = 'itemUnlockOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Get equipped item bonuses (for damage calculations)
function getEquippedItemBonuses() {
    const bonuses = {
        visceralDamage: 0,
        dragonDamage: 0,
        allDamagePercent: 0,
        heartPoints: 0,
        eatingQualityPercent: 0,
        streakBonusPercent: 0,
        skillXPBonus: {}
    };

    const equipped = getEquippedItem();
    if (!equipped || !equipped.effect) return bonuses;

    const effect = equipped.effect;

    switch (effect.type) {
        case 'damage_bonus':
            if (effect.target === 'visceral') {
                bonuses.visceralDamage += effect.amount;
            } else if (effect.target === 'dragon') {
                bonuses.dragonDamage += effect.amount;
            }
            break;
        case 'all_damage_bonus':
            bonuses.allDamagePercent += effect.amount;
            break;
        case 'heart_points_bonus':
            bonuses.heartPoints += effect.amount;
            break;
        case 'eating_quality_bonus':
            bonuses.eatingQualityPercent += effect.amount;
            break;
        case 'streak_bonus':
            bonuses.streakBonusPercent += effect.amount;
            break;
        case 'skill_xp_bonus':
            bonuses.skillXPBonus[effect.skill] = (bonuses.skillXPBonus[effect.skill] || 0) + effect.amount;
            break;
    }

    return bonuses;
}

// Count unlocked items
function getUnlockedItemCount() {
    return state.collection?.unlockedItems?.length || 0;
}

// Count total items
function getTotalItemCount() {
    return Object.keys(PRECIOUS_ITEMS).length;
}

// Mark item as viewed (remove from new items)
function markItemViewed(itemId) {
    if (state.collection?.newItems) {
        const index = state.collection.newItems.indexOf(itemId);
        if (index > -1) {
            state.collection.newItems.splice(index, 1);
            saveState();
        }
    }
}

// Check if there are new items to view
function hasNewItems() {
    return (state.collection?.newItems?.length || 0) > 0;
}

// Staging environment badge — fixed banner so you never mistake staging for production
function showStagingBadge() {
    if (typeof isStagingEnvironment !== 'function' || !isStagingEnvironment()) return;
    const badge = document.createElement('div');
    badge.id = 'staging-badge';
    badge.textContent = 'STAGING';
    badge.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:99999;' +
        'background:#f59e0b;color:#000;font-weight:bold;font-size:11px;padding:2px 12px;' +
        'border-radius:0 0 6px 6px;font-family:monospace;pointer-events:none;';
    document.body.appendChild(badge);
}

// DOM element cache for frequently accessed elements (performance optimization)
// Initialized in DOMContentLoaded to ensure elements exist
const domCache = {
    timerDisplay: null,
    progressBar: null,
    sleepTimerDisplay: null,
    sleepProgressBar: null,
    // Battle tab elements (queried 12+ times per 1.5s tick)
    visceralHPBar: null,
    visceralHPText: null,
    visceralDamageDealt: null,
    visceralFastsCount: null,
    visceralHours: null,
    visceralKills: null,
    dragonHPBar: null,
    dragonHPText: null,
    dragonDamageDealt: null,
    dragonSessionsCount: null,
    dragonHours: null,
    dragonKills: null,
    totalMonstersSlain: null
};

function initDomCache() {
    domCache.timerDisplay = document.getElementById('timer-display');
    domCache.progressBar = document.getElementById('progress-bar');
    domCache.sleepTimerDisplay = document.getElementById('sleep-timer-display');
    domCache.sleepProgressBar = document.getElementById('sleep-progress-bar');
    // Battle tab elements
    domCache.visceralHPBar = document.getElementById('visceral-hp-bar');
    domCache.visceralHPText = document.getElementById('visceral-hp-text');
    domCache.visceralDamageDealt = document.getElementById('visceral-damage-dealt');
    domCache.visceralFastsCount = document.getElementById('visceral-fasts-count');
    domCache.visceralHours = document.getElementById('visceral-hours');
    domCache.visceralKills = document.getElementById('visceral-kills');
    domCache.dragonHPBar = document.getElementById('dragon-hp-bar');
    domCache.dragonHPText = document.getElementById('dragon-hp-text');
    domCache.dragonDamageDealt = document.getElementById('dragon-damage-dealt');
    domCache.dragonSessionsCount = document.getElementById('dragon-sessions-count');
    domCache.dragonHours = document.getElementById('dragon-hours');
    domCache.dragonKills = document.getElementById('dragon-kills');
    domCache.totalMonstersSlain = document.getElementById('total-monsters-slain');
}

// ==========================================
// RETRO LAYOUT SYSTEM (SNES RPG Theme)
// ==========================================

// Maps retro tabs → which legacy views belong in which sub-container
const RETRO_TAB_MAP = {
    quest: {
        'quest-fasting': 'view-timer',
        'quest-eating': 'view-eating',
        'quest-sleep': 'view-sleep'
    },
    slayer: {
        'slayer-battles': 'view-slayer',
        'slayer-loot': 'view-collection'
    },
    scroll: {
        'scroll-stats': 'view-stats',
        'scroll-history': 'view-history',
        'scroll-audit': 'view-audit'
    },
    tavern: {
        'tavern-forum': 'view-forum'
    },
    config: {
        'config-settings': 'view-settings'
    }
};

// Reverse map: legacy tab name → retro tab + sub
const LEGACY_TO_RETRO = {
    timer: { tab: 'quest', sub: 'quest-fasting' },
    eating: { tab: 'quest', sub: 'quest-eating' },
    sleep: { tab: 'quest', sub: 'quest-sleep' },
    slayer: { tab: 'slayer', sub: 'slayer-battles' },
    collection: { tab: 'slayer', sub: 'slayer-loot' },
    stats: { tab: 'scroll', sub: 'scroll-stats' },
    history: { tab: 'scroll', sub: 'scroll-history' },
    audit: { tab: 'scroll', sub: 'scroll-audit' },
    forum: { tab: 'tavern', sub: 'tavern-forum' },
    settings: { tab: 'config', sub: 'config-settings' }
};

// Track current retro state
let currentRetroTab = 'quest';
let currentRetroSubs = {
    quest: 'quest-fasting',
    slayer: 'slayer-battles',
    scroll: 'scroll-stats',
    tavern: 'tavern-forum',
    config: 'config-settings'
};

// Original parent references for returning views to legacy
const retroOriginalParents = {};

function applyLayout() {
    const isRetro = state.settings.layout === 'retro';
    const body = document.body;

    if (isRetro) {
        body.classList.add('retro-theme');
        reparentViewsToRetro();
    } else {
        body.classList.remove('retro-theme');
        returnViewsToLegacy();
    }
}

function reparentViewsToRetro() {
    // Move each legacy view into its retro sub-container
    for (const tab in RETRO_TAB_MAP) {
        const subs = RETRO_TAB_MAP[tab];
        for (const subKey in subs) {
            const viewId = subs[subKey];
            const view = document.getElementById(viewId);
            const container = document.getElementById('retro-sub-' + subKey);
            if (view && container && view.parentNode !== container) {
                // Save original parent for returning later
                if (!retroOriginalParents[viewId]) {
                    retroOriginalParents[viewId] = view.parentNode;
                }
                // Unhide the view (legacy hides non-active tabs)
                view.classList.remove('hidden');
                container.appendChild(view);
            }
        }
    }
}

function returnViewsToLegacy() {
    for (const viewId in retroOriginalParents) {
        const view = document.getElementById(viewId);
        const originalParent = retroOriginalParents[viewId];
        if (view && originalParent && view.parentNode !== originalParent) {
            originalParent.appendChild(view);
        }
    }
    // Re-apply legacy tab visibility
    if (state.currentTab) {
        switchTab(state.currentTab);
    }
}

function switchRetroTab(tab, btnEl) {
    currentRetroTab = tab;

    // Update tab bar active states
    document.querySelectorAll('.retro-tab-btn').forEach(btn => {
        btn.classList.remove('retro-tab-active');
        btn.setAttribute('aria-selected', 'false');
    });
    if (btnEl) {
        btnEl.classList.add('retro-tab-active');
        btnEl.setAttribute('aria-selected', 'true');
    }

    // Show the correct retro view
    document.querySelectorAll('.retro-view').forEach(v => v.classList.remove('retro-view-active'));
    const targetView = document.getElementById('retro-view-' + tab);
    if (targetView) targetView.classList.add('retro-view-active');

    // Scroll content to top
    const content = document.querySelector('.retro-content');
    if (content) content.scrollTop = 0;

    // Activate the remembered sub-view for this tab
    const activeSub = currentRetroSubs[tab];
    if (activeSub) {
        activateRetroSub(tab, activeSub);
    }

    // Trigger data refresh based on which legacy views are now visible
    refreshRetroTabData(tab);

    // Update state.currentTab to match the active legacy view
    const subs = RETRO_TAB_MAP[tab];
    const activeSubKey = currentRetroSubs[tab];
    if (subs && subs[activeSubKey]) {
        const legacyViewId = subs[activeSubKey];
        state.currentTab = legacyViewId.replace('view-', '');
        saveState();
    }
}

function switchRetroSub(tab, subKey, pillEl) {
    currentRetroSubs[tab] = subKey;
    activateRetroSub(tab, subKey);

    // Update pill active states
    const parentView = document.getElementById('retro-view-' + tab);
    if (parentView) {
        parentView.querySelectorAll('.retro-pill').forEach(p => p.classList.remove('retro-pill-active'));
    }
    if (pillEl) pillEl.classList.add('retro-pill-active');

    // Update state.currentTab
    const subs = RETRO_TAB_MAP[tab];
    if (subs && subs[subKey]) {
        const legacyViewId = subs[subKey];
        state.currentTab = legacyViewId.replace('view-', '');
        saveState();
    }

    // Refresh data for the newly visible sub-view
    refreshRetroTabData(tab);
}

function activateRetroSub(tab, subKey) {
    // Hide all sub-containers within this tab
    const parentView = document.getElementById('retro-view-' + tab);
    if (parentView) {
        parentView.querySelectorAll('.retro-sub-container').forEach(sc => sc.classList.remove('retro-sub-active'));
    }
    const target = document.getElementById('retro-sub-' + subKey);
    if (target) target.classList.add('retro-sub-active');
}

function refreshRetroTabData(tab) {
    const activeSub = currentRetroSubs[tab];
    const subs = RETRO_TAB_MAP[tab];
    if (!subs || !subs[activeSub]) return;

    const legacyTab = subs[activeSub].replace('view-', '');

    // Use the same refresh logic as legacy switchTab
    if (legacyTab === 'history') {
        renderHistory();
        renderSleepHistory();
    } else if (legacyTab === 'stats') {
        renderStats();
        renderSleepStats();
        updateSkills();
        if (typeof refreshHealthKitData === 'function') refreshHealthKitData();
    } else if (legacyTab === 'sleep') {
        updateSleepUI();
        if (typeof refreshHealthKitData === 'function') refreshHealthKitData();
    } else if (legacyTab === 'eating') {
        updateEatingPowerupDisplay();
        updateMealQuality();
    } else if (legacyTab === 'slayer') {
        const slayerView = document.getElementById('view-slayer');
        if (slayerView) slayerView.classList.remove('animations-paused');
        updateMonsterBattleUI();
        if (typeof startSlayerAnimations === 'function') startSlayerAnimations();
    } else if (legacyTab === 'collection') {
        updateCollectionUI();
        checkAllItemUnlocks();
    } else if (legacyTab === 'forum') {
        updateForumAuthUI();
        loadForumPosts();
        setupForumRealTimeListener();
    } else if (legacyTab === 'audit') {
        renderAuditLog();
    } else if (legacyTab === 'settings') {
        updateHealthKitSettingsUI();
    }

    // Pause Battles animations when not on slayer
    if (legacyTab !== 'slayer') {
        const slayerView = document.getElementById('view-slayer');
        if (slayerView) slayerView.classList.add('animations-paused');
    }
}

function setLayout(layout) {
    if (layout !== 'legacy' && layout !== 'retro') return;
    if (state.settings.layout === layout) return; // No change needed

    state.settings.layout = layout;
    saveState();
    applyLayout();
    updateLayoutToggleUI();

    // If switching to retro, restore current tab position
    if (layout === 'retro' && state.currentTab) {
        const mapping = LEGACY_TO_RETRO[state.currentTab];
        if (mapping) {
            currentRetroSubs[mapping.tab] = mapping.sub;
            const tabBtn = document.querySelector(`.retro-tab-btn[data-retro-tab="${mapping.tab}"]`);
            switchRetroTab(mapping.tab, tabBtn);
        }
    }
}

function updateLayoutToggleUI() {
    const legacyBtn = document.getElementById('layout-legacy-btn');
    const retroBtn = document.getElementById('layout-retro-btn');
    if (!legacyBtn || !retroBtn) return;

    const isRetro = state.settings.layout === 'retro';

    if (isRetro) {
        retroBtn.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
        retroBtn.style.color = 'white';
        retroBtn.style.border = 'none';
        legacyBtn.style.background = 'rgba(255,255,255,0.05)';
        legacyBtn.style.color = 'var(--dark-text-muted)';
        legacyBtn.style.border = '1px solid rgba(255,255,255,0.1)';
    } else {
        legacyBtn.style.background = 'linear-gradient(135deg, var(--matrix-500) 0%, var(--matrix-400) 100%)';
        legacyBtn.style.color = 'black';
        legacyBtn.style.border = 'none';
        retroBtn.style.background = 'rgba(255,255,255,0.05)';
        retroBtn.style.color = 'var(--dark-text-muted)';
        retroBtn.style.border = '1px solid rgba(255,255,255,0.1)';
    }
}

// ==========================================
// UI UTILITIES
// ==========================================

/**
 * Generate skeleton loading HTML for history lists
 * @param {number} count - Number of skeleton items to show
 * @returns {string} - HTML string for skeleton loading state
 */
function generateHistorySkeleton(count = 3) {
    const skeletonItem = `
        <div class="border rounded-lg p-4" style="border-color: var(--dark-border);">
            <div class="flex justify-between items-start mb-2">
                <div class="flex-1">
                    <div class="h-5 w-24 rounded shimmer mb-2"></div>
                    <div class="h-4 w-16 rounded shimmer"></div>
                </div>
                <div class="h-4 w-12 rounded shimmer"></div>
            </div>
            <div class="h-3 w-40 rounded shimmer mt-2"></div>
        </div>
    `;
    return Array(count).fill(skeletonItem).join('');
}

/**
 * Show skeleton loading state for a history list
 * @param {string} listId - ID of the history list element
 */
function showHistorySkeleton(listId) {
    const list = document.getElementById(listId);
    if (list) {
        list.innerHTML = generateHistorySkeleton(3);
    }
}

/**
 * Close a modal with spring animation
 * @param {string} modalId - ID of the modal element
 * @param {Function} [callback] - Optional callback after animation completes
 */
function closeModalWithAnimation(modalId, callback) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Add closing class to trigger exit animation
    modal.classList.add('closing');

    // Wait for animation to complete, then hide
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('closing');
        if (callback) callback();
    }, 150); // Match the springOut animation duration
}

// ==========================================
// VIRTUALIZED LIST UTILITIES
// ==========================================

/**
 * Virtualized list configuration
 */
const VIRTUAL_LIST_CONFIG = {
    itemHeight: 100,      // Approximate height of each history item in pixels
    bufferSize: 5,        // Number of items to render above/below viewport
    containerHeight: 500  // Max height of scrollable container
};

/**
 * Create a virtualized list for history items
 * Only renders visible items + buffer for performance with large lists
 *
 * @param {Object} config - Configuration object
 * @param {string} config.containerId - ID of the container element
 * @param {Array} config.items - Array of items to render
 * @param {Function} config.renderItem - Function that returns HTML for a single item
 * @param {string} config.emptyMessage - Message to show when list is empty
 */
function createVirtualizedList({ containerId, items, renderItem, emptyMessage }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // For small lists (< 50 items), use regular rendering for simplicity
    if (!items || items.length === 0) {
        container.innerHTML = `<p class="text-gray-500 text-center py-8">${emptyMessage}</p>`;
        container.style.maxHeight = '';
        container.style.overflowY = '';
        return;
    }

    if (items.length < 50) {
        container.innerHTML = items.map(renderItem).join('');
        container.style.maxHeight = '';
        container.style.overflowY = '';
        return;
    }

    // For large lists, use virtualization
    const { itemHeight, bufferSize, containerHeight } = VIRTUAL_LIST_CONFIG;
    const totalHeight = items.length * itemHeight;

    // Set up scrollable container
    container.style.maxHeight = `${containerHeight}px`;
    container.style.overflowY = 'auto';
    container.style.position = 'relative';

    // Create inner wrapper for virtual scrolling
    const wrapper = document.createElement('div');
    wrapper.style.height = `${totalHeight}px`;
    wrapper.style.position = 'relative';
    wrapper.className = 'virtual-list-wrapper';

    // Content container for visible items
    const content = document.createElement('div');
    content.className = 'virtual-list-content';
    content.style.position = 'absolute';
    content.style.left = '0';
    content.style.right = '0';

    wrapper.appendChild(content);
    container.innerHTML = '';
    container.appendChild(wrapper);

    // Render function for visible items
    const renderVisibleItems = () => {
        const scrollTop = container.scrollTop;
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
        const endIndex = Math.min(
            items.length,
            Math.ceil((scrollTop + containerHeight) / itemHeight) + bufferSize
        );

        // Position content
        content.style.top = `${startIndex * itemHeight}px`;

        // Render visible items
        const visibleItems = items.slice(startIndex, endIndex);
        content.innerHTML = visibleItems.map(renderItem).join('');
    };

    // Initial render
    renderVisibleItems();

    // Throttled scroll handler
    let scrollTimeout;
    const handleScroll = () => {
        if (scrollTimeout) return;
        scrollTimeout = setTimeout(() => {
            renderVisibleItems();
            scrollTimeout = null;
        }, 16); // ~60fps
    };

    // Remove old listener if exists, add new one
    container._virtualScrollHandler = handleScroll;
    container.addEventListener('scroll', handleScroll, { passive: true });
}

/**
 * Clean up virtualized list scroll listeners
 * @param {string} containerId - ID of the container element
 */
function cleanupVirtualizedList(containerId) {
    const container = document.getElementById(containerId);
    if (container && container._virtualScrollHandler) {
        container.removeEventListener('scroll', container._virtualScrollHandler);
        delete container._virtualScrollHandler;
    }
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

// Check if a message contains a medical quote attribution
function isMedicalQuote(message) {
    return /Dr\.\s*(Matthew Walker|Jason Fung|Pradip Jamnadas|Andrew Huberman)/i.test(message);
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

    // Validate blockedUsers
    if (Array.isArray(sanitized.blockedUsers)) {
        sanitized.blockedUsers = sanitized.blockedUsers
            .filter(b => b && typeof b === 'object' && typeof b.uid === 'string' && b.uid.length <= 128)
            .map(b => ({
                uid: String(b.uid).slice(0, 128),
                username: String(b.username || 'Unknown').slice(0, 30),
                blockedAt: typeof b.blockedAt === 'number' ? b.blockedAt : Date.now()
            }))
            .slice(0, 200);
    } else {
        sanitized.blockedUsers = [];
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
                              'showHeartHealth', 'showBreakingFastGuide', 'showExerciseGuide', 'showEatingGuide',
                              'showSleepGuide', 'showMealSleepQuality', 'showHungerTracker', 'showTrends'];
        for (const setting of validSettings) {
            sanitized.settings[setting] = Boolean(sanitized.settings[setting]);
        }
        // Validate ghost color
        const validColors = ['green', 'blue', 'purple', 'red', 'gold'];
        if (!validColors.includes(sanitized.settings.suiGhostColor)) {
            sanitized.settings.suiGhostColor = 'green';
        }
        // Validate monster skins
        if (sanitized.settings.monsterSkins && typeof sanitized.settings.monsterSkins === 'object') {
            const validMonsters = ['visceral', 'dragon', 'wraith', 'golem', 'specter'];
            const validSkins = ['default', 'trophy'];
            const cleaned = {};
            for (const [monster, skin] of Object.entries(sanitized.settings.monsterSkins)) {
                if (validMonsters.includes(monster) && validSkins.includes(skin)) {
                    cleaned[monster] = skin;
                }
            }
            sanitized.settings.monsterSkins = cleaned;
        } else {
            sanitized.settings.monsterSkins = {};
        }
    }

    // Validate collection (precious items)
    if (sanitized.collection && typeof sanitized.collection === 'object') {
        // Validate unlockedItems
        if (Array.isArray(sanitized.collection.unlockedItems)) {
            sanitized.collection.unlockedItems = sanitized.collection.unlockedItems
                .filter(id => typeof id === 'string' && id.length <= 50 && PRECIOUS_ITEMS[id])
                .slice(0, 50);
        } else {
            sanitized.collection.unlockedItems = [];
        }
        // Validate equippedItem
        if (sanitized.collection.equippedItem) {
            if (typeof sanitized.collection.equippedItem !== 'string' ||
                !PRECIOUS_ITEMS[sanitized.collection.equippedItem]) {
                sanitized.collection.equippedItem = null;
            }
        }
        // Validate newItems
        if (Array.isArray(sanitized.collection.newItems)) {
            sanitized.collection.newItems = sanitized.collection.newItems
                .filter(id => typeof id === 'string' && id.length <= 50)
                .slice(0, 50);
        } else {
            sanitized.collection.newItems = [];
        }
        // Validate unlockTimestamps
        if (sanitized.collection.unlockTimestamps && typeof sanitized.collection.unlockTimestamps === 'object') {
            const cleaned = {};
            for (const [itemId, ts] of Object.entries(sanitized.collection.unlockTimestamps)) {
                if (typeof itemId === 'string' && itemId.length <= 50 && typeof ts === 'number' && ts > 0 && ts <= Date.now() + 86400000) {
                    cleaned[itemId] = ts;
                }
            }
            sanitized.collection.unlockTimestamps = cleaned;
        } else {
            sanitized.collection.unlockTimestamps = {};
        }
    } else {
        sanitized.collection = { unlockedItems: [], equippedItem: null, newItems: [], unlockTimestamps: {} };
    }

    // Validate premium state (Sui Pro subscription)
    if (sanitized.premium && typeof sanitized.premium === 'object') {
        sanitized.premium.isActive = Boolean(sanitized.premium.isActive);
        if (sanitized.premium.expiresAt !== null) {
            sanitized.premium.expiresAt = sanitizeNumber(sanitized.premium.expiresAt, 0, Date.now() + 365 * 86400000, null);
        }
        if (sanitized.premium.productId !== null && typeof sanitized.premium.productId !== 'string') {
            sanitized.premium.productId = null;
        }
        if (sanitized.premium.originalPurchaseDate !== null) {
            sanitized.premium.originalPurchaseDate = sanitizeNumber(sanitized.premium.originalPurchaseDate, 0, Date.now() + 86400000, null);
        }
        if (sanitized.premium.source !== null) {
            const validSources = ['storekit', 'restored'];
            if (!validSources.includes(sanitized.premium.source)) {
                sanitized.premium.source = null;
            }
        }
    } else {
        sanitized.premium = { isActive: false, expiresAt: null, productId: null, originalPurchaseDate: null, source: null };
    }

    return sanitized;
}

let timerInterval = null;
let sleepTimerInterval = null;
let heartPointsInterval = null; // Track heart points update interval to prevent memory leaks
let mealSleepInterval = null; // Track meal/sleep status interval
let heartPointsCheckInterval = null; // Track heart points check interval when not fasting
let livingLifeInterval = null; // Track Living Life status check interval
let initialSyncComplete = false; // Flag to prevent overwriting cloud data before initial sync
let isMergingRemoteData = false; // Flag to prevent sync loops during remote data merge

// Performance cache for expensive calculations
// Cache is invalidated when state changes (stopFast, stopSleep, addPowerup, remote sync)
const perfCache = {
    historicalBattleData: null,
    historicalBattleDataDirty: true,
    damageBonuses: null,
    damageBonusesDirty: true,
    fastingStreak: null,
    fastingStreakDirty: true,
    sleepStreak: null,
    sleepStreakDirty: true,
    auditEvents: null,
    auditEventsDirty: true
};

function invalidateCache(what) {
    if (what === 'all' || what === 'fasting') {
        perfCache.historicalBattleDataDirty = true;
        perfCache.damageBonusesDirty = true;
        perfCache.fastingStreakDirty = true;
        perfCache.auditEventsDirty = true;
    }
    if (what === 'all' || what === 'sleep') {
        perfCache.historicalBattleDataDirty = true;
        perfCache.damageBonusesDirty = true;
        perfCache.sleepStreakDirty = true;
        perfCache.auditEventsDirty = true;
    }
    if (what === 'all' || what === 'powerup') {
        perfCache.historicalBattleDataDirty = true;
        perfCache.damageBonusesDirty = true;
        perfCache.auditEventsDirty = true;
    }
    if (what === 'all' || what === 'eating') {
        perfCache.damageBonusesDirty = true;
        perfCache.historicalBattleDataDirty = true;
        perfCache.auditEventsDirty = true;
    }
    if (what === 'all' || what === 'loot') {
        perfCache.auditEventsDirty = true;
    }
}

// App pause state for visibility/background handling
let appPaused = false;

// Pause all intervals when app is hidden or backgrounded (Apple energy guidance)
function pauseAllIntervals() {
    if (appPaused) return;
    appPaused = true;

    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (sleepTimerInterval) { clearInterval(sleepTimerInterval); sleepTimerInterval = null; }
    if (heartPointsInterval) { clearInterval(heartPointsInterval); heartPointsInterval = null; }
    if (heartPointsCheckInterval) { clearInterval(heartPointsCheckInterval); heartPointsCheckInterval = null; }
    if (mealSleepInterval) { clearInterval(mealSleepInterval); mealSleepInterval = null; }
    if (livingLifeInterval) { clearInterval(livingLifeInterval); livingLifeInterval = null; }
    if (slayerAnimationInterval) { clearInterval(slayerAnimationInterval); slayerAnimationInterval = null; }

    // Pause CSS animations on Battles tab
    const slayerView = document.getElementById('view-slayer');
    if (slayerView) slayerView.classList.add('animations-paused');

    saveState();
}

// Resume all intervals when app returns to foreground
function resumeAllIntervals() {
    if (!appPaused) return;
    appPaused = false;

    // Invalidate all caches (time passed, data may be stale from remote sync)
    invalidateCache('all');

    // Restart session timers if active (startTimer/startSleepTimer clear before creating)
    if (state.currentFast?.isActive) {
        startTimer();
    }
    if (state.currentSleep?.isActive) {
        startSleepTimer();
    }

    // Restart always-on intervals
    if (!mealSleepInterval) {
        mealSleepInterval = setInterval(updateMealSleepStatus, 60000);
    }
    if (!heartPointsCheckInterval) {
        heartPointsCheckInterval = setInterval(() => {
            if (!state.currentFast.isActive) {
                updateHeartPoints();
            }
        }, 60000);
    }
    if (!livingLifeInterval) {
        livingLifeInterval = setInterval(checkLivingLifeStatus, 60000);
    }

    // Restart Battles animations if on that tab
    if (state.currentTab === 'slayer') {
        const slayerView = document.getElementById('view-slayer');
        if (slayerView) slayerView.classList.remove('animations-paused');
        startSlayerAnimations();
    }

    // Immediate UI refresh (time elapsed while hidden)
    if (state.currentFast?.isActive) {
        updateTimerDisplay();
        updateProgressBar();
    }
    if (state.currentSleep?.isActive) {
        updateSleepTimerDisplay();
        updateSleepProgressBar();
    }
    updateHeartPoints();
    updateMealSleepStatus();
}

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

// Pause/resume on visibility change (web + Capacitor)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        pauseAllIntervals();
    } else {
        resumeAllIntervals();
    }
});

// Save state before page unload (browser close/refresh)
window.addEventListener('beforeunload', () => {
    saveState();
});

// ==========================================
// COLLECTION UI FUNCTIONS
// ==========================================

let currentRarityFilter = 'all';

// Update the entire collection UI
function updateCollectionUI() {
    try {
        // Ensure collection state exists
        if (!state.collection) {
            state.collection = { unlockedItems: [], equippedItem: null, newItems: [] };
        }

        updateCollectionProgress();
        updateEquippedItemDisplay();
        renderCollectionGrid();
        updateCollectionNewDot();
    } catch (e) {
        console.warn('Error updating collection UI:', e);
    }
}

// Update collection progress bar and counts
function updateCollectionProgress() {
    const unlockedCount = getUnlockedItemCount();
    const totalCount = getTotalItemCount();
    const progressPercent = (unlockedCount / totalCount) * 100;

    const progressText = document.getElementById('collection-progress-text');
    const progressBar = document.getElementById('collection-progress-bar');

    if (progressText) {
        progressText.textContent = `${unlockedCount} / ${totalCount}`;
    }
    if (progressBar) {
        progressBar.style.width = `${progressPercent}%`;
    }

    // Update rarity counts
    const rarityCounts = {
        common: 0,
        uncommon: 0,
        rare: 0,
        epic: 0,
        legendary: 0
    };

    getAllPreciousItems().forEach(item => {
        if (isItemUnlocked(item.id)) {
            rarityCounts[item.rarity]++;
        }
    });

    Object.keys(rarityCounts).forEach(rarity => {
        const countEl = document.getElementById(`${rarity}-count`);
        if (countEl) {
            countEl.textContent = rarityCounts[rarity];
        }
    });
}

// Update equipped item display
function updateEquippedItemDisplay() {
    const section = document.getElementById('equipped-item-section');
    const display = document.getElementById('equipped-item-display');

    if (!section || !display) return;

    const equipped = getEquippedItem();

    if (equipped) {
        const rarity = ITEM_RARITIES[equipped.rarity];
        section.classList.remove('hidden');
        display.innerHTML = `
            <div class="flex items-center justify-center w-12 h-12 rounded-lg" style="background: rgba(0,0,0,0.3); border: 1px solid ${rarity.color};">
                <span class="px-icon px-icon-lg ${equipped.icon}"></span>
            </div>
            <div class="flex-1">
                <div class="text-xs uppercase tracking-wider mb-1" style="color: ${rarity.color};">${rarity.name}</div>
                <div class="font-bold text-white">${escapeHtml(equipped.name)}</div>
                ${equipped.effectText ? `<div class="text-xs mt-1" style="color: ${rarity.color};">${escapeHtml(equipped.effectText)}</div>` : ''}
            </div>
        `;
        display.style.borderColor = rarity.color;
        display.style.background = `rgba(${rarity.color === '#f59e0b' ? '245, 158, 11' : rarity.color === '#a855f7' ? '168, 85, 247' : rarity.color === '#3b82f6' ? '59, 130, 246' : rarity.color === '#22c55e' ? '34, 197, 94' : '156, 163, 175'}, 0.1)`;
    } else {
        section.classList.add('hidden');
    }

    // Also update the main screen equipment slot
    updateMainEquipmentSlot();
}

// Update the equipment slot on main screen (Today view)
function updateMainEquipmentSlot() {
    const slotIcon = document.getElementById('equipment-slot-icon');
    const slotName = document.getElementById('equipment-slot-name');
    const slotEffect = document.getElementById('equipment-slot-effect');
    const slotContainer = document.getElementById('equipment-slot');

    if (!slotIcon || !slotName || !slotEffect || !slotContainer) return;

    const equipped = getEquippedItem();

    if (equipped) {
        const rarity = ITEM_RARITIES[equipped.rarity];

        // Update icon slot with item and rarity glow
        slotIcon.innerHTML = `<span class="px-icon px-icon-lg ${equipped.icon}" style="color: ${rarity.color};"></span>`;
        slotIcon.style.background = `rgba(${getRarityRGB(rarity.color)}, 0.15)`;
        slotIcon.style.border = `2px solid ${rarity.color}`;
        slotIcon.style.boxShadow = `0 0 15px rgba(${getRarityRGB(rarity.color)}, 0.4), inset 0 0 10px rgba(${getRarityRGB(rarity.color)}, 0.1)`;

        // Update name with rarity color
        slotName.textContent = equipped.name;
        slotName.style.color = rarity.color;

        // Update effect text
        if (equipped.effectText) {
            slotEffect.innerHTML = `<span style="color: ${rarity.color};">✦</span> ${escapeHtml(equipped.effectText)}`;
            slotEffect.style.color = 'var(--dark-text)';
        } else {
            slotEffect.textContent = `${rarity.name} item equipped`;
            slotEffect.style.color = 'var(--dark-text-muted)';
        }

        // Add subtle rarity border glow to container
        slotContainer.style.borderColor = `rgba(${getRarityRGB(rarity.color)}, 0.3)`;
    } else {
        // Reset to empty state
        slotIcon.innerHTML = `<span class="text-2xl" style="color: var(--dark-text-muted);">?</span>`;
        slotIcon.style.background = 'rgba(255,255,255,0.05)';
        slotIcon.style.border = '2px dashed var(--dark-border)';
        slotIcon.style.boxShadow = 'none';

        slotName.textContent = 'No item equipped';
        slotName.style.color = 'var(--dark-text-muted)';

        slotEffect.textContent = 'Tap to equip from Loot';
        slotEffect.style.color = 'var(--dark-text-muted)';

        slotContainer.style.borderColor = '';
    }
}

// Helper to convert hex color to RGB values for rgba()
function getRarityRGB(hexColor) {
    const colorMap = {
        '#9ca3af': '156, 163, 175',  // common - gray
        '#22c55e': '34, 197, 94',    // uncommon - green
        '#3b82f6': '59, 130, 246',   // rare - blue
        '#a855f7': '168, 85, 247',   // epic - purple
        '#fbbf24': '251, 191, 36'    // legendary - gold
    };
    return colorMap[hexColor] || '156, 163, 175';
}

// Render the collection grid
function renderCollectionGrid() {
    const grid = document.getElementById('collection-grid');
    if (!grid) return;

    // Get items based on filter
    let items = getAllPreciousItems();
    if (currentRarityFilter !== 'all') {
        items = items.filter(item => item.rarity === currentRarityFilter);
    }

    // Sort by rarity (legendary first) then by unlocked status
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    items.sort((a, b) => {
        // First sort by unlocked status
        const aUnlocked = isItemUnlocked(a.id);
        const bUnlocked = isItemUnlocked(b.id);
        if (aUnlocked && !bUnlocked) return -1;
        if (!aUnlocked && bUnlocked) return 1;
        // Then by rarity
        return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    });

    grid.innerHTML = items.map(item => renderItemCard(item)).join('');

    // Add click listeners
    grid.querySelectorAll('.item-card').forEach(card => {
        card.addEventListener('click', () => {
            const itemId = card.dataset.itemId;
            showItemModal(itemId);
        });
    });
}

// Render a single item card
function renderItemCard(item) {
    const unlocked = isItemUnlocked(item.id);
    const equipped = state.collection?.equippedItem === item.id;
    const isNew = state.collection?.newItems?.includes(item.id);
    const rarity = ITEM_RARITIES[item.rarity];
    const progress = getItemUnlockProgress(item);

    if (unlocked) {
        return `
            <div class="item-card p-3 rounded-lg cursor-pointer transition-all hover:scale-105 relative"
                 data-item-id="${item.id}"
                 style="background: rgba(0,0,0,0.3); border: 2px solid ${rarity.color}; box-shadow: 0 0 10px ${rarity.glow};">
                ${isNew ? '<span class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>' : ''}
                ${equipped ? '<span class="absolute top-1 left-1 text-xs px-1.5 py-0.5 rounded" style="background: rgba(245, 158, 11, 0.3); color: #fbbf24;">Equipped</span>' : ''}
                <div class="flex justify-center mb-2">
                    <div class="w-12 h-12 flex items-center justify-center" style="filter: drop-shadow(0 0 8px ${rarity.glow});">
                        <span class="px-icon px-icon-xl ${item.icon}"></span>
                    </div>
                </div>
                <div class="text-center">
                    <div class="text-xs uppercase tracking-wider mb-1" style="color: ${rarity.color};">${rarity.name}</div>
                    <div class="text-sm font-bold text-white truncate">${escapeHtml(item.name)}</div>
                    ${item.effectText ? `<div class="text-xs mt-1 truncate" style="color: ${rarity.color};">${escapeHtml(item.effectText)}</div>` : ''}
                </div>
            </div>
        `;
    } else {
        return `
            <div class="item-card p-3 rounded-lg cursor-pointer transition-all hover:scale-105 opacity-50"
                 data-item-id="${item.id}"
                 style="background: rgba(0,0,0,0.3); border: 2px solid #4b5563;">
                <div class="flex justify-center mb-2">
                    <div class="w-12 h-12 flex items-center justify-center">
                        <span class="px-icon px-icon-xl px-locked"></span>
                    </div>
                </div>
                <div class="text-center">
                    <div class="text-xs uppercase tracking-wider mb-1" style="color: #6b7280;">Locked</div>
                    <div class="text-sm font-bold text-gray-500 truncate">???</div>
                    <div class="text-xs mt-1" style="color: #6b7280;">${Math.floor(progress)}% Progress</div>
                </div>
                <div class="mt-2 h-1 rounded-full overflow-hidden" style="background: rgba(107, 114, 128, 0.3);">
                    <div class="h-full transition-all" style="width: ${progress}%; background: #6b7280;"></div>
                </div>
            </div>
        `;
    }
}

// Show item detail modal
function showItemModal(itemId) {
    const item = PRECIOUS_ITEMS[itemId];
    if (!item) return;

    const unlocked = isItemUnlocked(itemId);
    const equipped = state.collection?.equippedItem === itemId;
    const rarity = ITEM_RARITIES[item.rarity];
    const progress = getItemUnlockProgress(item);

    // Mark as viewed if new
    if (state.collection?.newItems?.includes(itemId)) {
        markItemViewed(itemId);
        updateCollectionNewDot();
        renderCollectionGrid();
    }

    // Create modal
    const existingModal = document.getElementById('item-detail-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'item-detail-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.style.background = 'rgba(0,0,0,0.9)';

    modal.innerHTML = `
        <div class="dark-card rounded-xl max-w-md w-full p-6" style="border: 2px solid ${unlocked ? rarity.color : '#4b5563'}; box-shadow: ${unlocked ? `0 0 30px ${rarity.glow}` : 'none'};">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-16 h-16 flex items-center justify-center rounded-lg" style="background: rgba(0,0,0,0.3); border: 1px solid ${unlocked ? rarity.color : '#4b5563'};">
                        <span class="px-icon px-icon-xl ${unlocked ? item.icon : 'px-locked'}"></span>
                    </div>
                    <div>
                        <div class="text-xs uppercase tracking-wider mb-1" style="color: ${unlocked ? rarity.color : '#6b7280'};">${rarity.name}</div>
                        <h3 class="text-xl font-bold" style="color: ${unlocked ? 'white' : '#6b7280'};">${unlocked ? escapeHtml(item.name) : '???'}</h3>
                    </div>
                </div>
                <button class="text-2xl" style="color: var(--dark-text-muted);" id="close-item-modal">&times;</button>
            </div>

            ${unlocked ? `
                <p class="text-sm mb-3" style="color: var(--dark-text-muted);">${escapeHtml(item.description)}</p>
                <p class="text-xs italic mb-4" style="color: ${rarity.color};">"${escapeHtml(item.lore)}"</p>

                ${item.effectText ? `
                    <div class="p-3 rounded-lg mb-4" style="background: rgba(${rarity.color === '#f59e0b' ? '245, 158, 11' : rarity.color === '#a855f7' ? '168, 85, 247' : rarity.color === '#3b82f6' ? '59, 130, 246' : rarity.color === '#22c55e' ? '34, 197, 94' : '156, 163, 175'}, 0.1); border: 1px solid ${rarity.color};">
                        <div class="text-xs uppercase tracking-wider mb-1" style="color: ${rarity.color};">Effect</div>
                        <div class="font-bold text-white">${escapeHtml(item.effectText)}</div>
                    </div>
                ` : ''}

                ${equipped ? `
                    <button id="unequip-item-btn" class="w-full py-3 px-4 rounded-lg font-medium transition-colors" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444;">
                        Unequip Item
                    </button>
                ` : `
                    <button id="equip-item-btn" class="w-full py-3 px-4 rounded-lg font-medium transition-colors" style="background: linear-gradient(135deg, ${rarity.color} 0%, ${rarity.color}cc 100%); color: black;">
                        Equip Item
                    </button>
                `}
            ` : `
                <div class="text-center py-4">
                    <div class="text-lg font-bold mb-2" style="color: #6b7280;">Item Locked</div>
                    <p class="text-sm mb-4" style="color: var(--dark-text-muted);">${escapeHtml(item.unlockText)}</p>
                    <div class="h-2 rounded-full overflow-hidden mb-2" style="background: rgba(107, 114, 128, 0.3);">
                        <div class="h-full transition-all" style="width: ${progress}%; background: ${rarity.color};"></div>
                    </div>
                    <div class="text-xs" style="color: #6b7280;">${Math.floor(progress)}% Complete</div>
                </div>
            `}
        </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    document.getElementById('close-item-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    const equipBtn = document.getElementById('equip-item-btn');
    if (equipBtn) {
        equipBtn.addEventListener('click', () => {
            equipItem(itemId);
            modal.remove();
            updateCollectionUI();
        });
    }

    const unequipBtn = document.getElementById('unequip-item-btn');
    if (unequipBtn) {
        unequipBtn.addEventListener('click', () => {
            unequipItem();
            modal.remove();
            updateCollectionUI();
        });
    }
}

// Update the new items notification dot
function updateCollectionNewDot() {
    const dot = document.getElementById('collection-new-dot');
    if (dot) {
        if (hasNewItems()) {
            dot.classList.remove('hidden');
        } else {
            dot.classList.add('hidden');
        }
    }
}

// Initialize collection event listeners
function initCollectionListeners() {
    // Rarity filter buttons
    document.querySelectorAll('.rarity-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const rarity = btn.dataset.rarity;
            currentRarityFilter = rarity;

            // Update button styles
            document.querySelectorAll('.rarity-filter-btn').forEach(b => {
                b.style.border = '';
                b.style.background = b.style.background.replace('0.2', '0.1');
            });
            btn.style.border = '1px solid currentColor';

            renderCollectionGrid();
        });
    });

    // Unequip button in equipped section
    const unequipBtn = document.getElementById('unequip-btn');
    if (unequipBtn) {
        unequipBtn.addEventListener('click', () => {
            unequipItem();
            updateCollectionUI();
            showAchievementToast('<span class="px-icon px-chest"></span>', 'Item Unequipped', 'No item is currently equipped.', 'info');
        });
    }

    // Equipment slot on main screen - navigate to Loot tab
    const equipmentSlot = document.getElementById('equipment-slot');
    if (equipmentSlot) {
        equipmentSlot.addEventListener('click', () => {
            switchTab('collection');
        });
    }
}


// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    initDomCache(); // Initialize DOM element cache first
    showStagingBadge(); // Show staging indicator if on staging environment
    loadState();
    purgeExpiredHistory(); // Remove history older than 6 months for free users
    checkPurgeWarnings();  // Warn if data is approaching the 6-month cutoff
    initEventListeners();
    initUsernameListeners();
    initLeaderboardListeners();
    initTutorialListener();
    initCollectionListeners();
    initForumListeners();
    initSettings();

    restoreCollapsedSections();

    updateUI();
    updatePowerupDisplay();
    updateHungerDisplay();
    updateEatingPowerupDisplay();
    updateMealQuality();
    updateHeartPoints();
    updateSkills();
    updateCustomPowerupDisplay();
    updatePowerupStates();
    updateLivingLifeUI();
    updateCollectionNewDot();
    updateMainEquipmentSlot();
    checkAllItemUnlocks();
    updatePremiumUI();

    // Apply layout (legacy or retro) before restoring tab
    applyLayout();
    updateLayoutToggleUI();

    // Restore last active tab
    if (state.currentTab) {
        if (state.settings.layout === 'retro') {
            // Map legacy tab to retro tab + sub
            const mapping = LEGACY_TO_RETRO[state.currentTab];
            if (mapping) {
                currentRetroSubs[mapping.tab] = mapping.sub;
                const tabBtn = document.querySelector(`.retro-tab-btn[data-retro-tab="${mapping.tab}"]`);
                switchRetroTab(mapping.tab, tabBtn);
            }
        } else {
            switchTab(state.currentTab);
        }
    }

    if (state.currentFast.isActive) {
        startTimer();
        updateMetabolicStateDisplay(); // Initialize metabolic state on load
    }

    if (state.currentSleep && state.currentSleep.isActive) {
        startSleepTimer();
    }

    // Initialize metabolic panel toggle
    initMetabolicPanelToggle();

    // Update meal-sleep status every minute (store reference for cleanup)
    mealSleepInterval = setInterval(updateMealSleepStatus, 60000);

    // Note: Heart Points is updated by startTimer() every 30 seconds when fasting is active
    // Only need periodic update when NOT fasting (for sleep/eating scores)
    heartPointsCheckInterval = setInterval(() => {
        if (!state.currentFast.isActive) {
            updateHeartPoints();
        }
    }, 60000);

    // Initialize Firebase sync
    await initializeFirebaseSync();

    // MANDATORY SIGN-IN GATE: block app until user is authenticated
    if (firebaseSync && firebaseSync.isInitialized && !firebaseSync.isAuthenticated()) {
        await showSignInGate();
    }

    // If user's last tab was forum, reload now that Firebase is ready
    if (state.currentTab === 'forum' && firebaseSync && firebaseSync.isAuthenticated()) {
        loadForumPosts();
        setupForumRealTimeListener();
    }

    // Initialize Capacitor native plugins (no-op on web)
    initCapacitorPlugins();

    // Initialize offline/online network listeners
    initNetworkListeners();

    // Initialize manage subscription button
    initManageSubscriptionButton();

    // Render blocked users list in settings
    renderBlockedUsersList();

    // Check for username if already signed in
    if (firebaseSync && firebaseSync.isAuthenticated()) {
        await checkUsernameAfterSignIn();
    }

    // Wait for initial sync to complete before showing tutorial/checking unlocks
    // This prevents showing tutorial and loot toasts for users who already completed them on another device
    if (firebaseSync && firebaseSync.isAuthenticated()) {
        // Wait up to 3 seconds for cloud data to arrive
        const waitForSync = () => new Promise((resolve) => {
            if (initialSyncComplete) {
                resolve();
                return;
            }
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (initialSyncComplete || Date.now() - startTime > 3000) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
        await waitForSync();
    }

    // Show TestFlight banner and toast (web only)
    showTestFlightPromo();

    // Show health disclaimer on first launch
    showHealthDisclaimerIfNeeded();

    // Safety onboarding: age check → ED disclaimer (blocks until confirmed)
    checkAgeConfirmation();

    // Apply eating quality UI preference
    updateEatingQualityUI();

    // Check and show tutorial for first-time users (only after cloud data is synced)
    checkFirstTimeTutorial();

    // Global Escape key handler to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close modals in order of z-index priority (highest first)
            const modalsToClose = [
                { id: 'fasting-warning-modal', fn: hideFastingWarningModal },
                { id: 'ed-disclaimer-modal', fn: () => { document.getElementById('ed-disclaimer-modal')?.classList.add('hidden'); if (!state.settings.hasSeenEDDisclaimer) { state.settings.hasSeenEDDisclaimer = true; saveState(); } } },
                { id: 'tutorial-modal', fn: hideTutorial },
                { id: 'leaderboard-modal', fn: closeLeaderboard },
                { id: 'feeling-modal', fn: () => document.getElementById('feeling-modal')?.classList.add('hidden') },
                { id: 'custom-powerup-modal', fn: () => document.getElementById('custom-powerup-modal')?.classList.add('hidden') },
                // username-modal intentionally excluded — it's mandatory and cannot be dismissed
                // age-check-modal intentionally excluded — it's mandatory and cannot be dismissed
                { id: 'guide-modal', fn: () => document.getElementById('guide-modal')?.classList.add('hidden') },
                { id: 'levelup-modal', fn: () => document.getElementById('levelup-modal')?.classList.add('hidden') },
                { id: 'yolo-celebration-modal', fn: () => document.getElementById('yolo-celebration-modal')?.classList.add('hidden') },
                { id: 'living-life-modal', fn: () => document.getElementById('living-life-modal')?.classList.add('hidden') },
                { id: 'visceral-fat-modal', fn: () => document.getElementById('visceral-fat-modal')?.classList.add('hidden') },
                { id: 'insulin-dragon-modal', fn: () => document.getElementById('insulin-dragon-modal')?.classList.add('hidden') },
                { id: 'sui-pro-modal', fn: hidePaywall }
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
    // Purge history older than 6 months for free users before every save
    purgeExpiredHistory();

    if (localStorageAvailable) {
        try {
            localStorage.setItem(STATE_KEY, JSON.stringify(state));
            // Track when local state was last modified so merge logic knows our data is fresh
            localStorage.setItem('last-local-update', Date.now().toString());
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

    // Sync minimal state to Apple Watch (if paired)
    sendStateToWatch();
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
            // Ensure blockedUsers exists (backward compatibility)
            if (!Array.isArray(state.blockedUsers)) {
                state.blockedUsers = [];
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
                showHeartHealth: true,
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
            // Ensure suiGhostColor setting exists (backward compatibility for ghost cosmetics)
            if (!state.settings.suiGhostColor) {
                state.settings.suiGhostColor = 'green';
            }
            // Ensure monsterSkins setting exists (backward compatibility for trophy skins)
            if (!state.settings.monsterSkins || typeof state.settings.monsterSkins !== 'object') {
                state.settings.monsterSkins = {};
            }
            // Ensure layout setting exists (backward compatibility for dual-layout system)
            if (!state.settings.layout || (state.settings.layout !== 'legacy' && state.settings.layout !== 'retro')) {
                state.settings.layout = 'legacy';
            }
            // Ensure livingLife exists (backward compatibility)
            if (!state.livingLife) {
                state.livingLife = { isActive: false, activatedAt: null, expiresAt: null, history: [] };
            }
            if (!Array.isArray(state.livingLife.history)) {
                state.livingLife.history = [];
            }
            // Ensure collection exists (backward compatibility for precious items)
            if (!state.collection) {
                state.collection = { unlockedItems: [], equippedItem: null, newItems: [] };
            }
            if (!Array.isArray(state.collection.unlockedItems)) {
                state.collection.unlockedItems = [];
            }
            if (!Array.isArray(state.collection.newItems)) {
                state.collection.newItems = [];
            }
            if (!state.collection.unlockTimestamps || typeof state.collection.unlockTimestamps !== 'object') {
                state.collection.unlockTimestamps = {};
            }
            // Ensure premium state exists (backward compatibility for Sui Pro)
            if (!state.premium || typeof state.premium !== 'object') {
                state.premium = { isActive: false, expiresAt: null, productId: null, originalPurchaseDate: null, source: null };
            }

            // Migrate renamed item IDs (trademark cleanup, Feb 2026)
            const itemIdMigrations = {
                'insulin-slayer-blade': 'insulin-bane-blade',
                'glucagon-godsword': 'glucagon-greatsword',
                'circadian-partyhat': 'circadian-crown',
                'mitochondria-tassets': 'mitochondria-greaves'
            };
            for (const [oldId, newId] of Object.entries(itemIdMigrations)) {
                const idx = state.collection.unlockedItems.indexOf(oldId);
                if (idx !== -1) {
                    state.collection.unlockedItems[idx] = newId;
                }
                const newIdx = state.collection.newItems.indexOf(oldId);
                if (newIdx !== -1) {
                    state.collection.newItems[newIdx] = newId;
                }
                if (state.collection.equippedItem === oldId) {
                    state.collection.equippedItem = newId;
                }
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
            // Safety settings (backward compatibility)
            if (state.settings.ageConfirmed === undefined) state.settings.ageConfirmed = false;
            if (state.settings.ageBracket === undefined) state.settings.ageBracket = null;
            if (state.settings.dismissedFastingWarning16 === undefined) state.settings.dismissedFastingWarning16 = false;
            if (state.settings.eatingQualityEnabled === undefined) state.settings.eatingQualityEnabled = true;
            if (state.settings.hasSeenEDDisclaimer === undefined) state.settings.hasSeenEDDisclaimer = false;
            if (state.settings.healthKitConnected === undefined) state.settings.healthKitConnected = false;
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

// ==========================================
// FREE TIER DATA CLEANUP (6-month limit)
// ==========================================
// Free users keep 6 months of history. Beyond that, data is purged.
// Premium users keep unlimited history.
// Two warning notifications before purge: at 2 weeks and 3 days.
const FREE_HISTORY_MONTHS = 6;
const FREE_HISTORY_MS = FREE_HISTORY_MONTHS * 30 * 24 * 60 * 60 * 1000;
const PURGE_WARN_14_DAYS = 14 * 24 * 60 * 60 * 1000;
const PURGE_WARN_3_DAYS = 3 * 24 * 60 * 60 * 1000;

function purgeExpiredHistory() {
    // Premium users keep everything
    if (isPremiumActive()) return;

    const sixMonthsAgo = Date.now() - FREE_HISTORY_MS;

    // Purge fasting history
    if (Array.isArray(state.fastingHistory)) {
        state.fastingHistory = state.fastingHistory.filter(f => (f.endTime || f.startTime) >= sixMonthsAgo);
    }

    // Purge sleep history
    if (Array.isArray(state.sleepHistory)) {
        state.sleepHistory = state.sleepHistory.filter(s => (s.endTime || s.startTime) >= sixMonthsAgo);
    }
}

// Check if any history entries are approaching the 6-month purge cutoff
// Shows warning toasts at 2 weeks and 3 days before deletion
function checkPurgeWarnings() {
    if (isPremiumActive()) return;

    const now = Date.now();

    // Find the oldest entry across both histories
    let oldestTime = Infinity;

    if (Array.isArray(state.fastingHistory)) {
        for (const f of state.fastingHistory) {
            const t = f.endTime || f.startTime;
            if (t && t < oldestTime) oldestTime = t;
        }
    }
    if (Array.isArray(state.sleepHistory)) {
        for (const s of state.sleepHistory) {
            const t = s.endTime || s.startTime;
            if (t && t < oldestTime) oldestTime = t;
        }
    }

    // No history at all
    if (oldestTime === Infinity) return;

    // How long until the oldest entry gets purged?
    // purgeDate = oldestTime + FREE_HISTORY_MS  (when it turns 6 months old)
    const purgeDate = oldestTime + FREE_HISTORY_MS;
    const timeUntilPurge = purgeDate - now;

    // Already past cutoff — purgeExpiredHistory() handles deletion, no warning needed
    if (timeUntilPurge <= 0) return;

    // Entries older than warn14Cutoff will be purged within 14 days
    // Entries older than warn3Cutoff will be purged within 3 days
    const warn14Cutoff = now - FREE_HISTORY_MS + PURGE_WARN_14_DAYS;
    const warn3Cutoff = now - FREE_HISTORY_MS + PURGE_WARN_3_DAYS;

    let entriesExpiringSoon = 0;
    if (Array.isArray(state.fastingHistory)) {
        entriesExpiringSoon += state.fastingHistory.filter(f => (f.endTime || f.startTime) < warn14Cutoff).length;
    }
    if (Array.isArray(state.sleepHistory)) {
        entriesExpiringSoon += state.sleepHistory.filter(s => (s.endTime || s.startTime) < warn14Cutoff).length;
    }

    if (entriesExpiringSoon === 0) return;

    // Check which warning tier we're in
    let entriesExpiring3Days = 0;
    if (Array.isArray(state.fastingHistory)) {
        entriesExpiring3Days += state.fastingHistory.filter(f => (f.endTime || f.startTime) < warn3Cutoff).length;
    }
    if (Array.isArray(state.sleepHistory)) {
        entriesExpiring3Days += state.sleepHistory.filter(s => (s.endTime || s.startTime) < warn3Cutoff).length;
    }

    // Don't spam — only show once per session per tier
    const lastWarnTier = sessionStorage.getItem('purge-warn-tier');

    if (entriesExpiring3Days > 0 && lastWarnTier !== '3day') {
        // URGENT: 3 days or less
        sessionStorage.setItem('purge-warn-tier', '3day');
        const daysLeft = Math.max(1, Math.ceil(timeUntilPurge / (24 * 60 * 60 * 1000)));
        setTimeout(() => {
            showAchievementToast(
                '<span class="px-icon px-danger"></span>',
                'Data Expiring Soon!',
                `${entriesExpiring3Days} record${entriesExpiring3Days > 1 ? 's' : ''} will be deleted in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Upgrade to Sui Pro to keep your history forever.`,
                'danger'
            );
        }, 2000);
    } else if (entriesExpiringSoon > 0 && !lastWarnTier) {
        // WARNING: within 14 days
        sessionStorage.setItem('purge-warn-tier', '14day');
        const daysLeft = Math.max(1, Math.ceil(timeUntilPurge / (24 * 60 * 60 * 1000)));
        setTimeout(() => {
            showAchievementToast(
                '<span class="px-icon px-warning"></span>',
                'History Expiring',
                `${entriesExpiringSoon} record${entriesExpiringSoon > 1 ? 's' : ''} older than 5.5 months will be deleted soon. Upgrade to Sui Pro to keep everything.`,
                'warning'
            );
        }, 2000);
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
    document.getElementById('tab-collection')?.addEventListener('click', () => switchTab('collection'));
    document.getElementById('tab-forum')?.addEventListener('click', () => switchTab('forum'));
    document.getElementById('tab-audit')?.addEventListener('click', () => switchTab('audit'));
    document.getElementById('tab-settings')?.addEventListener('click', () => switchTab('settings'));

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

    // Heart Health Guide toggle
    document.getElementById('heart-health-btn')?.addEventListener('click', toggleHeartHealth);

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

    // Fasting warning modal buttons
    document.getElementById('fasting-warning-cancel')?.addEventListener('click', hideFastingWarningModal);
    document.getElementById('fasting-warning-confirm')?.addEventListener('click', confirmFastingWarning);

    // Age check modal buttons
    document.getElementById('age-under13')?.addEventListener('click', handleAgeUnder13);
    document.getElementById('age-13-17')?.addEventListener('click', () => handleAgeSelection('13-17'));
    document.getElementById('age-18plus')?.addEventListener('click', () => handleAgeSelection('18+'));

    // ED disclaimer modal buttons
    document.getElementById('ed-disable-scoring')?.addEventListener('click', () => handleEDChoice(false));
    document.getElementById('ed-keep-scoring')?.addEventListener('click', () => handleEDChoice(true));

    // Eating quality toggle — initialize visual state on load
    updateEatingQualityToggleVisual();

    // Delegated action handler (replaces inline onclick attributes)
    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        switch (action) {
            case 'toggle-section':
                toggleStatsSection(target.dataset.section);
                break;
            case 'retro-tab':
                switchRetroTab(target.dataset.retroTab, target);
                break;
            case 'retro-sub':
                switchRetroSub(target.dataset.parent, target.dataset.retroSub, target);
                break;
            case 'toggle-trophy':
                toggleMonsterTrophySkin(target.dataset.monster);
                break;
            case 'set-color':
                setSuiGhostColor(target.dataset.color);
                break;
            case 'set-layout':
                setLayout(target.dataset.layout);
                break;
            case 'filter-audit':
                filterAuditLog(target.dataset.filter);
                break;
            case 'show-paywall':
                showPaywall();
                break;
            case 'hide-paywall':
                hidePaywall();
                break;
            case 'purchase':
                handlePurchase();
                break;
            case 'restore':
                handleRestore();
                break;
            case 'dismiss-testflight':
                dismissTestFlightBanner();
                break;
            case 'toggle-eating-quality':
                toggleEatingQualitySetting();
                break;
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
    document.getElementById('export-btn').addEventListener('click', exportCSV);
    document.getElementById('backup-export-btn')?.addEventListener('click', exportBackup);
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
    document.getElementById('delete-all-data-btn')?.addEventListener('click', handleDeleteAllData);
    document.getElementById('delete-account-btn')?.addEventListener('click', handleDeleteAccount);
    document.getElementById('google-sign-in-btn')?.addEventListener('click', handleGoogleSignIn);
    document.getElementById('apple-sign-in-btn')?.addEventListener('click', handleAppleSignIn);

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
    // Note: Autophagy activates automatically at 16 hours - no button needed
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
    // YOLO celebration modal - no close button, tap backdrop to dismiss

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

    // Cooking Guide toggle
    document.getElementById('cooking-guide-btn')?.addEventListener('click', toggleCookingGuide);

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
    document.getElementById('toggle-heart-health')?.addEventListener('change', (e) => updateSetting('showHeartHealth', e.target.checked));
    document.getElementById('toggle-breaking-fast-guide')?.addEventListener('change', (e) => updateSetting('showBreakingFastGuide', e.target.checked));
    document.getElementById('toggle-exercise-guide')?.addEventListener('change', (e) => updateSetting('showExerciseGuide', e.target.checked));
    document.getElementById('toggle-eating-guide')?.addEventListener('change', (e) => updateSetting('showEatingGuide', e.target.checked));
    document.getElementById('toggle-sleep-guide')?.addEventListener('change', (e) => updateSetting('showSleepGuide', e.target.checked));
    document.getElementById('toggle-meal-sleep-quality')?.addEventListener('change', (e) => updateSetting('showMealSleepQuality', e.target.checked));
    document.getElementById('toggle-hunger-tracker')?.addEventListener('change', (e) => updateSetting('showHungerTracker', e.target.checked));
    document.getElementById('toggle-trends')?.addEventListener('change', (e) => updateSetting('showTrends', e.target.checked));

    // Biological profile listeners
    document.getElementById('bio-sex-male')?.addEventListener('change', () => {
        updateBiologicalSex('male');
        document.getElementById('female-fasting-info')?.classList.add('hidden');
    });
    document.getElementById('bio-sex-female')?.addEventListener('change', () => {
        updateBiologicalSex('female');
        document.getElementById('female-fasting-info')?.classList.remove('hidden');
    });
    document.getElementById('bio-sex-not-set')?.addEventListener('change', () => {
        updateBiologicalSex(null);
        document.getElementById('female-fasting-info')?.classList.add('hidden');
    });

    // Menstrual cycle tracking listeners
    document.getElementById('menstrual-tracking-enabled')?.addEventListener('change', (e) => {
        updateMenstrualCycleSetting('trackingEnabled', e.target.checked);
        const details = document.getElementById('menstrual-tracking-details');
        if (details) {
            if (e.target.checked) {
                details.classList.remove('hidden');
            } else {
                details.classList.add('hidden');
            }
        }
    });

    document.getElementById('last-period-date')?.addEventListener('change', (e) => {
        const date = e.target.value ? new Date(e.target.value).getTime() : null;
        updateMenstrualCycleSetting('lastPeriodStart', date);
    });

    document.getElementById('cycle-length-input')?.addEventListener('change', (e) => {
        const length = parseInt(e.target.value, 10);
        if (length >= 21 && length <= 35) {
            updateMenstrualCycleSetting('cycleLength', length);
        }
    });

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

    // Source buttons - using event delegation for better performance
    document.addEventListener('click', (e) => {
        const sourceBtn = e.target.closest('[data-source]');
        if (sourceBtn) {
            const sourceKey = sourceBtn.dataset.source;
            if (sourceKey) showSources(sourceKey);
        }
    });

    // Modal backdrop click-to-close handlers
    document.getElementById('living-life-modal')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop')) {
            hideLivingLifeModal();
        }
    });
    document.getElementById('yolo-celebration-modal')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop')) {
            hideYoloCelebrationModal();
        }
    });

    // Sui ghost click handler
    document.getElementById('sui-ghost')?.addEventListener('click', handleSuiClick);
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
    } else if (tab === 'collection') {
        activeTab.classList.add('text-white');
        activeTab.style.background = 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)';
        activeTab.style.color = 'white';
    } else if (tab === 'forum') {
        activeTab.classList.add('text-white');
        activeTab.style.background = 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)';
        activeTab.style.color = 'white';
    } else if (tab === 'audit') {
        activeTab.classList.add('text-white');
        activeTab.style.background = 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)';
        activeTab.style.color = 'white';
    } else if (tab === 'settings') {
        activeTab.classList.add('text-white');
        activeTab.style.background = 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)';
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

    // Pause Battles CSS animations when leaving that tab (Apple energy guidance)
    if (tab !== 'slayer') {
        const slayerView = document.getElementById('view-slayer');
        if (slayerView) slayerView.classList.add('animations-paused');
    }

    // Refresh data for the tab
    if (tab === 'history') {
        renderHistory();
        renderSleepHistory();
    } else if (tab === 'stats') {
        renderStats();
        renderSleepStats();
        updateSkills();
        refreshHealthKitData();
    } else if (tab === 'sleep') {
        updateSleepUI();
        refreshHealthKitData();
    } else if (tab === 'eating') {
        updateEatingPowerupDisplay();
        updateMealQuality();
    } else if (tab === 'slayer') {
        // Resume CSS animations on Battles tab
        const slayerView = document.getElementById('view-slayer');
        if (slayerView) slayerView.classList.remove('animations-paused');
        updateMonsterBattleUI();
        startSlayerAnimations();
    } else if (tab === 'collection') {
        updateCollectionUI();
        checkAllItemUnlocks();
    } else if (tab === 'forum') {
        updateForumAuthUI();
        loadForumPosts();
        setupForumRealTimeListener();
    } else if (tab === 'audit') {
        renderAuditLog();
    } else if (tab === 'settings') {
        updateHealthKitSettingsUI();
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

// Cooking Guide toggle
function toggleCookingGuide() {
    const content = document.getElementById('cooking-guide-content');
    const arrow = document.getElementById('cooking-arrow');
    const btn = document.getElementById('cooking-guide-btn');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        arrow.style.transform = 'rotate(180deg)';
        btn.style.background = 'linear-gradient(135deg, #9a3412 0%, #ea580c 50%, #fb923c 100%)';
    } else {
        content.classList.add('hidden');
        arrow.style.transform = 'rotate(0deg)';
        btn.style.background = 'linear-gradient(135deg, #ea580c 0%, #fb923c 50%, #f97316 100%)';
    }
}

// Heart Health Guide toggle
function toggleHeartHealth() {
    const content = document.getElementById('heart-health-content');
    const arrow = document.getElementById('heart-health-arrow');
    const btn = document.getElementById('heart-health-btn');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        arrow.style.transform = 'rotate(180deg)';
        btn.style.background = 'linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #ef4444 100%)';
    } else {
        content.classList.add('hidden');
        arrow.style.transform = 'rotate(0deg)';
        btn.style.background = 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)';
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

// Generic collapsible section toggle for Stats tab
function toggleStatsSection(sectionId) {
    const body = document.getElementById(sectionId + '-body');
    const arrow = document.getElementById(sectionId + '-arrow');
    if (!body) return;
    body.classList.toggle('hidden');
    if (arrow) {
        arrow.classList.toggle('expanded');
    }
    // Persist collapsed state
    if (!state.settings) state.settings = {};
    if (!state.settings.collapsedSections) state.settings.collapsedSections = {};
    state.settings.collapsedSections[sectionId] = body.classList.contains('hidden');
    saveState();
}

// Restore collapsed sections from saved state
function restoreCollapsedSections() {
    const collapsed = state.settings?.collapsedSections;
    if (!collapsed || typeof collapsed !== 'object') return;
    for (const [sectionId, isCollapsed] of Object.entries(collapsed)) {
        if (!isCollapsed) continue;
        const body = document.getElementById(sectionId + '-body');
        const arrow = document.getElementById(sectionId + '-arrow');
        if (body) body.classList.add('hidden');
        if (arrow) arrow.classList.remove('expanded');
    }
}

// Goal management
// Pending goal for fasting warning modal confirmation
let pendingFastingGoalHours = null;

function setGoal(hours) {
    // Age restriction: users under 18 cannot set goals > 24h
    if (state.settings?.ageBracket === '13-17' && hours > 24) {
        showAchievementToast('<span class="px-icon px-warning"></span>', 'Not Available', 'Extended fasts over 24 hours are not available for users under 18.', 'warning');
        return;
    }

    // Show warning for extended fasting goals (>16h)
    if (hours > 16) {
        const tier = hours >= 36 ? 'extreme' : hours >= 24 ? 'extended' : 'moderate';
        // Skip warning for moderate tier if user dismissed it
        if (tier === 'moderate' && state.settings?.dismissedFastingWarning16) {
            applyGoal(hours);
            return;
        }
        showFastingWarningModal(hours, tier);
        return;
    }
    applyGoal(hours);
}

function applyGoal(hours) {
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

function showFastingWarningModal(hours, tier) {
    pendingFastingGoalHours = hours;
    const modal = document.getElementById('fasting-warning-modal');
    const title = document.getElementById('fasting-warning-title');
    const message = document.getElementById('fasting-warning-message');
    const dismissRow = document.getElementById('fasting-warning-dismiss-row');
    const dismissCheckbox = document.getElementById('fasting-warning-dismiss');
    const modalContent = modal?.querySelector('.modal-content');

    if (!modal || !title || !message) return;

    // Configure by tier
    if (tier === 'extreme') {
        title.textContent = 'PROLONGED FAST WARNING';
        message.textContent = 'Fasts over 36 hours carry medical risks including refeeding syndrome and electrolyte depletion. Medical supervision is strongly recommended. Do not attempt without prior fasting experience.';
        if (modalContent) modalContent.style.borderColor = '#ef4444';
        title.style.color = '#ef4444';
        title.style.textShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
    } else if (tier === 'extended') {
        title.textContent = '24+ HOUR FAST';
        message.textContent = '24-hour fasts require preparation. Ensure adequate electrolytes (sodium, potassium, magnesium). If you are new to extended fasting, consult your doctor first.';
        if (modalContent) modalContent.style.borderColor = '#f97316';
        title.style.color = '#f97316';
        title.style.textShadow = '0 0 10px rgba(249, 115, 22, 0.5)';
    } else {
        title.textContent = 'EXTENDED FASTING';
        message.textContent = 'Extended fasting beyond 16 hours. Stay hydrated, listen to your body, and break your fast if you feel unwell.';
        if (modalContent) modalContent.style.borderColor = 'var(--amber-400)';
        title.style.color = 'var(--amber-400)';
        title.style.textShadow = '0 0 10px rgba(245, 158, 11, 0.5)';
    }

    // Show/hide dismiss checkbox (moderate tier only)
    if (dismissRow) dismissRow.classList.toggle('hidden', tier !== 'moderate');
    if (dismissCheckbox) dismissCheckbox.checked = false;

    modal.classList.remove('hidden');
}

function hideFastingWarningModal() {
    const modal = document.getElementById('fasting-warning-modal');
    if (modal) modal.classList.add('hidden');
    pendingFastingGoalHours = null;
}

function confirmFastingWarning() {
    // Check dismiss checkbox for moderate tier
    const dismissCheckbox = document.getElementById('fasting-warning-dismiss');
    if (dismissCheckbox?.checked) {
        if (!state.settings) state.settings = {};
        state.settings.dismissedFastingWarning16 = true;
        saveState();
    }

    const hours = pendingFastingGoalHours;
    hideFastingWarningModal();
    if (hours) applyGoal(hours);
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
    updateHeartPoints();
    updatePowerupStates(); // Update powerup enable/disable states
    updateEatingPowerupDisplay(); // Update eating display (should be reset)
    updateMealQuality();

    // Show Sui the Sleep God
    showSuiGhost('Your fast has begun...', 'fasting');

    // Schedule local notifications for fasting milestones
    scheduleFastingNotifications();
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

    // Cancel any pending fasting notifications
    cancelFastingNotifications();

    const endTime = Date.now();
    const duration = (endTime - state.currentFast.startTime) / 1000 / 60 / 60; // hours

    // Show feeling modal and wait for selection
    const feeling = await showFeelingModal('fasting');

    // Count powerups for summary
    const powerups = Array.isArray(state.currentFast?.powerups) ? state.currentFast.powerups : [];
    const powerupCounts = { water: 0, coffee: 0, tea: 0, exercise: 0, hanging: 0, grip: 0, walk: 0, hotwater: 0, doctorwin: 0 };
    powerups.forEach(p => {
        if (powerupCounts[p.type] !== undefined) {
            powerupCounts[p.type]++;
        }
    });

    // Count hunger logs for summary
    const hungerLogs = Array.isArray(state.currentFast?.hungerLogs) ? state.currentFast.hungerLogs : [];
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
        feeling: feeling, // Post-fast feeling (soso, fine, prettygood, ready, or null)
        feelingTimestamp: feeling ? Date.now() : null // When feeling was recorded (for trend analysis)
    });

    // Track last meal time (when fast ends = eating begins)
    state.lastMealTime = endTime;

    // Invalidate performance caches (history just changed)
    invalidateCache('fasting');

    // Write fasting session to Apple Health (no-op on web)
    writeHealthKitFastingSession(state.currentFast.startTime, endTime, duration);

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
    updateHeartPoints();
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
        breakingFastTips = `\n\n BREAKING A 36+ HOUR FAST:\n Your stomach has shrunk significantly!\n\n1. Sip broth slowly every few hours\n2. Wait 8+ HOURS before any solid food\n3. When ready: protein & fiber, eat very slowly\n4. Gentle walk after eating - aids digestion!\n5. Eat LOTS of fiber - veggies, fruits, whole grains\n\n Constipation is very common after 36+ hour fasts.\nYour gut has slowed — fibre-rich whole foods are critical!`;
    } else if (duration >= 24) {
        // 24-36 hour fast
        breakingFastTips = `\n\n BREAKING A 24+ HOUR FAST:\n Your stomach has shrunk!\n\n1. Sip broth over 30 minutes\n2. Wait 3-4 HOURS before solid food\n3. Then: protein & fiber, eat slowly\n4. Walk 30 min after eating!\n5. Load up on fiber - veggies, fruits, whole grains\n\n Constipation is common after 24+ hour fasts.\nFibre-rich whole foods help restore gut motility!`;
    } else {
        // Under 24 hours
        breakingFastTips = `\n\n BREAKING YOUR FAST:\n• Start with broth (bone marrow is best!)\n• Include protein & fiber\n• Eat slowly - be gentle with your gut\n• Walk 30 min after eating - helps digestion! `;
    }

    // Update Slayer system with fast completion damage
    updateMonsterBattleUI();
    showFastCompletionDamage(duration, powerups);

    // Check for item unlocks after completing a fast
    checkAllItemUnlocks();
}

let timerTickCount = 0;

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    if (heartPointsInterval) clearInterval(heartPointsInterval);
    timerTickCount = 0;

    timerInterval = setInterval(() => {
        timerTickCount++;

        // Visual updates every 1s (cheap: DOM writes only)
        updateTimerDisplay();
        updateProgressBar();

        // Non-visual checks every 10s (goal/guide checks don't need 1s precision)
        if (timerTickCount % 10 === 0) {
            checkGoalAchieved();
            updateFastingGuides();
            updateMetabolicStateDisplay();
        }
    }, 1000);

    // Update Heart Points every 30 seconds while fasting
    // Store reference to prevent memory leak
    heartPointsInterval = setInterval(() => {
        if (state.currentFast.isActive) {
            updateHeartPoints();
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
    if (heartPointsInterval) {
        clearInterval(heartPointsInterval);
        heartPointsInterval = null;
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
    document.title = `${timeString} - Fasting`;
}

function updateProgressBar() {
    const progressBar = domCache.progressBar || document.getElementById('progress-bar');
    if (!progressBar) return;

    if (!state.currentFast.isActive) {
        progressBar.style.transform = 'scaleX(0)';
        progressBar.setAttribute('aria-valuenow', '0');
        return;
    }

    // Guard against negative elapsed time (system clock changed backwards)
    const elapsed = Math.max(0, Date.now() - state.currentFast.startTime);
    const elapsedHours = elapsed / 1000 / 60 / 60;
    const progress = Math.min((elapsedHours / state.currentFast.goalHours) * 100, 100);

    // Use transform: scaleX() for GPU-composited animation (no layout recalculation)
    progressBar.style.transform = `scaleX(${progress / 100})`;
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
let autophagyActivated = false;

function checkGoalAchieved() {
    if (!state.currentFast.isActive) return;

    const elapsed = Date.now() - state.currentFast.startTime;
    const elapsedHours = elapsed / 1000 / 60 / 60;

    if (elapsedHours >= state.currentFast.goalHours && !goalAchievedNotified) {
        document.getElementById('goal-achieved').classList.remove('hidden');
        showNotification('Goal Achieved!', `You've reached your ${state.currentFast.goalHours} hour fasting goal!`);
        goalAchievedNotified = true;
    }

    // Auto-activate autophagy at 16 hours (once per fast)
    if (elapsedHours >= 16 && !autophagyActivated) {
        triggerAutophagyMilestone();
        autophagyActivated = true;
    }
}

function resetTimerUI() {
    const timerDisplay = domCache.timerDisplay || document.getElementById('timer-display');
    const progressBar = domCache.progressBar || document.getElementById('progress-bar');
    if (timerDisplay) timerDisplay.textContent = '00:00:00';
    if (progressBar) {
        progressBar.style.transform = 'scaleX(0)';
        progressBar.setAttribute('aria-valuenow', '0');
    }
    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('stop-btn').classList.add('hidden');
    document.getElementById('goal-achieved').classList.add('hidden');
    document.getElementById('start-info').textContent = 'Select a goal and start your fast';
    goalAchievedNotified = false;
    autophagyActivated = false;

    // Hide all fasting guides
    const breakingGuide = document.getElementById('breaking-fast-guide');
    const extended24Guide = document.getElementById('extended-fast-guide-24');
    const extended36Guide = document.getElementById('extended-fast-guide-36');
    if (breakingGuide) breakingGuide.classList.add('hidden');
    if (extended24Guide) extended24Guide.classList.add('hidden');
    if (extended36Guide) extended36Guide.classList.add('hidden');

    // Reset guide tracking
    guidesShown = { breaking: false, extended24: false, extended36: false };

    // Reset metabolic state tracking
    resetMetabolicMilestones();
    const metabolicContainer = document.getElementById('metabolic-state-container');
    if (metabolicContainer) metabolicContainer.classList.add('hidden');
}

function updateStartInfo() {
    if (state.currentFast.isActive) {
        const startDate = new Date(state.currentFast.startTime);
        const text = `Started: ${startDate.toLocaleString()}`;
        document.getElementById('start-info').textContent = text;
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
    const allTabs = ['tab-timer', 'tab-eating', 'tab-history', 'tab-stats', 'tab-slayer', 'tab-collection'];
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
    // Sanitize ID to prevent XSS - only allow alphanumeric characters
    const sanitizeId = (id) => String(id).replace(/[^a-zA-Z0-9]/g, '');

    // Render function for a single fasting record
    const renderFastingItem = (fast) => {
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
    };

    // Use virtualized list for performance with large history
    createVirtualizedList({
        containerId: 'history-list',
        items: state.fastingHistory,
        renderItem: renderFastingItem,
        emptyMessage: 'No fasting history yet. Start your first fast!'
    });
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
    const history = Array.isArray(state.sleepHistory) ? state.sleepHistory : [];
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
        // Super early (before noon)
        if (hour < 12) {
            return `It's ${timeStr} — that's earlier than usual.\n\nIf you're exhausted, rest is what your body needs. If you can push through, your evening sleep will thank you.\n\nTap again to start sleeping now.`;
        }

        // Afternoon nap attempt (12-5 PM)
        if (hour >= 12 && hour < 17) {
            return `Afternoon rest at ${timeStr}? Sometimes your body just needs it.\n\nShort naps (20-30 min) can recharge you without affecting tonight's sleep.\n\nTap again to log your rest.`;
        }

        // Evening but too early (5-9 PM)
        if (hour >= 17 && hour < 21) {
            const hoursUntil9 = 21 - hour;
            return `Feeling sleepy at ${timeStr}? You're ${hoursUntil9} hour${hoursUntil9 > 1 ? 's' : ''} from the 9-11 PM sweet spot for deep sleep.\n\nIf you can wait a bit, your body will get better recovery. But if you need rest now, that matters too.\n\nTap again to start sleeping.`;
        }

        // Late night (11 PM+)
        if (hour >= 23) {
            return `Starting sleep at ${timeStr} — better late than never! Your body still benefits from every hour.\n\nTap again to begin your rest.`;
        }
    }

    // Second tap - allow with warmth
    return `Sleep well! Rest is one of the best things you can do for yourself.\n\nSweet dreams.`;
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

    // Schedule local notifications for sleep milestones
    scheduleSleepNotifications();
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
    const history = Array.isArray(state.sleepHistory) ? state.sleepHistory : [];

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
        // Barely slept (under 3 hours)
        if (duration < 3) {
            return `You've slept ${sleptSoFar}. That's a short rest — most people feel best with 7+ hours.\n\nYou have about ${remainingHours}h ${remainingMins}m left to reach that. More rest would help your body recover.\n\nTap again if you need to get up.`;
        }

        // Slept 3-5 hours
        if (duration < 5) {
            return `You've had ${sleptSoFar} of sleep. Your brain benefits from those deeper REM cycles that come after the 5-hour mark.\n\nYou have ${remainingHours}h ${remainingMins}m left if you'd like more rest.\n\nTap again if you need to get up.`;
        }

        // Slept 5-6 hours
        if (duration < 6) {
            return `${sleptSoFar} of sleep — you're getting close! Just ${remainingHours}h ${remainingMins}m more would get you to 7 hours.\n\nThat last stretch is great for memory and recovery.\n\nTap again if it's time to start your day.`;
        }

        // Slept 6-7 hours - almost there
        return `${sleptSoFar} — so close to the 7-hour sweet spot! Just ${remainingMins} more minutes.\n\nWorth a snooze if you can, but you've had a solid rest either way.\n\nTap again to get up.`;
    }

    // Second tap - allow with warmth
    if (duration < 3) {
        return `You're up! If you get a chance to rest later or go to bed early tonight, your body will appreciate it.\n\nHave a good day!`;
    } else {
        return `Rise and shine! Every bit of sleep counts. You've got this.\n\nGood morning!`;
    }
}

async function stopSleep() {
    if (!state.currentSleep || !state.currentSleep.isActive) return;

    // Cancel any pending sleep notifications
    cancelSleepNotifications();

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
        feeling: feeling, // Post-sleep feeling (soso, fine, prettygood, ready, or null)
        feelingTimestamp: feeling ? Date.now() : null // When feeling was recorded (for trend analysis)
    });

    // Invalidate performance caches (history just changed)
    invalidateCache('sleep');

    // Write sleep session to Apple Health (no-op on web)
    writeHealthKitSleepSession(state.currentSleep.startTime, endTime, duration);

    // Reset current sleep
    state.currentSleep.startTime = null;
    state.currentSleep.isActive = false;
    saveState();

    stopSleepTimer();
    resetSleepTimerUI();
    updateHeartPoints();
    updatePowerupStates(); // Update powerup enable/disable states

    // Show sleep goal selector again (if settings allow)
    if (state.settings?.showSleepGoals !== false) {
        document.getElementById('sleep-goal-selector')?.classList.remove('hidden');
    }

    // Show Sui the Sleep God with Matthew Walker quote
    showSuiGhost(getRandomSleepQuote('waking'), 'sleep');

    // Update Slayer system with sleep completion damage
    updateMonsterBattleUI();
    showSleepCompletionDamage(duration);

    // Check for item unlocks after completing sleep
    checkAllItemUnlocks();
}

let sleepTimerTickCount = 0;

function startSleepTimer() {
    if (sleepTimerInterval) clearInterval(sleepTimerInterval);
    sleepTimerTickCount = 0;

    sleepTimerInterval = setInterval(() => {
        sleepTimerTickCount++;

        // Visual updates every 1s (cheap: DOM writes only)
        updateSleepTimerDisplay();
        updateSleepProgressBar();

        // Non-visual check every 10s (goal check doesn't need 1s precision)
        if (sleepTimerTickCount % 10 === 0) {
            checkSleepGoalAchieved();
        }
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
    document.title = `${timeString} - Sleeping`;
}

function updateSleepProgressBar() {
    const progressBar = domCache.sleepProgressBar || document.getElementById('sleep-progress-bar');
    if (!progressBar) return;

    if (!state.currentSleep || !state.currentSleep.isActive) {
        progressBar.style.transform = 'scaleX(0)';
        progressBar.setAttribute('aria-valuenow', '0');
        return;
    }

    // Guard against negative elapsed time (system clock changed backwards)
    const elapsed = Math.max(0, Date.now() - state.currentSleep.startTime);
    const elapsedHours = elapsed / 1000 / 60 / 60;
    const progress = Math.min((elapsedHours / state.currentSleep.goalHours) * 100, 100);

    // Use transform: scaleX() for GPU-composited animation (no layout recalculation)
    progressBar.style.transform = `scaleX(${progress / 100})`;
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
        sleepProgressBar.style.transform = 'scaleX(0)';
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
    // Sanitize ID to prevent XSS - only allow alphanumeric characters
    const sanitizeId = (id) => String(id).replace(/[^a-zA-Z0-9]/g, '');

    // Render function for a single sleep record
    const renderSleepItem = (sleep) => {
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
    };

    // Use virtualized list for performance with large history
    createVirtualizedList({
        containerId: 'sleep-history-list',
        items: Array.isArray(state.sleepHistory) ? state.sleepHistory : [],
        renderItem: renderSleepItem,
        emptyMessage: 'No sleep history yet. Start tracking your sleep!'
    });
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
    const history = Array.isArray(state.sleepHistory) ? state.sleepHistory : [];

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
    renderHungerInsights();
    renderFeelingTrends();
}

function renderSleepTrends() {
    const history = Array.isArray(state.sleepHistory) ? state.sleepHistory : [];

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
    const history = Array.isArray(state.fastingHistory) ? state.fastingHistory : [];

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
    const history = Array.isArray(state.fastingHistory) ? state.fastingHistory : [];

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

// Analyze hunger patterns using timestamp data
function renderHungerInsights() {
    const history = Array.isArray(state.fastingHistory) ? state.fastingHistory : [];

    // Collect all hunger logs with timestamps from history
    const allHungerLogs = [];
    history.forEach(fast => {
        if (fast.hungerDetails && Array.isArray(fast.hungerDetails)) {
            fast.hungerDetails.forEach(log => {
                if (log.time && log.fastingHours !== undefined) {
                    allHungerLogs.push({
                        ...log,
                        fastStartTime: fast.startTime,
                        sleepBeforeFast: log.sleepHours || 0
                    });
                }
            });
        }
    });

    // Update peak hunger hour
    updatePeakHungerHour(allHungerLogs);

    // Update time of day pattern
    updateHungerTimeOfDay(allHungerLogs);

    // Update sleep correlation
    updateHungerSleepCorrelation(allHungerLogs);
}

// Find at what hour into the fast hunger peaks most
function updatePeakHungerHour(logs) {
    const valueEl = document.getElementById('hunger-peak-hour');
    const detailEl = document.getElementById('hunger-peak-hour-detail');
    if (!valueEl || !detailEl) return;

    if (logs.length < 5) {
        valueEl.textContent = '--';
        detailEl.textContent = 'Need 5+ hunger logs';
        return;
    }

    // Weight by hunger level (hunger4 = 4, hunger1 = 1)
    const levelWeights = { hunger1: 1, hunger2: 2, hunger3: 3, hunger4: 4 };

    // Group by hour buckets (0-4h, 4-8h, 8-12h, 12-16h, 16-20h, 20-24h, 24+)
    const hourBuckets = {};
    logs.forEach(log => {
        const hour = Math.floor(log.fastingHours);
        const bucket = Math.floor(hour / 4) * 4; // 0, 4, 8, 12, 16, 20, 24
        const weight = levelWeights[log.level] || 1;
        if (!hourBuckets[bucket]) hourBuckets[bucket] = { total: 0, count: 0 };
        hourBuckets[bucket].total += weight;
        hourBuckets[bucket].count++;
    });

    // Find bucket with highest weighted average
    let peakBucket = null;
    let peakAvg = 0;
    Object.entries(hourBuckets).forEach(([bucket, data]) => {
        const avg = data.total / data.count;
        if (avg > peakAvg) {
            peakAvg = avg;
            peakBucket = parseInt(bucket);
        }
    });

    if (peakBucket !== null) {
        const endHour = peakBucket + 4;
        valueEl.textContent = `${peakBucket}-${endHour}h`;
        detailEl.textContent = `Avg intensity: ${peakAvg.toFixed(1)}/4`;
    }
}

// Find what time of day hunger is most common
function updateHungerTimeOfDay(logs) {
    const valueEl = document.getElementById('hunger-time-of-day');
    const detailEl = document.getElementById('hunger-time-of-day-detail');
    if (!valueEl || !detailEl) return;

    if (logs.length < 5) {
        valueEl.textContent = '--';
        detailEl.textContent = 'Need 5+ hunger logs';
        return;
    }

    // Group by time of day periods
    const periods = {
        morning: { name: 'Morning', range: '6AM-12PM', count: 0, total: 0 },
        afternoon: { name: 'Afternoon', range: '12PM-6PM', count: 0, total: 0 },
        evening: { name: 'Evening', range: '6PM-10PM', count: 0, total: 0 },
        night: { name: 'Night', range: '10PM-6AM', count: 0, total: 0 }
    };

    const levelWeights = { hunger1: 1, hunger2: 2, hunger3: 3, hunger4: 4 };

    logs.forEach(log => {
        if (!log.time) return;
        const date = new Date(log.time);
        const hour = date.getHours();
        const weight = levelWeights[log.level] || 1;

        let period;
        if (hour >= 6 && hour < 12) period = 'morning';
        else if (hour >= 12 && hour < 18) period = 'afternoon';
        else if (hour >= 18 && hour < 22) period = 'evening';
        else period = 'night';

        periods[period].count++;
        periods[period].total += weight;
    });

    // Find period with highest intensity
    let peakPeriod = null;
    let peakAvg = 0;
    Object.entries(periods).forEach(([key, data]) => {
        if (data.count > 0) {
            const avg = data.total / data.count;
            if (avg > peakAvg || (avg === peakAvg && data.count > (peakPeriod ? periods[peakPeriod].count : 0))) {
                peakAvg = avg;
                peakPeriod = key;
            }
        }
    });

    if (peakPeriod) {
        valueEl.textContent = periods[peakPeriod].name;
        detailEl.textContent = `${periods[peakPeriod].range} (${periods[peakPeriod].count} logs)`;
    }
}

// Analyze correlation between sleep and hunger intensity
function updateHungerSleepCorrelation(logs) {
    const valueEl = document.getElementById('hunger-sleep-correlation');
    const detailEl = document.getElementById('hunger-sleep-correlation-detail');
    if (!valueEl || !detailEl) return;

    // Filter logs with valid sleep data
    const logsWithSleep = logs.filter(log => log.sleepBeforeFast > 0);

    if (logsWithSleep.length < 10) {
        valueEl.textContent = '--';
        detailEl.textContent = 'Need 10+ logs with sleep data';
        return;
    }

    const levelWeights = { hunger1: 1, hunger2: 2, hunger3: 3, hunger4: 4 };

    // Split into good sleep (7+ hours) vs poor sleep (<7 hours)
    const goodSleep = { total: 0, count: 0 };
    const poorSleep = { total: 0, count: 0 };

    logsWithSleep.forEach(log => {
        const weight = levelWeights[log.level] || 1;
        if (log.sleepBeforeFast >= 7) {
            goodSleep.total += weight;
            goodSleep.count++;
        } else {
            poorSleep.total += weight;
            poorSleep.count++;
        }
    });

    if (goodSleep.count < 3 || poorSleep.count < 3) {
        valueEl.textContent = '--';
        detailEl.textContent = 'Need more varied sleep data';
        return;
    }

    const goodAvg = goodSleep.total / goodSleep.count;
    const poorAvg = poorSleep.total / poorSleep.count;
    const diff = poorAvg - goodAvg;
    const percentDiff = ((diff / goodAvg) * 100).toFixed(0);

    if (diff > 0.3) {
        valueEl.innerHTML = `<span style="color: #22c55e;">+${percentDiff}%</span>`;
        detailEl.textContent = `Less sleep = ${percentDiff}% more hunger`;
    } else if (diff < -0.3) {
        valueEl.innerHTML = `<span style="color: #ef4444;">${percentDiff}%</span>`;
        detailEl.textContent = 'Unusual: less sleep = less hunger';
    } else {
        valueEl.textContent = '~0%';
        detailEl.textContent = 'Sleep has minimal effect';
    }
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
    renderFastFeelingInsights();
    renderSleepFeelingTrends();
    renderSleepFeelingInsights();
}

function renderFastFeelingTrends() {
    const history = Array.isArray(state.fastingHistory) ? state.fastingHistory : [];

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
    const history = Array.isArray(state.sleepHistory) ? state.sleepHistory : [];

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

// Analyze post-fast feeling patterns using timestamps
function renderFastFeelingInsights() {
    const history = Array.isArray(state.fastingHistory) ? state.fastingHistory : [];
    const withFeeling = history.filter(f => f.feeling && f.endTime);

    // Best duration for feeling good
    updateFastFeelingBestDuration(withFeeling);

    // Best time of day to break fast
    updateFastFeelingBestTime(withFeeling);

    // Sleep effect on post-fast feeling
    updateFastFeelingSleepEffect(withFeeling);
}

function updateFastFeelingBestDuration(history) {
    const valueEl = document.getElementById('fast-feeling-best-duration');
    const detailEl = document.getElementById('fast-feeling-best-duration-detail');
    if (!valueEl || !detailEl) return;

    if (history.length < 5) {
        valueEl.textContent = '--';
        detailEl.textContent = 'Need 5+ fasts with feelings';
        return;
    }

    // Group by duration buckets (12-16h, 16-20h, 20-24h, 24+h)
    const buckets = {
        '12-16h': { total: 0, count: 0 },
        '16-20h': { total: 0, count: 0 },
        '20-24h': { total: 0, count: 0 },
        '24h+': { total: 0, count: 0 }
    };

    history.forEach(fast => {
        const score = feelingScores[fast.feeling] || 0;
        const hours = fast.duration;

        if (hours >= 24) {
            buckets['24h+'].total += score;
            buckets['24h+'].count++;
        } else if (hours >= 20) {
            buckets['20-24h'].total += score;
            buckets['20-24h'].count++;
        } else if (hours >= 16) {
            buckets['16-20h'].total += score;
            buckets['16-20h'].count++;
        } else if (hours >= 12) {
            buckets['12-16h'].total += score;
            buckets['12-16h'].count++;
        }
    });

    // Find best bucket
    let bestBucket = null;
    let bestAvg = 0;
    Object.entries(buckets).forEach(([name, data]) => {
        if (data.count >= 2) {
            const avg = data.total / data.count;
            if (avg > bestAvg) {
                bestAvg = avg;
                bestBucket = name;
            }
        }
    });

    if (bestBucket) {
        valueEl.textContent = bestBucket;
        detailEl.textContent = `Avg feeling: ${getFeelingLabel(bestAvg)}`;
    } else {
        valueEl.textContent = '--';
        detailEl.textContent = 'Need more varied durations';
    }
}

function updateFastFeelingBestTime(history) {
    const valueEl = document.getElementById('fast-feeling-best-time');
    const detailEl = document.getElementById('fast-feeling-best-time-detail');
    if (!valueEl || !detailEl) return;

    if (history.length < 5) {
        valueEl.textContent = '--';
        detailEl.textContent = 'Need 5+ fasts with feelings';
        return;
    }

    // Group by time of day when fast ended
    const periods = {
        morning: { name: 'Morning', range: '6AM-12PM', total: 0, count: 0 },
        afternoon: { name: 'Afternoon', range: '12PM-6PM', total: 0, count: 0 },
        evening: { name: 'Evening', range: '6PM-10PM', total: 0, count: 0 }
    };

    history.forEach(fast => {
        const score = feelingScores[fast.feeling] || 0;
        const endDate = new Date(fast.endTime);
        const hour = endDate.getHours();

        if (hour >= 6 && hour < 12) {
            periods.morning.total += score;
            periods.morning.count++;
        } else if (hour >= 12 && hour < 18) {
            periods.afternoon.total += score;
            periods.afternoon.count++;
        } else if (hour >= 18 && hour < 22) {
            periods.evening.total += score;
            periods.evening.count++;
        }
    });

    // Find best period
    let bestPeriod = null;
    let bestAvg = 0;
    Object.entries(periods).forEach(([key, data]) => {
        if (data.count >= 2) {
            const avg = data.total / data.count;
            if (avg > bestAvg) {
                bestAvg = avg;
                bestPeriod = key;
            }
        }
    });

    if (bestPeriod) {
        valueEl.textContent = periods[bestPeriod].name;
        detailEl.textContent = `${periods[bestPeriod].range} (${periods[bestPeriod].count} fasts)`;
    } else {
        valueEl.textContent = '--';
        detailEl.textContent = 'Need more varied break times';
    }
}

function updateFastFeelingSleepEffect(history) {
    const valueEl = document.getElementById('fast-feeling-sleep-effect');
    const detailEl = document.getElementById('fast-feeling-sleep-effect-detail');
    if (!valueEl || !detailEl) return;

    // Get sleep data to correlate with fasting feelings
    const sleepHistory = Array.isArray(state.sleepHistory) ? state.sleepHistory : [];

    if (history.length < 5 || sleepHistory.length < 3) {
        valueEl.textContent = '--';
        detailEl.textContent = 'Need more sleep & fast data';
        return;
    }

    // For each fast, find the most recent sleep before it started
    const fastsWithSleep = [];
    history.forEach(fast => {
        const sleepBefore = sleepHistory.find(s => s.endTime <= fast.startTime && s.endTime > fast.startTime - (24 * 60 * 60 * 1000));
        if (sleepBefore) {
            fastsWithSleep.push({
                feeling: fast.feeling,
                sleepDuration: sleepBefore.duration
            });
        }
    });

    if (fastsWithSleep.length < 5) {
        valueEl.textContent = '--';
        detailEl.textContent = 'Need more correlated data';
        return;
    }

    // Compare good sleep (7+h) vs poor sleep (<7h)
    const goodSleep = { total: 0, count: 0 };
    const poorSleep = { total: 0, count: 0 };

    fastsWithSleep.forEach(item => {
        const score = feelingScores[item.feeling] || 0;
        if (item.sleepDuration >= 7) {
            goodSleep.total += score;
            goodSleep.count++;
        } else {
            poorSleep.total += score;
            poorSleep.count++;
        }
    });

    if (goodSleep.count < 2 || poorSleep.count < 2) {
        valueEl.textContent = '--';
        detailEl.textContent = 'Need more varied sleep data';
        return;
    }

    const goodAvg = goodSleep.total / goodSleep.count;
    const poorAvg = poorSleep.total / poorSleep.count;
    const diff = goodAvg - poorAvg;
    const percentDiff = poorAvg > 0 ? ((diff / poorAvg) * 100).toFixed(0) : 0;

    if (diff > 0.3) {
        valueEl.innerHTML = `<span style="color: #22c55e;">+${percentDiff}%</span>`;
        detailEl.textContent = `Better sleep = ${percentDiff}% better feeling`;
    } else if (diff < -0.3) {
        valueEl.innerHTML = `<span style="color: #ef4444;">${percentDiff}%</span>`;
        detailEl.textContent = 'Unusual: less sleep = better feeling';
    } else {
        valueEl.textContent = '~0%';
        detailEl.textContent = 'Sleep has minimal effect';
    }
}

// Analyze post-sleep feeling patterns using timestamps
function renderSleepFeelingInsights() {
    const history = Array.isArray(state.sleepHistory) ? state.sleepHistory : [];
    const withFeeling = history.filter(s => s.feeling && s.endTime);

    // Best duration for feeling good
    updateSleepFeelingBestDuration(withFeeling);

    // Best wake time
    updateSleepFeelingBestTime(withFeeling);

    // Bedtime effect on feeling
    updateSleepFeelingBedtimeEffect(withFeeling);
}

function updateSleepFeelingBestDuration(history) {
    const valueEl = document.getElementById('sleep-feeling-best-duration');
    const detailEl = document.getElementById('sleep-feeling-best-duration-detail');
    if (!valueEl || !detailEl) return;

    if (history.length < 5) {
        valueEl.textContent = '--';
        detailEl.textContent = 'Need 5+ sleeps with feelings';
        return;
    }

    // Group by duration buckets
    const buckets = {
        '5-6h': { total: 0, count: 0 },
        '6-7h': { total: 0, count: 0 },
        '7-8h': { total: 0, count: 0 },
        '8-9h': { total: 0, count: 0 },
        '9h+': { total: 0, count: 0 }
    };

    history.forEach(sleep => {
        const score = feelingScores[sleep.feeling] || 0;
        const hours = sleep.duration;

        if (hours >= 9) {
            buckets['9h+'].total += score;
            buckets['9h+'].count++;
        } else if (hours >= 8) {
            buckets['8-9h'].total += score;
            buckets['8-9h'].count++;
        } else if (hours >= 7) {
            buckets['7-8h'].total += score;
            buckets['7-8h'].count++;
        } else if (hours >= 6) {
            buckets['6-7h'].total += score;
            buckets['6-7h'].count++;
        } else if (hours >= 5) {
            buckets['5-6h'].total += score;
            buckets['5-6h'].count++;
        }
    });

    // Find best bucket
    let bestBucket = null;
    let bestAvg = 0;
    Object.entries(buckets).forEach(([name, data]) => {
        if (data.count >= 2) {
            const avg = data.total / data.count;
            if (avg > bestAvg) {
                bestAvg = avg;
                bestBucket = name;
            }
        }
    });

    if (bestBucket) {
        valueEl.textContent = bestBucket;
        detailEl.textContent = `Avg feeling: ${getFeelingLabel(bestAvg)}`;
    } else {
        valueEl.textContent = '--';
        detailEl.textContent = 'Need more varied durations';
    }
}

function updateSleepFeelingBestTime(history) {
    const valueEl = document.getElementById('sleep-feeling-best-time');
    const detailEl = document.getElementById('sleep-feeling-best-time-detail');
    if (!valueEl || !detailEl) return;

    if (history.length < 5) {
        valueEl.textContent = '--';
        detailEl.textContent = 'Need 5+ sleeps with feelings';
        return;
    }

    // Group by wake time
    const periods = {
        early: { name: 'Early', range: '5-7AM', total: 0, count: 0 },
        normal: { name: 'Normal', range: '7-9AM', total: 0, count: 0 },
        late: { name: 'Late', range: '9AM+', total: 0, count: 0 }
    };

    history.forEach(sleep => {
        const score = feelingScores[sleep.feeling] || 0;
        const wakeDate = new Date(sleep.endTime);
        const hour = wakeDate.getHours();

        if (hour >= 5 && hour < 7) {
            periods.early.total += score;
            periods.early.count++;
        } else if (hour >= 7 && hour < 9) {
            periods.normal.total += score;
            periods.normal.count++;
        } else if (hour >= 9) {
            periods.late.total += score;
            periods.late.count++;
        }
    });

    // Find best period
    let bestPeriod = null;
    let bestAvg = 0;
    Object.entries(periods).forEach(([key, data]) => {
        if (data.count >= 2) {
            const avg = data.total / data.count;
            if (avg > bestAvg) {
                bestAvg = avg;
                bestPeriod = key;
            }
        }
    });

    if (bestPeriod) {
        valueEl.textContent = periods[bestPeriod].name;
        detailEl.textContent = `${periods[bestPeriod].range} (${periods[bestPeriod].count} wakes)`;
    } else {
        valueEl.textContent = '--';
        detailEl.textContent = 'Need more varied wake times';
    }
}

function updateSleepFeelingBedtimeEffect(history) {
    const valueEl = document.getElementById('sleep-feeling-bedtime-effect');
    const detailEl = document.getElementById('sleep-feeling-bedtime-effect-detail');
    if (!valueEl || !detailEl) return;

    if (history.length < 5) {
        valueEl.textContent = '--';
        detailEl.textContent = 'Need 5+ sleeps with feelings';
        return;
    }

    // Compare early bedtime (before 11pm) vs late bedtime (11pm+)
    const earlyBed = { total: 0, count: 0 };
    const lateBed = { total: 0, count: 0 };

    history.forEach(sleep => {
        const score = feelingScores[sleep.feeling] || 0;
        const bedDate = new Date(sleep.startTime);
        const hour = bedDate.getHours();

        // Adjust for after-midnight bedtimes (count as late previous night)
        if (hour >= 22 || hour < 2) {
            if (hour < 23 && hour >= 22) {
                earlyBed.total += score;
                earlyBed.count++;
            } else {
                lateBed.total += score;
                lateBed.count++;
            }
        } else if (hour < 22) {
            earlyBed.total += score;
            earlyBed.count++;
        }
    });

    if (earlyBed.count < 2 || lateBed.count < 2) {
        valueEl.textContent = '--';
        detailEl.textContent = 'Need more varied bedtimes';
        return;
    }

    const earlyAvg = earlyBed.total / earlyBed.count;
    const lateAvg = lateBed.total / lateBed.count;
    const diff = earlyAvg - lateAvg;
    const percentDiff = lateAvg > 0 ? ((diff / lateAvg) * 100).toFixed(0) : 0;

    if (diff > 0.3) {
        valueEl.innerHTML = `<span style="color: #22c55e;">+${percentDiff}%</span>`;
        detailEl.textContent = `Earlier bed = ${percentDiff}% better`;
    } else if (diff < -0.3) {
        valueEl.innerHTML = `<span style="color: #ef4444;">${percentDiff}%</span>`;
        detailEl.textContent = 'Later bed works better for you';
    } else {
        valueEl.textContent = '~0%';
        detailEl.textContent = 'Bedtime has minimal effect';
    }
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
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="%236366f1" d="M6 2h3v1h1v1h1v2h-1v1H9v1H8v1H7v3H5v-1H4v-1H3V8h1V5h1V3h1V2z"/><path fill="%23a5b4fc" d="M6 3h1v1h1v1H6V3zM10 4h1v1h-1zM12 6h1v1h-1zM11 9h1v1h-1z"/></svg>',
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
    autophagy: '<span class="px-icon px-autophagy"></span>',
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
        'CRUSH IT! Iron grip mode! ',
        'Grip of steel activated! ',
        'Forearms are ON FIRE! ',
        'Your grip game is getting serious! ',
        'Grip strength leveling up! ',
        'Building strength, one rep at a time! ',
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
        'Moderate hunger — your body is adjusting. This is normal.',
        'Your stomach is speaking louder now.',
        'Hunger wave incoming - ride it out!',
        '"The price of fasting is zero." — Dr. Jason Fung',
        '"You are genetically designed to fast." — Dr. Pradip Jamnadas',
        'Try some black coffee or tea to help!',
        'This hunger means fat-burning is active!',
        'Level 2 hunger. The battle intensifies!'
    ],
    hunger3: [
        'Strong hunger — your body is deep into fat-burning mode.',
        'Feeling very hungry is normal at this stage. It usually passes in waves.',
        'Your hunger is peaking. A walk or water can help it pass.',
        'This hunger means your body is tapping into stored energy. You\'re doing great.',
        '"No drug can provide the same benefit as fasting." — Dr. Pradip Jamnadas',
        '"Fasting is not deprivation. It\'s healing." — Dr. Pradip Jamnadas',
        'A short walk can help hunger pass. Movement is your friend.',
        'Intense hunger often means deep fat burning is happening.',
        'Listen to your body — if you need to eat, that\'s okay too.'
    ],
    hunger4: [
        'Maximum hunger — you\'re really deep into your fast. Impressive dedication.',
        'Very hungry! This is your body using stored energy. You\'re doing amazing.',
        'Peak hunger logged. This is rare and shows real commitment.',
        '"This is the ancient secret. Fasting follows feasting." — Dr. Jason Fung',
        '"Autophagy makes your cells younger. It\'s a reset switch." — Dr. Pradip Jamnadas',
        'Please consider breaking your fast safely if you need to. Your health comes first.',
        'This level of dedication is rare. Be proud of yourself.',
        'Extreme hunger logged. Remember: it\'s always okay to eat if your body needs it.'
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
    autophagy: [
        'AUTOPHAGY ACTIVATED! Your cells are cleaning house!',
        '"Autophagy is like a reset button for your cells." — Dr. Pradip Jamnadas',
        'Cellular recycling in full swing! Old proteins being broken down!',
        '"The Nobel Prize was awarded for autophagy research. It\'s that important." — Yoshinori Ohsumi',
        'Your body is literally eating damaged cells! This is the magic of fasting!',
        '"Autophagy doesn\'t occur in a fed state. Only fasting activates it." — Dr. Pradip Jamnadas',
        'Cell cleanup crew deployed! Damaged mitochondria being recycled!',
        'You\'ve unlocked the secret weapon! Autophagy = cellular youth!',
        '"Fasting triggers autophagy - your body\'s built-in detox." — Dr. Jason Fung',
        'Maximum battle damage! Your cells are regenerating!'
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
        "You're eager to move! You've been fasting {hours}.\n\nExercise works best after 14+ hours when autophagy peaks. You could wait for better results, or move now — any movement is good.\n\nTap again to log exercise.",
        "Only {hours} into your fast — exercise is most effective after 14 hours when your body shifts into deep fat-burning mode.\n\nBut if you need to move now, that's okay too.\n\nTap again to log it."
    ],
    optimal: [
        "Great timing! {hours} fasted — your body is primed for movement right now.\n\nKeep it short and spread sets throughout the day for best results.\n\nLet's go!",
        "You're in the sweet spot! {hours} of fasting means autophagy is active.\n\nA quick set — pushups, squats, or a hang — goes a long way right now."
    ],
    tooLateForBed: [
        "It's {time} — you have {hoursUntilBed} until bedtime.\n\nExercise close to sleep can keep you awake. If you want to move, try something gentle like stretching or a short walk.\n\nTap again to log it.",
        "Late movement at {time}? You have {hoursUntilBed} until bedtime.\n\nLight activity is fine — hanging or gentle stretches won't disrupt sleep much.\n\nTap again to log it."
    ],
    hungryWarning: [
        "Logged! A heads-up: exercise while fasting can increase hunger later. That's normal.\n\nShort sets spread throughout the day work well. Keep it moderate and listen to your body.",
        "Set logged! You might feel hungrier later from exercising while fasted — that's your body responding naturally.\n\nSpread your sets out and keep them short for best results."
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

    // Invalidate performance caches (powerup affects battle damage)
    invalidateCache('powerup');

    saveState();
    updatePowerupDisplay();
    updateHeartPoints();

    // Add XP to skill (10 XP per action)
    const xpGained = addSkillXP(type, 10);

    // Show XP drop
    showPowerupToast(powerupEmojis[type], type, xpGained);

    // Update Slayer damage and show bonus feedback
    const damageBonus = POWERUP_DAMAGE_BONUSES[type] || 0;
    if (damageBonus > 0 && state.currentFast.isActive) {
        showSlayerDamageBonus(type, damageBonus);
    }
    updateMonsterBattleUI();
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
        showAchievementToast('<span class="px-icon px-warning"></span>', 'Quick Note!', msg, 'warning');
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
    updateHeartPoints();

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

    // Update Slayer damage and show bonus feedback
    const damageBonus = POWERUP_DAMAGE_BONUSES['exercise'] || 0;
    if (damageBonus > 0 && state.currentFast.isActive) {
        showSlayerDamageBonus('exercise', damageBonus);
    }
    updateMonsterBattleUI();
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
    updateHeartPoints();

    // Show context message as toast for extra fun
    const toastType = hangingToday >= 5 ? 'epic' : hangingToday >= 2 ? 'success' : 'info';
    setTimeout(() => {
        showAchievementToast('<span class="px-icon px-monkey"></span>', `Hang #${hangingToday + 1} Complete!`, contextMessage, toastType);
    }, 300);

    // Update Slayer damage and show bonus feedback
    const damageBonus = POWERUP_DAMAGE_BONUSES['hanging'] || 0;
    if (damageBonus > 0 && state.currentFast.isActive) {
        showSlayerDamageBonus('hanging', damageBonus);
    }
    updateMonsterBattleUI();
}

// Grip training powerup
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

    // Fun contextual messages based on grip count
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
    updateHeartPoints();

    // Show context message as toast for extra motivation
    const toastType = gripToday >= 8 ? 'epic' : gripToday >= 4 ? 'success' : 'info';
    setTimeout(() => {
        showAchievementToast('<span class="px-icon px-grip"></span>', `Crush #${gripToday + 1} Complete!`, contextMessage, toastType);
    }, 300);

    // Update Slayer damage and show bonus feedback
    const damageBonus = POWERUP_DAMAGE_BONUSES['grip'] || 0;
    if (damageBonus > 0 && state.currentFast.isActive) {
        showSlayerDamageBonus('grip', damageBonus);
    }
    updateMonsterBattleUI();
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
    updateHeartPoints();

    // Show context message as toast for milestone walks
    const toastType = walksToday >= 7 ? 'epic' : walksToday >= 3 ? 'success' : 'info';
    setTimeout(() => {
        showAchievementToast('<span class="px-icon px-walk"></span>', `Walk #${walksToday + 1} Complete!`, contextMessage, toastType);
    }, 300);

    // Update Slayer damage and show bonus feedback
    const damageBonus = POWERUP_DAMAGE_BONUSES['walk'] || 0;
    if (damageBonus > 0 && state.currentFast.isActive) {
        showSlayerDamageBonus('walk', damageBonus);
    }
    updateMonsterBattleUI();
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
    updateHeartPoints();

    // Show achievement toast
    setTimeout(() => {
        showAchievementToast('<span class="px-icon px-doctorwin"></span>', 'Doctor Win!', randomMessage, 'epic');
    }, 300);

    // Update Slayer damage and show bonus feedback
    const damageBonus = POWERUP_DAMAGE_BONUSES['doctorwin'] || 0;
    if (damageBonus > 0 && state.currentFast.isActive) {
        showSlayerDamageBonus('doctorwin', damageBonus);
    }
    updateMonsterBattleUI();
}

// Autophagy milestone - automatically triggers at 16 hours of fasting
function triggerAutophagyMilestone() {
    // Check if fasting is active (safety check)
    if (!state.currentFast.isActive) return;

    // Ensure powerups array exists
    if (!state.currentFast.powerups) {
        state.currentFast.powerups = [];
    }

    // Add the autophagy powerup
    state.currentFast.powerups.push({
        type: 'autophagy',
        time: Date.now()
    });

    saveState();
    updatePowerupDisplay();

    // Get random message
    const messages = powerupMessages.autophagy;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Add XP (15 XP - bigger reward for achieving autophagy state)
    const xpGained = addSkillXP('autophagy', 15);

    // Show XP drop
    showPowerupToast(powerupEmojis.autophagy, 'autophagy', xpGained);
    updateHeartPoints();

    // Show epic achievement toast with notification
    showAchievementToast('<span class="px-icon px-autophagy"></span>', 'AUTOPHAGY ACTIVATED!', randomMessage, 'epic');
    showNotification('Autophagy Activated!', 'Your cells are now cleaning house! +15 battle damage unlocked.');

    // Update Slayer damage and show bonus feedback
    const damageBonus = POWERUP_DAMAGE_BONUSES['autophagy'] || 0;
    if (damageBonus > 0) {
        showSlayerDamageBonus('autophagy', damageBonus);
    }
    updateMonsterBattleUI();
}

// ============================================
// METABOLIC STATE SYSTEM
// Based on research by Dr. Pradip Jamnadas & Dr. Jason Fung
// ============================================

const METABOLIC_STATES = {
    fed: {
        name: 'Fed State',
        icon: '<span class="px-icon px-food"></span>',
        description: 'Digesting last meal...',
        color: '#6b7280',
        borderColor: '#4b5563',
        hourRange: [0, 4],
        markers: {
            insulin: { level: 90, status: 'HIGH', color: '#ef4444' },
            glycogen: { level: 100, status: 'FULL', color: '#22c55e' },
            ketones: { level: 5, status: 'MINIMAL', color: '#6b7280' },
            ampk: 20, mtor: 80,
            ampkMtorStatus: { text: 'mTOR ▲', color: '#ef4444' },
            gh: { level: 10, status: '1x baseline', color: '#6b7280' }
        }
    },
    glycogenBurning: {
        name: 'Glycogen Burning',
        icon: '<span class="px-icon px-fire"></span>',
        description: 'Depleting liver glycogen stores',
        color: '#f97316',
        borderColor: '#ea580c',
        hourRange: [4, 12],
        markers: {
            insulin: { level: 60, status: 'DROPPING', color: '#eab308' },
            glycogen: { level: 50, status: 'DEPLETING', color: '#eab308' },
            ketones: { level: 15, status: 'RISING', color: '#f97316' },
            ampk: 35, mtor: 65,
            ampkMtorStatus: { text: 'Shifting...', color: '#eab308' },
            gh: { level: 20, status: '1.5x', color: '#a855f7' }
        }
    },
    metabolicSwitch: {
        name: 'Metabolic Switch',
        icon: '<span class="px-icon px-lightning"></span>',
        description: 'Fat burning activated! Energy rising!',
        color: '#eab308',
        borderColor: '#ca8a04',
        hourRange: [12, 16],
        markers: {
            insulin: { level: 30, status: 'LOW', color: '#22c55e' },
            glycogen: { level: 15, status: 'DEPLETED', color: '#ef4444' },
            ketones: { level: 40, status: 'KETOSIS', color: '#f97316' },
            ampk: 55, mtor: 45,
            ampkMtorStatus: { text: 'AMPK ▲', color: '#22c55e' },
            gh: { level: 35, status: '2x', color: '#a855f7' }
        }
    },
    autophagyZone: {
        name: 'Autophagy Zone',
        icon: '<span class="px-icon px-autophagy"></span>',
        description: 'Cellular cleanup activated!',
        color: '#a855f7',
        borderColor: '#9333ea',
        hourRange: [16, 24],
        markers: {
            insulin: { level: 15, status: 'VERY LOW', color: '#22c55e' },
            glycogen: { level: 5, status: 'EMPTY', color: '#6b7280' },
            ketones: { level: 60, status: 'HIGH', color: '#eab308' },
            ampk: 75, mtor: 25,
            ampkMtorStatus: { text: 'AMPK ▲▲', color: '#22c55e' },
            gh: { level: 55, status: '3x', color: '#ec4899' }
        }
    },
    deepHealing: {
        name: 'Deep Healing',
        icon: '<span class="px-icon px-brawn"></span>',
        description: 'GH surge! Peak autophagy!',
        color: '#22c55e',
        borderColor: '#16a34a',
        hourRange: [24, 36],
        markers: {
            insulin: { level: 8, status: 'BASELINE', color: '#22c55e' },
            glycogen: { level: 0, status: 'EMPTY', color: '#6b7280' },
            ketones: { level: 80, status: 'OPTIMAL', color: '#22c55e' },
            ampk: 85, mtor: 15,
            ampkMtorStatus: { text: 'REPAIR MODE', color: '#22c55e' },
            gh: { level: 80, status: '5x', color: '#ec4899' }
        }
    },
    warriorMode: {
        name: 'Warrior Mode',
        icon: '<span class="px-icon px-crown"></span>',
        description: 'Stem cell regeneration active!',
        color: '#ec4899',
        borderColor: '#db2777',
        hourRange: [36, 72],
        markers: {
            insulin: { level: 5, status: 'MINIMAL', color: '#22c55e' },
            glycogen: { level: 0, status: 'EMPTY', color: '#6b7280' },
            ketones: { level: 95, status: 'PEAK', color: '#22c55e' },
            ampk: 90, mtor: 10,
            ampkMtorStatus: { text: 'MAX REPAIR', color: '#22c55e' },
            gh: { level: 100, status: '5x+', color: '#ec4899' }
        }
    },
    legend: {
        name: 'Fasting Legend',
        icon: '<span class="px-icon px-trophy"></span>',
        description: 'Immune system renewing!',
        color: '#fbbf24',
        borderColor: '#f59e0b',
        hourRange: [72, Infinity],
        markers: {
            insulin: { level: 3, status: 'MINIMAL', color: '#22c55e' },
            glycogen: { level: 0, status: 'EMPTY', color: '#6b7280' },
            ketones: { level: 100, status: 'MAXIMUM', color: '#22c55e' },
            ampk: 95, mtor: 5,
            ampkMtorStatus: { text: 'FULL REPAIR', color: '#22c55e' },
            gh: { level: 100, status: '5x+', color: '#ec4899' }
        }
    }
};

// Metabolic milestone messages with source attribution
const METABOLIC_MILESTONE_MESSAGES = {
    4: {
        title: 'GLYCOGEN BURNING',
        message: 'Your body is now tapping into liver glycogen stores for energy.',
        quote: '"In the first 12 hours your body wipes up all the glycogen in your liver and muscles."',
        source: 'Dr. Pradip Jamnadas'
    },
    12: {
        title: 'GLYCOGEN DEPLETED',
        message: 'Liver glycogen exhausted! Your body is accessing fat stores now.',
        quote: '"When glycogen stores are depleted, the body utilizes energy from adipose tissue."',
        source: 'Dr. Jason Fung'
    },
    16: {
        title: 'AUTOPHAGY ZONE',
        message: 'Cellular cleanup has begun! Old cells are being recycled.',
        quote: '"Your body activates autophagy when you restrict calories for at least 16-18 hours."',
        source: 'Dr. Jason Fung'
    },
    18: {
        title: 'ENERGY SURGE',
        message: 'Norepinephrine rising! Metabolic rate is INCREASING, not slowing.',
        quote: '"At about 18 hours, norepinephrine and metabolic rate go up. We feel more bushy tailed and bright eyed."',
        source: 'Dr. Pradip Jamnadas'
    },
    24: {
        title: 'DEEP HEALING',
        message: 'Growth hormone is 2-3x higher! Your muscles are protected.',
        quote: '"Fasting for 1 day increases growth hormone by 2-3 times."',
        source: 'Dr. Jason Fung'
    },
    36: {
        title: 'DEEP TERRITORY',
        message: 'Maximum autophagy reached. Immunity boosting!',
        quote: '"36 hours is a magic number. Your immunocytes are now new because your stem cells have kicked in."',
        source: 'Dr. Pradip Jamnadas'
    },
    48: {
        title: 'GROWTH HORMONE SURGE',
        message: 'GH is now 5x baseline! Brain clarity at peak.',
        quote: '"Fasting for just two days increases HGH production by five times."',
        source: 'Dr. Jason Fung'
    },
    72: {
        title: 'IMMUNE RENEWAL',
        message: 'Stem cells regenerating immune system!',
        quote: '"72 hours of fasting triggers stem cell regeneration of the immune system."',
        source: 'USC Stem Cell Research'
    }
};

// Track which milestones have been shown this fast
let metabolicMilestonesShown = {};

function getMetabolicState(hours) {
    if (hours >= 72) return METABOLIC_STATES.legend;
    if (hours >= 36) return METABOLIC_STATES.warriorMode;
    if (hours >= 24) return METABOLIC_STATES.deepHealing;
    if (hours >= 16) return METABOLIC_STATES.autophagyZone;
    if (hours >= 12) return METABOLIC_STATES.metabolicSwitch;
    if (hours >= 4) return METABOLIC_STATES.glycogenBurning;
    return METABOLIC_STATES.fed;
}

function updateMetabolicStateDisplay() {
    const container = document.getElementById('metabolic-state-container');
    if (!container) return;

    // Only show when fasting is active
    if (!state.currentFast.isActive) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    const elapsed = Math.max(0, Date.now() - state.currentFast.startTime);
    const hours = elapsed / 1000 / 60 / 60;
    const metabolicState = getMetabolicState(hours);

    // Update state banner
    const banner = document.getElementById('metabolic-state-banner');
    const icon = document.getElementById('metabolic-state-icon');
    const name = document.getElementById('metabolic-state-name');
    const desc = document.getElementById('metabolic-state-desc');

    if (banner) {
        banner.style.borderColor = metabolicState.borderColor;
        banner.style.background = `linear-gradient(135deg, rgba(0,0,0,0.8) 0%, ${metabolicState.color}22 100%)`;
    }
    if (icon) icon.innerHTML = metabolicState.icon;
    if (name) {
        name.textContent = metabolicState.name;
        name.style.color = metabolicState.color;
    }
    if (desc) desc.textContent = metabolicState.description;

    // Update metabolic markers
    updateMetabolicMarkers(metabolicState.markers);

    // Update timeline dots
    updateMetabolicTimeline(hours);

    // Check for milestone notifications
    checkMetabolicMilestones(hours);
}

function updateMetabolicMarkers(markers) {
    // Insulin
    const insulinBar = document.getElementById('insulin-bar');
    const insulinStatus = document.getElementById('insulin-status');
    if (insulinBar) insulinBar.style.width = `${markers.insulin.level}%`;
    if (insulinStatus) {
        insulinStatus.textContent = markers.insulin.status;
        insulinStatus.style.color = markers.insulin.color;
    }

    // Glycogen
    const glycogenBar = document.getElementById('glycogen-bar');
    const glycogenStatus = document.getElementById('glycogen-status');
    if (glycogenBar) glycogenBar.style.width = `${markers.glycogen.level}%`;
    if (glycogenStatus) {
        glycogenStatus.textContent = markers.glycogen.status;
        glycogenStatus.style.color = markers.glycogen.color;
    }

    // Ketones
    const ketoneBar = document.getElementById('ketone-bar');
    const ketoneStatus = document.getElementById('ketone-status');
    if (ketoneBar) ketoneBar.style.width = `${markers.ketones.level}%`;
    if (ketoneStatus) {
        ketoneStatus.textContent = markers.ketones.status;
        ketoneStatus.style.color = markers.ketones.color;
    }

    // AMPK/mTOR
    const ampkBar = document.getElementById('ampk-bar');
    const mtorBar = document.getElementById('mtor-bar');
    const ampkMtorStatus = document.getElementById('ampk-mtor-status');
    if (ampkBar) ampkBar.style.width = `${markers.ampk}%`;
    if (mtorBar) mtorBar.style.width = `${markers.mtor}%`;
    if (ampkMtorStatus) {
        ampkMtorStatus.textContent = markers.ampkMtorStatus.text;
        ampkMtorStatus.style.color = markers.ampkMtorStatus.color;
    }

    // Growth Hormone
    const ghBar = document.getElementById('gh-bar');
    const ghStatus = document.getElementById('gh-status');
    if (ghBar) ghBar.style.width = `${markers.gh.level}%`;
    if (ghStatus) {
        ghStatus.textContent = markers.gh.status;
        ghStatus.style.color = markers.gh.color;
    }
}

function updateMetabolicTimeline(hours) {
    const timelinePoints = [
        { id: 'timeline-fed', hour: 0 },
        { id: 'timeline-glycogen', hour: 12 },
        { id: 'timeline-switch', hour: 16 },
        { id: 'timeline-autophagy', hour: 24 },
        { id: 'timeline-deep', hour: 36 },
        { id: 'timeline-warrior', hour: 72 }
    ];

    timelinePoints.forEach(point => {
        const el = document.getElementById(point.id);
        if (el) {
            if (hours >= point.hour) {
                el.style.background = 'var(--matrix-400)';
                el.style.boxShadow = '0 0 8px var(--matrix-400)';
            } else {
                el.style.background = 'var(--dark-border)';
                el.style.boxShadow = 'none';
            }
        }
    });
}

function checkMetabolicMilestones(hours) {
    const milestoneHours = [4, 12, 16, 18, 24, 36, 48, 72];

    milestoneHours.forEach(milestoneHour => {
        // Check if we've passed this milestone and haven't shown it yet
        if (hours >= milestoneHour && !metabolicMilestonesShown[milestoneHour]) {
            const milestone = METABOLIC_MILESTONE_MESSAGES[milestoneHour];
            if (milestone) {
                // Mark as shown
                metabolicMilestonesShown[milestoneHour] = true;

                // Skip 16-hour notification since autophagy already handles it
                if (milestoneHour === 16) return;

                // Show milestone notification
                showMetabolicMilestoneNotification(milestone, milestoneHour);
            }
        }
    });
}

function showMetabolicMilestoneNotification(milestone, hour) {
    // Create a special metabolic milestone toast
    const toast = document.createElement('div');
    toast.id = 'metabolic-milestone-toast';
    toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-in';
    toast.style.width = '85vw';
    toast.style.maxWidth = '360px';
    toast.innerHTML = `
        <div class="rounded-lg p-5 shadow-2xl" style="background: linear-gradient(135deg, #0a150a 0%, #1a2f1a 100%); border: 2px solid var(--matrix-400); box-shadow: 0 0 30px rgba(34, 197, 94, 0.5);">
            <div class="flex items-center gap-3 mb-3">
                <span class="px-icon px-icon-lg px-clock"></span>
                <p class="font-bold text-base" style="color: var(--matrix-400);">${hour}H: ${milestone.title}</p>
            </div>
            <p class="text-sm mb-3 leading-relaxed" style="color: var(--dark-text);">${milestone.message}</p>
            <p class="text-xs italic leading-relaxed" style="color: var(--matrix-300);">${milestone.quote}</p>
            <p class="text-xs mt-1" style="color: var(--dark-text-muted);">— ${milestone.source}</p>
        </div>
    `;

    // Remove any existing metabolic toast
    const existing = document.getElementById('metabolic-milestone-toast');
    if (existing) existing.remove();

    document.body.appendChild(toast);

    // Also show browser notification
    showNotification(`${hour}H: ${milestone.title}`, milestone.message);

    // Auto-remove after 6 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -20px)';
        toast.style.transition = 'all 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 6000);
}

function resetMetabolicMilestones() {
    metabolicMilestonesShown = {};
}

// Toggle metabolic panel visibility
function initMetabolicPanelToggle() {
    const toggleBtn = document.getElementById('toggle-metabolic-panel');
    const panel = document.getElementById('metabolic-markers-panel');

    if (toggleBtn && panel) {
        toggleBtn.addEventListener('click', () => {
            panel.classList.toggle('hidden');
            toggleBtn.innerHTML = panel.classList.contains('hidden')
                ? '<span class="px-icon px-scroll"></span> Details'
                : '<span class="px-icon px-scroll"></span> Hide';
        });
    }
}

// ============================================
// END METABOLIC STATE SYSTEM
// ============================================

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
                ${isMedicalQuote(message) ? '<div style="font-size: 9px; opacity: 0.5; margin-top: 2px;">Educational \u2014 not medical advice</div>' : ''}
            </div>
        </div>
    `;

    toast.style.cssText = `
        position: fixed;
        top: calc(20px + env(safe-area-inset-top, 0px));
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

// Expert wisdom attributions shown when clicking Sui ghost
const suiWisdom = {
    fasting: [
        { title: 'The Science of Fasting', author: 'Dr. Jason Fung' },
        { title: 'Intermittent Fasting & Insulin', author: 'Dr. Jason Fung' },
        { title: 'The Obesity Code', author: 'Dr. Jason Fung' },
        { title: 'Therapeutic Fasting', author: 'Dr. Jason Fung' },
        { title: 'Fasting for Survival', author: 'Dr. Pradip Jamnadas' },
        { title: 'The Fat Lies', author: 'Dr. Pradip Jamnadas' },
        { title: 'Food as Medicine', author: 'Dr. Pradip Jamnadas' },
        { title: 'Strength & Conditioning', author: 'Pavel Tsatsouline' },
        { title: 'Simple & Sinister', author: 'Pavel Tsatsouline' }
    ],
    sleep: [
        { title: 'Why We Sleep', author: 'Dr. Matthew Walker' },
        { title: 'The Science of Sleep', author: 'Dr. Matthew Walker' },
        { title: 'Sleep is Your Superpower', author: 'Dr. Matthew Walker' },
        { title: 'Master Your Sleep', author: 'Dr. Matthew Walker' },
        { title: 'The Science of Better Sleep', author: 'Dr. Matthew Walker' }
    ]
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
    messageEl.textContent = '';
    messageEl.appendChild(document.createTextNode(message));
    // Add context label for medical quotes
    if (isMedicalQuote(message)) {
        const disclaimer = document.createElement('span');
        disclaimer.className = 'quote-disclaimer';
        disclaimer.style.cssText = 'display:block;font-size:10px;opacity:0.5;margin-top:4px;';
        disclaimer.textContent = 'Educational \u2014 not medical advice';
        messageEl.appendChild(disclaimer);
    }

    // Set color: use custom ghost color if set, otherwise type-based defaults
    ghost.classList.remove('sui-fasting', 'sui-sleep');
    const customFilter = getGhostColorFilter();
    if (customFilter && customFilter !== 'none') {
        // Custom color chosen by user — overrides type-based coloring
        ghost.style.filter = customFilter;
    } else {
        // Default: green for fasting, purple for sleep
        ghost.style.filter = '';
        ghost.classList.add(type === 'sleep' ? 'sui-sleep' : 'sui-fasting');
    }

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

    // Pick a random wisdom attribution
    const isSleep = ghost.classList.contains('sui-sleep');
    const wisdomList = isSleep ? suiWisdom.sleep : suiWisdom.fasting;
    const wisdom = wisdomList[Math.floor(Math.random() * wisdomList.length)];

    // Show attribution text (no links)
    messageEl.innerHTML = `
        <span style="font-size: 0.9rem; display: block; margin-bottom: 8px;">Sui says: "Seek this wisdom..."</span>
        <span style="color: #fbbf24; font-size: 0.85rem; display: block; font-weight: 600;">
            ${escapeHtml(wisdom.title)}
        </span>
        <span style="font-size: 0.75rem; color: #86efac; display: block; margin-top: 6px;">— ${escapeHtml(wisdom.author)}</span>
        <span style="font-size: 0.65rem; color: rgba(134, 239, 172, 0.6); display: block; margin-top: 8px;">(Click outside to dismiss)</span>
    `;

    // Add click handler to dismiss
    const dismissHandler = (e) => {
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
            top: calc(100px + env(safe-area-inset-top, 0px));
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
        autophagy: 'Autophagy',
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
    // Sui Pro users can create unlimited custom powerups
    if (isPremiumActive()) return true;

    if (!state.customPowerup) {
        state.customPowerup = { name: null, createdMonth: null };
    }
    const currentMonth = getCurrentMonth();
    // Free: can create if no custom powerup exists OR it was created in a previous month
    return !state.customPowerup.name || state.customPowerup.createdMonth !== currentMonth;
}

function showCustomPowerupModal() {
    const modal = document.getElementById('custom-powerup-modal');
    const remainingEl = document.getElementById('custom-powerup-remaining');
    const input = document.getElementById('custom-powerup-input');

    if (canCreateCustomPowerup()) {
        if (remainingEl) {
            if (isPremiumActive()) {
                remainingEl.textContent = 'Sui Pro: Unlimited custom powerups!';
                remainingEl.style.color = '#f59e0b';
            } else {
                remainingEl.textContent = 'You have 1 custom powerup available this month.';
                remainingEl.style.color = '#67e8f9';
            }
        }
        if (input) {
            input.disabled = false;
            input.value = '';
        }
        document.getElementById('create-custom-powerup').disabled = false;
    } else {
        if (remainingEl) {
            remainingEl.innerHTML = `You already created "${escapeHtml(state.customPowerup.name)}" this month. <span style="color: #f59e0b; cursor: pointer;" data-action="show-paywall">Upgrade to Sui Pro</span> for unlimited!`;
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

    // Save the custom powerup (store raw name, escape only on render to innerHTML)
    // Length limit enforced above (50 chars max)
    state.customPowerup = {
        name: name,
        createdMonth: getCurrentMonth()
    };
    saveState();

    // Update UI
    updateCustomPowerupDisplay();
    hideCustomPowerupModal();

    // Show confirmation toast (escapeHtml for innerHTML contexts)
    showPowerupToast(`Custom powerup "${escapeHtml(name)}" created! Use it wisely!`);
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

    const logs = Array.isArray(state.currentFast.hungerLogs) ? state.currentFast.hungerLogs : [];

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
    if (!Array.isArray(state.currentFast.hungerLogs) || state.currentFast.hungerLogs.length === 0) {
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
            showHeartHealth: true,
            showBreakingFastGuide: true,
            showExerciseGuide: true,
            showEatingGuide: true,
            showSleepGuide: true,
            showMealSleepQuality: true,
            showHungerTracker: true,
            showTrends: true,
            biologicalSex: null
        };
    }

    // Ensure menstrual cycle state exists
    if (!state.menstrualCycle) {
        state.menstrualCycle = {
            lastPeriodStart: null,
            cycleLength: 28,
            trackingEnabled: false
        };
    }

    // Set checkbox states from saved settings
    const settingsMap = {
        'toggle-fasting-goals': 'showFastingGoals',
        'toggle-sleep-goals': 'showSleepGoals',
        'toggle-fasting-future': 'showFastingFuture',
        'toggle-heart-health': 'showHeartHealth',
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

    // Set biological sex radio button state
    initBiologicalProfileUI();

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

    // Sync to cloud when user changes a setting (if connected AND initial sync is complete)
    // CRITICAL: Must check initialSyncComplete to prevent overwriting cloud data with empty local state
    if (window.firebaseSync && window.firebaseSync.syncEnabled && initialSyncComplete) {
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

    // Heart Health guide
    toggleElement('heart-health-section', settings.showHeartHealth !== false);

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
// BIOLOGICAL PROFILE SYSTEM
// ==========================================
// Based on research from Dr. Jason Fung, Megan Ramos (The Fasting Method), and Dr. Pradip Jamnadas
// Key findings:
// - Same protocols for both sexes (per Dr. Fung)
// - Women weeks 1-3: slower results (~0.25 lb/fast)
// - Women weeks 4-6: catches up (~1 lb/fast)
// - Week 8+: equal for both (~0.5 lb/fast)
// - Menstrual cycle: shorter fasts 2-3 days before period recommended
// - After 6 months: period becomes easiest fasting time

function initBiologicalProfileUI() {
    const biologicalSex = state.settings?.biologicalSex;

    // Set radio button state
    const maleRadio = document.getElementById('bio-sex-male');
    const femaleRadio = document.getElementById('bio-sex-female');
    const notSetRadio = document.getElementById('bio-sex-not-set');

    if (maleRadio) maleRadio.checked = biologicalSex === 'male';
    if (femaleRadio) femaleRadio.checked = biologicalSex === 'female';
    if (notSetRadio) notSetRadio.checked = biologicalSex === null || biologicalSex === undefined;

    // Show/hide female-specific info section
    const femaleInfo = document.getElementById('female-fasting-info');
    if (femaleInfo) {
        if (biologicalSex === 'female') {
            femaleInfo.classList.remove('hidden');
        } else {
            femaleInfo.classList.add('hidden');
        }
    }

    // Show/hide menstrual cycle section based on selection
    updateMenstrualCycleVisibility();

    // Update menstrual cycle UI if female
    if (biologicalSex === 'female') {
        updateMenstrualCycleUI();

        // Also show/hide tracking details based on enabled state
        const trackingDetails = document.getElementById('menstrual-tracking-details');
        if (trackingDetails && state.menstrualCycle?.trackingEnabled) {
            trackingDetails.classList.remove('hidden');
        }
    }
}

function updateBiologicalSex(sex) {
    if (!state.settings) state.settings = {};
    state.settings.biologicalSex = sex;

    // Save and sync
    saveState();

    // Update UI visibility
    updateMenstrualCycleVisibility();

    // Show appropriate educational message
    if (sex === 'female') {
        showBiologicalProfileToast('female');
    } else if (sex === 'male') {
        showBiologicalProfileToast('male');
    }
}

function updateMenstrualCycleVisibility() {
    const section = document.getElementById('menstrual-cycle-section');
    const isFemale = state.settings?.biologicalSex === 'female';

    if (section) {
        if (isFemale) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    }
}

function updateMenstrualCycleUI() {
    if (!state.menstrualCycle) {
        state.menstrualCycle = {
            lastPeriodStart: null,
            cycleLength: 28,
            trackingEnabled: false
        };
    }

    // Update checkbox state
    const trackingCheckbox = document.getElementById('menstrual-tracking-enabled');
    if (trackingCheckbox) {
        trackingCheckbox.checked = state.menstrualCycle.trackingEnabled;
    }

    // Update cycle length display
    const cycleLengthInput = document.getElementById('cycle-length-input');
    if (cycleLengthInput) {
        cycleLengthInput.value = state.menstrualCycle.cycleLength || 28;
    }

    // Update last period date
    const lastPeriodInput = document.getElementById('last-period-date');
    if (lastPeriodInput && state.menstrualCycle.lastPeriodStart) {
        const date = new Date(state.menstrualCycle.lastPeriodStart);
        lastPeriodInput.value = date.toISOString().split('T')[0];
    }

    // Update cycle phase indicator
    updateCyclePhaseIndicator();
}

function updateMenstrualCycleSetting(key, value) {
    if (!state.menstrualCycle) {
        state.menstrualCycle = {
            lastPeriodStart: null,
            cycleLength: 28,
            trackingEnabled: false
        };
    }

    state.menstrualCycle[key] = value;
    saveState();

    // Update phase indicator if relevant
    if (key === 'lastPeriodStart' || key === 'cycleLength') {
        updateCyclePhaseIndicator();
    }
}

function getCyclePhase() {
    if (!state.menstrualCycle?.trackingEnabled || !state.menstrualCycle?.lastPeriodStart) {
        return null;
    }

    const now = Date.now();
    const lastPeriod = state.menstrualCycle.lastPeriodStart;
    const cycleLength = state.menstrualCycle.cycleLength || 28;

    // Calculate days since last period
    const daysSinceLastPeriod = Math.floor((now - lastPeriod) / (1000 * 60 * 60 * 24));

    // Current day in cycle (1-based)
    const dayInCycle = (daysSinceLastPeriod % cycleLength) + 1;

    // Days until next period
    const daysUntilPeriod = cycleLength - dayInCycle + 1;

    // Define phases based on Megan Ramos recommendations:
    // - Days 1-5: Menstruation (after 6 months, easiest fasting time)
    // - Days 6-14: Follicular phase (normal fasting)
    // - Days 15-21: Ovulation/early luteal (normal fasting)
    // - Days 22-28 (or last 2-3 days): Late luteal (shorter fasts recommended)

    if (dayInCycle <= 5) {
        return {
            phase: 'menstruation',
            name: 'Menstruation',
            dayInCycle,
            daysUntilPeriod: cycleLength - 5 + (5 - dayInCycle), // Days until next menstruation
            recommendation: 'After adapting to fasting (6+ months), this can be your easiest time to fast.',
            icon: '<span class="px-icon px-moon"></span>',
            color: 'var(--purple-400)'
        };
    } else if (dayInCycle <= 14) {
        return {
            phase: 'follicular',
            name: 'Follicular Phase',
            dayInCycle,
            daysUntilPeriod,
            recommendation: 'Great time for extended fasts. Energy levels typically higher.',
            icon: '<span class="px-icon px-seedling"></span>',
            color: 'var(--matrix-400)'
        };
    } else if (daysUntilPeriod > 3) {
        return {
            phase: 'luteal',
            name: 'Luteal Phase',
            dayInCycle,
            daysUntilPeriod,
            recommendation: 'Normal fasting works well. Listen to your body.',
            icon: '<span class="px-icon px-flower"></span>',
            color: 'var(--orange-400)'
        };
    } else {
        return {
            phase: 'premenstrual',
            name: 'Pre-Menstrual',
            dayInCycle,
            daysUntilPeriod,
            recommendation: 'Consider shorter fasts (16-18hr). Hunger may be stronger.',
            icon: '<span class="px-icon px-lightning"></span>',
            color: 'var(--amber-400)'
        };
    }
}

function updateCyclePhaseIndicator() {
    const indicator = document.getElementById('cycle-phase-indicator');
    if (!indicator) return;

    const phase = getCyclePhase();

    if (!phase) {
        indicator.innerHTML = `
            <div class="text-sm" style="color: var(--dark-text-muted);">
                Set your last period date to see cycle-aware recommendations.
            </div>
        `;
        return;
    }

    indicator.innerHTML = `
        <div class="p-3 rounded-lg" style="background: rgba(139, 92, 246, 0.1); border: 1px solid ${phase.color};">
            <div class="flex items-center gap-2 mb-2">
                <span class="text-lg">${phase.icon}</span>
                <span class="font-medium" style="color: ${phase.color};">${phase.name}</span>
                <span class="text-xs ml-auto" style="color: var(--dark-text-muted);">Day ${phase.dayInCycle}</span>
            </div>
            <p class="text-sm" style="color: var(--dark-text-muted);">${phase.recommendation}</p>
        </div>
    `;
}

function showBiologicalProfileToast(sex) {
    if (sex === 'female') {
        showAchievementToast(
            '<span class="px-icon px-dna"></span>',
            'Profile Set: Female',
            'Weeks 1-3 may be slower — you catch up weeks 4-6!',
            'epic'
        );
    } else if (sex === 'male') {
        showAchievementToast(
            '<span class="px-icon px-dna"></span>',
            'Profile Set: Male',
            'Your biological profile has been saved.',
            'epic'
        );
    }
}

// Get fasting recommendation based on biological profile and cycle
function getFastingRecommendation() {
    const biologicalSex = state.settings?.biologicalSex;

    if (biologicalSex !== 'female' || !state.menstrualCycle?.trackingEnabled) {
        return null; // No special recommendations
    }

    const phase = getCyclePhase();
    if (!phase) return null;

    // Pre-menstrual phase: recommend shorter fasts
    if (phase.phase === 'premenstrual') {
        return {
            type: 'shorten',
            message: `You're ${phase.daysUntilPeriod} day${phase.daysUntilPeriod === 1 ? '' : 's'} from your period. Consider a shorter fast (16-18hr) if needed.`,
            suggestedGoal: 16
        };
    }

    return null;
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
        "Fiber is key after long fasts — keeps constipation at bay!",
        // Dr. Jason Fung quotes
        '"Eat whole, unprocessed foods. Avoid sugar. Avoid refined grains." — Dr. Jason Fung',
        '"Foods should be recognizable as something alive or from the ground." — Dr. Jason Fung',
        '"Boxes of Cheerios do not grow in the ground." — Dr. Jason Fung',
        '"Increasing fiber, fruits and vegetables may help with constipation." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"Eat your vegetables, do not drink them." — Dr. Pradip Jamnadas',
        '"An anti-inflammatory food is one your body has known for millennia." — Dr. Pradip Jamnadas',
        '"Natural foods reduce inflammation. That\'s the goal." — Dr. Pradip Jamnadas',
        '"I encourage a whole food predominantly plant-based diet." — Dr. Pradip Jamnadas'
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
        "Zero sugar = stable energy levels! Well done!",
        "No sugar this meal! Your body appreciates the choice.",
        // Dr. Jason Fung quotes
        '"Sugar and highly refined carbohydrates are the main culprits." — Dr. Jason Fung',
        '"Insulin is a fat-storage hormone. Sugar spikes insulin." — Dr. Jason Fung',
        '"Eat real food. Avoid sugar. Avoid refined grains. Simple." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"Sugar is the enemy. It spikes insulin and causes inflammation." — Dr. Pradip Jamnadas',
        '"If you\'re addicted to chocolate, use 100% dark chocolate." — Dr. Pradip Jamnadas',
        '"Processed sugar spikes insulin and drives inflammation." — Dr. Pradip Jamnadas'
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
        "Ate out — that's life! Home cooking gives you more control next time.",
        "Restaurant meals are part of living. Focus on what you can control.",
        "Dining out logged. Next meal at home is a chance to nourish yourself.",
        // Dr. Jason Fung quotes
        '"Real foods have no labels." — Dr. Jason Fung',
        '"Eat real food. Give your body time." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"Home cooking gives you full control over ingredients." — Dr. Pradip Jamnadas'
    ],
    toofast: [
        "Ate quickly? Your body absorbs more when you slow down.",
        "Fast eating logged. Try chewing more next time — it really helps digestion.",
        "Slowing down lets your body signal when it's full. Something to try next meal.",
        // Dr. Jason Fung quotes
        '"Eat real food. Give your body time." — Dr. Jason Fung',
        // Dr. Pradip Jamnadas quotes
        '"Learn to live in the moment. Slow down." — Dr. Pradip Jamnadas'
    ],
    junkfood: [
        "Processed food logged. No judgment — awareness is the first step.",
        "Noted! Next meal is a fresh opportunity to choose whole foods.",
        "It happens. What matters is your overall pattern, not one meal.",
        // Dr. Jason Fung quotes
        "\"Eat real food. That's the foundation.\" — Dr. Jason Fung",
        // Dr. Pradip Jamnadas quotes
        '"Focus on whole foods. Your body knows what to do with them." — Dr. Pradip Jamnadas'
    ],
    bloated: [
        "Feeling bloated? That's your body giving you feedback. Noted for next time.",
        "Bloating logged. Smaller portions or slower eating can help.",
        "Your gut is communicating. This info helps you learn what works for your body.",
        // Tips
        "Bloating can come from eating too much or too fast. Gentle walks can help.",
        "Try smaller portions and more chewing next time — it makes a real difference.",
        '"Your gut is your second brain. Listen to it." — Dr. Pradip Jamnadas'
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
    updateHeartPoints();

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

    // Update Slayer damage with eating quality effect
    updateMonsterBattleUI();
    showEatingQualityDragonEffect(type);
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
        updateHeartPoints();
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
    updateHeartPoints();

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
        updateHeartPoints();
    }
}

function updateSleepPowerupDisplay() {
    const stackEl = document.getElementById('sleep-powerup-stack');
    const statsEl = document.getElementById('sleep-powerup-stats');

    if (!stackEl) return;

    const powerups = Array.isArray(state.sleepPowerups) ? state.sleepPowerups : [];

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

    const powerups = Array.isArray(state.eatingPowerups) ? state.eatingPowerups : [];

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

    const powerups = Array.isArray(state.eatingPowerups) ? state.eatingPowerups : [];

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
        message = "Some choices lowered your score. Try more whole foods next meal.";
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

    const powerups = Array.isArray(state.currentFast?.powerups) ? state.currentFast.powerups : [];

    if (powerups.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        if (statsEl) statsEl.classList.add('hidden');
        if (exerciseGuideEl) exerciseGuideEl.classList.add('hidden');
        stackEl.innerHTML = '<span id="powerup-empty" class="text-xs italic" style="color: var(--dark-text-muted);">Your powerups will appear here...</span>';
        return;
    }

    // Count each type
    const counts = { water: 0, hotwater: 0, coffee: 0, tea: 0, exercise: 0, hanging: 0, grip: 0, walk: 0, doctorwin: 0, autophagy: 0 };
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
    const autophagyCountEl = document.getElementById('autophagy-count');
    if (autophagyCountEl) autophagyCountEl.textContent = counts.autophagy;
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
        state.skills = { water: 0, hotwater: 0, coffee: 0, tea: 0, exercise: 0, hanging: 0, grip: 0, walk: 0, doctorwin: 0, flatstomach: 0, autophagy: 0, broth: 0, protein: 0, fiber: 0, homecooked: 0, sloweating: 0, chocolate: 0, mealwalk: 0, sleep: 0 };
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
    let sanitizedAmount = sanitizeNumber(amount, 0, 10000, 0);
    if (sanitizedAmount <= 0) return 0;

    // Apply equipped item skill XP bonus
    const itemBonuses = getEquippedItemBonuses();
    if (itemBonuses.skillXPBonus && itemBonuses.skillXPBonus[skillType]) {
        sanitizedAmount += itemBonuses.skillXPBonus[skillType];
    }

    const oldLevel = levelFromXP(state.skills[skillType] || 0);
    state.skills[skillType] = (state.skills[skillType] || 0) + sanitizedAmount;
    const newLevel = levelFromXP(state.skills[skillType]);

    saveState();
    updateSkills();

    // Check for level up!
    if (newLevel > oldLevel) {
        showLevelUp(skillType, newLevel);
    }

    // Check for item unlocks after XP gain
    checkAllItemUnlocks();

    return sanitizedAmount;
}

// Show level up celebration
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
        autophagy: 'Autophagy',
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
        autophagy: '<span class="px-icon px-icon-xl px-autophagy"></span>',
        broth: '<span class="px-icon px-icon-xl px-potion"></span>',
        protein: '<span class="px-icon px-icon-xl px-meat"></span>',
        fiber: '<span class="px-icon px-icon-xl px-leaf"></span>',
        homecooked: '<span class="px-icon px-icon-xl px-house"></span>',
        sloweating: '<span class="px-icon px-icon-xl px-glass"></span>',
        chocolate: '<span class="px-icon px-icon-xl px-chocolate"></span>',
        mealwalk: '<span class="px-icon px-icon-xl px-walk"></span>',
        sleep: '<span class="px-icon px-icon-xl px-moon"></span>'
    };

    // Show the level up modal
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
            top: calc(100px + env(safe-area-inset-top, 0px));
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
        state.skills = { water: 0, coffee: 0, tea: 0, exercise: 0, hanging: 0, grip: 0, walk: 0, autophagy: 0, broth: 0, protein: 0, fiber: 0, homecooked: 0, sloweating: 0, chocolate: 0, mealwalk: 0, sleep: 0 };
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
// Export user-facing CSV spreadsheet of fasting & sleep history
async function exportCSV() {
    const timestamp = new Date().toISOString().split('T')[0];
    const lines = [];

    // Fasting history sheet
    lines.push('FASTING HISTORY');
    lines.push('Date,Start Time,End Time,Duration (hrs),Goal (hrs),Completed,Powerups');
    const fastHistory = Array.isArray(state.fastingHistory) ? state.fastingHistory : [];
    for (const fast of fastHistory) {
        const start = fast.startTime ? new Date(fast.startTime) : null;
        const end = fast.endTime ? new Date(fast.endTime) : null;
        const date = start ? start.toLocaleDateString() : '';
        const startStr = start ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const endStr = end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const duration = fast.duration ? (fast.duration / 3600000).toFixed(1) : '';
        const goal = fast.goalHours || '';
        const completed = fast.goalAchieved ? 'Yes' : 'No';
        const powerups = Array.isArray(fast.powerups) ? fast.powerups.map(p => p.type || p).join('; ') : '';
        lines.push(`${date},${startStr},${endStr},${duration},${goal},${completed},"${powerups}"`);
    }

    lines.push('');

    // Sleep history sheet
    lines.push('SLEEP HISTORY');
    lines.push('Date,Start Time,End Time,Duration (hrs),Goal (hrs),Completed');
    const sleepHistory = Array.isArray(state.sleepHistory) ? state.sleepHistory : [];
    for (const sleep of sleepHistory) {
        const start = sleep.startTime ? new Date(sleep.startTime) : null;
        const end = sleep.endTime ? new Date(sleep.endTime) : null;
        const date = start ? start.toLocaleDateString() : '';
        const startStr = start ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const endStr = end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const duration = sleep.duration ? (sleep.duration / 3600000).toFixed(1) : '';
        const goal = sleep.goalHours || '';
        const completed = sleep.goalAchieved ? 'Yes' : 'No';
        lines.push(`${date},${startStr},${endStr},${duration},${goal},${completed}`);
    }

    const csvContent = lines.join('\n');
    const filename = `sleep-suivour-${timestamp}.csv`;

    await shareOrDownloadFile(csvContent, filename, 'text/csv');

    showAchievementToast(
        '<span class="px-icon px-check"></span>',
        'Data Exported!',
        'Your fasting & sleep history is ready.',
        'success'
    );
}

// Export full JSON backup (for restore purposes)
async function exportBackup() {
    const dataStr = JSON.stringify(state, null, 2);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `sleep-suivour-backup-${timestamp}.json`;

    await shareOrDownloadFile(dataStr, filename, 'application/json');

    showAchievementToast(
        '<span class="px-icon px-check"></span>',
        'Backup Created!',
        'Save this file somewhere safe to restore your data later.',
        'success'
    );
}

// Share via native share sheet (iOS) or download (web)
async function shareOrDownloadFile(content, filename, mimeType) {
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

    if (isNative) {
        try {
            const Filesystem = window.Capacitor.Plugins.Filesystem;
            const Share = window.Capacitor.Plugins.Share;

            // Write to temp file
            const result = await Filesystem.writeFile({
                path: filename,
                data: btoa(unescape(encodeURIComponent(content))),
                directory: 'CACHE'
            });

            // Open share sheet
            await Share.share({
                title: filename,
                url: result.uri,
            });
        } catch (err) {
            // User cancelled share sheet — not an error
            if (err.message && err.message.includes('cancel')) return;
            console.error('Share failed:', err);
            showAchievementToast('<span class="px-icon px-warning"></span>', 'Export Failed', err.message || 'Could not share file.', 'warning');
        }
    } else {
        // Web fallback: trigger browser download
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
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
                importedData.skills = { water: 0, coffee: 0, tea: 0, exercise: 0, hanging: 0, grip: 0, walk: 0, autophagy: 0, broth: 0, protein: 0, fiber: 0, homecooked: 0, sloweating: 0, chocolate: 0, mealwalk: 0, sleep: 0 };
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
        state.skills = { water: 0, coffee: 0, tea: 0, exercise: 0, hanging: 0, grip: 0, walk: 0, autophagy: 0, broth: 0, protein: 0, fiber: 0, homecooked: 0, sloweating: 0, chocolate: 0, mealwalk: 0, sleep: 0 };
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
    if (!state.skills) state.skills = { water: 0, coffee: 0, tea: 0, exercise: 0, hanging: 0, grip: 0, walk: 0, autophagy: 0, broth: 0, protein: 0, fiber: 0, homecooked: 0, sloweating: 0, chocolate: 0, mealwalk: 0, sleep: 0 };
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
            } else if (event === 'connection-change') {
                // When connection is restored, push local state to cloud
                // This ensures offline changes (powerups, fasts, etc.) get synced
                // Delay to let the remote-update merge complete first (Firebase fires
                // .info/connected before data listeners, so we wait for merge)
                if (data.connected && initialSyncComplete) {
                    setTimeout(() => {
                        if (!isMergingRemoteData) {
                            firebaseSync.syncToCloud(state);
                            updateLeaderboardEntry();
                        }
                    }, 3000);
                }
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
                    // Cleanup forum listeners on sign out
                    cleanupForumListeners();
                    // Update forum auth UI immediately (username already cleared)
                    updateForumAuthUI();
                }
                // Note: For sign-in, updateForumAuthUI() is called inside
                // checkUsernameAfterSignIn() AFTER username is loaded (async)
            }
        });

        // If user is not signed in, allow local saves immediately
        if (!firebaseSync.isAuthenticated()) {
            initialSyncComplete = true;
        } else {
            // User has a persisted auth session from a previous app launch.
            // The 'auth-change' event may have already fired during initialize()
            // BEFORE this listener was registered, so checkUsernameAfterSignIn()
            // was never called. Run it now to ensure username is loaded.
            checkUsernameAfterSignIn();
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
                showHeartHealth: remoteState.settings.showHeartHealth !== undefined ? remoteState.settings.showHeartHealth : true,
                showBreakingFastGuide: remoteState.settings.showBreakingFastGuide !== undefined ? remoteState.settings.showBreakingFastGuide : true,
                showExerciseGuide: remoteState.settings.showExerciseGuide !== undefined ? remoteState.settings.showExerciseGuide : true,
                showEatingGuide: remoteState.settings.showEatingGuide !== undefined ? remoteState.settings.showEatingGuide : true,
                showSleepGuide: remoteState.settings.showSleepGuide !== undefined ? remoteState.settings.showSleepGuide : true,
                showMealSleepQuality: remoteState.settings.showMealSleepQuality !== undefined ? remoteState.settings.showMealSleepQuality : true,
                showHungerTracker: remoteState.settings.showHungerTracker !== undefined ? remoteState.settings.showHungerTracker : true,
                showTrends: remoteState.settings.showTrends !== undefined ? remoteState.settings.showTrends : true,
                // Biological profile settings
                biologicalSex: remoteState.settings.biologicalSex !== undefined ? remoteState.settings.biologicalSex : null,
                // Ghost color cosmetic
                suiGhostColor: remoteState.settings.suiGhostColor || 'green',
                // Monster trophy skins
                monsterSkins: (remoteState.settings.monsterSkins && typeof remoteState.settings.monsterSkins === 'object') ? remoteState.settings.monsterSkins : {},
                // Layout preference
                layout: (remoteState.settings.layout === 'legacy' || remoteState.settings.layout === 'retro') ? remoteState.settings.layout : 'legacy',
                // Safety onboarding settings (must sync so returning users aren't re-onboarded)
                ageConfirmed: remoteState.settings.ageConfirmed !== undefined ? remoteState.settings.ageConfirmed : false,
                ageBracket: remoteState.settings.ageBracket !== undefined ? remoteState.settings.ageBracket : null,
                dismissedFastingWarning16: remoteState.settings.dismissedFastingWarning16 !== undefined ? remoteState.settings.dismissedFastingWarning16 : false,
                eatingQualityEnabled: remoteState.settings.eatingQualityEnabled !== undefined ? remoteState.settings.eatingQualityEnabled : true,
                hasSeenEDDisclaimer: remoteState.settings.hasSeenEDDisclaimer !== undefined ? remoteState.settings.hasSeenEDDisclaimer : false,
                // HealthKit connection state (device-local — authorization is per-device, not synced from remote)
                // Prefer local value: if this device has connected HealthKit, keep it true regardless of remote.
                // Fall back to remote only if local is unset (e.g., fresh device that never connected).
                healthKitConnected: state.settings?.healthKitConnected || (remoteState.settings.healthKitConnected !== undefined ? remoteState.settings.healthKitConnected : false)
            };
        }

        // Sync menstrual cycle data
        if (remoteState.menstrualCycle) {
            state.menstrualCycle = {
                lastPeriodStart: remoteState.menstrualCycle.lastPeriodStart || null,
                cycleLength: remoteState.menstrualCycle.cycleLength || 28,
                trackingEnabled: remoteState.menstrualCycle.trackingEnabled || false
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

        // Merge blocked users (union of local + remote, deduplicated by uid)
        if (Array.isArray(remoteState.blockedUsers)) {
            if (!Array.isArray(state.blockedUsers)) state.blockedUsers = [];
            const existingUids = new Set(state.blockedUsers.map(b => b.uid));
            const newBlocked = remoteState.blockedUsers.filter(b => b && b.uid && !existingUids.has(b.uid));
            state.blockedUsers = [...state.blockedUsers, ...newBlocked];
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
        // If both have active fasts with same startTime, merge powerups from both devices
        // If different startTimes, keep the most recent one
        if (remoteState.currentFast && remoteState.currentFast.isActive) {
            if (!state.currentFast || !state.currentFast.isActive) {
                // Remote has active fast, local doesn't - use remote
                state.currentFast = { ...remoteState.currentFast };
                if (timerInterval) clearInterval(timerInterval);
                startTimer();
            } else {
                const remoteStart = remoteState.currentFast.startTime || 0;
                const localStart = state.currentFast.startTime || 0;
                if (remoteStart === localStart) {
                    // Same fast on both devices — merge powerups from both
                    const localPowerups = Array.isArray(state.currentFast.powerups) ? state.currentFast.powerups : [];
                    const remotePowerups = Array.isArray(remoteState.currentFast.powerups) ? remoteState.currentFast.powerups : [];
                    const existingTimes = new Set(localPowerups.map(p => `${p.type}-${p.time}`));
                    const newPowerups = remotePowerups.filter(p => !existingTimes.has(`${p.type}-${p.time}`));
                    state.currentFast.powerups = [...localPowerups, ...newPowerups].sort((a, b) => a.time - b.time);
                    // Also sync goalHours if remote changed it
                    if (remoteState.currentFast.goalHours) {
                        state.currentFast.goalHours = remoteState.currentFast.goalHours;
                    }
                } else if (remoteStart > localStart) {
                    // Different fasts — remote is newer, use it
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
                updateHeartPoints();
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
                const remoteStart = remoteState.currentSleep.startTime || 0;
                const localStart = state.currentSleep.startTime || 0;
                if (remoteStart === localStart) {
                    // Same sleep on both devices — sync goalHours
                    if (remoteState.currentSleep.goalHours) {
                        state.currentSleep.goalHours = remoteState.currentSleep.goalHours;
                    }
                } else if (remoteStart > localStart) {
                    // Different sleeps — remote is newer, use it
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
            if (!Array.isArray(state.livingLife.history)) {
                state.livingLife.history = [];
            }

            // Merge Living Life history (combine both, remove duplicates by activatedAt)
            if (Array.isArray(remoteState.livingLife.history) && remoteState.livingLife.history.length > 0) {
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

        // Merge collection data (Precious Loot items) - prevents re-unlocking items after clearing browser data
        if (remoteState.collection) {
            if (!state.collection) {
                state.collection = { unlockedItems: [], equippedItem: null, newItems: [] };
            }

            // Merge unlocked items - keep union of local and remote
            if (Array.isArray(remoteState.collection.unlockedItems) && remoteState.collection.unlockedItems.length > 0) {
                if (!Array.isArray(state.collection.unlockedItems)) state.collection.unlockedItems = [];
                const existingItems = new Set(state.collection.unlockedItems);
                remoteState.collection.unlockedItems.forEach(itemId => {
                    if (!existingItems.has(itemId)) {
                        state.collection.unlockedItems.push(itemId);
                    }
                });
            }

            // Sync equipped item - use remote if local has nothing equipped
            if (remoteState.collection.equippedItem && !state.collection.equippedItem) {
                state.collection.equippedItem = remoteState.collection.equippedItem;
            }

            // Merge unlock timestamps (keep earliest timestamp per item)
            if (remoteState.collection.unlockTimestamps && typeof remoteState.collection.unlockTimestamps === 'object') {
                if (!state.collection.unlockTimestamps) state.collection.unlockTimestamps = {};
                for (const [itemId, ts] of Object.entries(remoteState.collection.unlockTimestamps)) {
                    if (typeof ts === 'number') {
                        const local = state.collection.unlockTimestamps[itemId];
                        // Keep earliest timestamp (first device to unlock)
                        if (!local || ts < local) {
                            state.collection.unlockTimestamps[itemId] = ts;
                        }
                    }
                }
            }

            // Clear newItems for items that are already unlocked remotely (user already saw them)
            // This prevents showing "new item unlocked" toasts for items synced from cloud
            if (Array.isArray(state.collection.newItems)) {
                state.collection.newItems = state.collection.newItems.filter(
                    itemId => !remoteState.collection.unlockedItems?.includes(itemId)
                );
            }
        }

        // Merge premium state from cloud
        // On native iOS: SKIP cloud premium data — StoreKit is the sole source of truth.
        // checkSubscriptionStatus() runs after merge and sets the correct state from StoreKit.
        // On web: trust cloud premium data (web can't verify via StoreKit).
        if (remoteState.premium && typeof remoteState.premium === 'object' && !isCapacitorNative()) {
            if (!state.premium || typeof state.premium !== 'object') {
                state.premium = { isActive: false, expiresAt: null, productId: null, originalPurchaseDate: null, source: null };
            }
            const remoteExpiry = remoteState.premium.expiresAt || 0;
            const localExpiry = state.premium.expiresAt || 0;
            // Keep the subscription with the later expiry date (most recently renewed)
            if (remoteExpiry > localExpiry) {
                state.premium.isActive = Boolean(remoteState.premium.isActive);
                state.premium.expiresAt = remoteState.premium.expiresAt;
                state.premium.productId = remoteState.premium.productId || state.premium.productId;
                state.premium.originalPurchaseDate = remoteState.premium.originalPurchaseDate || state.premium.originalPurchaseDate;
                state.premium.source = remoteState.premium.source || state.premium.source;
            }
        }

        // Update Living Life UI after merge
        updateLivingLifeUI();
        updatePowerupStates();

        // Save merged state locally
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
        localStorage.setItem('last-local-update', Date.now().toString());

        // Update UI
        updateUI();
        updatePowerupDisplay();  // Refresh powerup counts after merge
        updateSleepUI();
        renderHistory();
        renderSleepHistory();
        renderStats();
        renderSleepStats();
        updateMonsterBattleUI();  // Sync damage rate/DPS display

        // Re-apply settings to update checkboxes and visibility
        initSettings();
        applySettings();

        // Update collection UI and check for unlocks
        // Note: checkAllItemUnlocks won't show toasts for items already in unlockedItems (synced from cloud)
        updateCollectionUI();
        updateCollectionNewDot();
        updateMainEquipmentSlot();
        checkAllItemUnlocks();
        updatePremiumUI();

        // On native iOS, verify premium state against StoreKit after cloud merge.
        // StoreKit is the source of truth — cloud data is ignored for premium on native.
        checkSubscriptionStatus();

        // Invalidate all performance caches (remote data may have changed history)
        invalidateCache('all');

        // Clear merge flag
        isMergingRemoteData = false;
    }
}

// Mandatory sign-in gate — blocks app until user authenticates
function showSignInGate() {
    return new Promise((resolve) => {
        const gate = document.getElementById('signin-gate');
        if (!gate) { resolve(); return; }
        gate.classList.remove('hidden');

        const googleBtn = document.getElementById('gate-google-signin');
        const appleBtn = document.getElementById('gate-apple-signin');

        // Only show Apple button on native iOS
        if (appleBtn && !isCapacitorNative()) {
            appleBtn.classList.add('hidden');
        }

        async function trySignIn(signInFn) {
            try {
                const user = await signInFn();
                if (user) {
                    gate.classList.add('hidden');
                    googleBtn?.removeEventListener('click', onGoogle);
                    appleBtn?.removeEventListener('click', onApple);
                    resolve();
                }
            } catch (e) {
                // Sign-in failed — gate stays visible, user can retry
            }
        }

        function onGoogle() { trySignIn(() => firebaseSync.signInWithGoogle()); }
        function onApple() { trySignIn(() => firebaseSync.signInWithApple()); }

        googleBtn?.addEventListener('click', onGoogle);
        appleBtn?.addEventListener('click', onApple);
    });
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
        // Not signed in — switch to Settings tab and scroll to Cloud Sync sign-in section
        switchTab('settings');
        setTimeout(() => {
            const target = document.getElementById('firebase-ready') || document.getElementById('cloud-sync-info');
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
    }
}

async function handleGoogleSignIn() {
    try {
        const user = await firebaseSync.signInWithGoogle();
        if (user) {
            await checkUsernameAfterSignIn();
        }
    } catch (error) {
        console.error('Google sign in failed:', error);
    }
}

async function handleAppleSignIn() {
    try {
        const user = await firebaseSync.signInWithApple();
        if (user) {
            await checkUsernameAfterSignIn();
        }
    } catch (error) {
        console.error('Apple sign in failed:', error);
    }
}

// Shared function: clears local state, stops timers, resets UI
// Used by handleSignOut, handleDeleteAllData, handleDeleteAccount
function clearLocalStateAndUI() {
    // Clear local storage
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
            showHeartHealth: true,
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

    // Stop any active timers and intervals
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (sleepTimerInterval) {
        clearInterval(sleepTimerInterval);
        sleepTimerInterval = null;
    }
    if (heartPointsInterval) {
        clearInterval(heartPointsInterval);
        heartPointsInterval = null;
    }
    if (livingLifeInterval) {
        clearInterval(livingLifeInterval);
        livingLifeInterval = null;
    }

    // Clear username
    currentUsername = null;
    const usernameEl = document.getElementById('user-username');
    if (usernameEl) usernameEl.textContent = '';

    // Reset global warning counters
    earlySleepWarnings = 0;
    earlyWakeWarnings = 0;
    goalAchievedNotified = false;
    autophagyActivated = false;
    sleepGoalAchievedNotified = false;
    guidesShown = { breaking: false, extended24: false, extended36: false };
    exerciseWarnings = 0;

    // Update UI to reflect cleared state
    updateUI();
    updateSleepUI();
    renderHistory();
    renderSleepHistory();
    renderStats();
    renderSleepStats();
    initSettings();
    applySettings();
}

async function handleSignOut() {
    if (!firebaseSync) return;

    const confirmed = await showConfirmModal('Are you sure you want to sign out? Your data will be cleared from this device. Sign back in to restore it.', 'Sign Out');
    if (confirmed) {
        try {
            await firebaseSync.signOut();
            clearLocalStateAndUI();

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
// DELETE ALL DATA / DELETE ACCOUNT
// ==========================================

// Core deletion function: removes ALL user data from Firebase
// Called by both handleDeleteAllData and handleDeleteAccount
async function deleteAllUserData(uid, username) {
    const deletePromises = [];

    // 1. Delete core user data
    deletePromises.push(database.ref(`users/${uid}/fastingData`).remove());
    deletePromises.push(database.ref(`users/${uid}/profile`).remove());

    // 2. Delete all-time leaderboard entry
    deletePromises.push(database.ref(`leaderboard/alltime/${uid}`).remove());

    // 3. Delete daily leaderboard entries (last 60 days)
    const now = new Date();
    for (let i = 0; i < 60; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
        deletePromises.push(database.ref(`leaderboard/daily/${dateStr}/${uid}`).remove());
    }

    // 4. Delete username reservation
    if (username) {
        deletePromises.push(database.ref(`usernames/${username.toLowerCase()}`).remove());
    }

    // 5. Find and delete all user's forum posts + their likes
    try {
        const userPostsSnapshot = await database.ref(`forum/userPosts/${uid}`).once('value');
        const userPosts = userPostsSnapshot.val();
        if (userPosts && typeof userPosts === 'object') {
            const postIds = Object.keys(userPosts);
            for (const postId of postIds) {
                deletePromises.push(database.ref(`forum/posts/${postId}`).remove());
                deletePromises.push(database.ref(`forum/likes/${postId}`).remove());
            }
        }
    } catch (e) {
        console.warn('Could not enumerate user forum posts for deletion:', e);
    }

    // 6. Delete user's forum post index
    deletePromises.push(database.ref(`forum/userPosts/${uid}`).remove());

    // 7. Delete rate limiting data
    deletePromises.push(database.ref(`forum/rateLimit/${uid}`).remove());

    // Execute all deletions in parallel
    await Promise.all(deletePromises);
}

// Shows a type-to-confirm modal. Returns true if user typed the required text.
function showTypeToConfirmModal(message, requiredText, title = 'Confirm Deletion') {
    return new Promise((resolve) => {
        const modal = document.getElementById('type-confirm-modal');
        const titleEl = document.getElementById('type-confirm-modal-title');
        const messageEl = document.getElementById('type-confirm-modal-message');
        const inputEl = document.getElementById('type-confirm-input');
        const hintEl = document.getElementById('type-confirm-hint');
        const confirmBtn = document.getElementById('type-confirm-modal-confirm');
        const cancelBtn = document.getElementById('type-confirm-modal-cancel');

        if (!modal || !inputEl || !confirmBtn || !cancelBtn) {
            resolve(false);
            return;
        }

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        if (hintEl) hintEl.textContent = `Type "${requiredText}" to confirm`;
        inputEl.value = '';
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';

        modal.classList.remove('hidden');
        inputEl.focus();

        function cleanup() {
            modal.classList.add('hidden');
            inputEl.removeEventListener('input', onInput);
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
        }

        function onInput() {
            const matches = inputEl.value.trim().toLowerCase() === requiredText.toLowerCase();
            confirmBtn.disabled = !matches;
            confirmBtn.style.opacity = matches ? '1' : '0.5';
        }

        function onConfirm() {
            cleanup();
            resolve(true);
        }

        function onCancel() {
            cleanup();
            resolve(false);
        }

        inputEl.addEventListener('input', onInput);
        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
    });
}

async function handleDeleteAllData() {
    if (!firebaseSync || !firebaseSync.isAuthenticated()) return;

    const confirmed = await showConfirmModal(
        'This will permanently delete ALL your data: fasting history, sleep history, scores, forum posts, and leaderboard entries. Your account will remain but all data will be gone. This cannot be undone.',
        'Delete All Data'
    );
    if (!confirmed) return;

    const typeConfirmed = await showTypeToConfirmModal(
        'To confirm, type DELETE below.',
        'DELETE',
        'Final Confirmation'
    );
    if (!typeConfirmed) return;

    try {
        const uid = firebaseSync.currentUser.uid;
        const username = currentUsername;

        showAchievementToast(
            '<span class="px-icon px-warning"></span>',
            'Deleting Data...',
            'Please wait while we remove your data.',
            'warning'
        );

        await deleteAllUserData(uid, username);
        clearLocalStateAndUI();

        showAchievementToast(
            '<span class="px-icon px-check"></span>',
            'Data Deleted',
            'All your data has been permanently deleted.',
            'success'
        );
    } catch (error) {
        console.error('Delete all data failed:', error);
        showAchievementToast(
            '<span class="px-icon px-danger"></span>',
            'Deletion Failed',
            error.message,
            'danger'
        );
    }
}

async function handleDeleteAccount() {
    if (!firebaseSync || !firebaseSync.isAuthenticated()) return;

    const confirmed = await showConfirmModal(
        'This will permanently DELETE YOUR ACCOUNT and all associated data. You will be signed out and this action cannot be reversed.',
        'Delete Account'
    );
    if (!confirmed) return;

    const username = currentUsername || 'DELETE';
    const typeConfirmed = await showTypeToConfirmModal(
        `To confirm account deletion, type your username below.`,
        username,
        'Delete Account Permanently'
    );
    if (!typeConfirmed) return;

    try {
        const uid = firebaseSync.currentUser.uid;

        showAchievementToast(
            '<span class="px-icon px-warning"></span>',
            'Deleting Account...',
            'Please wait while we remove your account and data.',
            'warning'
        );

        // Delete all user data from Firebase first (while still authenticated)
        await deleteAllUserData(uid, currentUsername);

        // Delete the Firebase Auth account
        const user = auth.currentUser;
        if (user) {
            await user.delete();
        }

        clearLocalStateAndUI();

        showAchievementToast(
            '<span class="px-icon px-check"></span>',
            'Account Deleted',
            'Your account and all data have been permanently deleted.',
            'success'
        );
    } catch (error) {
        console.error('Delete account failed:', error);
        if (error.code === 'auth/requires-recent-login') {
            showAchievementToast(
                '<span class="px-icon px-warning"></span>',
                'Re-authentication Required',
                'For security, please sign out, sign back in, and try again.',
                'warning'
            );
        } else {
            showAchievementToast(
                '<span class="px-icon px-danger"></span>',
                'Account Deletion Failed',
                error.message,
                'danger'
            );
        }
    }
}

// ==========================================
// HEART POINTS STAT
// ==========================================
// Sleep: 60% (max 60 points)
// Fasting: 20% (max 20 points)
// Eating: 10% (max 10 points)
// Powerups: 10% (max 10 points)

function updateHeartPoints() {
    const sleepScore = calculateSleepScore();
    const fastingScore = calculateFastingScore();
    const eatingScore = calculateEatingScore();
    const powerupScore = calculatePowerupScore();

    const totalScore = Math.min(100, Math.round(sleepScore + fastingScore + eatingScore + powerupScore));

    // Update UI
    const valueEl = document.getElementById('heart-points-value');
    const fillEl = document.getElementById('heart-points-fill');
    const sleepEl = document.getElementById('hp-sleep');
    const fastingEl = document.getElementById('hp-fasting');
    const eatingEl = document.getElementById('hp-eating');
    const powerupsEl = document.getElementById('hp-powerups');
    const messageEl = document.getElementById('heart-points-message');

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
        messageEl.textContent = getHeartPointsMessage(totalScore, sleepScore, fastingScore, eatingScore, powerupScore);
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
    const eatingPowerups = Array.isArray(state.eatingPowerups) ? state.eatingPowerups : [];
    const badEating = eatingPowerups.filter(p => ['eatenout', 'toofast', 'junkfood', 'bloated'].includes(p.type));
    bloatScore += badEating.length * 15;

    // Good eating reduces bloat
    const goodEating = eatingPowerups.filter(p => ['broth', 'fiber', 'sloweating', 'mealwalk'].includes(p.type));
    bloatScore -= goodEating.length * 10;

    // Sleep factors
    const history = Array.isArray(state.sleepHistory) ? state.sleepHistory : [];
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
        const currentPowerups = Array.isArray(state.currentFast?.powerups) ? state.currentFast.powerups : [];
        const flatStomach = currentPowerups.filter(p => p.type === 'flatstomach');
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
    const history = Array.isArray(state.sleepHistory) ? state.sleepHistory : [];
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
    const eatingPowerups = Array.isArray(state.eatingPowerups) ? state.eatingPowerups : [];
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
    const history = Array.isArray(state.sleepHistory) ? state.sleepHistory : [];
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
    if (state.currentFast?.isActive) {
        const powerups = Array.isArray(state.currentFast.powerups) ? state.currentFast.powerups : [];
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
    const eatingPowerups = Array.isArray(state.eatingPowerups) ? state.eatingPowerups : [];
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

    const history = Array.isArray(state.sleepHistory) ? state.sleepHistory : [];
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
    const history = Array.isArray(state.fastingHistory) ? state.fastingHistory : [];
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

    const powerups = Array.isArray(state.eatingPowerups) ? state.eatingPowerups : [];
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
    const powerups = Array.isArray(state.currentFast?.powerups) ? state.currentFast.powerups : [];

    if (powerups.length === 0) {
        // Check if there were powerups in most recent completed fast
        const history = Array.isArray(state.fastingHistory) ? state.fastingHistory : [];
        if (history.length > 0 && history[0].powerups) {
            const lastPowerups = history[0].powerups;
            const hoursSinceFast = (Date.now() - history[0].endTime) / 1000 / 60 / 60;

            if (hoursSinceFast <= 12) {
                // Give credit for recent powerups (historical format is object with counts)
                if (typeof lastPowerups === 'object' && !Array.isArray(lastPowerups)) {
                    if (lastPowerups.water > 0) score += 1;
                    if (lastPowerups.coffee > 0) score += 0.5;
                    if (lastPowerups.tea > 0) score += 0.5;
                    if (lastPowerups.exercise > 0) score += 2;
                    if (lastPowerups.hanging > 0) score += 2;
                    if (lastPowerups.grip > 0) score += 1;
                    if (lastPowerups.walk > 0) score += 3;
                }

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

function getHeartPointsMessage(total, sleep, fasting, eating, powerups) {
    // Fun RPG-inspired messages
    if (total >= 95) {
        return " MAXED OUT! You are a Heart Points LEGEND!";
    } else if (total >= 80) {
        return " Outstanding! Your body is a temple!";
    } else if (total >= 60) {
        return " Solid stats! Keep it up — you're doing great!";
    } else if (total >= 40) {
        return " You're on the path! More sleep and fasting will boost your score!";
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
// Health disclaimer — shown once on first launch per device
function showHealthDisclaimerIfNeeded() {
    if (localStorage.getItem('health-disclaimer-accepted')) return;

    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const messageEl = document.getElementById('confirm-modal-message');
    const confirmBtn = document.getElementById('confirm-modal-confirm');
    const cancelBtn = document.getElementById('confirm-modal-cancel');

    if (!modal || !confirmBtn || !cancelBtn) {
        // Fallback: just mark as seen
        localStorage.setItem('health-disclaimer-accepted', Date.now().toString());
        return;
    }

    if (titleEl) titleEl.textContent = 'Health Notice';
    if (messageEl) messageEl.textContent = 'Sleep Suivour is a wellness companion, not a medical device. The fasting timer, sleep tracking, and Heart Points are tools to help you build healthy habits — they are not substitutes for professional medical advice. Please consult your physician before starting any fasting regimen, especially if you have diabetes, an eating disorder, or are pregnant.';

    modal.classList.remove('hidden');

    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newConfirmBtn.textContent = 'I Understand';
    newCancelBtn.classList.add('hidden');

    newConfirmBtn.addEventListener('click', () => {
        localStorage.setItem('health-disclaimer-accepted', Date.now().toString());
        modal.classList.add('hidden');
        newCancelBtn.classList.remove('hidden');
    });
}

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
    const lbTabLoot = document.getElementById('lb-tab-loot');
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

    if (lbTabLoot) {
        lbTabLoot.addEventListener('click', () => switchLeaderboardTab('loot'));
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

// Show username modal (mandatory — cannot be dismissed without setting a username)
function showUsernameModal() {
    const modal = document.getElementById('username-modal');
    const input = document.getElementById('username-input');

    if (modal) {
        modal.classList.remove('hidden');
        // Block backdrop clicks from dismissing the modal
        modal.onclick = (e) => {
            if (e.target === modal) {
                e.stopPropagation();
                // Shake the modal content to signal it's mandatory
                const content = modal.querySelector('.modal-content');
                if (content) {
                    content.style.animation = 'none';
                    content.offsetHeight; // trigger reflow
                    content.style.animation = 'shake 0.4s ease-in-out';
                }
            }
        };
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

// Hide username modal (only called after successful username submission)
function hideUsernameModal() {
    const modal = document.getElementById('username-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    hideUsernameBlockingOverlay();
}

// Sources database - credit where it's due!
// APPROVED SOURCES: Dr. Pradip Jamnadas, Dr. Jason Fung, Matthew Walker, Osho, Pavel Tsatsouline
const sourcesData = {
    greaseTheGroove: {
        title: 'Grease the Groove',
        sources: [
            { author: 'Pavel Tsatsouline', work: 'Power to the People' },
            { author: 'Pavel Tsatsouline', work: 'GTG Protocol (StrongFirst)' }
        ]
    },
    deadHang: {
        title: 'Dead Hang Benefits',
        sources: [
            { author: 'Pavel Tsatsouline', work: 'Strength Training Principles' },
            { author: 'Dr. Pradip Jamnadas, MD', work: 'Physical Health & Longevity' }
        ]
    },
    gripStrength: {
        title: 'Grip Strength & Longevity',
        sources: [
            { author: 'Pavel Tsatsouline', work: 'Strength Training (StrongFirst)' },
            { author: 'Dr. Pradip Jamnadas, MD', work: 'Metabolic Health Lectures' }
        ]
    },
    zone2Walking: {
        title: 'Movement & Metabolic Health',
        sources: [
            { author: 'Dr. Pradip Jamnadas, MD', work: 'Cardiovascular Health' },
            { author: 'Osho', work: 'Mindfulness in Movement' }
        ]
    },
    postMealWalking: {
        title: 'Post-Meal Walking & Blood Sugar',
        sources: [
            { author: 'Dr. Pradip Jamnadas, MD', work: 'Insulin & Blood Sugar Control' },
            { author: 'Dr. Jason Fung', work: 'The Obesity Code' }
        ]
    },
    fasting: {
        title: 'Intermittent Fasting & Autophagy',
        sources: [
            { author: 'Dr. Pradip Jamnadas, MD', work: 'Fasting For Survival Lecture' },
            { author: 'Dr. Jason Fung', work: 'The Complete Guide to Fasting' },
            { author: 'Osho', work: 'Fasting as Purification' }
        ]
    },
    breakingFast: {
        title: 'Breaking a Fast Safely',
        sources: [
            { author: 'Dr. Jason Fung', work: 'The Complete Guide to Fasting' },
            { author: 'Dr. Pradip Jamnadas, MD', work: 'How To Fast' }
        ]
    },
    sleepTiming: {
        title: 'Sleep Timing & Circadian Rhythm',
        sources: [
            { author: 'Matthew Walker, PhD', work: 'Why We Sleep' },
            { author: 'Matthew Walker, PhD', work: 'The Matt Walker Podcast' }
        ]
    },
    sleepFasting: {
        title: 'Fasting Before Sleep',
        sources: [
            { author: 'Dr. Jason Fung', work: 'Time-Restricted Eating' },
            { author: 'Matthew Walker, PhD', work: 'Sleep & Metabolism' }
        ]
    },
    visceralFat: {
        title: 'Visceral Fat & Health',
        sources: [
            { author: 'Dr. Pradip Jamnadas, MD', work: 'Metabolic Health Lectures' },
            { author: 'Dr. Jason Fung', work: 'The Obesity Code' }
        ]
    },
    insulinResistance: {
        title: 'Insulin Resistance',
        sources: [
            { author: 'Dr. Pradip Jamnadas, MD', work: 'Insulin Resistance Lectures' },
            { author: 'Dr. Jason Fung', work: 'The Diabetes Code' }
        ]
    },
    eatingGuide: {
        title: 'Mindful Eating & Digestion',
        sources: [
            { author: 'Osho', work: 'Mindful Eating Teachings' },
            { author: 'Dr. Jason Fung', work: 'Breaking Fast Protocols' }
        ]
    },
    boneBroth: {
        title: 'Bone Broth & Fasting Recovery',
        sources: [
            { author: 'Dr. Jason Fung', work: 'The Complete Guide to Fasting' },
            { author: 'Dr. Pradip Jamnadas, MD', work: 'How To Fast' }
        ]
    },
    highFiber: {
        title: 'Fiber & Post-Fast Constipation',
        sources: [
            { author: 'Dr. Jason Fung', work: 'Practical Fasting Tips' },
            { author: 'Dr. Pradip Jamnadas, MD', work: 'Plant-Based Nutrition' }
        ]
    },
    gutHealth: {
        title: 'Gut Health & Microbiome',
        sources: [
            { author: 'Dr. Pradip Jamnadas, MD', work: 'Metabolic Health & Gut' },
            { author: 'Dr. Jason Fung', work: 'Fasting & Digestive Health' }
        ]
    },
    antiInflammatory: {
        title: 'Anti-Inflammatory Nutrition',
        sources: [
            { author: 'Dr. Pradip Jamnadas, MD', work: 'Inflammation & Heart Disease' },
            { author: 'Dr. Jason Fung', work: 'The Obesity Code' }
        ]
    },
    heartFasting: {
        title: 'Fasting & Cardiovascular Health',
        sources: [
            { author: 'Dr. Pradip Jamnadas, MD', work: 'Why This Cardiologist Recommends Fasting' },
            { author: 'Dr. Pradip Jamnadas, MD', work: 'How To Fast — Orlando Cardiovascular Institute' }
        ]
    },
    heartEating: {
        title: 'Heart-Protective Nutrition',
        sources: [
            { author: 'Dr. Pradip Jamnadas, MD', work: 'Anti-Inflammatory Diet — Orlando Cardiovascular Institute' }
        ]
    },
    heartSleep: {
        title: 'Sleep & Cardiovascular Health',
        sources: [
            { author: 'Dr. Pradip Jamnadas, MD', work: 'Metabolic Health & Sleep' },
            { author: 'Dr. Pradip Jamnadas, MD', work: 'Cardiovascular Health Protocols' }
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
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
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

    // Create modal content — plain attribution (no links)
    let sourcesHtml = sourceData.sources.map(src => {
        let citation = `<strong>${escapeHtml(src.author)}</strong>`;
        if (src.work) citation += ` — "${escapeHtml(src.work)}"`;
        return `
            <div class="block p-3 rounded-lg mb-2"
               style="background: rgba(255,255,255,0.03); border: 1px solid var(--dark-border);">
                <p class="text-xs" style="color: var(--dark-text);">${citation}</p>
            </div>
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
            <p class="text-xs mb-4" style="color: var(--dark-text-muted);">Credit where it's due — inspired by these experts:</p>
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
    closeModalWithAnimation('guide-modal');
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

        // Update forum auth UI now that username is set
        updateForumAuthUI();
        if (state.currentTab === 'forum') {
            loadForumPosts();
            setupForumRealTimeListener();
        }
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
        // User needs to set username — mandatory, cannot use app without it
        updateUsernameDisplay(null);
        showUsernameModal();
        showUsernameBlockingOverlay();
    } else {
        currentUsername = username;
        // Display username in UI
        updateUsernameDisplay(username);
        hideUsernameBlockingOverlay();
        // Update leaderboard with current stats
        await updateLeaderboardEntry();
    }

    // Now that username is resolved, update forum auth UI
    // (must happen AFTER currentUsername is set, not before)
    updateForumAuthUI();

    // If user is on the forum tab, reload posts now that auth is ready
    if (state.currentTab === 'forum') {
        loadForumPosts();
        setupForumRealTimeListener();
    }
}

// Show a blocking overlay that prevents app interaction until username is set
// ========== Age Check & ED Disclaimer (Safety Onboarding) ==========

function checkAgeConfirmation() {
    if (state.settings?.ageConfirmed) return;
    showAgeCheckModal();
}

function showAgeCheckModal() {
    const modal = document.getElementById('age-check-modal');
    if (!modal) return;

    // Show blocking overlay (same pattern as username modal)
    let overlay = document.getElementById('age-blocking-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'age-blocking-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:40;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);';
        document.body.appendChild(overlay);
    }
    overlay.classList.remove('hidden');

    modal.classList.remove('hidden');

    // Block backdrop clicks (shake instead)
    modal.onclick = (e) => {
        if (e.target === modal) {
            e.stopPropagation();
            const content = modal.querySelector('.modal-content');
            if (content) {
                content.style.animation = 'none';
                content.offsetHeight;
                content.style.animation = 'shake 0.4s ease-in-out';
            }
        }
    };
}

function hideAgeCheckModal() {
    const modal = document.getElementById('age-check-modal');
    const overlay = document.getElementById('age-blocking-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
}

function handleAgeUnder13() {
    // Show the "too young" message inside the modal
    const msg = document.getElementById('age-under13-message');
    if (msg) msg.classList.remove('hidden');
    // Do NOT set ageConfirmed — app stays blocked
}

function handleAgeSelection(bracket) {
    if (!state.settings) state.settings = {};
    state.settings.ageBracket = bracket;
    state.settings.ageConfirmed = true;
    saveState();
    hideAgeCheckModal();

    // After age check, show ED disclaimer if not seen
    if (!state.settings.hasSeenEDDisclaimer) {
        showEDDisclaimerModal();
    }
}

function showEDDisclaimerModal() {
    const modal = document.getElementById('ed-disclaimer-modal');
    if (modal) modal.classList.remove('hidden');
}

function handleEDChoice(keepScoring) {
    if (!state.settings) state.settings = {};
    state.settings.eatingQualityEnabled = keepScoring;
    state.settings.hasSeenEDDisclaimer = true;
    saveState();

    const modal = document.getElementById('ed-disclaimer-modal');
    if (modal) modal.classList.add('hidden');

    // Update UI to reflect eating quality preference
    updateEatingQualityUI();

    if (!keepScoring) {
        showAchievementToast('<span class="px-icon px-heart"></span>', 'Eating Quality Disabled', 'You can re-enable this anytime in Settings.', 'info');
    }
}

function updateEatingQualityUI() {
    const disabled = state.settings?.eatingQualityEnabled === false;
    // Hide/show negative eating powerup buttons
    const negativeTypes = ['eating-junkfood', 'eating-toofast', 'eating-eatenout', 'eating-bloated'];
    negativeTypes.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.style.display = disabled ? 'none' : '';
    });
    // Also hide in modern layout
    const mNegativeTypes = ['m-eating-junkfood', 'm-eating-toofast', 'm-eating-eatenout', 'm-eating-bloated'];
    mNegativeTypes.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.style.display = disabled ? 'none' : '';
    });
}

function toggleEatingQualitySetting() {
    if (!state.settings) state.settings = {};
    state.settings.eatingQualityEnabled = !(state.settings.eatingQualityEnabled !== false);
    saveState();
    updateEatingQualityUI();
    updateEatingQualityToggleVisual();
}

function updateEatingQualityToggleVisual() {
    const btn = document.getElementById('eating-quality-toggle-btn');
    if (!btn) return;
    const enabled = state.settings?.eatingQualityEnabled !== false;
    const dot = btn.querySelector('span');
    if (enabled) {
        btn.style.background = 'var(--matrix-500)';
        btn.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.3), 0 0 8px rgba(34,197,94,0.2)';
    } else {
        btn.style.background = 'var(--dark-border)';
        btn.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.3)';
    }
    if (dot) dot.style.transform = enabled ? 'translateX(20px)' : 'translateX(0px)';
}

function showUsernameBlockingOverlay() {
    let overlay = document.getElementById('username-blocking-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'username-blocking-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:40;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);';
        document.body.appendChild(overlay);
    }
    overlay.classList.remove('hidden');
}

// Hide the blocking overlay after username is set
function hideUsernameBlockingOverlay() {
    const overlay = document.getElementById('username-blocking-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
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
    const lootTab = document.getElementById('lb-tab-loot');

    // Content areas
    const dailyContent = document.getElementById('lb-daily');
    const alltimeContent = document.getElementById('lb-alltime');
    const fastContent = document.getElementById('lb-fast');
    const sleepContent = document.getElementById('lb-sleep');
    const mealContent = document.getElementById('lb-meal');
    const lootContent = document.getElementById('lb-loot');

    // Hide all content first
    [dailyContent, alltimeContent, fastContent, sleepContent, mealContent, lootContent].forEach(el => {
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
    if (lootTab) { lootTab.style.background = 'transparent'; lootTab.style.color = '#fbbf24'; }

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
    } else if (tab === 'loot') {
        lootTab.style.background = 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)';
        lootTab.style.color = 'black';
        lootContent.classList.remove('hidden');
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
        const heartPoints = sanitizeNumber(calculateHeartPointsValue(), 0, 1000, 0);
        const totalXP = sanitizeNumber(calculateTotalXP(), 0, 100000000, 0);
        const totalLevel = sanitizeNumber(calculateTotalLevel(), 0, 10000, 0);
        const fastingScore = sanitizeNumber(calculateFastingScore(), 0, 100, 0);
        const sleepScore = sanitizeNumber(calculateSleepScore(), 0, 100, 0);
        const eatingScore = sanitizeNumber(calculateEatingScore(), 0, 100, 0);

        // Get equipped item info for loot leaderboard
        const equippedItem = getEquippedItem();
        const equippedItemId = equippedItem ? equippedItem.id : null;
        const equippedItemRarity = equippedItem ? equippedItem.rarity : null;
        const unlockedItemCount = state.collection?.unlockedItems?.length || 0;

        const leaderboardData = {
            username: currentUsername,
            heartPoints: heartPoints,
            totalXP: totalXP,
            totalLevel: totalLevel,
            fastingScore: fastingScore,
            sleepScore: sleepScore,
            mealScore: eatingScore,
            equippedItemId: equippedItemId,
            equippedItemRarity: equippedItemRarity,
            unlockedItemCount: unlockedItemCount,
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

// Calculate heart points value (for leaderboard)
function calculateHeartPointsValue() {
    const sleepScore = calculateSleepScore();
    const fastingScore = calculateFastingScore();
    const eatingScore = calculateEatingScore();
    const powerupScore = calculatePowerupScore();

    // Add heart points bonus from equipped item
    const itemBonuses = getEquippedItemBonuses();
    const itemHeartPointsBonus = itemBonuses.heartPoints || 0;

    return Math.min(100, Math.round(sleepScore + fastingScore + eatingScore + powerupScore + itemHeartPointsBonus));
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
        const dailySnapshot = await dailyRef.orderByChild('heartPoints').limitToLast(50).once('value');
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

        // Render loot leaderboard using all-time data (shows equipped items)
        renderLootLeaderboard(alltimeData);

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
    const lootContent = document.getElementById('lb-loot');
    if (fastContent) fastContent.innerHTML = placeholderHTML;
    if (sleepContent) sleepContent.innerHTML = placeholderHTML;
    if (mealContent) mealContent.innerHTML = placeholderHTML;
    if (lootContent) lootContent.innerHTML = placeholderHTML;
}

// Render leaderboard loading state
function renderLeaderboardLoading() {
    const loadingHTML = `
        <div class="text-center py-8" style="color: var(--dark-text-muted);">
            <div class="inline-block animate-spin mb-2" style="width: 24px; height: 24px; border: 2px solid var(--dark-border); border-top-color: var(--matrix-400); border-radius: 50%;"></div>
            <p class="mt-2">Loading hiscores...</p>
        </div>
    `;

    const containers = ['lb-daily', 'lb-alltime', 'lb-fast', 'lb-sleep', 'lb-meal', 'lb-loot'];
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
        entries.sort((a, b) => (b.heartPoints || 0) - (a.heartPoints || 0));
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
                        ? `<span class="font-bold" style="color: #22c55e;">${entry.heartPoints || 0}</span> <span class="text-xs" style="color: var(--dark-text-muted);">HP</span>`
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

// Render loot leaderboard showing equipped items
function renderLootLeaderboard(data) {
    const container = document.getElementById('lb-loot');
    if (!container) return;

    // Convert to array and sort by unlocked item count, then rarity
    const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1, none: 0 };
    const entries = Object.entries(data).map(([id, entry]) => ({
        id,
        ...entry
    }));

    // Sort by: 1) number of unlocked items, 2) rarity of equipped item, 3) username
    entries.sort((a, b) => {
        const countDiff = (b.unlockedItemCount || 0) - (a.unlockedItemCount || 0);
        if (countDiff !== 0) return countDiff;
        const rarityDiff = (rarityOrder[b.equippedItemRarity] || 0) - (rarityOrder[a.equippedItemRarity] || 0);
        if (rarityDiff !== 0) return rarityDiff;
        return (a.username || '').localeCompare(b.username || '');
    });

    if (entries.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8" style="color: var(--dark-text-muted);">
                <span class="px-icon px-icon-lg px-scroll"></span>
                <p class="mt-2">No entries yet. Be the first!</p>
            </div>
        `;
        return;
    }

    // Rarity colors
    const rarityColors = {
        common: '#9ca3af',
        uncommon: '#22c55e',
        rare: '#3b82f6',
        epic: '#a855f7',
        legendary: '#fbbf24'
    };

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

        // Get equipped item info
        const equippedItem = entry.equippedItemId ? PRECIOUS_ITEMS[entry.equippedItemId] : null;
        const itemRarity = entry.equippedItemRarity || 'none';
        const itemColor = rarityColors[itemRarity] || '#6b7280';
        const unlockedCount = entry.unlockedItemCount || 0;
        const totalItems = Object.keys(PRECIOUS_ITEMS).length;

        // Build item display
        let itemDisplay = '';
        if (equippedItem) {
            itemDisplay = `
                <div class="flex items-center gap-2">
                    <span class="px-icon ${equippedItem.icon}" style="color: ${itemColor};"></span>
                    <div class="text-left">
                        <div class="text-xs font-bold truncate" style="color: ${itemColor}; max-width: 120px;">${escapeHtml(equippedItem.name)}</div>
                        <div class="text-xs" style="color: var(--dark-text-muted);">${unlockedCount}/${totalItems} items</div>
                    </div>
                </div>
            `;
        } else {
            itemDisplay = `
                <div class="text-right">
                    <div class="text-xs" style="color: var(--dark-text-muted);">No item equipped</div>
                    <div class="text-xs" style="color: var(--dark-text-muted);">${unlockedCount}/${totalItems} items</div>
                </div>
            `;
        }

        html += `
            <div class="flex items-center p-2 rounded-lg mb-1" style="${bgStyle}">
                <div class="w-10 text-center font-bold" style="color: ${rankColor};">
                    ${rankIcon || rank}
                </div>
                <div class="flex-1 font-bold truncate" style="color: ${isCurrentUser ? 'var(--matrix-400)' : 'var(--dark-text)'};">
                    ${escapeHtml(entry.username)}
                </div>
                <div class="flex-shrink-0">
                    ${itemDisplay}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ==========================================
// MONSTER BATTLE SYSTEM
// ==========================================

// Monster constants
const VISCERAL_FAT_MAX_HP = 360000; // HP per monster - scaled for visible per-tick damage
const INSULIN_DRAGON_MAX_HP = 720000; // HP per dragon - harder to kill
const DAMAGE_PER_FAST_HOUR = 3600; // Damage dealt per hour of fasting (to Visceral)
const DAMAGE_PER_FAST_HOUR_DRAGON = 1800; // Fasting also damages Insulin Dragon (insulin drops during fasting)
const DAMAGE_PER_SLEEP_HOUR = 5400; // Damage dealt per hour of quality sleep
const VISCERAL_REGEN_PER_HOUR = 720; // Monster heals when user is idle (scaled)
const DRAGON_REGEN_PER_HOUR = 1080; // Dragon heals when user is idle (scaled)
const MAX_REGEN_PERCENT = 0.5; // Monsters can only heal back 50% of their max HP

// Premium Monster constants (Sui Pro only)
const CORTISOL_WRAITH_MAX_HP = 540000; // Cortisol Wraith — defeated by sleep + exercise/walks
const INFLAMMATION_GOLEM_MAX_HP = 480000; // Inflammation Golem — defeated by fasting + clean eating
const GLUCOSE_SPECTER_MAX_HP = 600000; // Glucose Specter — defeated by fasting + sleep (glucose regulation)
const DAMAGE_PER_SLEEP_HOUR_WRAITH = 3600; // Sleep damages Cortisol Wraith (cortisol drops during sleep)
const DAMAGE_PER_EXERCISE_WRAITH = 2700; // Exercise/walk powerups also damage the Wraith
const DAMAGE_PER_FAST_HOUR_GOLEM = 2700; // Fasting reduces inflammation
const DAMAGE_PER_EATING_QUALITY_GOLEM = 1800; // Clean eating fights inflammation (per good eating powerup)
const DAMAGE_PER_FAST_HOUR_SPECTER = 2400; // Fasting stabilizes blood glucose
const DAMAGE_PER_SLEEP_HOUR_SPECTER = 1800; // Sleep aids glucose regulation
const WRAITH_REGEN_PER_HOUR = 900;
const GOLEM_REGEN_PER_HOUR = 800;
const SPECTER_REGEN_PER_HOUR = 1000;

// Format large HP numbers for display (e.g. 360000 → "360K", 1500 → "1.5K", 720000 → "720K")
function formatHP(hp) {
    if (hp >= 1000) {
        const k = hp / 1000;
        return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
    }
    return String(hp);
}

// Powerup damage bonuses (flat bonus added to Visceral damage)
const POWERUP_DAMAGE_BONUSES = {
    water: 720,
    hotwater: 720,
    coffee: 1080,
    tea: 720,
    exercise: 3600,
    walk: 1800,
    hanging: 1800,
    grip: 1800,
    flatstomach: 1080,
    doctorwin: 2880,
    autophagy: 5400,  // High bonus - requires 16+ hours to unlock
    custom: 1800
};

// Eating quality damage modifiers (multiplier on Dragon damage)
const EATING_QUALITY_MODIFIERS = {
    // Good eating habits (positive)
    protein: 0.05,
    fiber: 0.05,
    broth: 0.05,
    sloweating: 0.05,
    mealwalk: 0.05,
    homecooked: 0.03,
    // Bad eating habits (negative)
    junkfood: -0.05,
    toofast: -0.05,
    eatenout: -0.03,
    bloated: -0.08
};

// Streak bonus thresholds
const STREAK_BONUSES = {
    3: 0.10,   // 3-day streak: +10%
    7: 0.25,   // 7-day streak: +25%
    14: 0.40,  // 14-day streak: +40%
    30: 0.60   // 30-day streak: +60%
};

// Calculate fasting streak (consecutive days with at least one fast)
function calculateFastingStreak() {
    const history = Array.isArray(state.fastingHistory) ? state.fastingHistory : [];
    if (history.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dayStart = checkDate.getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;

        const hasFast = history.some(f => {
            const fastEnd = f.endTime || f.startTime + (f.duration * 60 * 60 * 1000);
            return fastEnd >= dayStart && f.startTime < dayEnd;
        });

        if (hasFast) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }

    return streak;
}

// Calculate sleep streak (consecutive days with sleep >= 6 hours)
function calculateSleepStreak() {
    const history = Array.isArray(state.sleepHistory) ? state.sleepHistory : [];
    if (history.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dayStart = checkDate.getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;

        const hasGoodSleep = history.some(s => {
            const sleepEnd = s.endTime || s.startTime + (s.duration * 60 * 60 * 1000);
            return sleepEnd >= dayStart && s.startTime < dayEnd && s.duration >= 6;
        });

        if (hasGoodSleep) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }

    return streak;
}

// Get streak bonus multiplier
function getStreakBonus(streak) {
    let bonus = 0;
    for (const [days, bonusValue] of Object.entries(STREAK_BONUSES)) {
        if (streak >= parseInt(days)) {
            bonus = bonusValue;
        }
    }
    return bonus;
}

// Calculate Heart Points damage multiplier
function getHeartPointsMultiplier() {
    const heartPoints = calculateHeartPointsValue();
    if (heartPoints >= 80) return 1.25;
    if (heartPoints >= 60) return 1.15;
    if (heartPoints >= 40) return 1.05;
    return 1.0;
}

// Calculate skill level bonus for Visceral (fasting-related skills)
function getVisceralSkillBonus() {
    const fastingSkills = ['water', 'hotwater', 'coffee', 'tea', 'exercise', 'walk', 'hanging', 'grip', 'flatstomach', 'doctorwin'];
    let totalLevels = 0;
    for (const skill of fastingSkills) {
        totalLevels += levelFromXP(state.skills?.[skill] || 0);
    }
    return Math.floor(totalLevels / 10) * 0.01; // +1% per 10 levels
}

// Calculate skill level bonus for Dragon (sleep + eating skills)
function getDragonSkillBonus() {
    const dragonSkills = ['sleep', 'broth', 'protein', 'fiber', 'homecooked', 'sloweating', 'mealwalk', 'chocolate'];
    let totalLevels = 0;
    for (const skill of dragonSkills) {
        totalLevels += levelFromXP(state.skills?.[skill] || 0);
    }
    return Math.floor(totalLevels / 10) * 0.01; // +1% per 10 levels
}

// Calculate eating quality modifier (affects Dragon damage)
function getEatingQualityModifier() {
    // When eating quality scoring is disabled, return neutral multiplier
    if (state.settings?.eatingQualityEnabled === false) return 1.0;

    const powerups = Array.isArray(state.eatingPowerups) ? state.eatingPowerups : [];
    const recentPowerups = powerups.filter(p => {
        const age = Date.now() - (p.timestamp || 0);
        return age < 24 * 60 * 60 * 1000; // Last 24 hours
    });

    let modifier = 1.0;
    for (const powerup of recentPowerups) {
        const mod = EATING_QUALITY_MODIFIERS[powerup.type] || 0;
        modifier += mod;
    }

    // Clamp between 0.5x and 1.5x
    return Math.max(0.5, Math.min(1.5, modifier));
}

// Calculate powerup damage bonus for current fasting session
function getCurrentPowerupDamageBonus() {
    if (!state.currentFast?.isActive) return 0;

    const powerups = Array.isArray(state.currentFast.powerups) ? state.currentFast.powerups : [];
    let bonus = 0;
    for (const powerup of powerups) {
        bonus += POWERUP_DAMAGE_BONUSES[powerup.type] || 0;
    }
    return bonus;
}

// Cached wrapper for damage bonuses (most expensive sub-call in battle stats)
function getCachedDamageBonuses() {
    if (!perfCache.damageBonusesDirty && perfCache.damageBonuses) {
        return perfCache.damageBonuses;
    }
    perfCache.damageBonuses = getActiveDamageBonuses();
    perfCache.damageBonusesDirty = false;
    return perfCache.damageBonuses;
}

// Cached wrapper for fasting streak
function getCachedFastingStreak() {
    if (!perfCache.fastingStreakDirty && perfCache.fastingStreak !== null) {
        return perfCache.fastingStreak;
    }
    perfCache.fastingStreak = calculateFastingStreak();
    perfCache.fastingStreakDirty = false;
    return perfCache.fastingStreak;
}

// Cached wrapper for sleep streak
function getCachedSleepStreak() {
    if (!perfCache.sleepStreakDirty && perfCache.sleepStreak !== null) {
        return perfCache.sleepStreak;
    }
    perfCache.sleepStreak = calculateSleepStreak();
    perfCache.sleepStreakDirty = false;
    return perfCache.sleepStreak;
}

// Get all active damage bonuses for display
function getActiveDamageBonuses() {
    const fastingStreak = getCachedFastingStreak();
    const sleepStreak = getCachedSleepStreak();
    const heartPoints = calculateHeartPointsValue();
    const eatingMod = getEatingQualityModifier();
    const visceralSkillBonus = getVisceralSkillBonus();
    const dragonSkillBonus = getDragonSkillBonus();
    const powerupBonus = getCurrentPowerupDamageBonus();

    // Get equipped item bonuses
    const itemBonuses = getEquippedItemBonuses();

    // Calculate base streak bonus with item streak bonus
    const baseVisceralStreakBonus = getStreakBonus(fastingStreak);
    const baseDragonStreakBonus = getStreakBonus(sleepStreak);
    const itemStreakBonus = itemBonuses.streakBonusPercent / 100;

    // Calculate eating quality modifier with item bonus
    const itemEatingBonus = itemBonuses.eatingQualityPercent / 100;
    const adjustedEatingMod = Math.max(0.5, Math.min(1.5, eatingMod + itemEatingBonus));

    // Calculate all damage percent bonus from item
    const allDamageBonus = itemBonuses.allDamagePercent / 100;

    return {
        visceral: {
            streakDays: fastingStreak,
            streakBonus: baseVisceralStreakBonus + itemStreakBonus,
            heartPointsMultiplier: getHeartPointsMultiplier(),
            skillBonus: visceralSkillBonus,
            powerupBonus: powerupBonus,
            itemFlatDamage: itemBonuses.visceralDamage,
            itemAllDamageBonus: allDamageBonus,
            totalMultiplier: (1 + baseVisceralStreakBonus + itemStreakBonus + visceralSkillBonus + allDamageBonus) * getHeartPointsMultiplier()
        },
        dragon: {
            streakDays: sleepStreak,
            streakBonus: baseDragonStreakBonus + itemStreakBonus,
            heartPointsMultiplier: getHeartPointsMultiplier(),
            skillBonus: dragonSkillBonus,
            eatingQualityModifier: adjustedEatingMod,
            itemFlatDamage: itemBonuses.dragonDamage,
            itemAllDamageBonus: allDamageBonus,
            totalMultiplier: (1 + baseDragonStreakBonus + itemStreakBonus + dragonSkillBonus + allDamageBonus) * getHeartPointsMultiplier() * adjustedEatingMod
        },
        heartPoints: heartPoints,
        equippedItem: getEquippedItem()
    };
}

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

// Monster damage state based on HP percentage
function getMonsterDamageState(hpPercent) {
    if (hpPercent <= 0) return { state: 'defeated', label: 'DEFEATED', color: 'var(--matrix-glow)', cssClass: 'monster-defeated' };
    if (hpPercent <= 25) return { state: 'near-death', label: 'NEAR DEATH', color: '#ef4444', cssClass: 'monster-near-death' };
    if (hpPercent <= 50) return { state: 'critical', label: 'CRITICAL', color: '#f97316', cssClass: 'monster-critical' };
    if (hpPercent <= 75) return { state: 'wounded', label: 'WOUNDED', color: '#fbbf24', cssClass: 'monster-wounded' };
    return { state: 'healthy', label: 'HEALTHY', color: '#22c55e', cssClass: 'monster-healthy' };
}

// Apply visual damage state to monster container
function applyMonsterDamageState(monsterType, hpPercent, isRegenerating) {
    const containerId = monsterType === 'visceral' ? 'visceral-monster-container' : 'dragon-monster-container';
    const statusId = monsterType === 'visceral' ? 'visceral-monster-status' : 'dragon-monster-status';
    const container = document.getElementById(containerId);
    const statusEl = document.getElementById(statusId);
    if (!container) return;

    const damageState = getMonsterDamageState(hpPercent);
    const allStates = ['monster-healthy', 'monster-wounded', 'monster-critical', 'monster-near-death', 'monster-defeated'];

    // Remove old state classes, add new one
    allStates.forEach(cls => container.classList.remove(cls));
    container.classList.remove('monster-danger-pulse', 'monster-regen-pulse');
    container.classList.add(damageState.cssClass);

    // Danger pulse for low HP
    if (hpPercent > 0 && hpPercent <= 50) {
        container.classList.add('monster-danger-pulse');
    }

    // Regen pulse when healing
    if (isRegenerating && hpPercent > 0) {
        container.classList.add('monster-regen-pulse');
    }

    // Update status badge
    if (statusEl) {
        const badge = statusEl.querySelector('.monster-status-badge');
        if (badge) {
            badge.textContent = damageState.label;
            badge.style.color = damageState.color;
        }
    }
}

// Get cached historical battle data (stable between state mutations)
// Only recalculated when history/powerups change via invalidateCache()
function getCachedHistoricalBattleData() {
    if (!perfCache.historicalBattleDataDirty && perfCache.historicalBattleData) {
        return perfCache.historicalBattleData;
    }

    const fastingHistory = Array.isArray(state.fastingHistory) ? state.fastingHistory : [];
    const sleepHistory = Array.isArray(state.sleepHistory) ? state.sleepHistory : [];

    const totalFastingHours = fastingHistory.reduce((sum, f) => sum + (f.duration || 0), 0);
    const totalSleepHours = sleepHistory.reduce((sum, s) => sum + (s.duration || 0), 0);

    // Historical powerup damage from completed fasts (the big nested loop)
    let historicalPowerupDamage = 0;
    for (const fast of fastingHistory) {
        if (Array.isArray(fast.powerups)) {
            for (const powerup of fast.powerups) {
                historicalPowerupDamage += POWERUP_DAMAGE_BONUSES[powerup.type] || 0;
            }
        } else if (fast.powerups && typeof fast.powerups === 'object') {
            for (const [type, count] of Object.entries(fast.powerups)) {
                const bonus = POWERUP_DAMAGE_BONUSES[type] || 0;
                const safeCount = typeof count === 'number' ? count : 0;
                historicalPowerupDamage += bonus * safeCount;
            }
        }
    }

    // Find the most recent activity end time (for regen calculation)
    let lastActivityTime = 0;
    if (fastingHistory.length > 0) {
        const lastFast = fastingHistory[fastingHistory.length - 1];
        const fastEnd = (lastFast.startTime || 0) + ((lastFast.duration || 0) * 3600000);
        lastActivityTime = Math.max(lastActivityTime, fastEnd);
    }
    if (sleepHistory.length > 0) {
        const lastSleep = sleepHistory[sleepHistory.length - 1];
        const sleepEnd = (lastSleep.startTime || 0) + ((lastSleep.duration || 0) * 3600000);
        lastActivityTime = Math.max(lastActivityTime, sleepEnd);
    }

    perfCache.historicalBattleData = {
        totalFastingHours,
        totalSleepHours,
        historicalPowerupDamage,
        fastingCount: fastingHistory.length,
        sleepCount: sleepHistory.length,
        lastActivityTime
    };
    perfCache.historicalBattleDataDirty = false;
    return perfCache.historicalBattleData;
}

// Calculate monster battle stats from fasting history with all multipliers
// Uses cached historical data for O(1) per-tick performance
function calculateMonsterBattleStats() {
    const cached = getCachedHistoricalBattleData();
    const bonuses = getCachedDamageBonuses();

    // Combine cached historical totals with fresh in-progress time
    let totalFastingHours = cached.totalFastingHours;
    let inProgressFastHours = 0;
    if (state.currentFast?.isActive && state.currentFast.startTime) {
        inProgressFastHours = (Date.now() - state.currentFast.startTime) / 3600000;
        totalFastingHours += inProgressFastHours;
    }

    let baseFastingDamage = totalFastingHours * DAMAGE_PER_FAST_HOUR;

    // Cached historical powerup damage + fresh in-progress session powerups
    let totalPowerupDamage = cached.historicalPowerupDamage;
    if (state.currentFast?.isActive) {
        const currentPowerups = Array.isArray(state.currentFast.powerups) ? state.currentFast.powerups : [];
        for (const powerup of currentPowerups) {
            totalPowerupDamage += POWERUP_DAMAGE_BONUSES[powerup.type] || 0;
        }
    }

    // Apply multipliers to Visceral damage (including equipped item flat bonus)
    const visceralMultiplier = bonuses.visceral.totalMultiplier;
    const itemVisceralDamage = bonuses.visceral.itemFlatDamage || 0;
    const totalFastingDamage = Math.floor((baseFastingDamage + totalPowerupDamage + itemVisceralDamage) * visceralMultiplier);

    // Insulin Resistance Dragon stats (from sleep + fasting)
    let totalSleepHours = cached.totalSleepHours;
    let inProgressSleepHours = 0;
    if (state.currentSleep?.isActive && state.currentSleep.startTime) {
        inProgressSleepHours = (Date.now() - state.currentSleep.startTime) / 3600000;
        totalSleepHours += inProgressSleepHours;
    }

    const baseSleepDamage = totalSleepHours * DAMAGE_PER_SLEEP_HOUR;
    const fastingDragonDamage = totalFastingHours * DAMAGE_PER_FAST_HOUR_DRAGON;

    // Apply multipliers to Dragon damage (includes eating quality and equipped item flat bonus)
    const dragonMultiplier = bonuses.dragon.totalMultiplier;
    const itemDragonDamage = bonuses.dragon.itemFlatDamage || 0;
    const totalSleepDamage = Math.floor((baseSleepDamage + fastingDragonDamage + itemDragonDamage) * dragonMultiplier);

    // Calculate regen (monsters heal when user is idle)
    const isActive = state.currentFast?.isActive || state.currentSleep?.isActive;
    let visceralRegen = 0;
    let dragonRegen = 0;
    let isRegenerating = false;

    if (!isActive && cached.lastActivityTime > 0) {
        const idleHours = (Date.now() - cached.lastActivityTime) / 3600000;
        if (idleHours > 0) {
            visceralRegen = Math.min(idleHours * VISCERAL_REGEN_PER_HOUR, VISCERAL_FAT_MAX_HP * MAX_REGEN_PERCENT);
            dragonRegen = Math.min(idleHours * DRAGON_REGEN_PER_HOUR, INSULIN_DRAGON_MAX_HP * MAX_REGEN_PERCENT);
            isRegenerating = visceralRegen > 0 || dragonRegen > 0;
        }
    }

    // Calculate final HP with regen applied
    const visceralCurrentDamage = totalFastingDamage % VISCERAL_FAT_MAX_HP;
    const visceralDamageAfterRegen = Math.max(0, visceralCurrentDamage - Math.floor(visceralRegen));
    const visceralCurrentHP = VISCERAL_FAT_MAX_HP - visceralDamageAfterRegen;
    const visceralKills = Math.floor(totalFastingDamage / VISCERAL_FAT_MAX_HP);

    const dragonCurrentDamage = totalSleepDamage % INSULIN_DRAGON_MAX_HP;
    const dragonDamageAfterRegen = Math.max(0, dragonCurrentDamage - Math.floor(dragonRegen));
    const dragonCurrentHP = INSULIN_DRAGON_MAX_HP - dragonDamageAfterRegen;
    const dragonKills = Math.floor(totalSleepDamage / INSULIN_DRAGON_MAX_HP);

    return {
        visceral: {
            totalFasts: cached.fastingCount,
            totalHours: totalFastingHours,
            baseDamage: Math.floor(baseFastingDamage),
            powerupDamage: totalPowerupDamage,
            totalDamage: totalFastingDamage,
            multiplier: visceralMultiplier,
            kills: visceralKills,
            currentHP: visceralCurrentHP,
            maxHP: VISCERAL_FAT_MAX_HP,
            currentDamage: visceralDamageAfterRegen,
            regenAmount: Math.floor(visceralRegen),
            isRegenerating: isRegenerating && visceralRegen > 0
        },
        dragon: {
            totalSleeps: cached.sleepCount,
            totalSessions: cached.fastingCount + cached.sleepCount,
            totalHours: totalSleepHours + totalFastingHours,
            baseDamage: Math.floor(baseSleepDamage),
            fastingDamage: Math.floor(fastingDragonDamage),
            totalDamage: totalSleepDamage,
            multiplier: dragonMultiplier,
            kills: dragonKills,
            currentHP: dragonCurrentHP,
            maxHP: INSULIN_DRAGON_MAX_HP,
            currentDamage: dragonDamageAfterRegen,
            regenAmount: Math.floor(dragonRegen),
            isRegenerating: isRegenerating && dragonRegen > 0
        },
        totalKills: visceralKills + dragonKills,
        bonuses: bonuses
    };
}

// Calculate premium monster battle stats (Sui Pro only)
function calculatePremiumMonsterStats() {
    if (!isPremiumActive()) return null;

    const cached = getCachedHistoricalBattleData();
    const bonuses = getCachedDamageBonuses();

    let totalFastingHours = cached.totalFastingHours;
    let totalSleepHours = cached.totalSleepHours;

    // Add in-progress sessions
    if (state.currentFast?.isActive && state.currentFast.startTime) {
        totalFastingHours += (Date.now() - state.currentFast.startTime) / 3600000;
    }
    if (state.currentSleep?.isActive && state.currentSleep.startTime) {
        totalSleepHours += (Date.now() - state.currentSleep.startTime) / 3600000;
    }

    // Count exercise/walk powerups from history for Wraith
    let exercisePowerupCount = 0;
    const fastingHistory = Array.isArray(state.fastingHistory) ? state.fastingHistory : [];
    for (const fast of fastingHistory) {
        const powerups = Array.isArray(fast.powerups) ? fast.powerups : [];
        for (const p of powerups) {
            const pType = typeof p === 'object' ? p.type : p;
            if (pType === 'exercise' || pType === 'walk' || pType === 'hanging' || pType === 'grip') {
                exercisePowerupCount++;
            }
        }
    }
    // Add current session exercise powerups
    if (state.currentFast?.isActive) {
        const currentPowerups = Array.isArray(state.currentFast.powerups) ? state.currentFast.powerups : [];
        for (const p of currentPowerups) {
            const pType = typeof p === 'object' ? p.type : p;
            if (pType === 'exercise' || pType === 'walk' || pType === 'hanging' || pType === 'grip') {
                exercisePowerupCount++;
            }
        }
    }

    // Count good eating powerups for Golem
    let goodEatingCount = 0;
    const goodEatingTypes = ['protein', 'fiber', 'broth', 'sloweating', 'mealwalk', 'homecooked'];
    for (const fast of fastingHistory) {
        const powerups = Array.isArray(fast.powerups) ? fast.powerups : [];
        for (const p of powerups) {
            const pType = typeof p === 'object' ? p.type : p;
            if (goodEatingTypes.includes(pType)) goodEatingCount++;
        }
    }
    // Also count eating powerups
    const eatingPowerups = Array.isArray(state.eatingPowerups) ? state.eatingPowerups : [];
    for (const p of eatingPowerups) {
        const pType = typeof p === 'object' ? p.type : p;
        if (goodEatingTypes.includes(pType)) goodEatingCount++;
    }

    // Regen
    const isActive = state.currentFast?.isActive || state.currentSleep?.isActive;
    let wraithRegen = 0, golemRegen = 0, specterRegen = 0;
    if (!isActive && cached.lastActivityTime > 0) {
        const idleHours = (Date.now() - cached.lastActivityTime) / 3600000;
        if (idleHours > 0) {
            wraithRegen = Math.min(idleHours * WRAITH_REGEN_PER_HOUR, CORTISOL_WRAITH_MAX_HP * MAX_REGEN_PERCENT);
            golemRegen = Math.min(idleHours * GOLEM_REGEN_PER_HOUR, INFLAMMATION_GOLEM_MAX_HP * MAX_REGEN_PERCENT);
            specterRegen = Math.min(idleHours * SPECTER_REGEN_PER_HOUR, GLUCOSE_SPECTER_MAX_HP * MAX_REGEN_PERCENT);
        }
    }

    // --- Cortisol Wraith: sleep + exercise ---
    const wraithBaseDamage = totalSleepHours * DAMAGE_PER_SLEEP_HOUR_WRAITH;
    const wraithExerciseDamage = exercisePowerupCount * DAMAGE_PER_EXERCISE_WRAITH;
    const wraithTotalDamage = Math.floor((wraithBaseDamage + wraithExerciseDamage) * bonuses.visceral.totalMultiplier);
    const wraithCurrentDamage = wraithTotalDamage % CORTISOL_WRAITH_MAX_HP;
    const wraithDamageAfterRegen = Math.max(0, wraithCurrentDamage - Math.floor(wraithRegen));
    const wraithCurrentHP = CORTISOL_WRAITH_MAX_HP - wraithDamageAfterRegen;
    const wraithKills = Math.floor(wraithTotalDamage / CORTISOL_WRAITH_MAX_HP);

    // --- Inflammation Golem: fasting + eating quality ---
    const golemBaseDamage = totalFastingHours * DAMAGE_PER_FAST_HOUR_GOLEM;
    const golemEatingDamage = goodEatingCount * DAMAGE_PER_EATING_QUALITY_GOLEM;
    const golemTotalDamage = Math.floor((golemBaseDamage + golemEatingDamage) * bonuses.dragon.totalMultiplier);
    const golemCurrentDamage = golemTotalDamage % INFLAMMATION_GOLEM_MAX_HP;
    const golemDamageAfterRegen = Math.max(0, golemCurrentDamage - Math.floor(golemRegen));
    const golemCurrentHP = INFLAMMATION_GOLEM_MAX_HP - golemDamageAfterRegen;
    const golemKills = Math.floor(golemTotalDamage / INFLAMMATION_GOLEM_MAX_HP);

    // --- Glucose Specter: fasting + sleep ---
    const specterBaseDamage = (totalFastingHours * DAMAGE_PER_FAST_HOUR_SPECTER) + (totalSleepHours * DAMAGE_PER_SLEEP_HOUR_SPECTER);
    const specterTotalDamage = Math.floor(specterBaseDamage * ((bonuses.visceral.totalMultiplier + bonuses.dragon.totalMultiplier) / 2));
    const specterCurrentDamage = specterTotalDamage % GLUCOSE_SPECTER_MAX_HP;
    const specterDamageAfterRegen = Math.max(0, specterCurrentDamage - Math.floor(specterRegen));
    const specterCurrentHP = GLUCOSE_SPECTER_MAX_HP - specterDamageAfterRegen;
    const specterKills = Math.floor(specterTotalDamage / GLUCOSE_SPECTER_MAX_HP);

    return {
        wraith: {
            totalDamage: wraithTotalDamage,
            kills: wraithKills,
            currentHP: wraithCurrentHP,
            maxHP: CORTISOL_WRAITH_MAX_HP,
            currentDamage: wraithDamageAfterRegen,
            isRegenerating: !isActive && wraithRegen > 0
        },
        golem: {
            totalDamage: golemTotalDamage,
            kills: golemKills,
            currentHP: golemCurrentHP,
            maxHP: INFLAMMATION_GOLEM_MAX_HP,
            currentDamage: golemDamageAfterRegen,
            isRegenerating: !isActive && golemRegen > 0
        },
        specter: {
            totalDamage: specterTotalDamage,
            kills: specterKills,
            currentHP: specterCurrentHP,
            maxHP: GLUCOSE_SPECTER_MAX_HP,
            currentDamage: specterDamageAfterRegen,
            isRegenerating: !isActive && specterRegen > 0
        },
        totalPremiumKills: wraithKills + golemKills + specterKills
    };
}

// Update premium monster UI
function updatePremiumMonsterUI() {
    const container = document.getElementById('premium-monsters-container');
    if (!container) return;

    if (!isPremiumActive()) {
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');

    const stats = calculatePremiumMonsterStats();
    if (!stats) return;

    // Cortisol Wraith
    const wraithHPPercent = (stats.wraith.currentHP / stats.wraith.maxHP) * 100;
    const wraithHPBar = document.getElementById('wraith-hp-bar');
    const wraithHPText = document.getElementById('wraith-hp-text');
    const wraithDamageDealt = document.getElementById('wraith-damage-dealt');
    const wraithKillsEl = document.getElementById('wraith-kills');
    if (wraithHPBar) wraithHPBar.style.width = `${wraithHPPercent}%`;
    if (wraithHPText) wraithHPText.textContent = `${formatHP(Math.floor(stats.wraith.currentHP))}/${formatHP(stats.wraith.maxHP)}`;
    if (wraithDamageDealt) wraithDamageDealt.textContent = formatHP(stats.wraith.totalDamage);
    if (wraithKillsEl) wraithKillsEl.textContent = stats.wraith.kills;

    // Inflammation Golem
    const golemHPPercent = (stats.golem.currentHP / stats.golem.maxHP) * 100;
    const golemHPBar = document.getElementById('golem-hp-bar');
    const golemHPText = document.getElementById('golem-hp-text');
    const golemDamageDealt = document.getElementById('golem-damage-dealt');
    const golemKillsEl = document.getElementById('golem-kills');
    if (golemHPBar) golemHPBar.style.width = `${golemHPPercent}%`;
    if (golemHPText) golemHPText.textContent = `${formatHP(Math.floor(stats.golem.currentHP))}/${formatHP(stats.golem.maxHP)}`;
    if (golemDamageDealt) golemDamageDealt.textContent = formatHP(stats.golem.totalDamage);
    if (golemKillsEl) golemKillsEl.textContent = stats.golem.kills;

    // Glucose Specter
    const specterHPPercent = (stats.specter.currentHP / stats.specter.maxHP) * 100;
    const specterHPBar = document.getElementById('specter-hp-bar');
    const specterHPText = document.getElementById('specter-hp-text');
    const specterDamageDealt = document.getElementById('specter-damage-dealt');
    const specterKillsEl = document.getElementById('specter-kills');
    if (specterHPBar) specterHPBar.style.width = `${specterHPPercent}%`;
    if (specterHPText) specterHPText.textContent = `${formatHP(Math.floor(stats.specter.currentHP))}/${formatHP(stats.specter.maxHP)}`;
    if (specterDamageDealt) specterDamageDealt.textContent = formatHP(stats.specter.totalDamage);
    if (specterKillsEl) specterKillsEl.textContent = stats.specter.kills;

    // Update total kills to include premium monsters
    const totalPremiumKillsEl = document.getElementById('total-premium-kills');
    if (totalPremiumKillsEl) totalPremiumKillsEl.textContent = stats.totalPremiumKills;
}

// Update monster battle UI (uses domCache to avoid repeated getElementById calls)
function updateMonsterBattleUI() {
    const stats = calculateMonsterBattleStats();

    // Visceral Fat Monster UI (use cached DOM references)
    const visceralHPBar = domCache.visceralHPBar || document.getElementById('visceral-hp-bar');
    const visceralHPText = domCache.visceralHPText || document.getElementById('visceral-hp-text');
    const visceralDamageDealt = domCache.visceralDamageDealt || document.getElementById('visceral-damage-dealt');
    const visceralFastsCount = domCache.visceralFastsCount || document.getElementById('visceral-fasts-count');
    const visceralHoursEl = domCache.visceralHours || document.getElementById('visceral-hours');
    const visceralKillsEl = domCache.visceralKills || document.getElementById('visceral-kills');

    const visceralHPPercent = (stats.visceral.currentHP / stats.visceral.maxHP) * 100;
    if (visceralHPBar) {
        visceralHPBar.style.width = `${visceralHPPercent}%`;
        // Change HP bar color based on health
        if (visceralHPPercent <= 25) {
            visceralHPBar.style.background = 'linear-gradient(90deg, #7f1d1d, #991b1b, #7f1d1d)';
        } else if (visceralHPPercent <= 50) {
            visceralHPBar.style.background = 'linear-gradient(90deg, #dc2626, #b91c1c, #dc2626)';
        } else {
            visceralHPBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626, #ef4444)';
        }
        visceralHPBar.style.backgroundSize = '200% 100%';
    }
    if (visceralHPText) {
        visceralHPText.textContent = `${formatHP(stats.visceral.currentHP)}/${formatHP(stats.visceral.maxHP)}`;
    }
    if (visceralDamageDealt) {
        const regenText = stats.visceral.isRegenerating ? ` (+${formatHP(stats.visceral.regenAmount)} regen)` : '';
        visceralDamageDealt.textContent = `${formatHP(stats.visceral.currentDamage)} HP${regenText}`;
        visceralDamageDealt.style.color = stats.visceral.isRegenerating ? '#22c55e' : 'var(--matrix-400)';
    }
    if (visceralFastsCount) {
        visceralFastsCount.textContent = stats.visceral.totalFasts;
    }
    if (visceralHoursEl) {
        visceralHoursEl.textContent = stats.visceral.totalHours.toFixed(1);
    }
    if (visceralKillsEl) {
        visceralKillsEl.textContent = stats.visceral.kills;
    }

    // Apply visual damage state to Visceral monster
    applyMonsterDamageState('visceral', visceralHPPercent, stats.visceral.isRegenerating);

    // Insulin Resistance Dragon UI (use cached DOM references)
    const dragonHPBar = domCache.dragonHPBar || document.getElementById('dragon-hp-bar');
    const dragonHPText = domCache.dragonHPText || document.getElementById('dragon-hp-text');
    const dragonDamageDealt = domCache.dragonDamageDealt || document.getElementById('dragon-damage-dealt');
    const dragonSessionsCount = domCache.dragonSessionsCount || document.getElementById('dragon-sessions-count');
    const dragonHoursEl = domCache.dragonHours || document.getElementById('dragon-hours');
    const dragonKillsEl = domCache.dragonKills || document.getElementById('dragon-kills');

    const dragonHPPercent = (stats.dragon.currentHP / stats.dragon.maxHP) * 100;
    if (dragonHPBar) {
        dragonHPBar.style.width = `${dragonHPPercent}%`;
        // Change HP bar color based on health
        if (dragonHPPercent <= 25) {
            dragonHPBar.style.background = 'linear-gradient(90deg, #4c1d95, #5b21b6, #4c1d95)';
        } else if (dragonHPPercent <= 50) {
            dragonHPBar.style.background = 'linear-gradient(90deg, #7c3aed, #6d28d9, #7c3aed)';
        } else {
            dragonHPBar.style.background = 'linear-gradient(90deg, #8b5cf6, #7c3aed, #8b5cf6)';
        }
        dragonHPBar.style.backgroundSize = '200% 100%';
    }
    if (dragonHPText) {
        dragonHPText.textContent = `${formatHP(stats.dragon.currentHP)}/${formatHP(stats.dragon.maxHP)}`;
    }
    if (dragonDamageDealt) {
        const regenText = stats.dragon.isRegenerating ? ` (+${formatHP(stats.dragon.regenAmount)} regen)` : '';
        dragonDamageDealt.textContent = `${formatHP(stats.dragon.currentDamage)} HP${regenText}`;
        dragonDamageDealt.style.color = stats.dragon.isRegenerating ? '#22c55e' : 'var(--indigo-400)';
    }
    if (dragonSessionsCount) {
        dragonSessionsCount.textContent = stats.dragon.totalSessions;
    }
    if (dragonHoursEl) {
        dragonHoursEl.textContent = stats.dragon.totalHours.toFixed(1);
    }
    if (dragonKillsEl) {
        dragonKillsEl.textContent = stats.dragon.kills;
    }

    // Apply visual damage state to Dragon
    applyMonsterDamageState('dragon', dragonHPPercent, stats.dragon.isRegenerating);

    // Total kills
    const totalKillsEl = domCache.totalMonstersSlain || document.getElementById('total-monsters-slain');
    if (totalKillsEl) {
        totalKillsEl.textContent = stats.totalKills;
    }

    // Update additional Slayer tab elements
    const totalVisceralKills = document.getElementById('total-visceral-kills');
    const totalDragonKills = document.getElementById('total-dragon-kills');
    if (totalVisceralKills) totalVisceralKills.textContent = stats.visceral.kills;
    if (totalDragonKills) totalDragonKills.textContent = stats.dragon.kills;

    // Update premium monsters (Sui Pro)
    updatePremiumMonsterUI();

    // Update total kills to include premium
    if (isPremiumActive()) {
        const premiumStats = calculatePremiumMonsterStats();
        if (premiumStats && totalKillsEl) {
            totalKillsEl.textContent = stats.totalKills + premiumStats.totalPremiumKills;
        }
    }

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

    // Start continuous damage animation (every 1.5 seconds)
    slayerAnimationInterval = setInterval(() => {
        // Only animate if on slayer tab
        if (state.currentTab !== 'slayer') {
            clearInterval(slayerAnimationInterval);
            slayerAnimationInterval = null;
            return;
        }

        // Get stats before and after to show real HP change
        const newStats = calculateMonsterBattleStats();

        // Show actual damage dealt since last tick
        if (lastVisceralHP !== null) {
            const visceralDmg = lastVisceralHP - newStats.visceral.currentHP;
            if (visceralDmg > 0) {
                showDamageNumber('visceral', visceralDmg);
                triggerMonsterHit('visceral');
            } else if (visceralDmg < 0 && newStats.visceral.isRegenerating) {
                showHealNumber('visceral', Math.abs(visceralDmg));
            }
        }
        if (lastDragonHP !== null) {
            const dragonDmg = lastDragonHP - newStats.dragon.currentHP;
            if (dragonDmg > 0) {
                showDamageNumber('dragon', dragonDmg);
                triggerMonsterHit('dragon');
            } else if (dragonDmg < 0 && newStats.dragon.isRegenerating) {
                showHealNumber('dragon', Math.abs(dragonDmg));
            }
        }

        lastVisceralHP = newStats.visceral.currentHP;
        lastDragonHP = newStats.dragon.currentHP;

        // Update HP bars and visual states in real-time
        updateMonsterBattleUI();
    }, 1500);
}

// Calculate DPS based on all bonuses and current activity
function calculateSlayerDPS() {
    const bonuses = getActiveDamageBonuses();

    // Calculate base DPS from history
    let visceralBaseDPS = 0;
    let dragonBaseDPS = 0;
    let currentPowerupDPS = 0;

    // If currently fasting, add real-time DPS
    if (state.currentFast?.isActive) {
        visceralBaseDPS = DAMAGE_PER_FAST_HOUR / 3600; // Per second

        // Add DPS from current session powerups
        const powerups = Array.isArray(state.currentFast.powerups) ? state.currentFast.powerups : [];
        for (const powerup of powerups) {
            // Powerup damage is spread over the session (assume 16hr fast average)
            currentPowerupDPS += (POWERUP_DAMAGE_BONUSES[powerup.type] || 0) / (16 * 3600);
        }
    }

    // If currently sleeping, add real-time DPS
    if (state.currentSleep?.isActive) {
        dragonBaseDPS = DAMAGE_PER_SLEEP_HOUR / 3600; // Per second
    }

    // Fasting also damages the Insulin Dragon (insulin drops during fasting)
    let dragonFastingDPS = 0;
    if (state.currentFast?.isActive) {
        dragonFastingDPS = DAMAGE_PER_FAST_HOUR_DRAGON / 3600; // Per second
    }

    // Apply all multipliers
    const visceralTotalDPS = (visceralBaseDPS + currentPowerupDPS) * bonuses.visceral.totalMultiplier;
    const dragonTotalDPS = (dragonBaseDPS + dragonFastingDPS) * bonuses.dragon.totalMultiplier;

    return {
        visceralDPS: visceralTotalDPS,
        dragonDPS: dragonTotalDPS,
        visceralBonus: bonuses.visceral.totalMultiplier,
        dragonBonus: bonuses.dragon.totalMultiplier,
        bonuses: bonuses
    };
}

// Update slayer trends and DPS display
function updateSlayerTrendsAndDPS() {
    const dpsData = calculateSlayerDPS();
    const bonuses = dpsData.bonuses;

    // Update DPS displays
    const visceralDPS = document.getElementById('visceral-dps');
    const dragonDPS = document.getElementById('dragon-dps');
    const visceralBonusEl = document.getElementById('visceral-bonus');
    const dragonBonusEl = document.getElementById('dragon-bonus');

    if (visceralDPS) {
        const dpsValue = state.currentFast?.isActive ? formatHP(Math.round(dpsData.visceralDPS * 3600)) : '0';
        visceralDPS.textContent = dpsValue + '/hr';
    }
    if (dragonDPS) {
        const dragonActive = state.currentSleep?.isActive || state.currentFast?.isActive;
        const dpsValue = dragonActive ? formatHP(Math.round(dpsData.dragonDPS * 3600)) : '0';
        dragonDPS.textContent = dpsValue + '/hr';
    }
    if (visceralBonusEl) {
        visceralBonusEl.textContent = dpsData.visceralBonus.toFixed(2) + 'x';
        // Color based on multiplier strength
        if (dpsData.visceralBonus >= 1.4) visceralBonusEl.style.color = '#ef4444';
        else if (dpsData.visceralBonus >= 1.2) visceralBonusEl.style.color = '#fbbf24';
        else visceralBonusEl.style.color = '#fbbf24';
    }
    if (dragonBonusEl) {
        dragonBonusEl.textContent = dpsData.dragonBonus.toFixed(2) + 'x';
        // Color based on multiplier strength
        if (dpsData.dragonBonus >= 1.4) dragonBonusEl.style.color = '#ef4444';
        else if (dpsData.dragonBonus >= 1.2) dragonBonusEl.style.color = '#fbbf24';
        else dragonBonusEl.style.color = '#fbbf24';
    }

    // Update trend indicators
    updateSlayerTrendIndicators();

    // Update damage rate indicator
    const damageRateIndicator = document.getElementById('damage-rate-indicator');
    if (damageRateIndicator) {
        const avgBonus = (dpsData.visceralBonus + dpsData.dragonBonus) / 2;
        if (avgBonus >= 1.5) {
            damageRateIndicator.textContent = 'LEGENDARY!';
            damageRateIndicator.style.background = 'rgba(168, 85, 247, 0.3)';
            damageRateIndicator.style.color = '#a855f7';
        } else if (avgBonus >= 1.3) {
            damageRateIndicator.textContent = 'BLAZING!';
            damageRateIndicator.style.background = 'rgba(239, 68, 68, 0.3)';
            damageRateIndicator.style.color = '#ef4444';
        } else if (avgBonus >= 1.15) {
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

    // Update the Active Damage Bonuses panel
    updateSlayerBonusDisplay(bonuses);
}

// Update the Active Damage Bonuses display panel
function updateSlayerBonusDisplay(bonuses) {
    const panel = document.getElementById('active-bonuses-panel');
    if (!panel) return;

    const visceralBonusList = [];
    const dragonBonusList = [];

    // Heart Points bonus (affects both)
    const hpValue = bonuses.heartPoints;
    let hpBonus = '';
    if (hpValue >= 80) hpBonus = '+25%';
    else if (hpValue >= 60) hpBonus = '+15%';
    else if (hpValue >= 40) hpBonus = '+5%';

    // Visceral bonuses
    if (bonuses.visceral.streakDays >= 3) {
        const streakPct = Math.round(bonuses.visceral.streakBonus * 100);
        visceralBonusList.push(`<span style="color: #fbbf24;">${bonuses.visceral.streakDays}-day streak: +${streakPct}%</span>`);
    }
    if (bonuses.visceral.skillBonus > 0) {
        const skillPct = Math.round(bonuses.visceral.skillBonus * 100);
        visceralBonusList.push(`<span style="color: #22c55e;">Skill levels: +${skillPct}%</span>`);
    }
    if (bonuses.visceral.powerupBonus > 0) {
        visceralBonusList.push(`<span style="color: #3b82f6;">Powerups: +${formatHP(bonuses.visceral.powerupBonus)} flat dmg</span>`);
    }
    if (hpBonus) {
        visceralBonusList.push(`<span style="color: #a855f7;">Heart Points (${hpValue}): ${hpBonus}</span>`);
    }

    // Dragon bonuses
    if (bonuses.dragon.streakDays >= 3) {
        const streakPct = Math.round(bonuses.dragon.streakBonus * 100);
        dragonBonusList.push(`<span style="color: #fbbf24;">${bonuses.dragon.streakDays}-day streak: +${streakPct}%</span>`);
    }
    if (bonuses.dragon.skillBonus > 0) {
        const skillPct = Math.round(bonuses.dragon.skillBonus * 100);
        dragonBonusList.push(`<span style="color: #22c55e;">Skill levels: +${skillPct}%</span>`);
    }
    const eatingMod = bonuses.dragon.eatingQualityModifier;
    if (eatingMod !== 1.0) {
        const eatingPct = Math.round((eatingMod - 1) * 100);
        const sign = eatingPct >= 0 ? '+' : '';
        const color = eatingPct >= 0 ? '#22c55e' : '#ef4444';
        dragonBonusList.push(`<span style="color: ${color};">Eating quality: ${sign}${eatingPct}%</span>`);
    }
    if (hpBonus) {
        dragonBonusList.push(`<span style="color: #a855f7;">Heart Points (${hpValue}): ${hpBonus}</span>`);
    }

    // Update the panel content
    const visceralSection = panel.querySelector('#visceral-bonus-list');
    const dragonSection = panel.querySelector('#dragon-bonus-list');

    if (visceralSection) {
        if (visceralBonusList.length > 0) {
            visceralSection.innerHTML = visceralBonusList.join('<br>');
        } else {
            visceralSection.innerHTML = '<span style="color: var(--dark-text-muted);">No active bonuses</span>';
        }
    }

    if (dragonSection) {
        if (dragonBonusList.length > 0) {
            dragonSection.innerHTML = dragonBonusList.join('<br>');
        } else {
            dragonSection.innerHTML = '<span style="color: var(--dark-text-muted);">No active bonuses</span>';
        }
    }

    // Update total multiplier displays
    const visceralTotal = panel.querySelector('#visceral-total-mult');
    const dragonTotal = panel.querySelector('#dragon-total-mult');
    if (visceralTotal) visceralTotal.textContent = bonuses.visceral.totalMultiplier.toFixed(2) + 'x';
    if (dragonTotal) dragonTotal.textContent = bonuses.dragon.totalMultiplier.toFixed(2) + 'x';
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

function showHealNumber(monster, amount) {
    const container = document.getElementById(`${monster === 'visceral' ? 'visceral' : 'dragon'}-damage-numbers`);
    if (!container) return;

    const healEl = document.createElement('div');
    healEl.className = 'damage-number';
    healEl.textContent = `+${amount}`;
    healEl.style.color = '#22c55e';
    healEl.style.textShadow = '0 0 5px rgba(34, 197, 94, 0.8), 2px 2px 0 #000';
    healEl.style.left = `${20 + Math.random() * 60}%`;
    healEl.style.top = '50%';

    container.appendChild(healEl);
    setTimeout(() => healEl.remove(), 1000);
}

// Show Slayer damage bonus toast when a powerup is added
function showSlayerDamageBonus(powerupType, damageBonus) {
    const powerupNames = {
        water: 'Water',
        hotwater: 'Hot Water',
        coffee: 'Coffee',
        tea: 'Tea',
        exercise: 'Exercise',
        walk: 'Walk',
        hanging: 'Hang',
        grip: 'Grip',
        flatstomach: 'Flat Stomach',
        doctorwin: 'Doctor Win',
        custom: 'Custom'
    };

    const name = powerupNames[powerupType] || powerupType;
    showAchievementToast(
        '<span class="px-icon px-sword"></span>',
        'Battle Bonus!',
        `${name} deals +${damageBonus} damage to Visceral Fat Monster!`,
        'danger'
    );
}

// Show eating quality effect on Dragon damage
function showEatingQualityDragonEffect(eatingType) {
    const modifier = EATING_QUALITY_MODIFIERS[eatingType];
    if (!modifier) return;

    const eatingNames = {
        protein: 'Protein',
        fiber: 'Fiber',
        broth: 'Broth',
        sloweating: 'Slow Eating',
        mealwalk: 'Meal Walk',
        homecooked: 'Homecooked',
        junkfood: 'Junk Food',
        toofast: 'Eating Too Fast',
        eatenout: 'Eaten Out',
        bloated: 'Bloated'
    };

    const name = eatingNames[eatingType] || eatingType;
    const pct = Math.round(Math.abs(modifier) * 100);

    if (modifier > 0) {
        setTimeout(() => {
            showAchievementToast(
                '<span class="px-icon px-lightning"></span>',
                'Dragon Weakness!',
                `${name} increases Dragon damage by +${pct}%!`,
                'epic'
            );
        }, 500);
    } else {
        setTimeout(() => {
            showAchievementToast(
                '<span class="px-icon px-lightning"></span>',
                'Dragon Resistance!',
                `${name} reduces Dragon damage by ${pct}%...`,
                'warning'
            );
        }, 500);
    }
}

// Show damage dealt when completing a fast
function showFastCompletionDamage(duration, powerups) {
    const bonuses = getActiveDamageBonuses();
    const baseDamage = Math.floor(duration * DAMAGE_PER_FAST_HOUR);

    // Calculate powerup bonus
    let powerupDamage = 0;
    for (const powerup of powerups) {
        powerupDamage += POWERUP_DAMAGE_BONUSES[powerup.type] || 0;
    }

    const totalDamage = Math.floor((baseDamage + powerupDamage) * bonuses.visceral.totalMultiplier);

    setTimeout(() => {
        showAchievementToast(
            '<span class="px-icon px-danger"></span>',
            'Visceral Fat Slain!',
            `Dealt ${formatHP(totalDamage)} damage! (${formatHP(baseDamage)} base + ${formatHP(powerupDamage)} powerups × ${bonuses.visceral.totalMultiplier.toFixed(2)}x)`,
            'danger'
        );
    }, 1000);
}

// Show damage dealt when completing sleep
function showSleepCompletionDamage(duration) {
    const bonuses = getActiveDamageBonuses();
    const baseDamage = Math.floor(duration * DAMAGE_PER_SLEEP_HOUR);
    const totalDamage = Math.floor(baseDamage * bonuses.dragon.totalMultiplier);

    setTimeout(() => {
        showAchievementToast(
            '<span class="px-icon px-lightning"></span>',
            'Dragon Wounded!',
            `Dealt ${formatHP(totalDamage)} damage! (${formatHP(baseDamage)} base × ${bonuses.dragon.totalMultiplier.toFixed(2)}x)`,
            'epic'
        );
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
    if (!Array.isArray(state.livingLife.history)) {
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
    closeModalWithAnimation('living-life-modal');
}

// Hide the YOLO celebration modal
function hideYoloCelebrationModal() {
    closeModalWithAnimation('yolo-celebration-modal');
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
    showAchievementToast('<span class="px-icon px-briefcase"></span>', 'Welcome Back!', 'Ready to track again when you are.', 'rare');
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
    if (!Array.isArray(state.livingLife.history)) {
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

    // Show the Golden Sui YOLO celebration!
    showYoloCelebration();

    // Update UI
    updateLivingLifeUI();
    updateUI();
    updatePowerupStates();
}

// YOLO celebration quotes - Golden Sui wisdom
const yoloQuotes = [
    "Some players are YOLO-ing... and I'm very concerned.",
    "You've seen this health curve go up 10x... but today? Today we feast.",
    "The Sleep God grants you 24 hours of freedom. Use them wisely... or don't.",
    "Even gods take days off. This is mine. And yours.",
    "Rules are for mortals. Today, you transcend.",
    "I calculated the risk. Then I remembered... I'm a ghost. YOLO.",
    "One does not simply track macros on a day like this.",
    "Tomorrow we continue. Tonight we celebrate.",
    "They asked who's YOLO-ing. I'm not going to answer that.",
    "Somewhere, a health app is crying. Let it."
];

// Valentine's Day YOLO quotes - Love-struck Sui
const valentineQuotes = [
    "Love is the only thing that burns more calories than fasting.",
    "Roses are red, my glow is gold... today it's pink, because love is bold.",
    "The heart wants what the heart wants. Tonight, it wants dessert.",
    "I'm a ghost, and even I feel butterflies today.",
    "Forget heart points. Today is about heart FEELINGS.",
    "They say love is blind. So is Sui to your calorie count today.",
    "You + rest day + someone you love = the real health hack.",
    "Even the Sleep God believes in love at first bite.",
    "Your heart rate is up and it's not from exercise. Happy Valentine's Day.",
    "The strongest muscle is the heart. Give it a workout today."
];

// Show the YOLO celebration with Golden Sui (or Valentine Sui on Feb 14!)
function showYoloCelebration() {
    const modal = document.getElementById('yolo-celebration-modal');
    const quoteEl = document.getElementById('yolo-sui-quote');
    const ghost = document.getElementById('yolo-sui-ghost');
    const content = document.getElementById('yolo-celebration-content');

    if (!modal || !quoteEl) return;

    // Valentine's Day easter egg!
    const now = new Date();
    const isValentines = (now.getMonth() === 1 && now.getDate() === 14);

    // Pick a random quote from the right pool
    const quotes = isValentines ? valentineQuotes : yoloQuotes;
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    quoteEl.textContent = `"${quote}"`;

    // Apply Valentine's theme if it's Feb 14
    if (isValentines) {
        applyValentineYoloTheme(modal, ghost);
    } else {
        clearValentineYoloTheme(modal, ghost);
    }

    // Reset animations
    if (ghost) {
        ghost.style.animation = 'none';
        ghost.offsetHeight;
        ghost.style.animation = '';
    }
    if (content) {
        content.style.animation = 'none';
        content.offsetHeight;
        content.style.animation = '';
    }

    modal.classList.remove('hidden');
}

// Valentine's Day YOLO theme — pink Sui with heart-eyes
function applyValentineYoloTheme(modal, ghost) {
    const pink = 'rgba(236, 72, 153, ';  // pink-500 base
    const rose = 'rgba(244, 63, 94, ';    // rose-500 base

    // Recolor ghost SVG from gold to pink
    if (ghost) {
        const svg = ghost.querySelector('svg');
        if (svg) {
            // Replace golden Sui with pink Valentine Sui (heart-eyes, no sunglasses)
            svg.innerHTML = `
                <!-- Valentine hair (pink curls) -->
                <rect fill="${pink}0.35)" x="5" y="0" width="2" height="1"/>
                <rect fill="${pink}0.3)" x="9" y="0" width="2" height="1"/>
                <rect fill="${pink}0.4)" x="3" y="1" width="2" height="1"/>
                <rect fill="${pink}0.5)" x="6" y="1" width="4" height="1"/>
                <rect fill="${pink}0.4)" x="11" y="1" width="2" height="1"/>
                <rect fill="${pink}0.3)" x="3" y="2" width="1" height="1"/>
                <rect fill="${pink}0.3)" x="12" y="2" width="1" height="1"/>
                <!-- Ghost body -->
                <path fill="${pink}0.2)" d="M4 2h8v1h1v1h1v12h-1v1h-1v1h-1v-2h-1v2h-2v-2h-1v2h-1v-2h-1v2H4v-1H3v-1H2V4h1V3h1V2z"/>
                <!-- Ghost outline glow -->
                <path fill="${pink}0.5)" d="M5 3h6v1h1v1h1v10h-1v1h-1v-1h-1v1h-2v-1H7v1H5v-1H4v-1H3V5h1V4h1V3z"/>
                <!-- Heart-eyes (left) -->
                <rect fill="${rose}0.9)" x="5" y="6" width="1" height="1"/>
                <rect fill="${rose}0.9)" x="7" y="6" width="1" height="1"/>
                <rect fill="${rose}0.9)" x="4" y="7" width="4" height="1"/>
                <rect fill="${rose}0.9)" x="5" y="8" width="2" height="1"/>
                <!-- Heart-eyes (right) -->
                <rect fill="${rose}0.9)" x="9" y="6" width="1" height="1"/>
                <rect fill="${rose}0.9)" x="11" y="6" width="1" height="1"/>
                <rect fill="${rose}0.9)" x="8" y="7" width="4" height="1"/>
                <rect fill="${rose}0.9)" x="9" y="8" width="2" height="1"/>
                <!-- Mouth (love-struck smile) -->
                <rect fill="${pink}0.7)" x="6" y="11" width="4" height="1"/>
                <rect fill="${pink}0.5)" x="5" y="10" width="1" height="1"/>
                <rect fill="${pink}0.5)" x="10" y="10" width="1" height="1"/>
            `;
        }
    }

    // Recolor title
    const title = modal.querySelector('.text-3xl');
    if (title) {
        title.textContent = 'Y  O  L  \u2665';
        title.style.color = '#ec4899';
        title.style.textShadow = '0 0 20px rgba(236, 72, 153, 0.8), 0 0 40px rgba(236, 72, 153, 0.4)';
    }

    // Recolor quote box
    const quoteBox = modal.querySelector('.px-6.py-4');
    if (quoteBox) {
        quoteBox.style.background = 'rgba(236, 72, 153, 0.08)';
        quoteBox.style.border = '2px solid rgba(236, 72, 153, 0.4)';
        quoteBox.style.boxShadow = '0 0 30px rgba(236, 72, 153, 0.15)';
    }

    // Recolor quote text
    const quoteEl = document.getElementById('yolo-sui-quote');
    if (quoteEl) {
        quoteEl.style.color = '#f9a8d4';
        quoteEl.style.textShadow = '0 0 10px rgba(236, 72, 153, 0.5)';
    }

    // Recolor attribution
    const attribution = quoteBox?.querySelector('.text-sm');
    if (attribution) {
        attribution.style.color = 'rgba(236, 72, 153, 0.6)';
        attribution.textContent = '\u2014 Sui, The Sleep God \u2665';
    }

    // Recolor info text
    const info = modal.querySelector('.text-sm.flex');
    if (info) {
        info.style.color = '#fda4af';
        info.innerHTML = 'Living Life for 24 hours. No tracking. No guilt.<br>Happy Valentine\'s Day! <span class="px-icon px-heart"></span>';
    }

    // Recolor dismiss text
    const dismiss = modal.querySelector('.text-xs.mt-4');
    if (dismiss) dismiss.style.color = 'rgba(236, 72, 153, 0.3)';

    // Override glow animation to pink
    if (ghost) {
        ghost.style.setProperty('--yolo-glow-color', 'rgba(236, 72, 153, 0.6)');
        ghost.style.filter = 'drop-shadow(0 0 20px rgba(236, 72, 153, 0.6))';
    }

    // Add floating hearts to the background
    modal.style.background = 'rgba(0,0,0,0.95)';
    let heartsContainer = modal.querySelector('.valentine-hearts');
    if (!heartsContainer) {
        heartsContainer = document.createElement('div');
        heartsContainer.className = 'valentine-hearts';
        heartsContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
        for (let i = 0; i < 12; i++) {
            const heart = document.createElement('div');
            heart.textContent = '\u2665';
            heart.style.cssText = `
                position:absolute;
                color:rgba(236,72,153,${0.1 + Math.random() * 0.15});
                font-size:${14 + Math.random() * 24}px;
                left:${Math.random() * 100}%;
                top:${Math.random() * 100}%;
                animation:valentineFloat ${3 + Math.random() * 4}s ease-in-out infinite ${Math.random() * 3}s;
            `;
            heartsContainer.appendChild(heart);
        }
        modal.insertBefore(heartsContainer, modal.firstChild);
    }
}

// Clear Valentine theme (restore gold) — for when modal is reused on non-Valentine days
function clearValentineYoloTheme(modal, ghost) {
    // Remove floating hearts if they exist
    const heartsContainer = modal?.querySelector('.valentine-hearts');
    if (heartsContainer) heartsContainer.remove();

    // Reset inline styles (the HTML defaults are gold)
    const title = modal?.querySelector('.text-3xl');
    if (title) {
        title.textContent = 'Y O L O';
        title.style.color = '';
        title.style.textShadow = '';
    }

    const quoteBox = modal?.querySelector('.px-6.py-4');
    if (quoteBox) {
        quoteBox.style.background = '';
        quoteBox.style.border = '';
        quoteBox.style.boxShadow = '';
    }

    const quoteEl = document.getElementById('yolo-sui-quote');
    if (quoteEl) {
        quoteEl.style.color = '';
        quoteEl.style.textShadow = '';
    }

    const attribution = quoteBox?.querySelector('.text-sm');
    if (attribution) {
        attribution.style.color = '';
        attribution.textContent = '\u2014 Sui, The Sleep God';
    }

    const info = modal?.querySelector('.text-sm.flex');
    if (info) {
        info.style.color = '';
        info.innerHTML = 'Living Life for 24 hours. No tracking. No guilt.<br>See you tomorrow, champ! <span class="px-icon px-palm"></span>';
    }

    const dismiss = modal?.querySelector('.text-xs.mt-4');
    if (dismiss) dismiss.style.color = '';

    if (ghost) {
        ghost.style.filter = '';
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

            // Living Life period ended
        } else {
            // Update the timer display
            updateLivingLifeUI();
        }
    }
}

// Start periodic Living Life check (every minute)
livingLifeInterval = setInterval(checkLivingLifeStatus, 60000);

// ==========================================
// FORUM SYSTEM (Chronicles)
// ==========================================

// Forum rate limiting
const FORUM_POST_COOLDOWN = 60000; // 1 minute between posts
const FORUM_LIKE_COOLDOWN = 1000;  // 1 second between likes
let lastForumPostTime = 0;
let lastForumLikeTime = 0;

// Forum state
let forumPosts = [];
let forumFilter = 'latest';
let forumUserLikes = {}; // Cache of current user's likes
let forumListenerRef = null;
let forumOldestTimestamp = null; // For pagination

// Initialize forum event listeners
function initForumListeners() {
    // Character counter and post button
    const input = document.getElementById('forum-post-input');
    const charCount = document.getElementById('forum-char-count');
    const postBtn = document.getElementById('forum-post-btn');

    if (input) {
        input.addEventListener('input', () => {
            const len = input.value.length;
            charCount.textContent = `${len}/280`;
            postBtn.disabled = len === 0 || len > 280;

            // Color warning when near limit
            if (len > 260) {
                charCount.style.color = '#ef4444';
            } else if (len > 200) {
                charCount.style.color = '#f59e0b';
            } else {
                charCount.style.color = 'var(--dark-text-muted)';
            }
        });
    }

    if (postBtn) {
        postBtn.addEventListener('click', createForumPost);
    }

    // Filter buttons
    document.getElementById('forum-filter-latest')?.addEventListener('click', () => switchForumFilter('latest'));
    document.getElementById('forum-filter-mine')?.addEventListener('click', () => switchForumFilter('mine'));

    // Load more button
    document.getElementById('forum-load-more')?.addEventListener('click', () => loadForumPosts(true));

    // Event delegation for like and delete buttons (handles all current and future posts)
    const postsContainer = document.getElementById('forum-posts-container');
    if (postsContainer) {
        postsContainer.addEventListener('click', (e) => {
            // Like button — match the button or any child inside it
            const likeBtn = e.target.closest('.forum-like-btn');
            if (likeBtn) {
                e.preventDefault();
                e.stopPropagation();
                toggleForumLike(likeBtn.dataset.postId);
                return;
            }
            // Delete button
            const deleteBtn = e.target.closest('.forum-delete-btn');
            if (deleteBtn) {
                e.preventDefault();
                e.stopPropagation();
                deleteForumPost(deleteBtn.dataset.postId);
                return;
            }
            // Block button
            const blockBtn = e.target.closest('.forum-block-btn');
            if (blockBtn) {
                e.preventDefault();
                e.stopPropagation();
                blockForumUser(blockBtn.dataset.authorUid, blockBtn.dataset.authorUsername);
                return;
            }
            // Report button
            const reportBtn = e.target.closest('.forum-report-btn');
            if (reportBtn) {
                e.preventDefault();
                e.stopPropagation();
                reportForumPost(reportBtn.dataset.postId);
                return;
            }
        });
    }
}

// Update forum UI based on auth state
function updateForumAuthUI() {
    const authRequired = document.getElementById('forum-auth-required');
    const composer = document.getElementById('forum-composer');

    if (firebaseSync && firebaseSync.isAuthenticated() && currentUsername) {
        authRequired?.classList.add('hidden');
        composer?.classList.remove('hidden');
    } else {
        authRequired?.classList.remove('hidden');
        composer?.classList.add('hidden');
    }
}

// Create a new forum post
async function createForumPost() {
    // Auth check
    if (!firebaseSync?.isAuthenticated() || !currentUsername) {
        showAchievementToast('<span class="px-icon px-scroll"></span>', 'Sign In Required', 'Please sign in to post.', 'warning');
        return;
    }

    // Rate limiting
    const now = Date.now();
    if (now - lastForumPostTime < FORUM_POST_COOLDOWN) {
        const remaining = Math.ceil((FORUM_POST_COOLDOWN - (now - lastForumPostTime)) / 1000);
        showAchievementToast('<span class="px-icon px-clock"></span>', 'Cooldown Active', `Wait ${remaining}s before posting again.`, 'warning');
        return;
    }

    const input = document.getElementById('forum-post-input');
    const content = input.value.trim();

    // Validation
    if (!content || content.length > 280) {
        return;
    }

    // Block URLs/links for safety
    const urlPattern = /https?:\/\/|www\.|\.com|\.org|\.net|\.io|\.co|\.gg|\.me|\.tv|\.xyz|\.app|\.dev/i;
    if (urlPattern.test(content)) {
        showAchievementToast('<span class="px-icon px-warning"></span>', 'Links Not Allowed', 'Posts cannot contain URLs or links.', 'warning');
        return;
    }

    // Content filter — block inappropriate language
    if (containsBlockedContent(content)) {
        showAchievementToast('<span class="px-icon px-warning"></span>', 'Content Not Allowed', 'Your post contains language that isn\'t allowed. Please rephrase and try again.', 'warning');
        return;
    }

    try {
        const postId = `${Date.now()}_${firebaseSync.currentUser.uid.substring(0, 8)}`;
        const equippedItem = getEquippedItem();

        const postData = {
            id: postId,
            content: content, // Will be escaped on render
            authorUid: firebaseSync.currentUser.uid,
            authorUsername: currentUsername,
            authorEquippedItem: equippedItem?.id || null,
            timestamp: Date.now(),
            likeCount: 0
        };

        // Write to Firebase
        await database.ref(`forum/posts/${postId}`).set(postData);
        await database.ref(`forum/userPosts/${firebaseSync.currentUser.uid}/${postId}`).set(true);

        // Update server-side rate limit timestamp
        await database.ref(`forum/rateLimit/${firebaseSync.currentUser.uid}/lastPostTime`).set(postData.timestamp);

        // Update client-side rate limit
        lastForumPostTime = Date.now();

        // Clear input
        input.value = '';
        document.getElementById('forum-char-count').textContent = '0/280';
        document.getElementById('forum-post-btn').disabled = true;

        showAchievementToast('<span class="px-icon px-scroll"></span>', 'Chronicle Posted!', 'Your journey has been shared.', 'success');

    } catch (err) {
        console.error('Error creating forum post:', err);
        showAchievementToast('<span class="px-icon px-danger"></span>', 'Post Failed', 'Please try again.', 'danger');
    }
}

// Toggle like on a post
async function toggleForumLike(postId) {
    if (!firebaseSync?.isAuthenticated()) {
        showAchievementToast('<span class="px-icon px-heart"></span>', 'Sign In Required', 'Please sign in to like posts.', 'warning');
        return;
    }

    // Rate limiting
    const now = Date.now();
    if (now - lastForumLikeTime < FORUM_LIKE_COOLDOWN) {
        return;
    }
    lastForumLikeTime = now;

    const uid = firebaseSync.currentUser.uid;
    const likeRef = database.ref(`forum/likes/${postId}/${uid}`);
    const postRef = database.ref(`forum/posts/${postId}`);

    try {
        const likeSnapshot = await likeRef.once('value');
        const isLiked = likeSnapshot.exists();

        if (isLiked) {
            // Unlike
            await likeRef.remove();
            await postRef.child('likeCount').transaction(count => Math.max(0, (count || 0) - 1));
            forumUserLikes[postId] = false;
        } else {
            // Like
            await likeRef.set(true);
            await postRef.child('likeCount').transaction(count => (count || 0) + 1);
            forumUserLikes[postId] = true;
        }

        // Update server-side rate limit timestamp AFTER successful like/unlike
        await database.ref(`forum/rateLimit/${uid}/lastLikeTime`).set(Date.now());

        // Update UI
        updateForumPostLikeUI(postId);

    } catch (err) {
        console.error('Error toggling forum like:', err);
    }
}

// Load forum posts
async function loadForumPosts(loadMore = false) {
    if (!firebaseSync?.isAuthenticated()) {
        document.getElementById('forum-loading')?.classList.add('hidden');
        document.getElementById('forum-empty')?.classList.remove('hidden');
        return;
    }

    try {
        const container = document.getElementById('forum-posts-container');
        const loadingEl = document.getElementById('forum-loading');
        const emptyEl = document.getElementById('forum-empty');
        const loadMoreBtn = document.getElementById('forum-load-more');

        if (!loadMore) {
            loadingEl?.classList.remove('hidden');
            emptyEl?.classList.add('hidden');
            loadMoreBtn?.classList.add('hidden');
            container.innerHTML = '';
            forumPosts = [];
            forumOldestTimestamp = null;
        }

        const limit = 20;
        let newPosts = [];

        if (forumFilter === 'mine') {
            // Get user's post IDs first
            const userPostsRef = database.ref(`forum/userPosts/${firebaseSync.currentUser.uid}`);
            const userPostsSnapshot = await userPostsRef.once('value');
            const allPostIds = Object.keys(userPostsSnapshot.val() || {});

            // Sort by timestamp (newer first) and paginate
            allPostIds.sort().reverse();

            const startIdx = loadMore ? forumPosts.length : 0;
            const postIds = allPostIds.slice(startIdx, startIdx + limit);

            // Load each post
            for (const postId of postIds) {
                const postSnapshot = await database.ref(`forum/posts/${postId}`).once('value');
                if (postSnapshot.exists()) {
                    newPosts.push(postSnapshot.val());
                }
            }
            newPosts.sort((a, b) => b.timestamp - a.timestamp);

            // Show load more if there are more posts
            if (allPostIds.length > startIdx + postIds.length) {
                loadMoreBtn?.classList.remove('hidden');
            } else {
                loadMoreBtn?.classList.add('hidden');
            }

        } else {
            // Load latest posts
            let query = database.ref('forum/posts').orderByChild('timestamp');

            if (loadMore && forumOldestTimestamp) {
                query = query.endAt(forumOldestTimestamp - 1);
            }

            const snapshot = await query.limitToLast(limit).once('value');
            const data = snapshot.val() || {};
            newPosts = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);

            // Update oldest timestamp for pagination
            if (newPosts.length > 0) {
                forumOldestTimestamp = newPosts[newPosts.length - 1].timestamp;
            }

            // Show load more if we got a full page
            if (newPosts.length >= limit) {
                loadMoreBtn?.classList.remove('hidden');
            } else {
                loadMoreBtn?.classList.add('hidden');
            }
        }

        // Add new posts to array
        if (loadMore) {
            forumPosts = [...forumPosts, ...newPosts];
        } else {
            forumPosts = newPosts;
        }

        // Load user's likes for these posts
        await loadForumUserLikes(newPosts);

        loadingEl?.classList.add('hidden');

        if (forumPosts.length === 0) {
            emptyEl?.classList.remove('hidden');
        } else {
            emptyEl?.classList.add('hidden');
            renderForumPosts();
        }

    } catch (err) {
        console.error('Error loading forum posts:', err);
        document.getElementById('forum-loading')?.classList.add('hidden');
    }
}

// Load user's likes for efficient UI updates
async function loadForumUserLikes(posts) {
    if (!firebaseSync?.isAuthenticated() || !posts.length) return;

    const uid = firebaseSync.currentUser.uid;

    for (const post of posts) {
        try {
            const likeRef = database.ref(`forum/likes/${post.id}/${uid}`);
            const snapshot = await likeRef.once('value');
            forumUserLikes[post.id] = snapshot.exists();
        } catch (e) {
            forumUserLikes[post.id] = false;
        }
    }
}

// Render forum posts to DOM (filters blocked users and inappropriate content)
function renderForumPosts() {
    const container = document.getElementById('forum-posts-container');
    if (!container) return;

    const blockedUids = new Set((Array.isArray(state.blockedUsers) ? state.blockedUsers : []).map(b => b.uid));
    const visiblePosts = forumPosts.filter(post => {
        // Hide posts from blocked users
        if (blockedUids.has(post.authorUid)) return false;
        // Hide posts with blocked content (safety filter)
        if (containsBlockedContent(post.content)) return false;
        return true;
    });

    container.innerHTML = visiblePosts.map(post => renderForumPostCard(post)).join('');
}

// Render individual forum post card
function renderForumPostCard(post) {
    const timeAgo = formatForumTimeAgo(post.timestamp);
    const isLiked = forumUserLikes[post.id];
    const likedColor = isLiked ? '#ef4444' : 'var(--dark-text-muted)';
    const isOwnPost = firebaseSync?.currentUser?.uid && post.authorUid === firebaseSync.currentUser.uid;

    const actionBtn = isOwnPost ? `
                <button class="forum-delete-btn flex items-center gap-1 text-xs transition-colors hover:scale-110"
                        data-post-id="${sanitizeAttribute(post.id)}"
                        style="color: var(--dark-text-muted); margin-left: auto;"
                        title="Delete post">
                    <span class="px-icon px-danger" style="width: 14px; height: 14px;"></span>
                </button>` : `
                <button class="forum-block-btn flex items-center gap-1 text-xs transition-colors hover:scale-110"
                        data-post-id="${sanitizeAttribute(post.id)}"
                        data-author-uid="${sanitizeAttribute(post.authorUid)}"
                        data-author-username="${sanitizeAttribute(post.authorUsername)}"
                        style="color: var(--dark-text-muted); margin-left: auto;"
                        title="Block user">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                </button>
                <button class="forum-report-btn flex items-center gap-1 text-xs transition-colors hover:scale-110"
                        data-post-id="${sanitizeAttribute(post.id)}"
                        style="color: var(--dark-text-muted);"
                        title="Report post">
                    <span class="px-icon px-warning" style="width: 14px; height: 14px;"></span>
                </button>`;

    return `
        <div class="forum-post dark-card rounded-lg p-4" data-post-id="${sanitizeAttribute(post.id)}">
            <div class="flex items-center gap-2 mb-2 flex-wrap">
                <span class="font-bold text-sm" style="color: #06b6d4;">${escapeHtml(post.authorUsername)}</span>
                <span class="text-xs" style="color: var(--dark-text-muted);">· ${timeAgo}</span>
            </div>
            <p class="text-sm break-words whitespace-pre-wrap mb-3" style="color: var(--dark-text);">${escapeHtml(post.content)}</p>
            <div class="flex items-center gap-4">
                <button class="forum-like-btn flex items-center gap-1.5 text-xs transition-colors active:scale-125"
                        data-post-id="${sanitizeAttribute(post.id)}"
                        style="color: ${likedColor}; padding: 8px 12px; margin: -8px -12px; -webkit-tap-highlight-color: transparent;">
                    <span class="px-icon ${isLiked ? 'px-heart' : 'px-heart-empty'}" style="width: 16px; height: 16px; display: inline-block;"></span>
                    <span class="like-count">${post.likeCount || 0}</span>
                </button>${actionBtn}
            </div>
        </div>
    `;
}

// Delete a forum post (own posts only)
async function deleteForumPost(postId) {
    if (!firebaseSync?.isAuthenticated()) return;

    const post = forumPosts.find(p => p.id === postId);
    if (!post) return;

    // Verify ownership
    if (post.authorUid !== firebaseSync.currentUser.uid) {
        showAchievementToast('<span class="px-icon px-warning"></span>', 'Cannot Delete', 'You can only delete your own posts.', 'warning');
        return;
    }

    const confirmed = await showConfirmModal('Delete this post? This cannot be undone.', 'Delete Post');
    if (!confirmed) return;

    try {
        const uid = firebaseSync.currentUser.uid;

        // Delete post, its likes, and the user post index entry
        await Promise.all([
            database.ref(`forum/posts/${postId}`).remove(),
            database.ref(`forum/likes/${postId}`).remove(),
            database.ref(`forum/userPosts/${uid}/${postId}`).remove()
        ]);

        // Remove from local array and re-render
        forumPosts = forumPosts.filter(p => p.id !== postId);
        delete forumUserLikes[postId];
        renderForumPosts();

        // Show empty state if no posts left
        if (forumPosts.length === 0) {
            const emptyEl = document.getElementById('forum-empty');
            if (emptyEl) emptyEl.classList.remove('hidden');
        }

        showAchievementToast('<span class="px-icon px-check"></span>', 'Post Deleted', 'Your post has been removed.', 'success');
    } catch (err) {
        console.error('Error deleting forum post:', err);
        showAchievementToast('<span class="px-icon px-danger"></span>', 'Delete Failed', 'Please try again.', 'danger');
    }
}

// Report a forum post (other users' posts)
async function reportForumPost(postId) {
    if (!firebaseSync?.isAuthenticated()) {
        showAchievementToast('<span class="px-icon px-scroll"></span>', 'Sign In Required', 'Please sign in to report posts.', 'warning');
        return;
    }

    const post = forumPosts.find(p => p.id === postId);
    if (!post) return;

    const uid = firebaseSync.currentUser.uid;

    // Check if already reported
    try {
        const existingReport = await database.ref(`forum/reports/${postId}/${uid}`).once('value');
        if (existingReport.exists()) {
            showAchievementToast('<span class="px-icon px-check"></span>', 'Already Reported', 'You\'ve already reported this post. We\'ll review it.', 'info');
            return;
        }
    } catch (e) {
        // Continue with report
    }

    const confirmed = await showConfirmModal('Report this post as inappropriate or abusive?', 'Report Post');
    if (!confirmed) return;

    try {
        await database.ref(`forum/reports/${postId}/${uid}`).set({
            reportedAt: Date.now(),
            reporterUid: uid,
            postAuthorUid: post.authorUid,
            postContent: (post.content || '').substring(0, 100)
        });

        showAchievementToast('<span class="px-icon px-check"></span>', 'Post Reported', 'Thanks for helping keep the community safe.', 'success');
    } catch (err) {
        console.error('Error reporting forum post:', err);
        showAchievementToast('<span class="px-icon px-danger"></span>', 'Report Failed', 'Please try again.', 'danger');
    }
}

// Block a forum user
async function blockForumUser(authorUid, authorUsername) {
    if (!firebaseSync?.isAuthenticated()) {
        showAchievementToast('<span class="px-icon px-scroll"></span>', 'Sign In Required', 'Please sign in to block users.', 'warning');
        return;
    }
    if (authorUid === firebaseSync.currentUser.uid) return;

    // Check if already blocked
    if (!Array.isArray(state.blockedUsers)) state.blockedUsers = [];
    if (state.blockedUsers.some(b => b.uid === authorUid)) {
        showAchievementToast('<span class="px-icon px-check"></span>', 'Already Blocked', `${escapeHtml(authorUsername)} is already blocked.`, 'info');
        return;
    }

    const confirmed = await showConfirmModal(`Block ${escapeHtml(authorUsername)}? You won't see their posts anymore. You can unblock them in Settings.`, 'Block User');
    if (!confirmed) return;

    state.blockedUsers.push({
        uid: authorUid,
        username: authorUsername,
        blockedAt: Date.now()
    });
    saveState();
    renderForumPosts();
    renderBlockedUsersList();
    showAchievementToast('<span class="px-icon px-check"></span>', 'User Blocked', `${escapeHtml(authorUsername)} has been blocked.`, 'success');
}

// Unblock a forum user
function unblockForumUser(authorUid) {
    if (!Array.isArray(state.blockedUsers)) return;
    const user = state.blockedUsers.find(b => b.uid === authorUid);
    if (!user) return;

    state.blockedUsers = state.blockedUsers.filter(b => b.uid !== authorUid);
    saveState();
    renderForumPosts();
    renderBlockedUsersList();
    showAchievementToast('<span class="px-icon px-check"></span>', 'User Unblocked', `${escapeHtml(user.username)} has been unblocked.`, 'success');
}

// Render blocked users list in settings
function renderBlockedUsersList() {
    const container = document.getElementById('blocked-users-list');
    if (!container) return;

    const blocked = Array.isArray(state.blockedUsers) ? state.blockedUsers : [];
    if (blocked.length === 0) {
        container.innerHTML = '<p class="text-xs" style="color: var(--dark-text-muted);">No blocked users.</p>';
        return;
    }

    container.innerHTML = blocked.map(b => `
        <div class="flex items-center justify-between p-2 rounded-lg mb-1" style="background: rgba(255,255,255,0.03); border: 1px solid var(--dark-border);">
            <span class="text-sm" style="color: var(--dark-text);">${escapeHtml(b.username)}</span>
            <button class="unblock-user-btn text-xs px-2 py-1 rounded" data-uid="${sanitizeAttribute(b.uid)}" style="background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.3);">Unblock</button>
        </div>
    `).join('');

    // Attach unblock listeners
    container.querySelectorAll('.unblock-user-btn').forEach(btn => {
        btn.addEventListener('click', () => unblockForumUser(btn.dataset.uid));
    });
}

// --- Content Filtering (Forum Safety) ---
// Basic profanity/slur filter to comply with App Store Guideline 1.2
const BLOCKED_WORDS = [
    // Slurs and hate speech
    'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded', 'tranny',
    'chink', 'spic', 'wetback', 'kike', 'gook', 'coon', 'dyke',
    // Severe profanity
    'fuck', 'shit', 'cunt', 'bitch', 'asshole', 'dick', 'cock', 'pussy',
    'bastard', 'whore', 'slut', 'damn', 'piss',
    // Violence/threats
    'kill yourself', 'kys', 'go die', 'neck yourself'
];

// Build regex from blocked words (word boundary matching, case insensitive)
const BLOCKED_WORDS_REGEX = new RegExp(
    BLOCKED_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
    'i'
);

function containsBlockedContent(text) {
    if (!text || typeof text !== 'string') return false;
    return BLOCKED_WORDS_REGEX.test(text);
}

// Format timestamp to relative time for forum
function formatForumTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
        return new Date(timestamp).toLocaleDateString();
    } else if (days > 0) {
        return `${days}d`;
    } else if (hours > 0) {
        return `${hours}h`;
    } else if (minutes > 0) {
        return `${minutes}m`;
    } else {
        return 'now';
    }
}

// Switch forum filter
function switchForumFilter(filter) {
    forumFilter = filter;

    // Update button styles
    const latestBtn = document.getElementById('forum-filter-latest');
    const mineBtn = document.getElementById('forum-filter-mine');

    if (filter === 'latest') {
        if (latestBtn) {
            latestBtn.style.background = 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)';
            latestBtn.style.color = 'white';
            latestBtn.style.border = 'none';
        }
        if (mineBtn) {
            mineBtn.style.background = 'transparent';
            mineBtn.style.color = '#06b6d4';
            mineBtn.style.border = '1px solid var(--dark-border)';
        }
    } else {
        if (mineBtn) {
            mineBtn.style.background = 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)';
            mineBtn.style.color = 'white';
            mineBtn.style.border = 'none';
        }
        if (latestBtn) {
            latestBtn.style.background = 'transparent';
            latestBtn.style.color = '#06b6d4';
            latestBtn.style.border = '1px solid var(--dark-border)';
        }
    }

    loadForumPosts();
}

// Set up real-time listener for new forum posts
function setupForumRealTimeListener() {
    // Clean up existing listener
    if (forumListenerRef) {
        forumListenerRef.off();
        forumListenerRef = null;
    }

    if (!firebaseSync?.isAuthenticated()) return;

    // Listen for new posts (only when viewing latest)
    if (forumFilter !== 'latest') return;

    forumListenerRef = database.ref('forum/posts').orderByChild('timestamp');

    // Listen for new posts added after current time
    const startTime = Date.now();
    forumListenerRef.on('child_added', (snapshot) => {
        const newPost = snapshot.val();

        // Only add if it's newer than when we started listening
        if (newPost.timestamp < startTime) return;

        // Avoid duplicates
        if (forumPosts.find(p => p.id === newPost.id)) return;

        // Add to beginning of array
        forumPosts.unshift(newPost);
        forumUserLikes[newPost.id] = false; // Default to not liked

        // Re-render if viewing latest
        if (forumFilter === 'latest') {
            renderForumPosts();
        }
    });

    // Listen for like count updates
    forumListenerRef.on('child_changed', (snapshot) => {
        const updatedPost = snapshot.val();
        const postIndex = forumPosts.findIndex(p => p.id === updatedPost.id);

        if (postIndex !== -1) {
            forumPosts[postIndex] = updatedPost;
            updateForumPostLikeUI(updatedPost.id);
        }
    });

    // Listen for deleted posts (real-time sync across devices)
    forumListenerRef.on('child_removed', (snapshot) => {
        const removedPost = snapshot.val();
        if (!removedPost) return;

        const postIndex = forumPosts.findIndex(p => p.id === removedPost.id);
        if (postIndex !== -1) {
            forumPosts.splice(postIndex, 1);
            delete forumUserLikes[removedPost.id];
            renderForumPosts();
        }
    });
}

// Cleanup forum listeners
function cleanupForumListeners() {
    if (forumListenerRef) {
        forumListenerRef.off();
        forumListenerRef = null;
    }
}

// Update single post's like UI
function updateForumPostLikeUI(postId) {
    const post = forumPosts.find(p => p.id === postId);
    if (!post) return;

    const postEl = document.querySelector(`.forum-post[data-post-id="${postId}"]`);
    if (!postEl) return;

    const likeBtn = postEl.querySelector('.forum-like-btn');
    const likeCount = postEl.querySelector('.like-count');

    const isLiked = forumUserLikes[postId];

    if (likeBtn) {
        likeBtn.style.color = isLiked ? '#ef4444' : 'var(--dark-text-muted)';
        const heartSpan = likeBtn.querySelector('.px-icon');
        if (heartSpan) {
            heartSpan.className = `px-icon ${isLiked ? 'px-heart' : 'px-heart-empty'}`;
        }
    }

    // Fetch fresh like count
    database.ref(`forum/posts/${postId}/likeCount`).once('value').then(snap => {
        if (likeCount) {
            likeCount.textContent = snap.val() || 0;
        }
        // Also update in our local array
        if (post) {
            post.likeCount = snap.val() || 0;
        }
    });
}


// ==========================================
// CAPACITOR NATIVE PLUGINS
// ==========================================
// These functions provide native iOS/Android features via Capacitor plugins.
// On web, they silently no-op.

function isCapacitorNative() {
    return window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
}

// ==========================================
// TESTFLIGHT BETA PROMO (WEB ONLY)
// ==========================================

function showTestFlightPromo() {
    // Only show on web, never on native iOS app
    if (isCapacitorNative()) return;

    const banner = document.getElementById('testflight-banner');
    const dismissed = localStorage.getItem('testflight-banner-dismissed');

    // Show persistent banner if not dismissed
    if (banner && !dismissed) {
        banner.classList.remove('hidden');
    }

    // Show one-time toast notification
    const toastShown = localStorage.getItem('testflight-toast-shown');
    if (!toastShown) {
        setTimeout(() => {
            showAchievementToast(
                '<span class="px-icon px-star"></span>',
                'Now on iOS!',
                'Sleep Suivour is in beta on TestFlight — tap the banner to join!',
                'epic'
            );
            localStorage.setItem('testflight-toast-shown', 'true');
        }, 3000); // Delay so it doesn't compete with other init toasts
    }
}

function dismissTestFlightBanner() {
    const banner = document.getElementById('testflight-banner');
    if (banner) {
        banner.style.transition = 'opacity 0.3s, transform 0.3s';
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(-10px)';
        setTimeout(() => banner.classList.add('hidden'), 300);
    }
    localStorage.setItem('testflight-banner-dismissed', 'true');
}

// ==========================================
// SUI PRO — PREMIUM SUBSCRIPTION
// ==========================================

function isPremiumActive() {
    if (!state.premium || typeof state.premium !== 'object') return false;
    if (!state.premium.isActive) return false;
    // Only trust premium state from verified StoreKit transactions
    const validSources = ['storekit', 'restored'];
    if (!state.premium.source || !validSources.includes(state.premium.source)) {
        return false;
    }
    // If expiresAt is set, check it hasn't expired
    if (state.premium.expiresAt && Date.now() > state.premium.expiresAt) {
        // Subscription expired — clear it
        clearPremiumState();
        return false;
    }
    return true;
}

function setPremiumState(purchaseData) {
    if (!state.premium) {
        state.premium = { isActive: false, expiresAt: null, productId: null, originalPurchaseDate: null, source: null };
    }
    state.premium.isActive = true;
    state.premium.expiresAt = purchaseData.expiresAt || null;
    state.premium.productId = purchaseData.productId || 'com.sleepsuivour.app.pro.monthly';
    state.premium.originalPurchaseDate = purchaseData.originalPurchaseDate || state.premium.originalPurchaseDate || Date.now();
    state.premium.source = purchaseData.source || 'storekit';
    saveState();
    updatePremiumUI();
}

function clearPremiumState() {
    if (!state.premium) {
        state.premium = {};
    }
    state.premium.isActive = false;
    state.premium.expiresAt = null;
    // Keep productId and originalPurchaseDate for records
    saveState();
    updatePremiumUI();
}

function updatePremiumUI() {
    const isPro = isPremiumActive();

    // Toggle premium badge visibility
    const premiumBadge = document.getElementById('sui-pro-badge');
    if (premiumBadge) {
        premiumBadge.classList.toggle('hidden', !isPro);
    }

    // Toggle free/active views in Account tab
    const freeView = document.getElementById('sui-pro-free-view');
    const activeView = document.getElementById('sui-pro-active-view');
    if (freeView) freeView.classList.toggle('hidden', isPro);
    if (activeView) activeView.classList.toggle('hidden', !isPro);

    // Show expiry date for active subscribers
    if (isPro && state.premium && state.premium.expiresAt) {
        const expiryEl = document.getElementById('sui-pro-expiry');
        if (expiryEl) {
            const expiryDate = new Date(state.premium.expiresAt);
            expiryEl.textContent = `Renews ${expiryDate.toLocaleDateString()}`;
        }
    }

    // Update custom powerup gating text
    updateCustomPowerupDisplay();

    // Update any lock icons on premium features
    document.querySelectorAll('.premium-lock').forEach(el => {
        el.classList.toggle('hidden', isPro);
    });
    document.querySelectorAll('.premium-unlocked').forEach(el => {
        el.classList.toggle('hidden', !isPro);
    });

    // Update ghost color picker visibility
    updateGhostColorPicker();

    // Apply monster trophy skins
    applyMonsterTrophySkins();
}

// --- Sui Ghost Color Cosmetics (Premium) ---

// Ghost color definitions: CSS filter values to transform the base green ghost
// The base SVG uses rgba(34, 197, 94, ...) — hue ~142°
const SUI_GHOST_COLORS = {
    green:  { name: 'Sui Green',   filter: 'none',                                          premium: false, swatch: '#22c55e' },
    blue:   { name: 'Ocean Blue',  filter: 'hue-rotate(100deg) saturate(1.2)',               premium: true,  swatch: '#3b82f6' },
    purple: { name: 'Mystic Purple', filter: 'hue-rotate(200deg) saturate(1.1)',             premium: true,  swatch: '#a855f7' },
    red:    { name: 'Ember Red',   filter: 'hue-rotate(-30deg) saturate(1.3)',               premium: true,  swatch: '#ef4444' },
    gold:   { name: 'Golden Sui',  filter: 'hue-rotate(-60deg) saturate(1.4) brightness(1.1)', premium: true, swatch: '#f59e0b' }
};

function setSuiGhostColor(colorKey) {
    if (!SUI_GHOST_COLORS[colorKey]) return;

    // Premium gate: non-green colors require premium
    if (SUI_GHOST_COLORS[colorKey].premium && !isPremiumActive()) {
        showPaywall();
        return;
    }

    state.settings.suiGhostColor = colorKey;
    saveState();
    updateGhostColorPicker();
}

function getGhostColorFilter() {
    const colorKey = state.settings.suiGhostColor || 'green';
    const color = SUI_GHOST_COLORS[colorKey];
    return color ? color.filter : 'none';
}

function updateGhostColorPicker() {
    const isPro = isPremiumActive();
    const currentColor = state.settings.suiGhostColor || 'green';

    // Update swatch selection states
    document.querySelectorAll('.ghost-color-swatch').forEach(swatch => {
        const colorKey = swatch.dataset.color;
        const isSelected = colorKey === currentColor;
        const isLocked = SUI_GHOST_COLORS[colorKey]?.premium && !isPro;

        // Selected state
        swatch.style.outline = isSelected ? '3px solid white' : '2px solid rgba(255,255,255,0.15)';
        swatch.style.outlineOffset = isSelected ? '2px' : '0px';
        swatch.style.transform = isSelected ? 'scale(1.15)' : 'scale(1)';

        // Lock overlay
        const lockIcon = swatch.querySelector('.ghost-swatch-lock');
        if (lockIcon) {
            lockIcon.style.display = isLocked ? 'flex' : 'none';
        }
    });

    // Show/hide the color picker section based on premium status visibility
    const colorSection = document.getElementById('ghost-color-section');
    if (colorSection) {
        // Always show the section, but lock premium colors
        colorSection.classList.remove('hidden');
    }
}

// --- Monster Trophy Skins (Premium) ---

// Trophy skin names per monster (filter applied via CSS class 'monster-trophy-active')
const MONSTER_TROPHY_NAMES = {
    visceral: 'Golden Beast',
    dragon: 'Gilded Dragon',
    wraith: 'Spectral Crown',
    golem: 'Obsidian Golem',
    specter: 'Radiant Specter'
};

function hasDefeatedMonster(monsterType) {
    const stats = calculateMonsterBattleStats();
    switch (monsterType) {
        case 'visceral': return stats.visceral.kills >= 1;
        case 'dragon': return stats.dragon.kills >= 1;
        case 'wraith':
        case 'golem':
        case 'specter': {
            if (!isPremiumActive()) return false;
            const premStats = calculatePremiumMonsterStats();
            if (!premStats) return false;
            return (premStats[monsterType]?.kills || 0) >= 1;
        }
        default: return false;
    }
}

function toggleMonsterTrophySkin(monsterType) {
    if (!isPremiumActive()) {
        showPaywall();
        return;
    }
    if (!hasDefeatedMonster(monsterType)) return;

    if (!state.settings.monsterSkins) state.settings.monsterSkins = {};
    const current = state.settings.monsterSkins[monsterType] || 'default';
    state.settings.monsterSkins[monsterType] = current === 'trophy' ? 'default' : 'trophy';
    saveState();
    applyMonsterTrophySkins();
}

function applyMonsterTrophySkins() {
    const isPro = isPremiumActive();

    // Map monster type → container element ID
    const monsterContainers = {
        visceral: 'visceral-monster-container',
        dragon: 'dragon-monster-container',
        wraith: 'wraith-monster-svg',
        golem: 'golem-monster-svg',
        specter: 'specter-monster-svg'
    };

    for (const [monsterType, containerId] of Object.entries(monsterContainers)) {
        const container = document.getElementById(containerId);
        if (!container) continue;

        const isEquipped = isPro && state.settings.monsterSkins?.[monsterType] === 'trophy';

        // Toggle CSS class — golden glow applied via stylesheet, stacks with damage states
        container.classList.toggle('monster-trophy-active', isEquipped);

        // Show/hide trophy badge
        const badge = container.parentElement?.querySelector('.trophy-skin-badge');
        if (badge) {
            badge.classList.toggle('hidden', !isEquipped);
        }
    }

    // Update trophy toggle buttons
    document.querySelectorAll('.trophy-skin-toggle').forEach(btn => {
        const monsterType = btn.dataset.monster;
        const defeated = hasDefeatedMonster(monsterType);
        const equipped = isPro && state.settings.monsterSkins?.[monsterType] === 'trophy';

        btn.classList.toggle('hidden', !isPro || !defeated);
        if (!btn.classList.contains('hidden')) {
            btn.textContent = equipped ? 'Remove Skin' : 'Equip Trophy';
            btn.style.background = equipped ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.1)';
            btn.style.borderColor = equipped ? '#f59e0b' : 'rgba(245, 158, 11, 0.3)';
        }
    });
}

// --- StoreKit Bridge (iOS purchases) ---

// Cached product info from StoreKit
let storeKitProducts = null;

async function initStoreKit() {
    if (!isCapacitorNative()) return;

    const StoreKit = window.Capacitor?.Plugins?.StoreKitPlugin;
    if (!StoreKit) {
        console.warn('StoreKitPlugin not available');
        return;
    }

    try {
        // Fetch products from App Store
        const result = await StoreKit.getProducts();
        if (result.products && result.products.length > 0) {
            storeKitProducts = result.products;
            // StoreKit products loaded
        }

        // Check current subscription status
        await checkSubscriptionStatus();

        // Listen for subscription changes (renewals, expirations, refunds)
        StoreKit.addListener('subscriptionStatusChanged', (status) => {
            // Subscription status changed — update premium state
            if (status.active) {
                setPremiumState({
                    expiresAt: status.expiresAt,
                    productId: status.productId,
                    originalPurchaseDate: status.originalPurchaseDate,
                    source: 'storekit'
                });
            } else {
                clearPremiumState();
            }
        });
    } catch (e) {
        console.warn('StoreKit init error:', e);
    }
}

async function checkSubscriptionStatus() {
    if (!isCapacitorNative()) return;

    const StoreKit = window.Capacitor?.Plugins?.StoreKitPlugin;
    if (!StoreKit) return;

    try {
        const status = await StoreKit.getSubscriptionStatus();
        if (status.active) {
            setPremiumState({
                expiresAt: status.expiresAt,
                productId: status.productId,
                originalPurchaseDate: status.originalPurchaseDate,
                source: 'storekit'
            });
        } else if (state.premium && state.premium.isActive && state.premium.source === 'storekit') {
            // Was active from StoreKit but no longer — subscription expired/revoked
            clearPremiumState();
        }
    } catch (e) {
        console.warn('Subscription status check error:', e);
    }
}

async function handlePurchase() {
    if (!isCapacitorNative()) {
        // On webapp, show "Available on iOS" message
        showAchievementToast(
            '<span class="px-icon px-star"></span>',
            'Sui Pro',
            'Subscribe in the iOS app to unlock premium features!',
            'info'
        );
        return;
    }

    // Require sign-in before purchase so subscription links to their account
    if (!firebaseSync || !firebaseSync.isAuthenticated()) {
        showAchievementToast(
            '<span class="px-icon px-warning"></span>',
            'Sign In Required',
            'Please sign in first so your subscription syncs across devices.',
            'warning'
        );
        return;
    }

    const StoreKit = window.Capacitor?.Plugins?.StoreKitPlugin;
    if (!StoreKit) {
        showAchievementToast(
            '<span class="px-icon px-warning"></span>',
            'Unavailable',
            'In-app purchases are not available on this device.',
            'warning'
        );
        return;
    }

    // Show loading state on purchase button
    const purchaseBtn = document.getElementById('sui-pro-purchase-btn');
    if (purchaseBtn) {
        purchaseBtn.disabled = true;
        purchaseBtn.textContent = 'Processing...';
    }

    try {
        const result = await StoreKit.purchase({ productId: 'com.sleepsuivour.app.pro.monthly' });

        if (result.success) {
            setPremiumState({
                expiresAt: result.expiresAt,
                productId: result.productId,
                originalPurchaseDate: result.originalPurchaseDate,
                source: 'storekit'
            });
            // Close paywall and celebrate
            hidePaywall();
            showAchievementToast(
                '<span class="px-icon px-crown"></span>',
                'Welcome to Sui Pro!',
                'You\'ve unlocked the full adventure. Sui is proud of you!',
                'legendary'
            );
        } else if (result.cancelled) {
            // User cancelled — no toast needed, just reset button
        } else if (result.pending) {
            showAchievementToast(
                '<span class="px-icon px-clock"></span>',
                'Purchase Pending',
                'Your purchase is being processed. It will activate soon!',
                'info'
            );
        }
    } catch (e) {
        console.error('Purchase error:', e);
        showAchievementToast(
            '<span class="px-icon px-danger"></span>',
            'Purchase Failed',
            'Something went wrong. Please try again.',
            'danger'
        );
    } finally {
        // Reset purchase button
        if (purchaseBtn) {
            purchaseBtn.disabled = false;
            purchaseBtn.textContent = 'Start Free Trial';
        }
    }
}

async function handleRestore() {
    if (!isCapacitorNative()) {
        showAchievementToast(
            '<span class="px-icon px-star"></span>',
            'Sui Pro',
            'Subscribe in the iOS app to unlock premium features!',
            'info'
        );
        return;
    }

    const StoreKit = window.Capacitor?.Plugins?.StoreKitPlugin;
    if (!StoreKit) return;

    // Show loading state on restore button
    const restoreBtn = document.getElementById('sui-pro-restore-btn');
    if (restoreBtn) {
        restoreBtn.disabled = true;
        restoreBtn.textContent = 'Restoring...';
    }

    try {
        const result = await StoreKit.restorePurchases();
        if (result.active) {
            setPremiumState({
                expiresAt: result.expiresAt,
                productId: result.productId,
                originalPurchaseDate: result.originalPurchaseDate,
                source: 'restored'
            });
            hidePaywall();
            showAchievementToast(
                '<span class="px-icon px-crown"></span>',
                'Sui Pro Restored!',
                'Welcome back, adventurer! Your premium features are active.',
                'legendary'
            );
        } else {
            showAchievementToast(
                '<span class="px-icon px-scroll"></span>',
                'No Subscription Found',
                'No active Sui Pro subscription was found for this Apple ID.',
                'info'
            );
        }
    } catch (e) {
        console.error('Restore error:', e);
        showAchievementToast(
            '<span class="px-icon px-danger"></span>',
            'Restore Failed',
            'Could not restore purchases. Please try again.',
            'danger'
        );
    } finally {
        if (restoreBtn) {
            restoreBtn.disabled = false;
            restoreBtn.textContent = 'Restore Purchase';
        }
    }
}

function showPaywall() {
    const modal = document.getElementById('sui-pro-modal');
    if (!modal) return;

    // Update price display if we have product info
    const priceEl = document.getElementById('sui-pro-price');
    if (priceEl && storeKitProducts && storeKitProducts.length > 0) {
        priceEl.textContent = `${storeKitProducts[0].displayPrice}/month`;
    }

    // Show/hide purchase vs "Available on iOS" based on platform
    const purchaseSection = document.getElementById('sui-pro-purchase-section');
    const webappSection = document.getElementById('sui-pro-webapp-section');
    if (isCapacitorNative()) {
        purchaseSection?.classList.remove('hidden');
        webappSection?.classList.add('hidden');
    } else {
        purchaseSection?.classList.add('hidden');
        webappSection?.classList.remove('hidden');
    }

    modal.classList.remove('hidden');
}

function hidePaywall() {
    const modal = document.getElementById('sui-pro-modal');
    if (modal) modal.classList.add('hidden');
}

// Manage Subscription — deep link to Apple subscription settings
function initManageSubscriptionButton() {
    const btn = document.getElementById('manage-subscription-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        if (isCapacitorNative()) {
            // Open iOS subscription management
            try {
                const { Browser } = window.Capacitor?.Plugins || {};
                if (Browser) {
                    await Browser.open({ url: 'https://apps.apple.com/account/subscriptions' });
                } else {
                    window.open('https://apps.apple.com/account/subscriptions', '_blank');
                }
            } catch (e) {
                window.open('https://apps.apple.com/account/subscriptions', '_blank');
            }
        } else {
            window.open('https://apps.apple.com/account/subscriptions', '_blank');
        }
    });
}

// --- Offline/Online Detection ---
function initNetworkListeners() {
    window.addEventListener('offline', () => {
        // Network went offline
        if (typeof showAchievementToast === 'function') {
            showAchievementToast(
                '<span class="px-icon px-cloud"></span>',
                'Offline',
                'Your data is saved locally and will sync when you reconnect.',
                'warning'
            );
        }
    });

    window.addEventListener('online', () => {
        // Network back online
        if (typeof showAchievementToast === 'function') {
            showAchievementToast(
                '<span class="px-icon px-crystal"></span>',
                'Back Online',
                'Syncing your data...',
                'success'
            );
        }
        // Trigger sync if authenticated
        if (firebaseSync && firebaseSync.isAuthenticated()) {
            firebaseSync.syncToCloud();
        }
    });
}

function initCapacitorPlugins() {
    if (!isCapacitorNative()) return;

    // Initializing Capacitor native plugins

    // Status Bar - match dark theme
    initStatusBar();

    // Push Notifications - request permission and register
    initPushNotifications();

    // Local Notifications - scheduled reminders for fasting/sleep
    initLocalNotifications();

    // HealthKit - request authorization (actual writes happen on session end)
    initHealthKit();

    // Apple Watch bridge - send state, listen for watch actions
    initWatchBridge();

    // StoreKit - load products and check subscription status
    initStoreKit();

    // App lifecycle - pause/resume intervals on background/foreground (iOS energy optimization)
    const App = window.Capacitor?.Plugins?.App;
    if (App) {
        App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
                resumeAllIntervals();
                // Re-check subscription status when returning from background
                // (user may have managed subscription in Settings)
                checkSubscriptionStatus();
                // Refresh Apple Health data on resume
                refreshHealthKitData();
            } else {
                pauseAllIntervals();
            }
        });
    }
}

// --- Status Bar ---
function initStatusBar() {
    const StatusBar = window.Capacitor?.Plugins?.StatusBar;
    if (!StatusBar) return;

    try {
        StatusBar.setStyle({ style: 'DARK' });
        StatusBar.setBackgroundColor({ color: '#0a0a0a' });
    } catch (e) {
        console.warn('StatusBar plugin error:', e);
    }
}

// --- Push Notifications ---
async function initPushNotifications() {
    const PushNotifications = window.Capacitor?.Plugins?.PushNotifications;
    if (!PushNotifications) return;

    try {
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive === 'granted') {
            await PushNotifications.register();
        }

        PushNotifications.addListener('registration', (token) => {
            // Push registration token received
            // Token can be sent to server for targeted push notifications
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            // Push notification received — show toast
            if (typeof showAchievementToast === 'function') {
                showAchievementToast(
                    '<span class="px-icon px-lightning"></span>',
                    notification.title || 'Notification',
                    notification.body || '',
                    'info'
                );
            }
        });
    } catch (e) {
        console.warn('PushNotifications plugin error:', e);
    }
}

// --- Scheduled Local Notifications ---

// Notification IDs (stable so we can cancel them)
const NOTIF_IDS = {
    FAST_HALFWAY: 2001,
    FAST_ALMOST: 2002,
    FAST_GOAL: 2003,
    FAST_AUTOPHAGY: 2004,
    SLEEP_GOAL: 2005,
    SLEEP_GENTLE_WAKE: 2006
};

async function initLocalNotifications() {
    const LocalNotifications = window.Capacitor?.Plugins?.LocalNotifications;
    if (!LocalNotifications) return;

    try {
        const perm = await LocalNotifications.requestPermissions();
        if (perm.display !== 'granted') return;

        // Listen for notification actions
        LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
            // Local notification tapped — navigate to app
        });
    } catch (e) {
        console.warn('LocalNotifications init error:', e);
    }
}

async function scheduleFastingNotifications() {
    const LocalNotifications = window.Capacitor?.Plugins?.LocalNotifications;
    if (!LocalNotifications || !isCapacitorNative()) return;
    if (!state.currentFast?.isActive || !state.currentFast?.startTime) return;

    const startMs = state.currentFast.startTime;
    const goalHours = state.currentFast.goalHours || 16;
    const notifications = [];

    // Halfway reminder (only for goals >= 8h)
    if (goalHours >= 8) {
        const halfwayMs = startMs + (goalHours / 2) * 3600000;
        if (halfwayMs > Date.now()) {
            notifications.push({
                id: NOTIF_IDS.FAST_HALFWAY,
                title: 'Halfway There! 💪',
                body: `You're ${goalHours / 2} hours into your ${goalHours}h fast. Keep going!`,
                schedule: { at: new Date(halfwayMs) },
                sound: 'default'
            });
        }
    }

    // Almost there — 1 hour before goal
    const almostMs = startMs + (goalHours - 1) * 3600000;
    if (almostMs > Date.now() && goalHours > 1) {
        notifications.push({
            id: NOTIF_IDS.FAST_ALMOST,
            title: 'Almost There!',
            body: `Just 1 hour left until your ${goalHours}h goal. You've got this!`,
            schedule: { at: new Date(almostMs) },
            sound: 'default'
        });
    }

    // Goal reached
    const goalMs = startMs + goalHours * 3600000;
    if (goalMs > Date.now()) {
        notifications.push({
            id: NOTIF_IDS.FAST_GOAL,
            title: 'Fasting Goal Achieved! 🎉',
            body: `You've completed your ${goalHours}-hour fast. Sui is proud of you!`,
            schedule: { at: new Date(goalMs) },
            sound: 'default'
        });
    }

    // Autophagy activation at 16h (if goal is < 16 or user might not know)
    if (goalHours <= 16) {
        const autophagyMs = startMs + 16 * 3600000;
        if (autophagyMs > Date.now()) {
            notifications.push({
                id: NOTIF_IDS.FAST_AUTOPHAGY,
                title: 'Autophagy Activated! 🧬',
                body: 'Your cells are now recycling damaged components. Deep healing mode engaged.',
                schedule: { at: new Date(autophagyMs) },
                sound: 'default'
            });
        }
    }

    if (notifications.length > 0) {
        try {
            await LocalNotifications.schedule({ notifications });
        } catch (e) {
            console.warn('Failed to schedule fasting notifications:', e);
        }
    }
}

async function cancelFastingNotifications() {
    const LocalNotifications = window.Capacitor?.Plugins?.LocalNotifications;
    if (!LocalNotifications || !isCapacitorNative()) return;

    try {
        await LocalNotifications.cancel({
            notifications: [
                { id: NOTIF_IDS.FAST_HALFWAY },
                { id: NOTIF_IDS.FAST_ALMOST },
                { id: NOTIF_IDS.FAST_GOAL },
                { id: NOTIF_IDS.FAST_AUTOPHAGY }
            ]
        });
    } catch (e) { /* ignore */ }
}

async function scheduleSleepNotifications() {
    const LocalNotifications = window.Capacitor?.Plugins?.LocalNotifications;
    if (!LocalNotifications || !isCapacitorNative()) return;
    if (!state.currentSleep?.isActive || !state.currentSleep?.startTime) return;

    const startMs = state.currentSleep.startTime;
    const goalHours = state.currentSleep.goalHours || 8;
    const notifications = [];

    // Sleep goal reached
    const goalMs = startMs + goalHours * 3600000;
    if (goalMs > Date.now()) {
        notifications.push({
            id: NOTIF_IDS.SLEEP_GOAL,
            title: 'Sleep Goal Reached! 🌅',
            body: `You've logged ${goalHours} hours of sleep. Well rested!`,
            schedule: { at: new Date(goalMs) },
            sound: 'default'
        });
    }

    // Gentle wake — 30 min after goal (in case they're oversleeping)
    const wakeMs = startMs + (goalHours + 0.5) * 3600000;
    if (wakeMs > Date.now()) {
        notifications.push({
            id: NOTIF_IDS.SLEEP_GENTLE_WAKE,
            title: 'Good Morning! ☀️',
            body: 'You\'ve passed your sleep goal. Time to rise and shine?',
            schedule: { at: new Date(wakeMs) },
            sound: 'default'
        });
    }

    if (notifications.length > 0) {
        try {
            await LocalNotifications.schedule({ notifications });
        } catch (e) {
            console.warn('Failed to schedule sleep notifications:', e);
        }
    }
}

async function cancelSleepNotifications() {
    const LocalNotifications = window.Capacitor?.Plugins?.LocalNotifications;
    if (!LocalNotifications || !isCapacitorNative()) return;

    try {
        await LocalNotifications.cancel({
            notifications: [
                { id: NOTIF_IDS.SLEEP_GOAL },
                { id: NOTIF_IDS.SLEEP_GENTLE_WAKE }
            ]
        });
    } catch (e) { /* ignore */ }
}

// --- Apple Watch Bridge ---

// Last notification sent to Watch (for toast display)
let lastWatchToast = null;

let _watchBridgeAvailable = null; // null = not checked yet, true/false = checked
let _lastWatchSendTime = 0;
const WATCH_SEND_THROTTLE = 5000; // Max once every 5 seconds

function _isWatchBridgeAvailable() {
    if (_watchBridgeAvailable !== null) return _watchBridgeAvailable;
    // Capacitor creates proxy objects for ALL plugins, so checking Plugins.X is always truthy.
    // Use isPluginAvailable() which checks if a native implementation is actually registered.
    const cap = window.Capacitor;
    if (cap && typeof cap.isPluginAvailable === 'function') {
        _watchBridgeAvailable = cap.isPluginAvailable('WatchBridgePlugin');
    } else {
        _watchBridgeAvailable = false;
    }
    return _watchBridgeAvailable;
}

function sendStateToWatch(toast) {
    if (!isCapacitorNative()) return;
    if (!_isWatchBridgeAvailable()) return;

    // Throttle: skip if called too recently (saveState fires very frequently)
    const now = Date.now();
    if (!toast && now - _lastWatchSendTime < WATCH_SEND_THROTTLE) return;

    const WatchBridge = window.Capacitor.Plugins.WatchBridgePlugin;
    const payload = {
        isFasting: !!state.currentFast?.isActive,
        fastStartTime: state.currentFast?.startTime || 0,
        fastGoalHours: state.currentFast?.goalHours || 16,
        isSleeping: !!state.currentSleep?.isActive,
        sleepStartTime: state.currentSleep?.startTime || 0,
        sleepGoalHours: state.currentSleep?.goalHours || 8,
        heartPoints: typeof currentHeartPoints !== 'undefined' ? currentHeartPoints : 0,
        timestamp: now
    };

    if (toast) {
        payload.toastTitle = toast.title || '';
        payload.toastBody = toast.body || '';
        payload.toastTime = now;
    }

    _lastWatchSendTime = now;
    WatchBridge.sendToWatch(payload).catch(() => {
        // Native side threw — disable permanently
        _watchBridgeAvailable = false;
    });
}

function initWatchBridge() {
    if (!isCapacitorNative()) return;
    if (!_isWatchBridgeAvailable()) return;
    const WatchBridge = window.Capacitor.Plugins.WatchBridgePlugin;

    // Listen for actions from Apple Watch
    WatchBridge.addListener('watchAction', (data) => {
        if (!data || !data.action) return;

        switch (data.action) {
            case 'startFast':
                if (!state.currentFast?.isActive) {
                    startFast();
                }
                break;
            case 'stopFast':
                if (state.currentFast?.isActive) {
                    stopFast();
                }
                break;
            case 'startSleep':
                if (!state.currentSleep?.isActive) {
                    startSleep();
                }
                break;
            case 'stopSleep':
                if (state.currentSleep?.isActive) {
                    stopSleep();
                }
                break;
            case 'logPowerup':
                if (data.type && state.currentFast?.isActive) {
                    addPowerup(data.type);
                    const label = data.type.charAt(0).toUpperCase() + data.type.slice(1);
                    sendStateToWatch({ title: `${label} +10 XP`, body: 'Powerup logged!' });
                }
                break;
            case 'logEatingPowerup':
                if (data.type && !state.currentFast?.isActive && !state.currentSleep?.isActive) {
                    addEatingPowerup(data.type);
                    const eatLabel = data.type.charAt(0).toUpperCase() + data.type.slice(1);
                    sendStateToWatch({ title: `${eatLabel} logged`, body: 'Eating powerup!' });
                }
                break;
            case 'logSleepPowerup':
                if (data.type && state.currentSleep?.isActive) {
                    addSleepPowerup(data.type);
                    const sleepLabel = data.type.charAt(0).toUpperCase() + data.type.slice(1);
                    sendStateToWatch({ title: `${sleepLabel} logged`, body: 'Sleep powerup!' });
                }
                break;
            default:
                console.warn('Unknown watch action:', data.action);
        }
    });

    // Send initial state to Watch
    sendStateToWatch();
}

// --- HealthKit ---
let healthKitAuthorized = false;

async function initHealthKit() {
    const HealthPlugin = window.Capacitor?.Plugins?.Health;
    if (!HealthPlugin) return;

    // Capture BEFORE any async operation — the await below yields to the event loop,
    // during which handleRemoteDataUpdate() can fire and replace state.settings entirely.
    // The local (localStorage) value is the source of truth for this device-local setting.
    const alreadyConnected = state.settings?.healthKitConnected;

    try {
        const { available } = await HealthPlugin.isAvailable();
        if (!available) {
            // HealthKit not available on this device
            return;
        }

        // If user has previously connected, authorize directly
        if (alreadyConnected) {
            await authorizeHealthKit();
            return;
        }

        // First time: show explanation modal before requesting system authorization
        showHealthKitConnectModal();
    } catch (e) {
        console.warn('HealthKit init error:', e);
    }
}

function showHealthKitConnectModal() {
    const modal = document.getElementById('healthkit-connect-modal');
    if (modal) modal.classList.remove('hidden');
}

function dismissHealthKitModal() {
    const modal = document.getElementById('healthkit-connect-modal');
    if (modal) modal.classList.add('hidden');
}

// Wire up HealthKit modal buttons (CSP blocks inline onclick handlers)
document.getElementById('hk-connect-btn')?.addEventListener('click', () => connectHealthKit());
document.getElementById('hk-dismiss-btn')?.addEventListener('click', () => dismissHealthKitModal());
document.getElementById('hk-settings-toggle-btn')?.addEventListener('click', () => toggleHealthKitConnection());

async function connectHealthKit() {
    dismissHealthKitModal();
    // Set state BEFORE authorizing so updateHealthKitSettingsUI sees it
    if (!state.settings) state.settings = {};
    state.settings.healthKitConnected = true;
    saveState();
    await authorizeHealthKit();
    updateHealthKitSettingsUI();
}

async function authorizeHealthKit() {
    const HealthPlugin = window.Capacitor?.Plugins?.Health;
    if (!HealthPlugin) return;

    try {
        const result = await HealthPlugin.requestAuthorization({
            read: ['sleep', 'restingHeartRate', 'heartRateVariability', 'steps'],
            write: ['sleep']
        });
        healthKitAuthorized = true;

        // Log which types were denied so we can debug in console
        if (result?.readDenied?.length > 0) {
            console.warn('HealthKit read denied for:', result.readDenied);
        }

        // Initial data fetch after authorization
        refreshHealthKitData();
        updateHealthKitSettingsUI();
    } catch (e) {
        console.warn('HealthKit authorization error:', e);
        // On iOS, requestAuthorization resolves even when user denies individual types
        // (denial is per-type, not all-or-nothing). A rejection here means something
        // more fundamental failed. Still attempt reads — they'll gracefully return empty
        // if permissions weren't granted.
        healthKitAuthorized = true;
        refreshHealthKitData();
        updateHealthKitSettingsUI();
    }
}

function updateHealthKitSettingsUI() {
    const section = document.getElementById('healthkit-settings-section');
    if (!section) return;

    // Only show on native iOS
    if (!isCapacitorNative()) {
        section.classList.add('hidden');
        return;
    }
    section.classList.remove('hidden');

    const statusEl = document.getElementById('hk-settings-status');
    const toggleBtn = document.getElementById('hk-settings-toggle-btn');
    const connected = healthKitAuthorized && state.settings?.healthKitConnected;

    if (statusEl) {
        statusEl.textContent = connected ? 'Connected' : 'Not Connected';
        statusEl.style.color = connected ? 'var(--matrix-400)' : 'var(--indigo-400)';
    }
    if (toggleBtn) {
        toggleBtn.textContent = connected ? 'Connected' : 'Connect';
        toggleBtn.style.background = connected ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)';
        toggleBtn.style.color = connected ? 'var(--matrix-400)' : 'var(--indigo-400)';
    }
}

async function toggleHealthKitConnection() {
    if (healthKitAuthorized && state.settings?.healthKitConnected) {
        // Already connected — direct user to system Settings
        showAchievementToast(
            '<span class="px-icon px-heart"></span>',
            'Apple Health',
            'To manage permissions, go to iPhone Settings > Privacy & Security > Health.',
            'info'
        );
        return;
    }
    // Not connected — trigger connection flow
    await connectHealthKit();
}

function writeHealthKitFastingSession(startTime, endTime, durationHours) {
    if (!isCapacitorNative() || !healthKitAuthorized) return;

    const HealthPlugin = window.Capacitor?.Plugins?.Health;
    if (!HealthPlugin) return;

    // HealthKit doesn't have a native "fasting" type, but we can store it
    // as a custom workout or dietary energy category. For now, log it.
    // HealthKit: Fasting session logged
}

async function writeHealthKitSleepSession(startTime, endTime, durationHours) {
    if (!isCapacitorNative() || !healthKitAuthorized) return;

    const HealthPlugin = window.Capacitor?.Plugins?.Health;
    if (!HealthPlugin) return;

    try {
        // Check if another source (Apple Watch, etc.) already has sleep data overlapping
        // this period. Writing a generic "asleep" entry would create a duplicate that
        // confuses the Health app and skews aggregate totals.
        const existing = await HealthPlugin.readSamples({
            dataType: 'sleep',
            startDate: new Date(startTime).toISOString(),
            endDate: new Date(endTime).toISOString(),
            limit: 5,
            ascending: false
        });

        const otherSourceSamples = (existing?.samples || []).filter(s =>
            s.sourceId && !s.sourceId.includes('com.sleepsuivour')
        );

        if (otherSourceSamples.length > 0) {
            // Another source already recorded sleep for this window — skip write
            return;
        }

        await HealthPlugin.saveSample({
            dataType: 'sleep',
            startDate: new Date(startTime).toISOString(),
            endDate: new Date(endTime).toISOString(),
            value: 0  // HKCategoryValueSleepAnalysis.asleep
        });
    } catch (e) {
        console.warn('HealthKit write error:', e);
    }
}

// ==========================================
// HEALTHKIT DATA LAYER — Read from Apple Health
// ==========================================

const healthKitCache = {
    sleep: null,       // { lastNight: {...}, nights: [...], weekAvg: {...} }
    heartRate: null,   // { restingHR, hrv, restingHRTrend, hrvTrend, rhrHistory[], hrvHistory[] }
    steps: null,       // { today, weekAvg, history[] }
    lastFetch: 0,
    STALE_MS: 5 * 60 * 1000  // 5 minutes
};

function isHealthKitCacheStale() {
    return Date.now() - healthKitCache.lastFetch > healthKitCache.STALE_MS;
}

async function refreshHealthKitData() {
    if (!isCapacitorNative() || !healthKitAuthorized) return;
    if (!isHealthKitCacheStale()) return;

    // Use allSettled so one failing query (e.g., no Apple Watch for HR) doesn't
    // prevent the others from caching data and updating the UI.
    const results = await Promise.allSettled([
        fetchHealthKitSleepData(),
        fetchHealthKitHeartData(),
        fetchHealthKitSteps()
    ]);

    for (const r of results) {
        if (r.status === 'rejected') {
            console.warn('HealthKit fetch partial failure:', r.reason);
        }
    }

    healthKitCache.lastFetch = Date.now();
    updateHealthKitUI();
}

async function fetchHealthKitSleepData() {
    const HealthPlugin = window.Capacitor?.Plugins?.Health;
    if (!HealthPlugin) return;

    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const result = await HealthPlugin.readSamples({
        dataType: 'sleep',
        startDate,
        endDate,
        limit: 500,
        ascending: true
    });

    const samples = result?.samples;
    if (!samples || samples.length === 0) {
        healthKitCache.sleep = null;
        return;
    }

    const nights = groupSleepSamplesIntoNights(samples);
    if (nights.length === 0) {
        healthKitCache.sleep = null;
        return;
    }

    const processedNights = nights.map(n => processSleepNight(n));
    healthKitCache.sleep = {
        lastNight: processedNights[processedNights.length - 1],
        nights: processedNights,
        weekAvg: calculateWeekAvgSleepStages(processedNights)
    };
}

function groupSleepSamplesIntoNights(samples) {
    const nights = [];
    let currentNight = [];

    for (const sample of samples) {
        if (sample.sleepState === 'inBed') continue; // Skip "in bed" — not an actual sleep stage

        if (currentNight.length > 0) {
            const lastEnd = new Date(currentNight[currentNight.length - 1].endDate).getTime();
            const thisStart = new Date(sample.startDate).getTime();
            if (thisStart - lastEnd > 6 * 60 * 60 * 1000) {
                nights.push(currentNight);
                currentNight = [];
            }
        }
        currentNight.push(sample);
    }
    if (currentNight.length > 0) nights.push(currentNight);
    return nights;
}

function processSleepNight(nightSamples) {
    const stages = { rem: 0, deep: 0, light: 0, awake: 0 };
    let source = 'Unknown';

    for (const s of nightSamples) {
        const minutes = (new Date(s.endDate) - new Date(s.startDate)) / 60000;
        const st = s.sleepState;
        if (st === 'rem') stages.rem += minutes;
        else if (st === 'deep') stages.deep += minutes;
        else if (st === 'light') stages.light += minutes;
        else if (st === 'awake') stages.awake += minutes;
        else if (st === 'asleep') stages.light += minutes; // Generic 'asleep' = light
        if (s.sourceName) source = s.sourceName;
    }

    const sleepMinutes = stages.rem + stages.deep + stages.light;
    const totalMinutes = sleepMinutes + stages.awake;

    return {
        stages,
        totalMinutes,
        sleepMinutes,
        source,
        startTime: new Date(nightSamples[0].startDate).getTime(),
        endTime: new Date(nightSamples[nightSamples.length - 1].endDate).getTime(),
        score: calculateSleepScore_HK(stages, sleepMinutes)
    };
}

function calculateSleepScore_HK(stages, totalSleepMin) {
    // Score 0-100: Duration (40pts), Deep% (25pts), REM% (25pts), Awake penalty (10pts)
    let score = 0;
    const hours = totalSleepMin / 60;

    // Duration (40pts) — 7-9h optimal
    if (hours >= 7 && hours <= 9) score += 40;
    else if (hours >= 6) score += 30;
    else if (hours >= 5) score += 20;
    else score += 10;

    // Deep sleep (25pts) — 13-23% ideal
    const deepPct = totalSleepMin > 0 ? (stages.deep / totalSleepMin) * 100 : 0;
    if (deepPct >= 13 && deepPct <= 23) score += 25;
    else if (deepPct >= 10) score += 20;
    else if (deepPct >= 5) score += 10;
    else score += 5;

    // REM (25pts) — 20-25% ideal
    const remPct = totalSleepMin > 0 ? (stages.rem / totalSleepMin) * 100 : 0;
    if (remPct >= 20 && remPct <= 25) score += 25;
    else if (remPct >= 15) score += 20;
    else if (remPct >= 10) score += 15;
    else score += 5;

    // Awake penalty (10pts)
    const awakePct = (totalSleepMin + stages.awake) > 0
        ? (stages.awake / (totalSleepMin + stages.awake)) * 100 : 0;
    if (awakePct <= 5) score += 10;
    else if (awakePct <= 10) score += 7;
    else if (awakePct <= 15) score += 4;

    return Math.min(100, Math.max(0, Math.round(score)));
}

function calculateWeekAvgSleepStages(processedNights) {
    if (processedNights.length === 0) return { deep: 0, rem: 0, light: 0, awake: 0 };
    const totals = { deep: 0, rem: 0, light: 0, awake: 0 };
    for (const night of processedNights) {
        totals.deep += night.stages.deep;
        totals.rem += night.stages.rem;
        totals.light += night.stages.light;
        totals.awake += night.stages.awake;
    }
    const count = processedNights.length;
    return { deep: totals.deep / count, rem: totals.rem / count, light: totals.light / count, awake: totals.awake / count };
}

async function fetchHealthKitHeartData() {
    const HealthPlugin = window.Capacitor?.Plugins?.Health;
    if (!HealthPlugin) return;

    const endDate = new Date().toISOString();
    const startDate7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // restingHeartRate supports queryAggregated, but heartRateVariability does NOT —
    // the plugin explicitly rejects aggregated queries for HRV (it's an instantaneous type).
    // Use readSamples for HRV and compute daily averages manually.
    // allSettled so one failing (e.g., no Apple Watch = no RHR) doesn't kill the other.
    const [rhrResult, hrvResult] = await Promise.allSettled([
        HealthPlugin.queryAggregated({
            dataType: 'restingHeartRate',
            startDate: startDate7d,
            endDate,
            bucket: 'day',
            aggregation: 'average'
        }),
        HealthPlugin.readSamples({
            dataType: 'heartRateVariability',
            startDate: startDate7d,
            endDate,
            limit: 500,
            ascending: true
        })
    ]);

    const rhrSamples = rhrResult.status === 'fulfilled' ? (rhrResult.value?.samples || []) : [];

    // Aggregate raw HRV samples into daily averages to match the format resting HR uses
    const hrvRawSamples = hrvResult.status === 'fulfilled' ? (hrvResult.value?.samples || []) : [];
    const hrvSamples = aggregateHRVByDay(hrvRawSamples);

    healthKitCache.heartRate = {
        restingHR: rhrSamples.length > 0 ? Math.round(rhrSamples[rhrSamples.length - 1].value) : null,
        restingHRTrend: calculateHKTrendDirection(rhrSamples.map(s => s.value)),
        hrv: hrvSamples.length > 0 ? Math.round(hrvSamples[hrvSamples.length - 1].value) : null,
        hrvTrend: calculateHKTrendDirection(hrvSamples.map(s => s.value)),
        rhrHistory: rhrSamples.map(s => ({ date: s.startDate, value: Math.round(s.value) })),
        hrvHistory: hrvSamples.map(s => ({ date: s.startDate, value: Math.round(s.value) }))
    };
}

// Aggregate raw HRV samples (multiple per day) into one daily average per day
function aggregateHRVByDay(rawSamples) {
    if (!rawSamples || rawSamples.length === 0) return [];
    const byDay = {};
    for (const s of rawSamples) {
        const day = s.startDate.slice(0, 10); // YYYY-MM-DD
        if (!byDay[day]) byDay[day] = { sum: 0, count: 0, startDate: s.startDate };
        byDay[day].sum += s.value;
        byDay[day].count++;
    }
    return Object.values(byDay).map(d => ({
        startDate: d.startDate,
        value: d.sum / d.count
    }));
}

async function fetchHealthKitSteps() {
    const HealthPlugin = window.Capacitor?.Plugins?.Health;
    if (!HealthPlugin) return;

    const endDate = new Date().toISOString();
    const startDate7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const result = await HealthPlugin.queryAggregated({
        dataType: 'steps',
        startDate: startDate7d,
        endDate,
        bucket: 'day',
        aggregation: 'sum'
    });

    const dailySteps = result?.samples || [];

    // HKStatisticsCollectionQuery skips buckets with no data, so the last entry
    // might be yesterday if the user hasn't taken steps yet today. Verify the date.
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local tz
    let todaySteps = 0;
    if (dailySteps.length > 0) {
        const lastEntry = dailySteps[dailySteps.length - 1];
        const lastDateStr = new Date(lastEntry.startDate).toLocaleDateString('en-CA');
        todaySteps = lastDateStr === todayStr ? Math.round(lastEntry.value) : 0;
    }

    const weekValues = dailySteps.map(s => Math.round(s.value));
    const weekAvg = weekValues.length > 0 ? Math.round(weekValues.reduce((a, b) => a + b, 0) / weekValues.length) : 0;

    healthKitCache.steps = {
        today: todaySteps,
        weekAvg,
        history: dailySteps.map(s => ({ date: s.startDate, value: Math.round(s.value) }))
    };
}

function calculateHKTrendDirection(values) {
    if (values.length < 2) return 'stable';
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);
    const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const diff = avg1 > 0 ? ((avg2 - avg1) / avg1) * 100 : 0;
    if (diff > 3) return 'up';
    if (diff < -3) return 'down';
    return 'stable';
}

function formatMinutesShort(minutes) {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// --- HealthKit UI Rendering ---

function updateHealthKitUI() {
    updateHealthKitSleepCard();
    updateHealthKitSnapshot();
    updateHealthKitTrends();
}

function updateHealthKitSleepCard() {
    const card = document.getElementById('healthkit-sleep-card');
    if (!card) return;

    if (!isCapacitorNative() || !healthKitAuthorized || !healthKitCache.sleep?.lastNight) {
        card.classList.add('hidden');
        return;
    }

    card.classList.remove('hidden');
    const night = healthKitCache.sleep.lastNight;
    const { stages, sleepMinutes, score, source } = night;

    // Score
    const scoreEl = document.getElementById('hk-sleep-score');
    if (scoreEl) scoreEl.textContent = score;

    // Stacked bar
    const bar = document.getElementById('hk-sleep-bar');
    const totalForBar = stages.deep + stages.rem + stages.light + stages.awake;
    if (bar && totalForBar > 0) {
        bar.innerHTML = [
            { min: stages.deep, color: '#8b5cf6' },
            { min: stages.rem, color: '#6366f1' },
            { min: stages.light, color: '#3b82f6' },
            { min: stages.awake, color: '#f59e0b' }
        ].filter(s => s.min > 0)
         .map(s => `<div style="width: ${(s.min / totalForBar * 100).toFixed(1)}%; background: ${s.color}; transition: width 0.5s ease;"></div>`)
         .join('');
    }

    // Stage durations
    const deepEl = document.getElementById('hk-deep-dur');
    const remEl = document.getElementById('hk-rem-dur');
    const lightEl = document.getElementById('hk-light-dur');
    const awakeEl = document.getElementById('hk-awake-dur');
    if (deepEl) deepEl.textContent = formatMinutesShort(stages.deep);
    if (remEl) remEl.textContent = formatMinutesShort(stages.rem);
    if (lightEl) lightEl.textContent = formatMinutesShort(stages.light);
    if (awakeEl) awakeEl.textContent = formatMinutesShort(stages.awake);

    // Source + total
    const sourceEl = document.getElementById('hk-sleep-source');
    const totalEl = document.getElementById('hk-sleep-total');
    if (sourceEl) sourceEl.textContent = source.includes('Watch') ? 'via Apple Watch' : `via ${source}`;
    if (totalEl) totalEl.textContent = `Total: ${formatMinutesShort(sleepMinutes)}`;
}

function updateHealthKitSnapshot() {
    const card = document.getElementById('healthkit-snapshot-card');
    if (!card) return;

    if (!isCapacitorNative() || !healthKitAuthorized) {
        card.classList.add('hidden');
        return;
    }

    const hasAnyData = healthKitCache.heartRate || healthKitCache.steps || healthKitCache.sleep;
    if (!hasAnyData) {
        card.classList.add('hidden');
        return;
    }

    card.classList.remove('hidden');

    // Resting HR
    const hr = healthKitCache.heartRate;
    if (hr?.restingHR) {
        const rhrVal = document.getElementById('hk-rhr-value');
        const rhrTrend = document.getElementById('hk-rhr-trend');
        if (rhrVal) rhrVal.textContent = hr.restingHR;
        if (rhrTrend) {
            // For HR, "down" is good (lower resting HR = fitter)
            rhrTrend.textContent = hr.restingHRTrend === 'down' ? '↓ improving'
                : hr.restingHRTrend === 'up' ? '↑ rising' : '→ stable';
            rhrTrend.style.color = hr.restingHRTrend === 'down' ? 'var(--matrix-400)'
                : hr.restingHRTrend === 'up' ? '#f87171' : 'var(--dark-text-muted)';
        }
    }

    // Steps
    const steps = healthKitCache.steps;
    if (steps) {
        const stepsVal = document.getElementById('hk-steps-value');
        const stepsAvg = document.getElementById('hk-steps-avg');
        if (stepsVal) stepsVal.textContent = steps.today >= 1000 ? `${(steps.today / 1000).toFixed(1)}K` : steps.today;
        if (stepsAvg) stepsAvg.textContent = `avg ${steps.weekAvg >= 1000 ? (steps.weekAvg / 1000).toFixed(1) + 'K' : steps.weekAvg}`;
    }

    // Sleep score
    const sleep = healthKitCache.sleep?.lastNight;
    if (sleep) {
        const sleepVal = document.getElementById('hk-snapshot-sleep');
        const sleepDur = document.getElementById('hk-snapshot-sleep-dur');
        if (sleepVal) sleepVal.textContent = sleep.score;
        if (sleepDur) sleepDur.textContent = formatMinutesShort(sleep.sleepMinutes);
    }
}

function updateHealthKitTrends() {
    const section = document.getElementById('healthkit-trends-section');
    if (!section) return;

    if (!isCapacitorNative() || !healthKitAuthorized) {
        section.classList.add('hidden');
        return;
    }

    const hasData = healthKitCache.heartRate || healthKitCache.steps || healthKitCache.sleep;
    if (!hasData) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');

    // Sleep stage averages
    if (healthKitCache.sleep?.weekAvg) {
        const avg = healthKitCache.sleep.weekAvg;
        const total = avg.deep + avg.rem + avg.light + avg.awake;
        if (total > 0) {
            const bar = document.getElementById('hk-trends-sleep-bar');
            if (bar) {
                bar.innerHTML = [
                    { pct: avg.deep / total * 100, color: '#8b5cf6' },
                    { pct: avg.rem / total * 100, color: '#6366f1' },
                    { pct: avg.light / total * 100, color: '#3b82f6' },
                    { pct: avg.awake / total * 100, color: '#f59e0b' }
                ].map(s => `<div style="width: ${s.pct.toFixed(1)}%; background: ${s.color};"></div>`).join('');
            }

            const deepPct = document.getElementById('hk-trends-deep-pct');
            const remPct = document.getElementById('hk-trends-rem-pct');
            const lightPct = document.getElementById('hk-trends-light-pct');
            const awakePct = document.getElementById('hk-trends-awake-pct');
            if (deepPct) deepPct.textContent = `${(avg.deep / total * 100).toFixed(0)}%`;
            if (remPct) remPct.textContent = `${(avg.rem / total * 100).toFixed(0)}%`;
            if (lightPct) lightPct.textContent = `${(avg.light / total * 100).toFixed(0)}%`;
            if (awakePct) awakePct.textContent = `${(avg.awake / total * 100).toFixed(0)}%`;
        }
    }

    // Mini bar charts
    renderMiniBarChart('hk-trends-rhr-chart', healthKitCache.heartRate?.rhrHistory || [], '#f87171');
    renderMiniBarChart('hk-trends-hrv-chart', healthKitCache.heartRate?.hrvHistory || [], '#a78bfa');
    renderMiniBarChart('hk-trends-steps-chart', healthKitCache.steps?.history || [], 'var(--matrix-400)');
}

function renderMiniBarChart(containerId, dataPoints, color) {
    const container = document.getElementById(containerId);
    if (!container || dataPoints.length === 0) {
        if (container) container.innerHTML = '<div class="text-xs text-center w-full" style="color: var(--dark-text-muted);">No data yet</div>';
        return;
    }

    const values = dataPoints.map(d => d.value);
    const max = Math.max(...values);
    if (max === 0) return;

    container.innerHTML = values.map((v, i) => {
        const heightPct = (v / max) * 100;
        const isLast = i === values.length - 1;
        return `<div class="flex-1 rounded-t" style="height: ${Math.max(8, heightPct)}%; background: ${color}; min-height: 4px; opacity: ${isLast ? 1 : 0.6};" title="${v}"></div>`;
    }).join('');
}

// ==========================================
// AUDIT LOG — Chronological action feed
// ==========================================

let auditLogFilter = 'all';

function filterAuditLog(filter) {
    auditLogFilter = filter;

    // Update filter button styles
    document.querySelectorAll('.audit-filter-btn').forEach(btn => {
        const isActive = btn.dataset.filter === filter;
        btn.style.outline = isActive ? '2px solid white' : 'none';
        btn.style.outlineOffset = isActive ? '1px' : '0';
    });

    renderAuditLog();
}

function renderAuditLog() {
    const container = document.getElementById('audit-log-container');
    if (!container) return;

    const events = buildAuditEvents();

    // Apply filter
    const filtered = auditLogFilter === 'all'
        ? events
        : events.filter(e => e.category === auditLogFilter);

    if (filtered.length === 0) {
        container.innerHTML = `<p class="text-center text-sm py-8" style="color: var(--dark-text-muted);">No ${auditLogFilter === 'all' ? '' : auditLogFilter + ' '}events yet. Start your journey!</p>`;
        return;
    }

    // Group by date
    const groups = {};
    for (const event of filtered) {
        const dateKey = new Date(event.time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(event);
    }

    let html = '';
    for (const [date, dayEvents] of Object.entries(groups)) {
        html += `<div class="mb-4">`;
        html += `<p class="text-xs font-bold mb-2 px-1" style="color: var(--dark-text-muted);">${escapeHtml(date)}</p>`;
        for (const event of dayEvents) {
            const timeStr = new Date(event.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            html += `<div class="flex items-start gap-3 py-2 px-3 rounded-lg mb-1" style="background: rgba(0,0,0,0.2);">`;
            html += `<span class="flex-shrink-0 mt-0.5">${event.icon}</span>`;
            html += `<div class="flex-1 min-w-0">`;
            html += `<p class="text-sm" style="color: var(--dark-text);">${escapeHtml(event.label)}</p>`;
            if (event.detail) {
                html += `<p class="text-xs" style="color: var(--dark-text-muted);">${escapeHtml(event.detail)}</p>`;
            }
            html += `</div>`;
            html += `<span class="flex-shrink-0 text-xs" style="color: var(--dark-text-muted);">${timeStr}</span>`;
            html += `</div>`;
        }
        html += `</div>`;
    }

    container.innerHTML = html;

    // Update summary
    const summary = document.getElementById('audit-summary');
    if (summary) {
        summary.innerHTML = `<p class="text-xs" style="color: var(--dark-text-muted);">${filtered.length} events total</p>`;
    }
}

function buildAuditEvents() {
    if (!perfCache.auditEventsDirty && perfCache.auditEvents) {
        return perfCache.auditEvents;
    }

    const events = [];

    // Fasting sessions (completed)
    const fastingHistory = Array.isArray(state.fastingHistory) ? state.fastingHistory : [];
    for (const fast of fastingHistory) {
        const start = fast.startTime || fast.start;
        const dur = fast.duration || 0;
        if (!start) continue;

        // Fast started
        events.push({
            time: start,
            category: 'fasting',
            icon: '<span class="px-icon px-fire" style="color: var(--matrix-400);"></span>',
            label: `Started a fast`,
            detail: `Goal: ${fast.goalHours || '?'}h`
        });

        // Fast ended
        const endTime = fast.endTime || (start + dur * 3600000);
        events.push({
            time: endTime,
            category: 'fasting',
            icon: '<span class="px-icon px-check" style="color: var(--matrix-400);"></span>',
            label: `Completed fast`,
            detail: `Duration: ${dur.toFixed(1)}h${fast.goalHours && dur >= fast.goalHours ? ' — Goal reached!' : ''}`
        });

        // Powerups during this fast
        const powerups = Array.isArray(fast.powerups) ? fast.powerups : [];
        for (const pu of powerups) {
            if (typeof pu === 'object' && pu.type && pu.time) {
                events.push({
                    time: pu.time,
                    category: 'powerup',
                    icon: '<span class="px-icon px-lightning" style="color: var(--orange-400);"></span>',
                    label: `Used ${formatPowerupName(pu.type)}`,
                    detail: 'During fast'
                });
            }
        }
    }

    // Sleep sessions (completed)
    const sleepHistory = Array.isArray(state.sleepHistory) ? state.sleepHistory : [];
    for (const sleep of sleepHistory) {
        const start = sleep.startTime || sleep.start;
        const dur = sleep.duration || 0;
        if (!start) continue;

        events.push({
            time: start,
            category: 'sleep',
            icon: '<span class="px-icon px-moon" style="color: var(--indigo-400);"></span>',
            label: `Started sleeping`,
            detail: `Goal: ${sleep.goalHours || '?'}h`
        });

        const endTime = sleep.endTime || (start + dur * 3600000);
        events.push({
            time: endTime,
            category: 'sleep',
            icon: '<span class="px-icon px-sun" style="color: var(--indigo-400);"></span>',
            label: `Woke up`,
            detail: `Slept ${dur.toFixed(1)}h${sleep.goalHours && dur >= sleep.goalHours ? ' — Goal reached!' : ''}`
        });
    }

    // Currently active fast
    if (state.currentFast?.isActive && state.currentFast.startTime) {
        events.push({
            time: state.currentFast.startTime,
            category: 'fasting',
            icon: '<span class="px-icon px-fire" style="color: var(--matrix-glow);"></span>',
            label: `Started current fast`,
            detail: `Goal: ${state.currentFast.goalHours || '?'}h — In progress`
        });

        // Current fast powerups
        const currentPUs = Array.isArray(state.currentFast.powerups) ? state.currentFast.powerups : [];
        for (const pu of currentPUs) {
            if (typeof pu === 'object' && pu.type && pu.time) {
                events.push({
                    time: pu.time,
                    category: 'powerup',
                    icon: '<span class="px-icon px-lightning" style="color: var(--orange-400);"></span>',
                    label: `Used ${formatPowerupName(pu.type)}`,
                    detail: 'During current fast'
                });
            }
        }
    }

    // Currently active sleep
    if (state.currentSleep?.isActive && state.currentSleep.startTime) {
        events.push({
            time: state.currentSleep.startTime,
            category: 'sleep',
            icon: '<span class="px-icon px-moon" style="color: #818cf8;"></span>',
            label: `Started sleeping`,
            detail: `Goal: ${state.currentSleep.goalHours || '?'}h — In progress`
        });
    }

    // Loot unlocks (using recorded timestamps)
    const unlockTimestamps = (state.collection?.unlockTimestamps && typeof state.collection.unlockTimestamps === 'object')
        ? state.collection.unlockTimestamps : {};
    for (const [itemId, ts] of Object.entries(unlockTimestamps)) {
        if (typeof ts !== 'number') continue;
        const item = PRECIOUS_ITEMS[itemId];
        const name = item ? item.name : itemId;
        const rarity = item ? item.rarity : 'common';
        const rarityColors = { common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b', mythic: '#ef4444' };
        const color = rarityColors[rarity] || '#9ca3af';
        events.push({
            time: ts,
            category: 'loot',
            icon: item ? `<span class="px-icon ${item.icon}" style="color: ${color};"></span>` : `<span class="px-icon px-crystal" style="color: ${color};"></span>`,
            label: `Unlocked: ${name}`,
            detail: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} item`
        });
    }

    // Living Life activations
    const livingLifeHistory = Array.isArray(state.livingLife?.history) ? state.livingLife.history : [];
    for (const ll of livingLifeHistory) {
        if (ll.activatedAt) {
            events.push({
                time: ll.activatedAt,
                category: 'powerup',
                icon: '<span class="px-icon px-star" style="color: var(--amber-400);"></span>',
                label: `Activated Living Life mode`,
                detail: '24h break from tracking'
            });
        }
    }

    // Sort by time (newest first)
    events.sort((a, b) => b.time - a.time);

    perfCache.auditEvents = events;
    perfCache.auditEventsDirty = false;
    return events;
}

function formatPowerupName(type) {
    const names = {
        water: 'Water', hotwater: 'Hot Water', coffee: 'Coffee', tea: 'Tea',
        exercise: 'Exercise', hanging: 'Hanging', grip: 'Grip Training',
        walk: 'Walk', flatstomach: 'Flat Stomach', doctorwin: 'Doctor Win',
        autophagy: 'Autophagy Boost', custom: 'Custom Powerup',
        broth: 'Bone Broth', protein: 'Protein', fiber: 'Fiber',
        homecooked: 'Homecooked', sloweating: 'Slow Eating',
        chocolate: 'Dark Chocolate', mealwalk: 'Post-Meal Walk'
    };
    return names[type] || type;
}

// Seed data script for @Lurioninefive
// Run this in browser console while logged in, or via Node.js with Firebase Admin SDK

const generateSeedData = () => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const HOUR = 60 * 60 * 1000;

    // Generate 30 days of fasting history
    const fastingHistory = [];
    for (let i = 29; i >= 0; i--) {
        const dayStart = now - (i * DAY);

        // Vary fasting duration (14-20 hours typically)
        const fastDuration = 14 + Math.random() * 6; // 14-20 hours
        const startTime = dayStart + (Math.random() * 4 * HOUR); // Start between midnight and 4am variation
        const endTime = startTime + (fastDuration * HOUR);

        // Generate powerups for this fast
        const powerupTypes = ['water', 'coffee', 'tea', 'exercise', 'walk', 'hanging', 'grip', 'hotwater', 'flatstomach'];
        const powerupCounts = {
            water: Math.floor(Math.random() * 5) + 2, // 2-6 waters
            coffee: Math.floor(Math.random() * 3), // 0-2 coffees
            tea: Math.floor(Math.random() * 2), // 0-1 tea
            exercise: Math.random() > 0.4 ? 1 : 0, // 60% chance of exercise
            walk: Math.floor(Math.random() * 3), // 0-2 walks
            hanging: Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : 0, // 50% chance, 1-3
            grip: Math.random() > 0.5 ? Math.floor(Math.random() * 4) + 1 : 0, // 50% chance, 1-4
            hotwater: Math.floor(Math.random() * 2), // 0-1
            flatstomach: Math.random() > 0.7 ? 1 : 0 // 30% chance
        };

        // Generate hunger logs
        const hungerCounts = {
            hunger1: Math.floor(Math.random() * 3),
            hunger2: Math.floor(Math.random() * 2),
            hunger3: Math.floor(Math.random() * 2),
            hunger4: Math.random() > 0.8 ? 1 : 0
        };

        const feelings = ['soso', 'fine', 'prettygood', 'ready'];
        const feeling = feelings[Math.floor(Math.random() * feelings.length)];

        fastingHistory.push({
            id: `fast-${i}-${Math.random().toString(36).substr(2, 9)}`,
            startTime: startTime,
            endTime: endTime,
            duration: fastDuration,
            goalHours: [16, 18, 20][Math.floor(Math.random() * 3)],
            powerups: powerupCounts,
            hungerLogs: hungerCounts,
            hungerDetails: [],
            feeling: feeling
        });
    }

    // Generate 30 days of sleep history
    const sleepHistory = [];
    for (let i = 29; i >= 0; i--) {
        const dayStart = now - (i * DAY);

        // Sleep typically starts 9pm-11pm, duration 6-9 hours
        const sleepStartHour = 21 + Math.random() * 2; // 9pm-11pm
        const startTime = dayStart + (sleepStartHour * HOUR) - DAY; // Previous night
        const sleepDuration = 6 + Math.random() * 3; // 6-9 hours
        const endTime = startTime + (sleepDuration * HOUR);

        const feelings = ['soso', 'fine', 'prettygood', 'ready'];
        const feeling = feelings[Math.floor(Math.random() * feelings.length)];

        sleepHistory.push({
            id: `sleep-${i}-${Math.random().toString(36).substr(2, 9)}`,
            startTime: startTime,
            endTime: endTime,
            duration: sleepDuration,
            goalHours: 8,
            feeling: feeling
        });
    }

    // Generate eating powerups for last 7 days (more recent)
    const eatingPowerups = [];
    const goodEating = ['protein', 'fiber', 'broth', 'homecooked', 'sloweating', 'mealwalk'];
    const badEating = ['junkfood', 'toofast', 'eatenout', 'bloated'];

    for (let i = 6; i >= 0; i--) {
        const dayStart = now - (i * DAY);

        // 2-4 eating events per day
        const mealsPerDay = 2 + Math.floor(Math.random() * 3);
        for (let m = 0; m < mealsPerDay; m++) {
            const mealTime = dayStart + ((8 + m * 4 + Math.random() * 2) * HOUR);

            // 70% good eating, 30% bad
            if (Math.random() > 0.3) {
                // Good eating - add 1-3 good powerups
                const numGood = 1 + Math.floor(Math.random() * 3);
                for (let g = 0; g < numGood; g++) {
                    eatingPowerups.push({
                        type: goodEating[Math.floor(Math.random() * goodEating.length)],
                        time: mealTime + (g * 1000),
                        timestamp: mealTime + (g * 1000)
                    });
                }
            } else {
                // Bad eating - add 1 bad powerup
                eatingPowerups.push({
                    type: badEating[Math.floor(Math.random() * badEating.length)],
                    time: mealTime,
                    timestamp: mealTime
                });
            }
        }
    }

    // Generate skills XP (accumulated over 30 days of usage)
    const skills = {
        water: 800 + Math.floor(Math.random() * 400),      // Lots of water
        hotwater: 150 + Math.floor(Math.random() * 100),
        coffee: 300 + Math.floor(Math.random() * 200),
        tea: 100 + Math.floor(Math.random() * 100),
        exercise: 250 + Math.floor(Math.random() * 150),
        hanging: 200 + Math.floor(Math.random() * 150),
        grip: 250 + Math.floor(Math.random() * 200),
        walk: 350 + Math.floor(Math.random() * 200),
        doctorwin: 20 + Math.floor(Math.random() * 30),
        flatstomach: 80 + Math.floor(Math.random() * 50),
        broth: 150 + Math.floor(Math.random() * 100),
        protein: 250 + Math.floor(Math.random() * 150),
        fiber: 200 + Math.floor(Math.random() * 100),
        homecooked: 180 + Math.floor(Math.random() * 120),
        sloweating: 150 + Math.floor(Math.random() * 100),
        chocolate: 50 + Math.floor(Math.random() * 50),
        mealwalk: 200 + Math.floor(Math.random() * 150),
        sleep: 300 + Math.floor(Math.random() * 200)
    };

    return {
        currentFast: {
            startTime: null,
            goalHours: 16,
            isActive: false,
            powerups: []
        },
        fastingHistory: fastingHistory,
        currentSleep: {
            startTime: null,
            goalHours: 8,
            isActive: false
        },
        sleepHistory: sleepHistory,
        lastMealTime: now - (2 * HOUR), // Ate 2 hours ago
        sleepPowerups: [],
        eatingPowerups: eatingPowerups,
        skills: skills,
        settings: {
            showFastingGoals: true,
            showSleepGoals: true,
            showFastingFuture: true,
            showBreakingFastGuide: true,
            showExerciseGuide: true,
            showEatingGuide: true,
            showSleepGuide: true,
            showMealSleepQuality: true
        },
        livingLife: {
            isActive: false,
            activatedAt: null,
            expiresAt: null,
            history: []
        }
    };
};

// For browser console: copy this and run it while logged in
const seedData = generateSeedData();
console.log('Generated seed data:', seedData);
console.log('Fasting history entries:', seedData.fastingHistory.length);
console.log('Sleep history entries:', seedData.sleepHistory.length);
console.log('Eating powerups:', seedData.eatingPowerups.length);

// To apply: localStorage.setItem('fasting-tracker-state', JSON.stringify(seedData));
// Then refresh the page

// Export for use
if (typeof module !== 'undefined') {
    module.exports = { generateSeedData };
}

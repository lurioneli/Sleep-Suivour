const https = require('https');

const DATABASE_URL = 'https://sleep-suivour-default-rtdb.firebaseio.com';

// First, find the user ID for @Lurioninefive
const findUser = () => {
    return new Promise((resolve, reject) => {
        https.get(`${DATABASE_URL}/usernames/Lurioninefive.json`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const result = JSON.parse(data);
                console.log('Username lookup result:', result);
                resolve(result?.uid || null);
            });
        }).on('error', reject);
    });
};

// Generate seed data
const generateSeedData = () => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const HOUR = 60 * 60 * 1000;

    const fastingHistory = [];
    for (let i = 29; i >= 0; i--) {
        const dayStart = now - (i * DAY);
        const fastDuration = 14 + Math.random() * 6;
        const startTime = dayStart + (Math.random() * 4 * HOUR);
        
        fastingHistory.push({
            id: 'fast-' + i + '-' + Math.random().toString(36).substr(2, 9),
            startTime, 
            endTime: startTime + (fastDuration * HOUR), 
            duration: Math.round(fastDuration * 100) / 100,
            goalHours: [16, 18, 20][Math.floor(Math.random() * 3)],
            powerups: {
                water: Math.floor(Math.random() * 5) + 2,
                coffee: Math.floor(Math.random() * 3),
                tea: Math.floor(Math.random() * 2),
                exercise: Math.random() > 0.4 ? 1 : 0,
                walk: Math.floor(Math.random() * 3),
                hanging: Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : 0,
                grip: Math.random() > 0.5 ? Math.floor(Math.random() * 4) + 1 : 0,
                hotwater: Math.floor(Math.random() * 2),
                flatstomach: Math.random() > 0.7 ? 1 : 0
            },
            hungerLogs: { hunger1: Math.floor(Math.random() * 3), hunger2: Math.floor(Math.random() * 2), hunger3: Math.floor(Math.random() * 2), hunger4: Math.random() > 0.8 ? 1 : 0 },
            feeling: ['soso', 'fine', 'prettygood', 'ready'][Math.floor(Math.random() * 4)]
        });
    }

    const sleepHistory = [];
    for (let i = 29; i >= 0; i--) {
        const dayStart = now - (i * DAY);
        const startTime = dayStart + ((21 + Math.random() * 2) * HOUR) - DAY;
        const sleepDuration = 6 + Math.random() * 3;
        sleepHistory.push({
            id: 'sleep-' + i + '-' + Math.random().toString(36).substr(2, 9),
            startTime, 
            endTime: startTime + (sleepDuration * HOUR), 
            duration: Math.round(sleepDuration * 100) / 100, 
            goalHours: 8,
            feeling: ['soso', 'fine', 'prettygood', 'ready'][Math.floor(Math.random() * 4)]
        });
    }

    const eatingPowerups = [];
    const goodEating = ['protein', 'fiber', 'broth', 'homecooked', 'sloweating', 'mealwalk'];
    const badEating = ['junkfood', 'toofast', 'eatenout', 'bloated'];
    for (let i = 6; i >= 0; i--) {
        const dayStart = now - (i * DAY);
        for (let m = 0; m < 3; m++) {
            const mealTime = dayStart + ((8 + m * 4) * HOUR);
            if (Math.random() > 0.3) {
                for (let g = 0; g < 2; g++) {
                    eatingPowerups.push({ type: goodEating[Math.floor(Math.random() * goodEating.length)], time: mealTime, timestamp: mealTime });
                }
            } else {
                eatingPowerups.push({ type: badEating[Math.floor(Math.random() * badEating.length)], time: mealTime, timestamp: mealTime });
            }
        }
    }

    return {
        currentFast: { startTime: null, goalHours: 16, isActive: false, powerups: [] },
        fastingHistory,
        currentSleep: { startTime: null, goalHours: 8, isActive: false },
        sleepHistory,
        lastMealTime: now - (2 * HOUR),
        sleepPowerups: [],
        eatingPowerups,
        skills: { water: 950, hotwater: 180, coffee: 420, tea: 150, exercise: 320, hanging: 280, grip: 350, walk: 450, doctorwin: 40, flatstomach: 110, broth: 200, protein: 340, fiber: 250, homecooked: 220, sloweating: 190, chocolate: 70, mealwalk: 280, sleep: 400 },
        settings: { showFastingGoals: true, showSleepGoals: true, showFastingFuture: true, showBreakingFastGuide: true, showExerciseGuide: true, showEatingGuide: true, showSleepGuide: true, showMealSleepQuality: true },
        livingLife: { isActive: false, activatedAt: null, expiresAt: null, history: [] },
        lastSyncTimestamp: now
    };
};

// Write data to Firebase
const writeData = (uid, data) => {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        const url = new URL(`${DATABASE_URL}/users/${uid}/fastingData.json`);
        
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('Write response:', res.statusCode, data.substring(0, 200));
                resolve(data);
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
};

async function main() {
    console.log('Looking up user @Lurioninefive...');
    const uid = await findUser();
    
    if (!uid) {
        console.log('User not found in /usernames. Checking if we need to look elsewhere...');
        // Try a different approach - list users or use known UID
        return;
    }
    
    console.log('Found UID:', uid);
    console.log('Generating 30 days of seed data...');
    const data = generateSeedData();
    
    console.log('Writing to Firebase...');
    console.log('- Fasting history:', data.fastingHistory.length, 'entries');
    console.log('- Sleep history:', data.sleepHistory.length, 'entries');
    console.log('- Eating powerups:', data.eatingPowerups.length, 'entries');
    
    await writeData(uid, data);
    console.log('Done!');
}

main().catch(console.error);

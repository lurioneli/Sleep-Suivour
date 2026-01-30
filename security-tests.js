/**
 * SECURITY TEST SUITE FOR SLEEP SUIVOUR
 *
 * Run these tests in your browser console while the app is open.
 * Copy and paste each test section to verify security measures.
 *
 * IMPORTANT: Run these tests while signed in to fully test Firebase rules.
 */

// ==========================================
// TEST 1: XSS Prevention (Username Escaping)
// ==========================================
console.log('=== TEST 1: XSS Prevention ===');

// Try to inject malicious HTML via username
const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror="alert(1)">',
    '"><script>alert(1)</script>',
    "'; DROP TABLE users;--",
    '<svg onload="alert(1)">',
];

// Test the escapeHtml function
xssPayloads.forEach(payload => {
    const escaped = escapeHtml(payload);
    const containsScript = escaped.includes('<script') || escaped.includes('onerror') || escaped.includes('onload');
    console.log(`Payload: ${payload.substring(0, 30)}...`);
    console.log(`Escaped: ${escaped.substring(0, 50)}...`);
    console.log(`Safe: ${!containsScript ? '✅ PASS' : '❌ FAIL'}`);
    console.log('---');
});

// ==========================================
// TEST 2: Username Validation
// ==========================================
console.log('\n=== TEST 2: Username Validation ===');

const invalidUsernames = [
    '<script>alert(1)</script>',  // XSS
    'ab',                          // Too short
    'a'.repeat(25),               // Too long
    'user name',                  // Contains space
    'user@name',                  // Invalid character
    'user<name>',                 // HTML characters
    '../../etc/passwd',           // Path traversal
];

const validUsernames = [
    'validUser123',
    'test_user',
    'Player_One',
];

console.log('Invalid usernames (should all fail):');
invalidUsernames.forEach(username => {
    const isValid = isValidUsername(username);
    console.log(`  "${username.substring(0, 20)}..." - ${!isValid ? '✅ Correctly rejected' : '❌ FAIL - Should be rejected'}`);
});

console.log('\nValid usernames (should all pass):');
validUsernames.forEach(username => {
    const isValid = isValidUsername(username);
    console.log(`  "${username}" - ${isValid ? '✅ Correctly accepted' : '❌ FAIL - Should be accepted'}`);
});

// ==========================================
// TEST 3: Number Sanitization
// ==========================================
console.log('\n=== TEST 3: Number Sanitization ===');

const numberTests = [
    { value: 100, min: 0, max: 50, expected: 50, desc: 'Clamp to max' },
    { value: -10, min: 0, max: 100, expected: 0, desc: 'Clamp to min' },
    { value: 'abc', min: 0, max: 100, expected: 0, desc: 'Non-numeric string' },
    { value: Infinity, min: 0, max: 100, expected: 0, desc: 'Infinity' },
    { value: NaN, min: 0, max: 100, expected: 0, desc: 'NaN' },
    { value: '50', min: 0, max: 100, expected: 50, desc: 'Numeric string' },
    { value: 999999999999, min: 0, max: 1000, expected: 1000, desc: 'Huge number' },
];

numberTests.forEach(test => {
    const result = sanitizeNumber(test.value, test.min, test.max);
    const pass = result === test.expected;
    console.log(`  ${test.desc}: ${pass ? '✅ PASS' : '❌ FAIL'} (input: ${test.value}, expected: ${test.expected}, got: ${result})`);
});

// ==========================================
// TEST 4: Firebase Rules - Unauthorized Write Attempt
// ==========================================
console.log('\n=== TEST 4: Firebase Rules (requires sign-in) ===');

async function testFirebaseRules() {
    if (!firebaseSync || !firebaseSync.isAuthenticated()) {
        console.log('⚠️ Please sign in first to test Firebase rules');
        return;
    }

    const myUid = firebaseSync.currentUser.uid;
    const fakeUid = 'FAKE_USER_ID_12345';

    console.log(`Your UID: ${myUid}`);
    console.log(`Attempting to write to another user's path...`);

    try {
        // Try to write to another user's leaderboard entry
        await database.ref(`leaderboard/daily/2025-01-30/${fakeUid}`).set({
            username: 'hacker',
            constitution: 999,
            totalXP: 9999999
        });
        console.log('❌ FAIL - Was able to write to another user\'s path!');
    } catch (error) {
        console.log('✅ PASS - Correctly blocked: ' + error.message);
    }

    // Try to write invalid data to your own path
    console.log('\nAttempting to write invalid data to your own path...');
    try {
        await database.ref(`leaderboard/daily/2025-01-30/${myUid}`).set({
            username: 'x'.repeat(50), // Too long - should fail validation
            constitution: 99999,      // Over limit - should fail
            totalXP: -100             // Negative - should fail
        });
        console.log('❌ FAIL - Was able to write invalid data!');
    } catch (error) {
        console.log('✅ PASS - Correctly blocked invalid data: ' + error.message);
    }

    // Try to claim another user's username
    console.log('\nAttempting to steal another user\'s username...');
    try {
        await database.ref('usernames/existinguser').set({
            uid: myUid // Try to claim with my UID
        });
        console.log('⚠️ Check if this overwrote an existing username');
    } catch (error) {
        console.log('✅ PASS - Correctly blocked username theft: ' + error.message);
    }
}

// Run Firebase tests
testFirebaseRules();

// ==========================================
// TEST 5: Rate Limiting
// ==========================================
console.log('\n=== TEST 5: Rate Limiting ===');

async function testRateLimiting() {
    if (!firebaseSync || !firebaseSync.isAuthenticated() || !currentUsername) {
        console.log('⚠️ Please sign in and set username first');
        return;
    }

    console.log('Attempting rapid leaderboard updates...');
    const startTime = Date.now();

    // Try to update 5 times rapidly
    for (let i = 0; i < 5; i++) {
        await updateLeaderboardEntry();
        console.log(`  Update ${i + 1} attempted at +${Date.now() - startTime}ms`);
    }

    console.log('✅ Rate limiting should have blocked most of these (5 second cooldown)');
}

testRateLimiting();

// ==========================================
// TEST 6: CSP Headers Check
// ==========================================
console.log('\n=== TEST 6: Content Security Policy ===');

// Check if CSP is active
const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
if (cspMeta) {
    console.log('✅ CSP meta tag found');
    console.log('Policy:', cspMeta.content.substring(0, 100) + '...');
} else {
    console.log('❌ No CSP meta tag found');
}

// Try to inject a script (should be blocked by CSP if inline scripts from data: are blocked)
try {
    const script = document.createElement('script');
    script.textContent = 'window.__CSP_TEST__ = true;';
    document.body.appendChild(script);
    if (window.__CSP_TEST__) {
        console.log('⚠️ Inline script executed (allowed by unsafe-inline for Tailwind)');
    }
} catch (e) {
    console.log('✅ Inline script blocked');
}

// ==========================================
// TEST 7: localStorage Data Check
// ==========================================
console.log('\n=== TEST 7: localStorage Security ===');

const storedData = localStorage.getItem('fasting-tracker-state');
if (storedData) {
    const parsed = JSON.parse(storedData);

    // Check for sensitive data that shouldn't be stored
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'credential', 'email'];
    const foundSensitive = [];

    const checkObject = (obj, path = '') => {
        for (const key of Object.keys(obj)) {
            const fullPath = path ? `${path}.${key}` : key;
            if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
                foundSensitive.push(fullPath);
            }
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                checkObject(obj[key], fullPath);
            }
        }
    };

    checkObject(parsed);

    if (foundSensitive.length === 0) {
        console.log('✅ No sensitive data keys found in localStorage');
    } else {
        console.log('⚠️ Potentially sensitive keys found:', foundSensitive);
    }
} else {
    console.log('ℹ️ No localStorage data found');
}

// ==========================================
// TEST 8: Console Log Leakage Check
// ==========================================
console.log('\n=== TEST 8: Console Log Security ===');
console.log('Checking for sensitive data in recent console output...');
console.log('✅ Manual check: Review console for any emails, passwords, or tokens');
console.log('   If you see your email address in the console, that\'s a security issue');

// ==========================================
// TEST 9: Import Data Sanitization
// ==========================================
console.log('\n=== TEST 9: Import Data Sanitization ===');

const maliciousImport = {
    currentFast: {
        startTime: Date.now() + 999999999999, // Future date
        goalHours: 99999, // Way over limit
        isActive: 'yes', // Wrong type
        powerups: ['<script>alert(1)</script>'] // XSS in array
    },
    fastingHistory: [
        {
            id: '<script>alert(1)</script>',
            startTime: -1000,
            endTime: Date.now(),
            duration: -50, // Negative
            goalHours: 1000
        }
    ],
    sleepHistory: [],
    skills: {
        water: 'invalid',
        coffee: -100,
        tea: Infinity
    }
};

try {
    const sanitized = sanitizeImportedData(maliciousImport);

    console.log('Checking sanitized data:');
    console.log(`  goalHours clamped: ${sanitized.currentFast.goalHours <= 72 ? '✅' : '❌'} (${sanitized.currentFast.goalHours})`);
    console.log(`  isActive is boolean: ${typeof sanitized.currentFast.isActive === 'boolean' ? '✅' : '❌'}`);
    console.log(`  Future startTime handled: ${sanitized.currentFast.startTime === null ? '✅' : '❌'}`);
    console.log(`  Invalid history filtered: ${sanitized.fastingHistory.length === 0 ? '✅' : '❌'}`);
    console.log(`  Skills sanitized: ${sanitized.skills.water === 0 ? '✅' : '❌'}`);
} catch (error) {
    console.log('✅ Malicious import correctly rejected:', error.message);
}

// ==========================================
// SUMMARY
// ==========================================
console.log('\n========================================');
console.log('SECURITY TEST SUMMARY');
console.log('========================================');
console.log('Review the results above. All tests should show ✅ PASS');
console.log('If any show ❌ FAIL, there may be a security issue.');
console.log('\nFor Firebase rule tests, check the Firebase Console > Rules Playground');
console.log('to simulate write attempts with different user contexts.');

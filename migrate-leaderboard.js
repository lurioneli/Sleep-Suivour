/**
 * Leaderboard Migration Script: constitution → heartPoints
 *
 * This script migrates all existing leaderboard entries from using
 * 'constitution' field to 'heartPoints' field.
 *
 * HOW TO RUN:
 *
 * Option A: Firebase Console (Easiest)
 * 1. Go to Firebase Console → Your Project → Realtime Database
 * 2. Click the three dots menu → "Export JSON"
 * 3. Download the backup (IMPORTANT: keep this safe!)
 * 4. Go to Cloud Functions or use the Firebase Admin SDK locally
 *
 * Option B: Run Locally with Node.js
 * 1. Install Firebase Admin SDK: npm install firebase-admin
 * 2. Download your service account key from Firebase Console:
 *    Project Settings → Service Accounts → Generate New Private Key
 * 3. Save it as 'serviceAccountKey.json' in this directory
 * 4. Run: node migrate-leaderboard.js
 *
 * WHAT THIS SCRIPT DOES:
 * - Reads all entries in /leaderboard/daily/{date}/{uid}
 * - Reads all entries in /leaderboard/alltime/{uid}
 * - For each entry that has 'constitution' but not 'heartPoints':
 *   - Adds 'heartPoints' field with the same value as 'constitution'
 * - Preserves all other data
 *
 * SAFETY:
 * - This is ADDITIVE only - it adds heartPoints, doesn't remove constitution
 * - Entries that already have heartPoints are skipped
 * - Dry run mode available to preview changes
 */

const admin = require('firebase-admin');

// Configuration
const DRY_RUN = false; // Set to false to actually write changes
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';
const DATABASE_URL = 'https://sleep-suivour-default-rtdb.firebaseio.com';

// Initialize Firebase Admin
let serviceAccount;
try {
    serviceAccount = require(SERVICE_ACCOUNT_PATH);
} catch (e) {
    console.error('❌ Could not load service account key.');
    console.error('   Download it from Firebase Console:');
    console.error('   Project Settings → Service Accounts → Generate New Private Key');
    console.error('   Save as: serviceAccountKey.json');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: DATABASE_URL
});

const db = admin.database();

async function migrateLeaderboard() {
    console.log('🚀 Starting leaderboard migration: constitution → heartPoints');
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : '⚠️  LIVE - Changes will be written!'}`);
    console.log('');

    let totalEntries = 0;
    let migratedEntries = 0;
    let skippedEntries = 0;
    let errors = 0;

    // Migrate daily leaderboard
    console.log('📅 Processing daily leaderboard...');
    try {
        const dailySnapshot = await db.ref('leaderboard/daily').once('value');
        const dailyData = dailySnapshot.val();

        if (dailyData) {
            for (const date of Object.keys(dailyData)) {
                const dateEntries = dailyData[date];
                for (const uid of Object.keys(dateEntries)) {
                    totalEntries++;
                    const entry = dateEntries[uid];

                    if (entry.heartPoints !== undefined) {
                        skippedEntries++;
                        continue; // Already has heartPoints
                    }

                    if (entry.constitution !== undefined) {
                        const newEntry = {
                            ...entry,
                            heartPoints: entry.constitution
                        };

                        if (!DRY_RUN) {
                            await db.ref(`leaderboard/daily/${date}/${uid}`).set(newEntry);
                        }
                        migratedEntries++;
                        console.log(`   ✓ Migrated daily/${date}/${uid}: constitution=${entry.constitution} → heartPoints=${entry.constitution}`);
                    }
                }
            }
        }
    } catch (err) {
        console.error('   ❌ Error processing daily leaderboard:', err.message);
        errors++;
    }

    // Migrate alltime leaderboard
    console.log('');
    console.log('🏆 Processing alltime leaderboard...');
    try {
        const alltimeSnapshot = await db.ref('leaderboard/alltime').once('value');
        const alltimeData = alltimeSnapshot.val();

        if (alltimeData) {
            for (const uid of Object.keys(alltimeData)) {
                totalEntries++;
                const entry = alltimeData[uid];

                if (entry.heartPoints !== undefined) {
                    skippedEntries++;
                    continue; // Already has heartPoints
                }

                if (entry.constitution !== undefined) {
                    const newEntry = {
                        ...entry,
                        heartPoints: entry.constitution
                    };

                    if (!DRY_RUN) {
                        await db.ref(`leaderboard/alltime/${uid}`).set(newEntry);
                    }
                    migratedEntries++;
                    console.log(`   ✓ Migrated alltime/${uid}: constitution=${entry.constitution} → heartPoints=${entry.constitution}`);
                }
            }
        }
    } catch (err) {
        console.error('   ❌ Error processing alltime leaderboard:', err.message);
        errors++;
    }

    // Summary
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 Migration Summary');
    console.log('═══════════════════════════════════════');
    console.log(`   Total entries scanned: ${totalEntries}`);
    console.log(`   Migrated: ${migratedEntries}`);
    console.log(`   Skipped (already had heartPoints): ${skippedEntries}`);
    console.log(`   Errors: ${errors}`);
    console.log('');

    if (DRY_RUN) {
        console.log('🔍 This was a DRY RUN. No changes were made.');
        console.log('   To apply changes, set DRY_RUN = false and run again.');
    } else {
        console.log('✅ Migration complete!');
        console.log('');
        console.log('📋 Next steps:');
        console.log('   1. Update database.rules.json to require heartPoints');
        console.log('   2. Deploy new rules: firebase deploy --only database');
        console.log('   3. Remove backwards compatibility code from app.js');
    }

    process.exit(errors > 0 ? 1 : 0);
}

migrateLeaderboard().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

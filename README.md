# Daily Fasting Hours Tracker

A responsive web app for tracking daily fasting hours with real-time timer, history, statistics, and preset goals. Access from any device on your local network.

## Features

- **Real-time Timer**: Track your current fast with a live countdown
- **Preset Goals**: Quick selection for popular fasting schedules (16:8, 18:6, 20:4, 24hr)
- **Custom Goals**: Set any fasting duration from 1-72 hours
- **Progress Bar**: Visual indicator of progress toward your goal
- **Goal Notifications**: Browser notifications when you reach your fasting goal
- **Fasting History**: Complete log of all your fasts with dates and durations
- **Statistics Dashboard**:
  - Total fasts completed
  - Average fasting duration
  - Longest fast
  - Success rate (fasts that met goal)
  - Current week average
- **Persistent Storage**: All data saved to browser localStorage
- **Cloud Sync**: Automatic real-time syncing across all your devices with Firebase
- **Manual Backup**: Export/import functionality for manual data backup
- **Mobile-Friendly**: Responsive design works great on phones and tablets
- **Local Network Access**: Use from any device on your WiFi network

## Quick Start

### 1. Start the Server

Navigate to the fasting-tracker directory and run:

```bash
cd fasting-tracker
python3 server.py
```

**Command line options:**
```bash
python3 server.py --host 0.0.0.0 --port 8000  # Custom host and port
python3 server.py --port 3000                  # Custom port only
python3 server.py --help                       # Show all options
```

You should see output like:

```
============================================================
Fasting Tracker Server Started
============================================================

Server is running on port 8000

Access the app from:
  - This computer:    http://localhost:8000
  - Other devices:    http://192.168.1.100:8000

Make sure your devices are on the same WiFi network!
```

### 2. Access the App

**From your computer:**
- Open your browser and go to `http://localhost:8000`

**From your phone or tablet:**
- Make sure your device is on the same WiFi network as your computer
- Open your browser and go to the IP address shown in the server output (e.g., `http://192.168.1.100:8000`)

### 3. Start Tracking!

1. Select a fasting goal (16:8, 18:6, 20:4, or 24hr) or enter a custom duration
2. Click "Start Fast" to begin your timer
3. The timer will continue running even if you close the browser
4. Click "Stop Fast" when you're done to save it to your history

## Usage Guide

### Timer Tab

- **Select a Goal**: Click one of the preset buttons or enter a custom number of hours
- **Start Fasting**: Click the green "Start Fast" button to begin
- **Monitor Progress**: Watch the timer count up and the progress bar fill
- **Goal Achievement**: You'll see a notification when you reach your goal
- **Stop Fasting**: Click the red "Stop Fast" button when you want to end your fast

### History Tab

- View all your completed fasts in reverse chronological order
- See the duration, goal, and achievement status (✓ if goal was met)
- Delete individual entries if needed
- Each entry shows the start and end times

### Stats Tab

- **Total Fasts**: How many fasts you've completed
- **Average Duration**: Your average fasting time across all fasts
- **Longest Fast**: Your personal record
- **Success Rate**: Percentage of fasts where you met your goal
- **Current Week Average**: Average fasting time for the last 7 days

### Cloud Sync - Automatic Syncing (Recommended)

The app now supports automatic real-time syncing across all your devices using Firebase!

**Setup (One-time):**

1. **Create a Firebase Project** (Free):
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project"
   - Enter a project name (e.g., "My Fasting Tracker")
   - Disable Google Analytics (not needed)
   - Click "Create project"

2. **Enable Authentication**:
   - In your Firebase project, click "Authentication" in the left sidebar
   - Click "Get started"
   - Click "Sign-in method" tab
   - Enable "Google" provider
   - Add your email as an authorized domain if prompted
   - Click "Save"

3. **Enable Realtime Database**:
   - Click "Realtime Database" in the left sidebar
   - Click "Create Database"
   - Choose a location (pick closest to you)
   - Start in "test mode" for now
   - Click "Enable"

4. **Configure Database Rules** (Important for security):
   - In Realtime Database, click "Rules" tab
   - Replace the rules with:
   ```json
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "$uid === auth.uid",
           ".write": "$uid === auth.uid"
         }
       }
     }
   }
   ```
   - Click "Publish"

5. **Get Your Firebase Config**:
   - Click the gear icon (⚙️) next to "Project Overview"
   - Click "Project settings"
   - Scroll down to "Your apps" section
   - Click the web icon (`</>`) to add a web app
   - Enter a nickname (e.g., "Fasting Tracker Web")
   - Click "Register app"
   - Copy the `firebaseConfig` object

6. **Update Your App**:
   - Open `firebase-config.js` in the fasting-tracker folder
   - Replace the placeholder values with your Firebase config values:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",              // Paste your values here
       authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT_ID.appspot.com",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID",
       databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com"
   };
   ```
   - Save the file

**Using Cloud Sync:**

1. Open the app on any device
2. Click "Sign In" in the top right corner
3. Sign in with your Google account
4. Your data will automatically sync across all devices!
5. The sync indicator shows:
   - 🟢 Online - Synced and connected
   - 🔴 Offline - Not signed in or no connection
   - 🟠 Syncing - Currently uploading/downloading changes

**How it works:**
- When you sign in on any device, your data is uploaded to Firebase
- Any changes you make are instantly synced to the cloud
- Other devices signed in with the same account automatically receive updates
- Works even if you close and reopen the app
- Data is private to your Google account only

**Benefits:**
- No manual export/import needed
- Instant syncing across all devices
- Start a fast on your phone, track it on your computer
- Never lose your data - it's backed up in the cloud
- Works across different browsers and devices

### Manual Backup (Alternative)

If you prefer not to use cloud sync, you can still manually transfer data:

**Export Data:**
1. Go to Stats tab, scroll to "Manual Backup" section
2. Click "📥 Export Data" button
3. A JSON file will download to your device
4. Transfer this file to your other device (email, cloud storage, AirDrop, etc.)

**Import & Replace Data:**
1. Click "📤 Import & Replace Data" button
2. Select your exported JSON file
3. All existing data will be replaced with the imported data

**Import & Merge Data:**
1. Click "🔄 Import & Merge Data" button
2. Select your exported JSON file
3. Imported data will be combined with existing data
4. No duplicates - the app intelligently merges both datasets

## Technical Details

### File Structure

```
fasting-tracker/
├── index.html          # Main app interface
├── app.js              # JavaScript logic and state management
├── firebase-config.js  # Firebase project configuration
├── firebase-sync.js    # Firebase sync functionality
├── server.py           # Python HTTP server for local network access
└── README.md           # This file
```

### Technology Stack

- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Tailwind CSS (via CDN)
- **Storage**: Browser localStorage API
- **Cloud Sync**: Firebase Realtime Database & Authentication
- **Server**: Python 3 HTTP server

### Data Storage

All data is stored in your browser's localStorage with the key `fasting-tracker-state`. The data structure is:

```javascript
{
  currentFast: {
    startTime: timestamp,
    goalHours: number,
    isActive: boolean
  },
  fastingHistory: [
    {
      id: string,
      startTime: timestamp,
      endTime: timestamp,
      duration: number (hours),
      goalHours: number
    }
  ]
}
```

**Important Notes:**
- Data is stored locally in browser localStorage
- With cloud sync enabled, data is also synced to Firebase
- Your phone and computer will automatically sync when signed in with the same Google account
- Clearing browser data will erase local history, but cloud backup remains if synced
- Without cloud sync, you'll need to manually export/import to share data between devices

### Browser Notifications

The app requests permission to send browser notifications. Grant permission to receive alerts when you reach your fasting goal.

## Troubleshooting

### Can't access from phone

1. Make sure your phone and computer are on the same WiFi network
2. Check that your firewall isn't blocking port 8000
3. Try accessing from your computer first to verify the server is running
4. Use the exact IP address shown in the server output

### Timer not persisting

The timer uses localStorage, which can be cleared by:
- Clearing browser data
- Using private/incognito mode
- Different browsers (Chrome and Safari have separate storage)

### Notifications not working

1. Check that you granted notification permissions when prompted
2. In your browser settings, ensure notifications are allowed for this site
3. Some browsers block notifications from localhost - use the IP address instead

### Port 8000 already in use

If you see an error that port 8000 is already in use, either:
- Stop the other program using that port
- Edit `server.py` and change `PORT = 8000` to a different number (e.g., `PORT = 8080`)

## Tips

- **Set a reminder**: Your phone won't remind you when your fast is complete - check the app periodically
- **Keep the tab open**: For reliable notifications, keep the browser tab open
- **Use preset goals**: The 16:8 and 18:6 buttons are perfect for intermittent fasting
- **Track consistency**: Use the Stats tab to monitor your progress over time
- **Custom goals**: Great for experimenting with different fasting protocols

## Privacy

**Local Mode (without cloud sync):**
- All data stays on your device
- Nothing is sent to any external server
- The Python server only serves files from your computer to devices on your local network

**Cloud Sync Mode (when signed in):**
- Data is encrypted and stored in your Firebase project
- Only you can access your data (secured by Google authentication)
- Data is stored in Google's secure Firebase infrastructure
- You control your Firebase project and can delete all data anytime
- No third parties have access to your fasting data

## License

Free to use and modify as you wish!

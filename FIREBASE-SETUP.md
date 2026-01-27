# Firebase Cloud Sync Setup Guide

Follow these steps to enable automatic cloud syncing for your Fasting Tracker app.

## Step 1: Create Firebase Project (5 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter a project name (e.g., "Fasting Tracker")
4. **Disable** Google Analytics (not needed for this app)
5. Click **"Create project"**
6. Wait for project creation to complete, then click **"Continue"**

## Step 2: Enable Google Authentication

1. In your Firebase project, click **"Authentication"** in the left sidebar
2. Click **"Get started"**
3. Click the **"Sign-in method"** tab
4. Find **"Google"** in the providers list and click it
5. Toggle the **"Enable"** switch ON
6. Choose your support email from the dropdown
7. Click **"Save"**

## Step 3: Create Realtime Database

1. Click **"Realtime Database"** in the left sidebar
2. Click **"Create Database"**
3. Choose a database location (select the one closest to you)
4. Select **"Start in test mode"** (we'll secure it in the next step)
5. Click **"Enable"**

## Step 4: Secure Your Database

1. In Realtime Database, click the **"Rules"** tab
2. Replace the existing rules with this secure configuration:

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

3. Click **"Publish"**

**What this does:** Only allows users to read and write their own data. Nobody else can access your fasting records.

## Step 5: Get Your Firebase Configuration

1. Click the **gear icon (⚙️)** next to "Project Overview" in the top left
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **web icon (`</>`)**  to add a web app
5. Enter a nickname: **"Fasting Tracker Web"**
6. **Do NOT** check "Also set up Firebase Hosting"
7. Click **"Register app"**
8. You'll see a `firebaseConfig` object - **keep this page open!**

## Step 6: Configure Your App

1. Open the file `firebase-config.js` in your fasting-tracker folder
2. Find these lines:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com"
};
```

3. Replace each placeholder with the values from your Firebase config:
   - Copy `apiKey` from Firebase Console
   - Copy `authDomain` from Firebase Console
   - Copy `projectId` from Firebase Console
   - Copy `storageBucket` from Firebase Console
   - Copy `messagingSenderId` from Firebase Console
   - Copy `appId` from Firebase Console
   - Copy `databaseURL` from Firebase Console (or construct it: `https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com`)

4. **Save the file**

### Example:
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyC1234567890abcdefghijklmnopqrstu",
    authDomain: "my-fasting-tracker.firebaseapp.com",
    projectId: "my-fasting-tracker",
    storageBucket: "my-fasting-tracker.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890",
    databaseURL: "https://my-fasting-tracker-default-rtdb.firebaseio.com"
};
```

## Step 7: Authorize Your Domain (Important!)

If you're accessing the app via your local IP address or a custom domain:

1. In Firebase Console, go to **Authentication**
2. Click the **"Settings"** tab
3. Scroll to **"Authorized domains"**
4. Click **"Add domain"**
5. Add your local IP (e.g., `192.168.1.100`) or custom domain
6. Click **"Add"**

**Note:** `localhost` and `127.0.0.1` are already authorized by default.

## Step 8: Test It!

1. **Refresh your fasting tracker app** in the browser
2. You should see the sync status change from "Setup required" to "Offline"
3. Click the **"Sign In"** button in the top right
4. A Google sign-in popup should appear
5. Choose your Google account
6. Grant permissions
7. You should see your profile picture and email
8. The sync indicator should turn **green** (🟢 Online)

## Troubleshooting

### "Setup required" still showing after configuration

- Double-check all values in `firebase-config.js`
- Make sure you saved the file
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Check the browser console for errors (F12 → Console tab)

### "This domain is not authorized"

- Go to Firebase Console → Authentication → Settings → Authorized domains
- Add your current domain/IP address to the list

### Sign-in popup doesn't appear

- Check if your browser is blocking popups
- Disable popup blockers for this site
- Try a different browser

### "Failed to initialize Firebase"

- Verify all config values are correct (no typos)
- Check that you copied the complete strings (no extra spaces)
- Make sure `databaseURL` ends with `.firebaseio.com`

### Still having issues?

1. Open browser console (F12)
2. Look for red error messages
3. Common issues:
   - **Invalid API key**: Check your `apiKey` in firebase-config.js
   - **Project not found**: Check your `projectId`
   - **Database URL wrong**: Verify `databaseURL` format

## Security Notes

✅ **Your data is secure:**
- Only you can access your data (secured by database rules)
- Data is encrypted in transit (HTTPS)
- Firebase is Google's infrastructure (enterprise-grade security)

✅ **Free tier limits:**
- Realtime Database: 1 GB storage, 10 GB/month bandwidth
- Authentication: Unlimited users
- This app uses minimal data, so you'll never hit the limits

## Success!

Once configured, your fasting data will:
- ✨ Sync automatically across all devices
- 💾 Backup to the cloud in real-time
- 🔄 Merge intelligently when using multiple devices
- 🔐 Stay private and secure

You can now sign in on your phone, tablet, and computer with the same Google account to access your data everywhere!

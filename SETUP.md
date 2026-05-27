# Family State of the Union — Setup Guide

## What you're building
A private web app that works like a native iPhone app. Both of you sign in with Google, see each other's updates in real time, and get a push notification every Saturday evening as a Sunday meeting reminder.

---

## Before you start
Download and unzip `family-sotu-app.zip` to your Desktop. You should see a folder called `family-sotu-app` with files inside.

---

## Step 1: Set up Firebase — your database (15 min)

Firebase is Google's free database service. This is where all your meeting data lives.

### 1a. Create your Firebase project
1. Go to **console.firebase.google.com** — sign in with your Google account
2. Click **Add project**
3. Name it `family-sotu` → click **Continue** → turn off Google Analytics (not needed) → **Create project**
4. Wait ~30 seconds for it to set up, then click **Continue**

### 1b. Add a web app and get your config values
1. On the project overview page, click the **web icon** — it looks like `</>`
2. Register app name: `family-sotu` → click **Register app**
3. You'll see a block of code with your config values. **Copy all of it** — you'll need it in Step 3
4. Click **Continue to console**

### 1c. Enable Google Sign-In
1. In the left sidebar: **Build → Authentication**
2. Click **Get started**
3. Click **Google** under Sign-in providers
4. Toggle **Enable** → add your Gmail address as the support email → **Save**

### 1d. Create your Firestore database
1. In the left sidebar: **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** → **Next**
4. Choose a server location — pick **us-central** → **Enable**
5. Click the **Rules** tab and replace everything with:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
6. Click **Publish**

### 1e. Enable Cloud Messaging (for push notifications)
1. In the left sidebar: **Build → Cloud Messaging**
2. If it asks you to enable the API, click **Enable**
3. Go to the gear icon (top left) → **Project Settings**
4. Click the **Cloud Messaging** tab
5. Scroll to **Web Push certificates** → click **Generate key pair**
6. Copy the long key that appears — this is your **VAPID key**

### 1f. Upgrade to Blaze plan (for Saturday reminders — free in practice)
The Saturday night reminder requires Firebase's pay-as-you-go plan. Your usage will be ~$0/month — it's free in practice, but requires a credit card on file.
1. In the left sidebar, click **Upgrade** at the bottom
2. Select **Blaze plan** → add a payment method
3. Set a billing alert at $5 so you're notified if anything unexpected happens

---

## Step 2: Create a GitHub account and upload the code (10 min)

GitHub stores your code so Vercel can deploy it.

### 2a. Create a GitHub account
1. Go to **github.com** → click **Sign up**
2. Use your email → create a username and password → verify your email

### 2b. Create a new repository
1. Once logged in, click the **+** in the top right → **New repository**
2. Name it `family-sotu`
3. Set it to **Private**
4. Click **Create repository**

### 2c. Upload your files
1. On your new empty repository page, click **uploading an existing file**
2. Open the `family-sotu-app` folder on your Desktop
3. Select ALL files and folders inside it (Cmd+A on Mac, Ctrl+A on Windows)
4. Drag them into the GitHub upload area
5. Scroll down → click **Commit changes**

Your code is now on GitHub.

---

## Step 3: Create your .env file with your Firebase values (5 min)

This tells the app where your Firebase project is.

1. In your `family-sotu-app` folder, find the file `.env.example`
2. Duplicate it and rename the copy to `.env` (remove the word "example")
3. Open `.env` in any text editor (TextEdit on Mac, Notepad on Windows)
4. Fill in each line using the Firebase config values you copied in Step 1b:
```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=family-sotu.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=family-sotu
VITE_FIREBASE_STORAGE_BUCKET=family-sotu.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_VAPID_KEY=BK...   ← paste the VAPID key from Step 1e
```
5. Save the file

**Note:** `.env` is listed in `.gitignore` so it won't be uploaded to GitHub — this is correct and intentional.

---

## Step 4: Deploy to Vercel (5 min)

Vercel hosts your app and gives you a URL.

1. Go to **vercel.com** → **Sign up with GitHub** → authorize Vercel
2. Click **Add New Project** → find and select `family-sotu`
3. Before clicking Deploy, click **Environment Variables**
4. Add each line from your `.env` file — one per variable (name and value)
5. Click **Deploy**
6. Wait ~2 minutes — Vercel builds and deploys your app
7. You'll get a URL like `family-sotu.vercel.app` — **save this URL**

### Add your Vercel URL to Firebase authorized domains
1. Back in Firebase Console → **Authentication → Settings → Authorized domains**
2. Click **Add domain** → paste your Vercel URL (without https://) → **Add**

---

## Step 5: Update the service worker with your Firebase values (3 min)

The push notification service worker needs your Firebase config hardcoded (browser limitation).

1. In your `family-sotu-app` folder, open `public/firebase-messaging-sw.js`
2. Replace each `REPLACE_WITH_YOUR_...` placeholder with your actual Firebase values
3. Also replace the two `YOUR_VERCEL_URL` placeholders in `functions/index.js` with your actual Vercel URL
4. Upload the updated files to GitHub (drag and drop the changed files onto github.com/YOUR_USERNAME/family-sotu)
5. Vercel will automatically redeploy within ~60 seconds

---

## Step 6: Deploy the Saturday reminder Cloud Function (10 min)

This is the one step that needs your computer's Terminal.

Claude Code can do this for you — open a Claude Code session and say:
> "I need to deploy Firebase Cloud Functions. My project is in the `functions/` folder inside `family-sotu-app`. Help me install the Firebase CLI and deploy."

Or do it manually:
1. Install Firebase CLI: open Terminal and run `npm install -g firebase-tools`
2. Run `firebase login` and log in with your Google account
3. Navigate to your project folder: `cd ~/Desktop/family-sotu-app`
4. Run `firebase deploy --only functions`

The Saturday 7pm reminder is now scheduled.

---

## Step 7: Add to both iPhone home screens (2 min each)

Do this on both Kelly's and Kevin's phones.

1. Open **Safari** on iPhone (must be Safari, not Chrome)
2. Go to your Vercel URL
3. Sign in with your Google account
4. Tap the **Share button** (box with arrow pointing up)
5. Scroll down → tap **Add to Home Screen**
6. Name it **SotU** → tap **Add**

The app now appears on your home screen like a native app — full screen, no browser bar.

### Enable notifications on iPhone
After adding to home screen:
1. Open the app from your home screen (important — must open from home screen, not Safari)
2. A banner will appear asking to enable notifications → tap **Enable**
3. iOS will ask for permission → tap **Allow**

Both Kelly and Kevin need to do this to receive the Saturday reminder.

---

## Future enhancements (backlog)

- **Live Google Calendar sync** — replace hardcoded events with real calendar data
- **Calendar push** — update June 26 event with checklist answers (currently copy/paste)
- **Event creation** — add events during the meeting that sync to both calendars
- **Customize the reminder** — change the Saturday time or message in `functions/index.js`

---

## Updating the app going forward

Any time you want changes (new events, meals, anything):
1. Edit the files in your `family-sotu-app` folder
2. Upload the changed files to GitHub (drag and drop)
3. Vercel redeploys automatically in ~60 seconds

Or bring it to Claude Code and say what you want changed.

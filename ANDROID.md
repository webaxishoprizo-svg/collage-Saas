# Build the Painter Work Android App (Capacitor)

This project wraps the web app in a native Android shell using
[Capacitor](https://capacitorjs.com/). The app also works **fully offline** —
data is stored locally with Dexie/IndexedDB and synced to the backend when
internet is available.

## Prerequisites (one time)

- [Node.js 20+](https://nodejs.org/) and `npm`
- [Android Studio](https://developer.android.com/studio) (includes the Android
  SDK & emulator)
- A real Android device with USB debugging enabled, **or** an Android emulator

## First-time setup

```bash
# 1. Clone the repo and install dependencies
git clone <your-repo-url>
cd <repo>
npm install

# 2. Build the web app (creates /dist)
npm run build

# 3. Add the Android platform (creates /android folder)
npm run cap:add:android

# 4. Sync the built web assets into the Android project
npm run cap:sync

# 5. Open Android Studio
npx cap open android
```

In Android Studio:
1. Wait for Gradle to finish syncing.
2. Click **Run ▶** to install on a connected device/emulator, or
3. **Build → Build Bundle(s)/APK(s) → Build APK(s)** to get an installable
   `app-debug.apk` (under `android/app/build/outputs/apk/debug/`).

For a signed Play Store release, follow:
https://capacitorjs.com/docs/android/deploying-to-google-play

## Updating the app after code changes

```bash
npm run android:build   # builds web + syncs to android + opens Android Studio
```

Then hit Run ▶ in Android Studio.

## How offline works

- All reads come from a local IndexedDB store (Dexie) — instant, no network.
- All writes save locally first, then queue an outbox entry.
- The outbox is flushed to the backend automatically when the device is online,
  when the app returns to the foreground, and every 30 seconds.
- The header shows a Wi-Fi icon (online), Wi-Fi-off icon (offline), or a
  spinner (syncing). A small badge shows how many writes are still pending.
- Tap the icon to force a sync.
- On sign-out the local cache is wiped for privacy.

### Conflict handling

This version uses **last-write-wins** at the server level. Since each user
sees only their own data (RLS scoped to `auth.uid()`), conflicts are rare —
they only happen if the same user edits on two devices while both are
offline.

### Things to know

- The first sign-in requires internet (auth tokens).
- After that, the cached session lets the app open offline.
- A fresh install on a new device pulls all your data on first sign-in.

# Build the LLMs Android App (Capacitor)

This project wraps the web app in a native Android shell using
[Capacitor](https://capacitorjs.com/) with **full offline support** —
data is stored locally with Dexie/IndexedDB and synced when online.

The app uses the **"P" icon** branding everywhere — favicon, launcher icon,
adaptive icon, and splash screen — on a solid **black** background.

## Prerequisites (one time)

- [Node.js 20+](https://nodejs.org/) and `npm`
- [Android Studio](https://developer.android.com/studio)
- A real Android device with USB debugging, **or** an emulator

## First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Build the web app
npm run build

# 3. Add the Android platform (creates /android folder)
npm run cap:add:android

# 4. Apply branding (icons + splash) — choose ONE of the two options below
#
# Option A (recommended): regenerate from source images in /resources
npm run cap:assets
#
# Option B: copy the pre-generated PNGs from /android-resources
npm run android:icons

# 5. Sync web assets into the Android project
npm run cap:sync

# 6. Open Android Studio
npx cap open android
```

In Android Studio: **Run ▶** to install on a device, or
**Build → Build APK(s)** to produce `app-debug.apk`.

## Updating after code changes

```bash
npm run android:build   # build + sync + open Android Studio
```

## Branding assets

| File                                    | Purpose                                |
| --------------------------------------- | -------------------------------------- |
| `public/icon.png`                       | Web favicon & in-app logo (512×512)    |
| `resources/icon.png`                    | Source for `@capacitor/assets`         |
| `resources/icon-foreground.png`         | Adaptive icon foreground               |
| `resources/icon-background.png`         | Adaptive icon background (solid black) |
| `resources/splash.png`                  | 2732×2732 splash source                |
| `android-resources/mipmap-*`            | Pre-generated launcher PNGs            |
| `android-resources/drawable/splash.png` | Pre-generated splash drawable          |

To change the logo: replace `public/icon.png`, then re-run steps 4–5.

## Splash screen

Configured in `capacitor.config.ts` under `plugins.SplashScreen`:

- Background: `#000000` (black)
- Duration: 2s, auto-hides
- Centered "P" logo
- Drawable: `@drawable/splash`

## Offline architecture

- Reads come from local IndexedDB (Dexie) — instant, no network.
- Writes save locally first, then queue to an outbox.
- The outbox flushes when online, on app resume, and every 30s.
- Header shows a Wi-Fi / offline / syncing indicator with a pending badge.
- Tap the icon to force a sync; sign-out wipes the local cache.

Conflict policy: **last-write-wins** (rare in practice — RLS scopes
data per-user, so only same-user multi-device offline edits collide).

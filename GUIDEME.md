# Painter Work — Convert Web App to Native Android App

This project is already wired for Capacitor. Follow this guide to ship it as an installable Android `.apk` / `.aab`.

---

## 1. Prerequisites (one-time setup on your computer)

Install on your local machine (this cannot be done in Lovable's sandbox):

- **Node.js 20+** and **npm** / **bun**
- **Android Studio** (latest) — https://developer.android.com/studio
- **Java JDK 17** (Android Studio ships one)
- During Android Studio setup, install:
  - Android SDK Platform 34+
  - Android SDK Build-Tools
  - Android Emulator + at least one system image (e.g. Pixel 6, API 34)

Set environment variables (add to `~/.bashrc` / `~/.zshrc` / Windows env):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk   # macOS
# export ANDROID_HOME=$HOME/Android/Sdk          # Linux
# Windows: %LOCALAPPDATA%\Android\Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

---

## 2. Export the project from Lovable

1. In Lovable, click **GitHub → Connect** (top right) and push the repo.
2. On your computer:

```bash
git clone <your-repo-url> painter-work
cd painter-work
bun install        # or: npm install
```

---

## 3. Build the web bundle

```bash
bun run build      # outputs to /dist
```

---

## 4. Add the Android platform (first time only)

```bash
bun run cap:add:android
```

This creates the `/android` folder (a real Android Studio project).

---

## 5. Apply branding (icon + splash)

The "P" launcher icons and splash are pre-generated in `/resources` and `/android-resources`.

```bash
bun run cap:assets         # regenerates icons from /resources
bash scripts/apply-android-resources.sh   # copies them into /android
```

Want to change the icon? Replace `resources/icon.png` (1024×1024) and re-run the two commands above.

---

## 6. Sync web → native

After **any** change to the web app:

```bash
bun run build
bunx cap sync android
```

---

## 7. Run on an emulator or device

**Emulator:**
```bash
bunx cap open android
```
Then in Android Studio: pick a device in the toolbar → click **Run ▶**.

**Physical phone:**
1. Enable **Developer Options → USB Debugging** on the phone.
2. Plug in via USB, accept the prompt.
3. The phone appears in Android Studio's device dropdown — click **Run ▶**.

**CLI shortcut (if a device/emulator is already running):**
```bash
bunx cap run android
```

---

## 8. Build a release APK / AAB (for Play Store)

In Android Studio:
1. **Build → Generate Signed Bundle / APK**
2. Choose **Android App Bundle** (recommended) or **APK**.
3. Create a new keystore the first time — **back this file up**, you need it for every future update.
4. Select **release** build variant → **Finish**.
5. Output goes to `android/app/build/outputs/`.

Upload the `.aab` to https://play.google.com/console.

---

## 9. iOS (optional)

Mac + Xcode required:
```bash
bunx cap add ios
bun run build && bunx cap sync ios
bunx cap open ios
```

---

## Updating the app later

Web change only (no native code touched):
```bash
bun run build && bunx cap sync android
# then Run ▶ in Android Studio, OR rebuild release AAB and upload
```

For **OTA updates without rebuilding the APK**, look into Capacitor Live Updates (Ionic) or Capgo.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| White screen on launch | `bun run build` was skipped — always build before `cap sync` |
| Old icon still showing | Uninstall the app from the device, then re-run |
| Gradle / SDK errors | Open `/android` in Android Studio once, let it sync, accept SDK license prompts |
| Google sign-in fails inside the app | Add the APK's SHA-1 fingerprint to your OAuth provider settings |
| "Cleartext HTTP not permitted" | Your API must be HTTPS (Lovable Cloud already is) |

---

## What's already configured

- `capacitor.config.ts` → `appId: app.lovable.painterwork`, `appName: Painter Work`, splash screen
- `/resources` → source icon + splash
- `/android-resources` → pre-generated adaptive icons (mdpi → xxxhdpi)
- `scripts/apply-android-resources.sh` → copies them into the Android project
- Offline-first local DB (`PainterWorkLocalDB`) syncs with Lovable Cloud when online

You're shipping a real native app — not a webview shortcut.

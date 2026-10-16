# LovePlay native app

LovePlay now has a Capacitor Android/iOS shell around the existing dashboard. The native shell includes camera/photo-library selection, the system share sheet, and push-notification registration. The same Firebase web app continues to provide sign-in, chat, and gallery data.

## Build the web assets

```sh
npm ci
npm run build:web
```

The generated `www/` folder is a build output and is intentionally not committed.

## Android

Install Android Studio, Android SDK Platform 35 or later, and JDK 21. Then:

```sh
npm run cap:sync:android
npx cap open android
```

Build a local debug APK in Android Studio, or run `npm run android:debug` from Windows after installing the Android SDK and JDK. A debug APK can be installed directly on an Android device after allowing installs from that source.

Each successful run of the **Build LovePlay Android APK** GitHub Actions workflow also uploads `app-debug.apk` as a downloadable workflow artifact.

## iPhone and iPad

iOS builds require macOS, Xcode, an Apple signing identity, and provisioning for device installation. On a Mac:

```sh
npm ci
npm run cap:sync:ios
npx cap open ios
```

Install on a personal device using Xcode signing, or distribute through TestFlight/App Store. Direct installation outside those routes requires Apple provisioning and is not equivalent to sideloading an Android APK.

## Push notifications setup

Push delivery is not active until the Firebase native apps and server function are configured:

1. Register Android package `com.loveplay.app` and the chosen iOS bundle ID as native apps in Firebase.
2. Put the Android `google-services.json` in `android/app/`. Add `GoogleService-Info.plist` to the iOS app target in Xcode.
3. Upload an APNs authentication key in Firebase Console for iOS push delivery.
   In Xcode, enable the **Push Notifications** capability for the iOS app target.
4. Enable Cloud Functions and its required billing plan for the Firebase project.
5. Deploy the Realtime Database rules and message trigger:

   ```sh
   firebase deploy --only database,functions
   ```

   The rules add owner-only storage for device tokens. The function sends a push when a new chat message is created and prunes expired tokens.

Native setup files and signing keys are deliberately not committed. Do not commit Apple signing keys, provisioning profiles, service-account credentials, or local Firebase native config files.

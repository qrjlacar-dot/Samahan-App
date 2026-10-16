# Samahan: Firebase integrated with the latest UI

This project uses `main` at `ae5c71a` for the UI. `organize-source` has the same files. Firebase, Google sign-in, Android Maps configuration, Google services and EAS settings came from `backup-main-before-organize` at `40ae0bd`.

## Open and run

1. Extract the whole project and open its folder in VS Code. Use the folder containing `package.json`, not only `src`.
2. Run `npm ci` in that folder.
3. For Expo Go on iPhone or Android, run `npm run start:go -- --clear`, then scan the QR code. Email/password sign-in is available. Google sign-in shows an alert in Expo Go. iPhone always shows the requested unavailable alert.
4. If your phone and laptop cannot connect over Wi-Fi, try `npm run start:go -- --tunnel`.

For native Google sign-in on Android, rebuild the app. Reusing an older APK will not add the restored Maps configuration:

```bash
npx eas-cli build --platform android --profile development
npm run start:dev -- --clear
```

Install the new development build, then open the development server in it. For an APK that runs without the development server, use `npx eas-cli build --platform android --profile preview` instead. Keep using the existing team's EAS project and signing credentials.

The ZIP has no `.git` folder or `node_modules`. Opening it does not switch a branch in your existing repository. It includes all project files, not only the source folder. The old embedded `src.zip` is omitted to avoid distributing outdated duplicate source.

## Account behavior

- Email/password accounts show the uppercase first character of their name, without photo-edit controls.
- Google accounts show the Google name, email and photo. Name/email are read-only in the profile editor. Reset Password is hidden, and its direct route redirects back to Profile.
- Login, registration, reset links, password changes and sign-out use the existing Firebase project.
- Email/password users can update their name. An email change requires the current password and verification of the new email. Keep using the old email until verification is complete.
- Authentication persists through AsyncStorage. Each account's emergency contacts use its own local storage key and remain on that device after signing out.
- Existing stylesheets and screen wording are retained. The account avatar controls and live map replace the corresponding placeholders as requested. Alerts provide the new action results.

## Maps

Home and Directions now use a shared live native map. Home opens Directions with its sheet collapsed so the map is visible. Android uses Google Maps; iPhone uses Apple Maps, including in Expo Go. Web retains the existing map image because `react-native-maps` is a native library.

The existing Android API key is restored through the Maps plugin. If an Android build shows the Google logo but no map tiles, check the Google Cloud project that owns that key:

1. Maps SDK for Android is enabled and billing is active.
2. Android application restrictions include `com.samahan.app` and the SHA-1 of the signing certificate used for that specific build.
3. API restrictions allow Maps SDK for Android.

Google sign-in also requires its Android OAuth client to match the signing certificate. The original `google-services.json` is included. Google Cloud and Firebase Console settings were not modified or verified through this source integration.

The existing transport and fare examples were preserved. This change restores the map display; it does not add route-search or fare APIs.

## Validation

- Android and iOS JavaScript/Hermes exports passed.
- Web export passed.
- Android native prebuild passed. Its generated manifest contains the configured Maps key, and the generated Android app contains the matching Google services file and package name.
- `npm test`: 17 mock-based automated checks passed, covering account identity, profile/password restrictions, verification, registration failure recovery, Google sign-in guards/cancellation and separate contact storage. Tests do not create real Firebase accounts or change server data.
- Expo's offline dependency check reported compatible installed versions. Online validation timed out.
- All source files parsed, and the Git whitespace check passed.

Live Firebase flows, map tiles and native Google sign-in still need testing on phones. No APK was built here. A browser interaction check could not run because this environment has no installed Chromium executable. No changes were pushed to GitHub.

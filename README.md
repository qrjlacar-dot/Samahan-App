# SAMAHAN: Your Guide Around Cubao

SAMAHAN is a mobile commute-assistance app for the Cubao and Anonas area of Quezon City, Philippines. It brings place search, walking directions, local transport guides, fare estimates, and saved journeys into one map-based interface.

The app is developed as a team academic project for CS409 - Mobile Computing using React Native and Expo. Its current coverage focuses on a bounded service area around Cubao, including TIP Quezon City, Anonas, Gateway Mall, Ali Mall, and nearby transport connections.

## Features

| Feature                        | What it does                                                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts and profiles          | Supports email and password accounts, password recovery, and Google Sign-In on Android builds.                                                     |
| Place search                   | Finds places and addresses within the supported area using Geoapify.                                                                               |
| Walking directions             | Shows a route, step-by-step instructions, estimated distance and time, and foreground GPS guidance.                                                |
| Transport guides               | Provides the team's included bus and jeepney route previews, plus LRT-2 and Cubao station connections.                                             |
| Fare estimates                 | Displays available regular and discounted fare estimates using the project's saved rules, with a link to each fare's source.                       |
| Live location and map controls | Shows the user's position and heading, with route fitting, map following, and recenter controls.                                                   |
| Favorite journeys              | Saves selected journeys for reopening and recalculating a route later.                                                                             |
| Trip updates                   | Keeps completed and cancelled trips in the Notifications page, with optional phone notifications when permission is granted.                       |
| Emergency contacts             | Stores personal emergency contacts and calls them directly on Android after phone-call permission is granted. The 911 and 122 buttons open the dialer. |

## A typical journey

1. Select a starting point and destination, or use the current location.
2. Choose a transport mode and review the available route, instructions, and fare information.
3. Save the journey as a favorite or start guidance near the selected origin.
4. Follow the map and instructions, using the mode's trip controls when needed.
5. View the completed or cancelled trip in Notifications.

## Quick start: install the APK

The easiest way to try SAMAHAN is to install the working Android APK.

**[Download Samahan.apk (Google Drive)](https://drive.google.com/file/d/1xjqW6RTxoNRWajw5wQc0u73-TTwFyCAq/view?usp=sharing)**

1. Open the link on an Android phone and download `Samahan.apk` (about 133 MB). Google Drive may warn that it cannot scan the file for viruses because of its size; choose **Download anyway**.
2. Open the downloaded file.
3. If Android asks, allow installation from this source (**Settings > Apps > Special app access > Install unknown apps**).
4. Open SAMAHAN, create an account or sign in, and allow location access when asked.

The APK already contains everything it needs, so no setup below is required to use it.

## Setup instructions (running from source)

### Requirements

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (current LTS version) and npm
- An Android phone, or an Android emulator from [Android Studio](https://developer.android.com/studio)
- An [Expo](https://expo.dev/) account, only needed for building with EAS
- The project keys described in step 3 (they are not stored in this repository)

### 1. Clone the repository

```bash
git clone https://github.com/qrjlacar-dot/Samahan-App.git
cd Samahan-App
```

### 2. Install dependencies

```bash
npm install
```

### 3. Add the project keys

API keys and the Firebase configuration are kept out of the repository for security. Copy the example file and fill in the real values:

```bash
# macOS / Linux / Git Bash
cp .env.example .env.local

# Windows PowerShell
Copy-Item .env.example .env.local
```

Open `.env.local` and replace every placeholder:

| Variable                     | Where to get it                                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_GEOAPIFY_API_KEY` | [Geoapify](https://myprojects.geoapify.com/) project API key                                     |
| `GOOGLE_MAPS_API_KEY`        | Google Cloud Console, an API key with Maps SDK for Android enabled                                  |
| `EXPO_PUBLIC_FIREBASE_*`     | Firebase Console > Project settings > General > Your apps > Web app > SDK setup and configuration   |

Also place the Android Firebase file `google-services.json` in the project root (Firebase Console > Project settings > Your apps > Android app). This file is ignored by git.

Team members and evaluators can request `.env.local` and `google-services.json` from the project leader instead of creating new keys. Never commit either file.

### 4. Run the app

SAMAHAN uses native modules (Google Sign-In, maps, and direct phone calling), so it runs best in a **development build** rather than Expo Go.

**Option A: Android development build (recommended)**

```bash
# Build and install a development client once
npx eas-cli build -p android --profile development

# After installing it on the phone, start the development server
npm run start:dev
```

Open the installed SAMAHAN development app and connect to the server shown in the terminal.

**Option B: Build locally with Android Studio**

With the Android SDK installed and a phone connected (USB debugging on) or an emulator running:

```bash
npm run android
```

**Option C: Expo Go (limited)**

```bash
npm run start:go
```

Scan the QR code with Expo Go. Google Sign-In and direct calling are unavailable in Expo Go, and the map may behave differently. Use email and password sign-in instead.

After changing `.env.local`, restart with a clear cache so the new values load:

```bash
npx expo start -c
```

### 5. Run the automated tests

```bash
npm test
```

### 6. Build an APK (optional)

The project's EAS environment variables must be set for the build environment (the same names as in `.env.local`, plus `GOOGLE_SERVICES_JSON` as a file variable). Then run:

```bash
npm run check:android
npx eas-cli build -p android --profile preview
```

The `preview` profile produces an installable APK.

### Troubleshooting

| Problem                                         | Fix                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| "Missing Firebase config" error on launch       | A `EXPO_PUBLIC_FIREBASE_*` value is missing from `.env.local`. Add it and run `npx expo start -c`.     |
| Place search or walking routes fail             | Check `EXPO_PUBLIC_GEOAPIFY_API_KEY` and the internet connection.                                      |
| Blank or grey map on Android                    | Check `GOOGLE_MAPS_API_KEY`, then rebuild the app. Map key changes need a new build.                   |
| Google Sign-In unavailable                      | Use an Android development build or APK. It is not supported in Expo Go or on iPhone.                  |
| Location does not appear                        | Allow location permission and turn on the phone's location services.                                   |

## Coverage and current status

SAMAHAN is an academic prototype. Route planning is limited to the app's supported area rather than the entire Metro Manila transport network.

- Walking routes use provider-generated directions. Location tracking operates while the app is in the foreground.
- Bus and jeepney guides use the team's saved corridor and stop information. Some transport segments are schematic previews, and current service and permitted stops still need local confirmation.
- The train guide covers the included LRT-2 journey between Anonas and Araneta Center–Cubao, together with nearby walking and station connections. It does not provide live train arrivals.
- Fare values are estimates from saved reference data. They are not live operator quotations, and fares the saved rules cannot support are shown as unavailable.
- Native Google Sign-In is provided on Android builds. The iPhone version offers email and password sign-in.
- Phone notifications depend on permission and a build containing the native notification module. In-app trip records are saved independently of phone notifications.
- Favorites, trip records, and emergency contacts are stored on the device and are not synced between devices.

## Technology

| Technology                                  | Role                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| React Native and Expo                       | Mobile application framework and development workflow.                                      |
| Expo Router                                 | Screen navigation and file-based routes.                                                    |
| React Native Maps                           | Native map display (Google Maps on Android), markers, polylines, and camera controls.       |
| Geoapify                                    | Place search, geocoding, and route requests.                                                |
| Expo Location                               | Foreground location readings, tracking, and heading.                                        |
| Expo Notifications                          | Optional local phone notifications for trip updates.                                        |
| Firebase Authentication and Cloud Firestore | Account authentication and profile data.                                                    |
| AsyncStorage                                | Device-local favorites, notification history, preferences, and personal emergency contacts. |
| EAS Build                                   | Cloud builds for the development client and the Android APK.                                |

## Project structure

| Location          | Contents                                                                        |
| ----------------- | ------------------------------------------------------------------------------- |
| `src/app/`        | Screens and Expo Router navigation.                                             |
| `src/components/` | Shared controls, with separate map, onboarding, and directions folders.         |
| `src/hooks/`      | Reusable state, permissions, gestures, and trip controllers.                    |
| `src/services/`   | App services, with grouped authentication and route helpers.                    |
| `src/data/`       | Service boundaries, transport catalogs, station data, and fare rules.           |
| `src/styles/`     | Screen and shared component styles.                                             |
| `src/constants/`  | Shared theme values, images, and identifiers.                                   |
| `src/types/`      | Data contracts for places, routes, trips, and saved journeys.                   |
| `modules/`        | Custom native module for direct phone calls on Android.                         |
| `plugins/`        | Expo config plugins used during the Android build.                              |
| `tests/`          | Automated checks, test helpers, fixtures, and the team's manual test checklist. |
| `scripts/`        | Project utility scripts and the test runner.                                    |
| `assets/`         | Images, icons, and other app resources.                                         |
| `app.config.js`   | App configuration; reads keys from environment variables.                       |
| `eas.json`        | EAS build profiles: development, preview (APK), and production.                 |

## Testing

Automated checks cover account behavior, GPS handling, route planning, fares, favorites, trip lifecycles, notifications, and reusable controls. Run them with `npm test`. Native features and real transport journeys also require testing on supported devices.

## Team

Group 6, CS409 - Mobile Computing, Technological Institute of the Philippines - Quezon City

- Lacar, Rhian Jannah L. (Leader)
- Lancin, Heaven Leigh E.
- Morano, Raven Rose E.
- San Pablo, Jahzara Samantha S.

## Credits and license

SAMAHAN uses open-source libraries and third-party map, routing, and authentication services. Their respective licenses and terms apply. The repository retains its existing [license notice](LICENSE).

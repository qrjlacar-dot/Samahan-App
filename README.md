# SAMAHAN

SAMAHAN is a mobile commute-assistance app for the Cubao and Anonas area of Quezon City, Philippines. It brings place search, walking directions, local transport guides, fare estimates, and saved journeys into one map-based interface.

The app is developed as a team academic project using React Native and Expo. Its current coverage focuses on a bounded service area around Cubao, including TIP Quezon City, Anonas, Gateway Mall, Ali Mall, and nearby transport connections.

## Features

| Feature                        | What it does                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Accounts and profiles          | Supports email/password accounts, password recovery, and Google sign-in in the Android development build.             |
| Place search                   | Finds places and addresses within the supported area using Geoapify.                                                  |
| Walking directions             | Shows a route, step-by-step instructions, estimated distance and time, and foreground GPS guidance.                   |
| Transport guides               | Provides the team's included bus and jeepney route previews, plus LRT-2 and Cubao station connections.                |
| Fare estimates                 | Displays available regular and discounted fare estimates using the project's saved rules.                             |
| Live location and map controls | Shows the user's position and heading, with route fitting, map following, and recenter controls.                      |
| Favorite journeys              | Saves selected journeys for reopening and recalculating a route later.                                                |
| Trip updates                   | Keeps completed and cancelled trips in the Notifications page, with optional phone alerts when permission is granted. |
| Emergency contacts             | Stores personal emergency contacts and opens the phone's dialer for a selected number.                                |

## A typical journey

1. Select a starting point and destination, or use the current location.
2. Choose a transport mode and review the available route, instructions, and fare information.
3. Save the journey as a favorite or start guidance near the selected origin.
4. Follow the map and instructions, using the mode's trip controls when needed.
5. View the completed or cancelled trip in Notifications.

## Coverage and current status

SAMAHAN is an academic prototype under development. Route planning is limited to the app's supported area rather than the entire Metro Manila transport network.

- Walking routes use provider-generated directions. Location tracking operates while the app is in the foreground.
- Bus and jeepney guides use the team's saved corridor and stop information. Some transport segments are schematic previews, and current service and permitted stops still need local confirmation.
- The train guide covers the included LRT-2 journey between Anonas and Araneta Center–Cubao, together with nearby walking and station connections. It does not provide live train arrivals.
- Fare values are estimates from saved reference data. They are not live operator quotations.
- Native Google sign-in is currently provided through the Android development build. The iPhone version offers email/password sign-in.
- Phone notifications depend on permission and a development build containing the native notification module. In-app trip records are saved independently of phone alerts.

## Technology

| Technology                                  | Role                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| React Native and Expo                       | Mobile application framework and development workflow.                                      |
| Expo Router                                 | Screen navigation and file-based routes.                                                    |
| React Native Maps                           | Native map display, markers, polylines, and camera controls.                                |
| Geoapify                                    | Place search and route-provider requests.                                                   |
| Expo Location                               | Foreground location readings and tracking.                                                  |
| Expo Notifications                          | Optional local phone notifications for trip updates.                                        |
| Firebase Authentication and Cloud Firestore | Account authentication and profile data.                                                    |
| AsyncStorage                                | Device-local favorites, notification history, preferences, and personal emergency contacts. |

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
| `tests/`          | Automated checks, test helpers, fixtures, and the team's manual test checklist. |
| `scripts/`        | Project utility scripts and the test runner.                                    |
| `assets/`         | Images, icons, and other app resources.                                         |

## Testing

Automated checks cover account behavior, GPS handling, route planning, fares, favorites, trip lifecycles, notifications, and reusable controls. Native features and real transport journeys also require testing on supported devices.

## Credits and license

SAMAHAN uses open-source libraries and third-party map, routing, and authentication services. Their respective licenses and terms apply. The repository retains its existing [license notice](LICENSE).

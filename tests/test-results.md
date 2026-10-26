# SAMAHAN test results

Maintained by Member 4. Everyone adds the results of their own feature; Member 4 combines them and checks the final journey.

Use one row per check. Result is Pass, Fail, or Not run. Emulator results are labelled **Android emulator** and do not prove iPhone behavior. Never place a real emergency call while testing.

## 1. Test sessions

| Date | Tester | Commit (git rev-parse --short HEAD) | Device or emulator | Android version | Build (APK/link) | Notes |
| ---- | ------ | ----------------------------------- | ------------------ | --------------- | ---------------- | ----- |
|      |        |                                     |                    |                 |                  |       |

## 2. Automated checks

Run from the folder containing package.json.

| Date | Command                                  | Tests | Passed | Failed | Commit | Tester |
| ---- | ---------------------------------------- | ----- | ------ | ------ | ------ | ------ |
|      | npm test                                 |       |        |        |        |        |
|      | node --test tests/test-notifications.cjs |       |        |        |        |        |

## 3. Notifications checks (Member 4)

| ID  | Steps                                                     | Expected                                                                              | Actual | Result  | Owner    | Retest |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ | ------- | -------- | ------ |
| N1  | Open Notifications with a new account                     | Empty message, no fake rows                                                           |        | Not run | Member 4 |        |
| N2  | Save a new favorite from Directions                       | Confirmation alert; favorite appears in Favorites; no phone or in-app notification    |        | Not run | Member 3 |        |
| N3  | Save the same journey again                               | No second notification                                                                |        | Not run | Member 3 |        |
| N4  | Finish a trip (emulator route playback)                   | Exactly one Trip completed record; a phone alert after leaving the route when allowed |        | Not run | Member 1 |        |
| N5  | Preview a route only, or repeat GPS updates               | No arrival notification                                                               |        | Not run | Member 1 |        |
| N6  | Tap All and Trips                                         | Only All and Trips filters are shown                                                  |        | Not run | Member 4 |        |
| N7  | Tap an unread notification                                | Dot disappears, related screen opens                                                  |        | Not run | Member 4 |        |
| N8  | Tap the trash icon                                        | Only that notification is removed; stays removed after reopening                      |        | Not run | Member 4 |        |
| N9  | Profile: switch notifications off, then trigger an event  | New trip records are still saved in the page; no phone alert                          |        | Not run | Member 4 |        |
| N10 | Switch off, leave Profile, fully close and reopen the app | Switch is still off                                                                   |        | Not run | Member 4 |        |
| N11 | Sign in with a second account                             | Its own notifications and its own switch value                                        |        | Not run | Member 4 |        |
| N12 | Turn on airplane mode and use Notifications               | Works (stored on the device)                                                          |        | Not run | Member 4 |        |

## 4. Regression checks (login and profile)

| ID  | Steps                              | Expected                     | Actual | Result  | Owner    | Retest |
| --- | ---------------------------------- | ---------------------------- | ------ | ------- | -------- | ------ |
| R1  | Email login, sign out, login again | Works                        |        | Not run | Member 4 |        |
| R2  | Edit profile name                  | Saved                        |        | Not run | Member 4 |        |
| R3  | Google login on Android build      | Works; Reset Password hidden |        | Not run | Member 4 |        |
| R4  | Profile layout after the change    | Same look as before          |        | Not run | Member 4 |        |

## 5. Complete journey (all members)

| ID  | Journey                                                                     | Expected                                                                          | Result  | Date | Notes |
| --- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------- | ---- | ----- |
| J1  | TIP QC to Gateway Mall: search, fare, save favorite, reopen, follow, arrive | Every step works; favorite confirmation alert and one trip-completed notification | Not run |      |       |
| J2  | Reverse direction                                                           | Same                                                                              | Not run |      |       |

## 6. Defect log

| Defect ID | Date | Commit | Device | Steps to reproduce | Expected | Actual | Owner | Status                  | Retest result |
| --------- | ---- | ------ | ------ | ------------------ | -------- | ------ | ----- | ----------------------- | ------------- |
|           |      |        |        |                    |          |        |       | Open / Fixed / Retested |               |

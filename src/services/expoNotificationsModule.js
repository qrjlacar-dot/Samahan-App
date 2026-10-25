// Phone (system) notifications are OFF in this build.
//
// They need the native module `expo-notifications`, which is not in the
// current development APK. Trip updates are still saved in the Notifications
// page; only the phone notification is skipped.
//
// Turn phone notifications on later, ONLY after `expo-notifications` is
// installed AND a development APK that contains it exists, by replacing the
// line below with:
//
//   const expoNotifications = require("expo-notifications");
const expoNotifications = null;

export default expoNotifications;

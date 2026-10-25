// Phone (system) notifications use expo-notifications, which is wired in
// through ./expoNotificationsModule. While that file exports null (the current
// APK does not contain the module) every function here quietly does nothing:
// trip updates are still saved in the Notifications page and the app never
// shows a phone permission question.

import { Platform } from "react-native";
import ExpoNotifications from "./expoNotificationsModule";

const CHANNEL_ID = "trip-updates";

let preparing = null;

function getModule() {
  return ExpoNotifications ?? null;
}

// Android needs a channel before it will show the permission question or any
// notification. The handler lets a notification appear while the app is open.
function prepare(Notifications) {
  if (!preparing) {
    preparing = (async () => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: "Trip updates",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
    })().catch((error) => {
      preparing = null;
      throw error;
    });
  }

  return preparing;
}

/** True when this app build contains the notification module. */
export function phoneNotificationsAvailable() {
  return getModule() !== null;
}

/**
 * Current phone permission without asking.
 * @returns {Promise<"granted" | "denied" | "undetermined" | "unavailable">}
 */
export async function getPhonePermission() {
  const Notifications = getModule();
  if (!Notifications) return "unavailable";

  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return "granted";
    return current.status === "undetermined" ? "undetermined" : "denied";
  } catch {
    return "unavailable";
  }
}

/**
 * Shows the phone's "Allow notifications?" question when it can.
 * @returns {Promise<"granted" | "denied" | "unavailable">}
 */
export async function requestPhonePermission() {
  const Notifications = getModule();
  if (!Notifications) return "unavailable";

  try {
    await prepare(Notifications);

    const result = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: false },
    });

    return result.granted ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}

/**
 * Shows one phone notification now, only when permission is granted.
 * Never throws. Returns true when it was handed to the phone.
 */
export async function showPhoneNotification({ title, body, data }) {
  const Notifications = getModule();
  if (!Notifications) return false;

  try {
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted) return false;

    await prepare(Notifications);

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
      },
      trigger: null,
    });

    return true;
  } catch {
    return false;
  }
}

import { AppState, Platform } from "react-native";
import ExpoNotifications from "./expoNotificationsModule";

const CHANNEL_ID = "trip-updates";

let preparing = null;
const holds = new Map();
const pending = new Map();
let backgroundListener = null;

function flushTripNotifications(uid) {
  const notices = pending.get(uid) ?? [];
  pending.delete(uid);
  for (const notice of notices) {
    void showPhoneNotification({ ...notice, delaySeconds: 3 });
  }
}

// Keep system banners out of the route interface. The in-app record is saved
// immediately; phone alerts follow three seconds after leaving or backgrounding.
export function holdTripNotifications(uid) {
  if (!uid) return () => {};
  holds.set(uid, (holds.get(uid) ?? 0) + 1);
  if (!backgroundListener && AppState?.addEventListener) {
    backgroundListener = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        for (const account of pending.keys()) flushTripNotifications(account);
      }
    });
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const remaining = (holds.get(uid) ?? 1) - 1;
    if (remaining > 0) holds.set(uid, remaining);
    else {
      holds.delete(uid);
      flushTripNotifications(uid);
    }
    if (!holds.size) {
      backgroundListener?.remove();
      backgroundListener = null;
    }
  };
}

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
          shouldPlaySound: Platform.OS === "android",
          shouldSetBadge: false,
        }),
      });

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: "Trip updates",
          importance: Notifications.AndroidImportance.HIGH,
          // Omit sound here to use Android's system notification tone.
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
 * Shows or queues one phone notification when permission is granted.
 * Never throws. Returns true when queued or handed to the phone.
 */
export async function showPhoneNotification({ title, body, data, uid, delaySeconds = 0, canShow }) {
  const Notifications = getModule();
  if (!Notifications) return false;

  try {
    if (canShow && !(await canShow())) return false;
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted) return false;

    if (uid && holds.has(uid) && delaySeconds === 0 && AppState?.currentState !== "background") {
      const notices = pending.get(uid) ?? [];
      notices.push({ title, body, data, uid, canShow });
      pending.set(uid, notices);
      return true;
    }

    await prepare(Notifications);
    const seconds = delaySeconds || (uid && AppState?.currentState === "background" ? 3 : 0);

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
        ...(Platform.OS === "android"
          ? {
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
            }
          : {}),
      },
      trigger:
        seconds > 0
          ? {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds,
              ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
            }
          : null,
    });

    return true;
  } catch {
    return false;
  }
}
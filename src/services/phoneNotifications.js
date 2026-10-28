import { AppState, Platform } from "react-native";
import ExpoNotifications from "./expoNotificationsModule";

const CHANNEL_ID = "trip-updates";

let preparing = null;
const holds = new Map();
const pending = new Map();
let backgroundListener = null;
let activeAccount;
const revisions = new Map();
const scheduledIds = new Map();

function accountAllowed(uid) {
  return !uid || activeAccount === undefined || activeAccount === uid;
}

export async function cancelPhoneNotifications(uid) {
  if (!uid) return;
  revisions.set(uid, (revisions.get(uid) ?? 0) + 1);
  pending.delete(uid);
  const ids = new Set(scheduledIds.get(uid) ?? []);
  scheduledIds.delete(uid);
  const Notifications = getModule();
  if (!Notifications) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync?.();
    for (const item of scheduled ?? []) {
      if (
        item.content?.data?.samahanTrip === true &&
        item.content.data.uid === uid
      )
        ids.add(item.identifier);
    }
  } catch {}
  // Retain tracked IDs even if the platform cannot list pending requests.
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync?.(id);
    } catch {}
  }
}

export function setNotificationAccount(uid) {
  const next = uid || null;
  const previous = activeAccount;
  activeAccount = next;
  if (previous && previous !== next) void cancelPhoneNotifications(previous);
}

export function clearNotificationAccount(uid) {
  if (activeAccount === uid) setNotificationAccount(null);
}

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
          shouldPlaySound: true,
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
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
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
export async function showPhoneNotification({
  title,
  body,
  data,
  uid,
  delaySeconds = 0,
  canShow,
}) {
  const Notifications = getModule();
  if (!Notifications) return false;
  const revision = revisions.get(uid) ?? 0;
  const stillAllowed = () =>
    accountAllowed(uid) && revision === (revisions.get(uid) ?? 0);

  try {
    if (!stillAllowed()) return false;
    if (canShow && !(await canShow())) return false;
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted || !stillAllowed()) return false;

    if (
      uid &&
      holds.has(uid) &&
      delaySeconds === 0 &&
      AppState?.currentState !== "background"
    ) {
      const notices = pending.get(uid) ?? [];
      notices.push({ title, body, data, uid, canShow });
      pending.set(uid, notices);
      return true;
    }

    await prepare(Notifications);
    if (!stillAllowed() || (canShow && !(await canShow()))) return false;
    const seconds =
      delaySeconds || (uid && AppState?.currentState === "background" ? 3 : 0);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { ...(data ?? {}), ...(uid ? { uid, samahanTrip: true } : {}) },
        sound: true,
        ...(Platform.OS === "android"
          ? {
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

    if (!stillAllowed() || (canShow && !(await canShow()))) {
      if (id) await Notifications.cancelScheduledNotificationAsync?.(id);
      return false;
    }
    if (uid && id && seconds > 0) {
      const ids = scheduledIds.get(uid) ?? new Set();
      ids.add(id);
      scheduledIds.set(uid, ids);
      setTimeout(
        () => {
          ids.delete(id);
          if (!ids.size && scheduledIds.get(uid) === ids)
            scheduledIds.delete(uid);
        },
        (seconds + 30) * 1000,
      )?.unref?.();
    }

    return true;
  } catch {
    return false;
  }
}

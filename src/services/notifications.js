import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  NOTIFICATION_CATEGORIES,
  TICKET_TYPES,
  TRAVEL_MODES,
} from "../constants/commute";
import {
  cancelPhoneNotifications,
  showPhoneNotification,
} from "./phoneNotifications";

const NOTIFICATIONS_PREFIX = "samahan:notifications:v1:";
const PREFERENCES_PREFIX = "samahan:notification-preferences:v1:";
const PROMPT_PREFIX = "samahan:notification-prompt:v1:";
const PLACE_SOURCES = ["google", "geoapify", "verified-local", "device"];
const MAX_STORED = 100; // oldest are dropped so storage cannot grow forever

const DEFAULT_PREFERENCES = Object.freeze({ enabled: true });

function requireUid(uid) {
  if (typeof uid !== "string" || uid.trim() === "") {
    throw new Error("A signed-in account is required to use notifications.");
  }
  return uid;
}

const notificationsKey = (uid) => `${NOTIFICATIONS_PREFIX}${requireUid(uid)}`;
const preferencesKey = (uid) => `${PREFERENCES_PREFIX}${requireUid(uid)}`;
const promptKey = (uid) => `${PROMPT_PREFIX}${requireUid(uid)}`;

// ---------- validation ----------

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isValidPlace(place) {
  return (
    !!place &&
    typeof place === "object" &&
    isNonEmptyString(place.id) &&
    typeof place.name === "string" &&
    typeof place.address === "string" &&
    !!place.coordinate &&
    Number.isFinite(place.coordinate.latitude) &&
    Number.isFinite(place.coordinate.longitude) &&
    PLACE_SOURCES.includes(place.source)
  );
}

function isValidJourney(journey) {
  return (
    !!journey &&
    typeof journey === "object" &&
    isValidPlace(journey.origin) &&
    isValidPlace(journey.destination) &&
    TRAVEL_MODES.includes(journey.preferredMode) &&
    TICKET_TYPES.includes(journey.ticketType)
  );
}

function isValidTarget(target) {
  if (target === null) return true;
  if (!target || typeof target !== "object") return false;
  if (target.screen === "favorites") return true;
  if (target.screen === "directions") return isValidJourney(target.journey);
  return false;
}

function isValidInput(input) {
  return (
    !!input &&
    typeof input === "object" &&
    isNonEmptyString(input.eventId) &&
    NOTIFICATION_CATEGORIES.includes(input.category) &&
    isNonEmptyString(input.title) &&
    typeof input.body === "string" &&
    isValidTarget(input.target ?? null)
  );
}

function isStoredNotification(item) {
  return (
    isValidInput(item) &&
    isNonEmptyString(item.id) &&
    typeof item.createdAt === "string" &&
    !Number.isNaN(Date.parse(item.createdAt)) &&
    (item.readAt === null ||
      (typeof item.readAt === "string" &&
        !Number.isNaN(Date.parse(item.readAt))))
  );
}

function clonePlace(place) {
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    coordinate: {
      latitude: place.coordinate.latitude,
      longitude: place.coordinate.longitude,
    },
    source: place.source,
  };
}

function cloneTarget(target) {
  if (!target) return null;
  if (target.screen === "favorites") return { screen: "favorites" };
  return {
    screen: "directions",
    journey: {
      origin: clonePlace(target.journey.origin),
      destination: clonePlace(target.journey.destination),
      preferredMode: target.journey.preferredMode,
      ticketType: target.journey.ticketType,
      ...(target.journey.preferredMode === "jeep"
        ? { operatorId: target.journey.operatorId || "jeep-traditional" }
        : {}),
    },
  };
}

// ---------- storage helpers ----------

async function readAll(uid) {
  const raw = await AsyncStorage.getItem(notificationsKey(uid));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isStoredNotification) : [];
  } catch {
    return [];
  }
}

async function writeAll(uid, items) {
  await AsyncStorage.setItem(notificationsKey(uid), JSON.stringify(items));
}

// One write at a time per account (and per kind) so quick taps or retries
// cannot overwrite each other.
const queues = new Map();
function enqueue(queueKey, task) {
  const previous = queues.get(queueKey) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  queues.set(queueKey, next);
  return next;
}

async function readPreferences(uid) {
  const raw = await AsyncStorage.getItem(preferencesKey(uid));
  if (!raw) return { ...DEFAULT_PREFERENCES };
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.enabled === "boolean"
      ? { enabled: parsed.enabled }
      : { ...DEFAULT_PREFERENCES };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

// ---------- public service (names and formats are shared; do not rename) ----------

/**
 * Newest first.
 * @returns {Promise<import('../types/commute').AppNotification[]>}
 */
export async function loadNotifications(uid) {
  const items = await readAll(uid);
  return items.sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

// Saves one notification. Trip updates are ALWAYS saved here, whether or not
// phone notifications are on. The same eventId never creates a second copy.
function storeNotification(uid, notification) {
  requireUid(uid);
  if (!isValidInput(notification)) {
    throw new Error(
      "A notification needs an eventId, a category, a title, a body, and a valid target.",
    );
  }

  return enqueue(`items:${uid}`, async () => {
    const items = await readAll(uid);
    const existing = items.find(
      (item) => item.eventId === notification.eventId,
    );
    if (existing) return { notification: existing, created: false };

    const created = {
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      eventId: notification.eventId,
      category: notification.category,
      title: notification.title,
      body: notification.body,
      target: cloneTarget(notification.target ?? null),
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    await writeAll(uid, [created, ...items].slice(0, MAX_STORED));
    return { notification: created, created: true };
  });
}

/**
 * Returns the stored notification. The same eventId never creates a second
 * notification, so retries and repeated callbacks are safe.
 * @param {string} uid
 * @param {import('../types/commute').NotificationInput} notification
 * @returns {Promise<import('../types/commute').AppNotification>}
 */
export async function addNotification(uid, notification) {
  return (await storeNotification(uid, notification)).notification;
}

/**
 * @returns {Promise<void>}
 */
export async function markNotificationRead(uid, notificationId) {
  requireUid(uid);
  return enqueue(`items:${uid}`, async () => {
    const items = await readAll(uid);
    let changed = false;
    const next = items.map((item) => {
      if (item.id !== notificationId || item.readAt) return item;
      changed = true;
      return { ...item, readAt: new Date().toISOString() };
    });
    if (changed) await writeAll(uid, next);
  });
}

/**
 * @returns {Promise<void>}
 */
export async function removeNotification(uid, notificationId) {
  requireUid(uid);
  return enqueue(`items:${uid}`, async () => {
    const items = await readAll(uid);
    const next = items.filter((item) => item.id !== notificationId);
    if (next.length !== items.length) await writeAll(uid, next);
  });
}

/**
 * Defaults to { enabled: true } until the account saves a choice.
 * @returns {Promise<import('../types/commute').NotificationPreferences>}
 */
export async function getNotificationPreferences(uid) {
  requireUid(uid);
  return readPreferences(uid);
}

/**
 * enabled = show PHONE notifications. Switching it off never stops trip
 * updates from being saved in the Notifications page.
 * @param {string} uid
 * @param {import('../types/commute').NotificationPreferences} preferences
 * @returns {Promise<import('../types/commute').NotificationPreferences>}
 */
export async function setNotificationPreferences(uid, preferences) {
  requireUid(uid);
  if (!preferences || typeof preferences.enabled !== "boolean") {
    throw new Error(
      "Notification preferences need an enabled true/false value.",
    );
  }
  return enqueue(`prefs:${uid}`, async () => {
    const saved = { enabled: preferences.enabled };
    await AsyncStorage.setItem(preferencesKey(uid), JSON.stringify(saved));
    if (!saved.enabled) await cancelPhoneNotifications(uid);
    return saved;
  });
}

// ---------- first-time "Allow notifications?" question ----------

/**
 * True only for an account that has never been asked and has never saved a
 * notification choice (so people who already used the Profile switch are
 * not asked again).
 * @returns {Promise<boolean>}
 */
export async function shouldAskNotificationPermission(uid) {
  requireUid(uid);
  const [asked, savedChoice] = await Promise.all([
    AsyncStorage.getItem(promptKey(uid)),
    AsyncStorage.getItem(preferencesKey(uid)),
  ]);
  return asked === null && savedChoice === null;
}

/**
 * Call right before the question is shown so it never appears twice.
 * @returns {Promise<void>}
 */
export async function markNotificationPermissionAsked(uid) {
  requireUid(uid);
  await AsyncStorage.setItem(promptKey(uid), "asked");
}

// ---------- trip updates (Completed / Cancelled) ----------
// Both are saved in the Notifications page first, always. Then, only for a
// NEW update, a phone notification is shown when the Profile switch is on
// and the phone has granted permission. They never throw: a notification
// problem must not break a trip.

const MODE_LABELS = {
  walk: "walking",
  train: "train",
  bus: "bus",
  jeep: "jeepney",
};

function destinationLabel(journey) {
  return journey?.destination?.name?.trim() || "your destination";
}

function tripText(kind, journey) {
  const mode = MODE_LABELS[journey?.preferredMode];
  const trip = mode ? `${mode} trip` : "trip";
  const where = destinationLabel(journey);

  return kind === "completed"
    ? {
        title: "Trip completed",
        body: `Your ${trip} to ${where} is complete.`,
      }
    : {
        title: "Trip cancelled",
        body: `Your ${trip} to ${where} was cancelled.`,
      };
}

async function notifyTrip(uid, update, kind) {
  try {
    if (!update || !isNonEmptyString(update.tripId)) return null;

    const journey = isValidJourney(update.journey) ? update.journey : null;
    const { title, body } = tripText(kind, journey);

    const { notification, created } = await storeNotification(uid, {
      eventId: `trip-${kind}:${update.tripId}`,
      category: "trips",
      title,
      body,
      target: journey ? { screen: "directions", journey } : null,
    });

    if (created) {
      try {
        const preferences = await readPreferences(uid);
        if (preferences.enabled) {
          await showPhoneNotification({
            title,
            body,
            uid,
            canShow: async () => (await readPreferences(uid)).enabled,
            data: { notificationId: notification.id, kind },
          });
        }
      } catch {
        // The update is already saved; the phone notification is optional.
      }
    }

    return notification;
  } catch {
    return null;
  }
}

/**
 * Call once, only when the whole trip is finished. tripId must stay the same
 * for the whole trip so repeated GPS callbacks cannot create a second one.
 * @param {string} uid
 * @param {{ tripId: string, journey: import('../types/commute').FavoriteInput }} trip
 */
export function notifyTripCompleted(uid, trip) {
  return notifyTrip(uid, trip, "completed");
}

/**
 * Call once, only after the user confirmed they want to cancel the trip.
 * @param {string} uid
 * @param {{ tripId: string, journey: import('../types/commute').FavoriteInput }} trip
 */
export function notifyTripCancelled(uid, trip) {
  return notifyTrip(uid, trip, "cancelled");
}

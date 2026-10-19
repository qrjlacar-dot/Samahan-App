import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  NOTIFICATION_CATEGORIES,
  TICKET_TYPES,
  TRAVEL_MODES,
} from "../constants/commute";

const NOTIFICATIONS_PREFIX = "samahan:notifications:v1:";
const PREFERENCES_PREFIX = "samahan:notification-preferences:v1:";
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
      (typeof item.readAt === "string" && !Number.isNaN(Date.parse(item.readAt))))
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
  return items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/**
 * Returns the stored notification, or null when notifications are switched
 * off. The same eventId never creates a second notification, so retries and
 * repeated callbacks are safe.
 * @param {string} uid
 * @param {import('../types/commute').NotificationInput} notification
 * @returns {Promise<import('../types/commute').AppNotification | null>}
 */
export async function addNotification(uid, notification) {
  requireUid(uid);
  if (!isValidInput(notification)) {
    throw new Error(
      "A notification needs an eventId, a category, a title, a body, and a valid target.",
    );
  }
  return enqueue(`items:${uid}`, async () => {
    const preferences = await readPreferences(uid);
    if (!preferences.enabled) return null;

    const items = await readAll(uid);
    const existing = items.find((item) => item.eventId === notification.eventId);
    if (existing) return existing; // duplicate event: no second copy

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
    return created;
  });
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
 * Switching off only stops NEW events. Notifications already stored stay.
 * @param {string} uid
 * @param {import('../types/commute').NotificationPreferences} preferences
 * @returns {Promise<import('../types/commute').NotificationPreferences>}
 */
export async function setNotificationPreferences(uid, preferences) {
  requireUid(uid);
  if (!preferences || typeof preferences.enabled !== "boolean") {
    throw new Error("Notification preferences need an enabled true/false value.");
  }
  return enqueue(`prefs:${uid}`, async () => {
    const saved = { enabled: preferences.enabled };
    await AsyncStorage.setItem(preferencesKey(uid), JSON.stringify(saved));
    return saved;
  });
}

// ---------- event helpers for Member 1 (arrival) and Member 3 (favorites) ----------
// They never throw: a notification problem must not break saving a favorite
// or finishing a trip. They return the stored notification, or null.

function placeLabel(place) {
  return place?.name?.trim() || "your destination";
}

/**
 * Call once after a NEW favorite is saved successfully.
 * @param {string} uid
 * @param {import('../types/commute').SavedFavorite} favorite
 */
export async function notifyFavoriteSaved(uid, favorite) {
  try {
    if (!favorite || !isNonEmptyString(favorite.id)) return null;
    return await addNotification(uid, {
      eventId: `favorite-saved:${favorite.id}`,
      category: "favorites",
      title: "Favorite saved",
      body: `${placeLabel(favorite.origin)} to ${placeLabel(favorite.destination)} was added to your favorites.`,
      target: { screen: "favorites" },
    });
  } catch {
    return null;
  }
}

/**
 * Call once when an active trip is confirmed arrived. tripId must stay the
 * same for the whole trip (for example the time the trip started), so GPS
 * repeats cannot create more than one arrival notification.
 * @param {string} uid
 * @param {{ tripId: string, journey: import('../types/commute').FavoriteInput }} arrival
 */
export async function notifyArrival(uid, arrival) {
  try {
    if (!arrival || !isNonEmptyString(arrival.tripId)) return null;
    const journey = isValidJourney(arrival.journey) ? arrival.journey : null;
    return await addNotification(uid, {
      eventId: `arrival:${arrival.tripId}`,
      category: "trips",
      title: "You have arrived",
      body: `You arrived at ${placeLabel(journey?.destination)}.`,
      target: journey ? { screen: "directions", journey } : null,
    });
  } catch {
    return null;
  }
}

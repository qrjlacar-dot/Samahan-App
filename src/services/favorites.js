import AsyncStorage from "@react-native-async-storage/async-storage";
import { TICKET_TYPES, TRAVEL_MODES } from "../constants/commute";

const KEY_PREFIX = "samahan:favorites:v1:";
const PLACE_SOURCES = ["google", "geoapify", "verified-local", "device"];

function storageKey(uid) {
  if (typeof uid !== "string" || uid.trim() === "") {
    throw new Error("A signed-in account is required to use favorites.");
  }
  return `${KEY_PREFIX}${uid}`;
}

function isValidPlace(place) {
  return (
    !!place &&
    typeof place === "object" &&
    typeof place.id === "string" &&
    place.id.trim() !== "" &&
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
    TICKET_TYPES.includes(journey.ticketType) &&
    (journey.operatorId == null ||
      (journey.preferredMode === "jeep" &&
        ["jeep-traditional", "jeep-modern"].includes(journey.operatorId)))
  );
}

function isValidFavorite(item) {
  return (
    isValidJourney(item) &&
    typeof item.id === "string" &&
    typeof item.createdAt === "string" &&
    !Number.isNaN(Date.parse(item.createdAt))
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

export function journeyKey(journey) {
  return [
    journey.origin.id,
    journey.destination.id,
    journey.preferredMode,
    journey.ticketType,
    ...(journey.preferredMode === "jeep" ? [journey.operatorId || "jeep-traditional"] : []),
  ].join("|");
}

async function readAll(uid) {
  const raw = await AsyncStorage.getItem(storageKey(uid));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidFavorite) : [];
  } catch {
    return [];
  }
}

async function writeAll(uid, items) {
  await AsyncStorage.setItem(storageKey(uid), JSON.stringify(items));
}

// One write at a time per account so quick taps cannot overwrite each other.
const queues = new Map();
function enqueue(uid, task) {
  const previous = queues.get(uid) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  queues.set(uid, next);
  return next;
}

/**
 * @returns {Promise<import('../types/commute').SavedFavorite[]>}
 */
export async function loadFavorites(uid) {
  const items = await readAll(uid);
  return items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/**
 * For the Directions heart: returns the saved favorite for these choices, or null.
 */
export async function findFavorite(uid, journey) {
  if (!isValidJourney(journey)) return null;
  const items = await readAll(uid);
  const key = journeyKey(journey);
  return items.find((item) => journeyKey(item) === key) ?? null;
}

/**
 * @param {string} uid
 * @param {import('../types/commute').FavoriteInput} journey
 * @returns {Promise<import('../types/commute').SavedFavorite>}
 */
export async function saveFavorite(uid, journey) {
  storageKey(uid);
  if (!isValidJourney(journey)) {
    throw new Error("A favorite needs a selected origin, destination, mode, and ticket type.");
  }
  return enqueue(uid, async () => {
    const items = await readAll(uid);
    const key = journeyKey(journey);
    const existing = items.find((item) => journeyKey(item) === key);
    if (existing) return existing; // duplicate: no second copy

    const favorite = {
      id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      origin: clonePlace(journey.origin),
      destination: clonePlace(journey.destination),
      preferredMode: journey.preferredMode,
      ticketType: journey.ticketType,
      ...(journey.preferredMode === "jeep"
        ? { operatorId: journey.operatorId || "jeep-traditional" }
        : {}),
      createdAt: new Date().toISOString(),
    };
    await writeAll(uid, [favorite, ...items]);
    return favorite;
  });
}

/**
 * @returns {Promise<void>}
 */
export async function removeFavorite(uid, favoriteId) {
  storageKey(uid);
  return enqueue(uid, async () => {
    const items = await readAll(uid);
    await writeAll(
      uid,
      items.filter((item) => item.id !== favoriteId),
    );
  });
}

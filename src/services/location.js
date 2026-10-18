import { LOCATION_STATUS } from "../constants/commute";
import { LANDMARKS, SERVICE_AREA } from "../data/serviceArea";

export const LOCATION_LABELS = Object.freeze({
  finding: "Finding your location",
  unavailable: "Location unavailable",
  denied: "Location access is off",
  weakSignal: "Location signal is weak",
  outsideArea: "Outside the Cubao area",
  insideArea: SERVICE_AREA.name,
});

// Fixes less accurate than this are not trusted for the inside/outside
// decision. Tune after the real Android walking test.
export const MAX_ACCEPTABLE_ACCURACY_METERS = 150;

const DEFAULT_FIX_TIMEOUT_MS = 15000;
const LABEL_REUSE_DISTANCE_METERS = 50;
const WATCH_OPTIONS = { distanceInterval: 10, timeInterval: 5000 };

let nativeOverride = null;
let fixTimeoutMs = DEFAULT_FIX_TIMEOUT_MS;

// Test hook only. Lets scripts/test-location.cjs supply a fake expo-location.
export function __configureLocationForTests(options) {
  const settings = options || {};
  nativeOverride = settings.native || null;
  fixTimeoutMs = settings.fixTimeoutMs || DEFAULT_FIX_TIMEOUT_MS;
}

// expo-location is loaded lazily so a build without the native module
// reports "unavailable" instead of crashing the whole app.
function getNativeLocation() {
  if (nativeOverride) return nativeOverride;
  try {
    return require("expo-location");
  } catch {
    return null;
  }
}

// ---------- geometry helpers ----------

function isValidCoordinate(value) {
  return (
    !!value &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.latitude) <= 90 &&
    Math.abs(value.longitude) <= 180
  );
}

export function distanceMeters(a, b) {
  const earthRadius = 6371000;
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * @param {import('../types/commute').Coordinate} coordinate
 * @returns {boolean}
 */
export function isWithinServiceArea(coordinate) {
  if (!isValidCoordinate(coordinate)) return false;
  const b = SERVICE_AREA.bounds;
  return (
    coordinate.latitude >= b.minLatitude &&
    coordinate.latitude <= b.maxLatitude &&
    coordinate.longitude >= b.minLongitude &&
    coordinate.longitude <= b.maxLongitude
  );
}

function nearestLandmark(coordinate) {
  let best = null;
  for (const item of LANDMARKS) {
    const distance = distanceMeters(coordinate, item.coordinate);
    if (distance <= item.radiusMeters && (!best || distance < best.distance)) {
      best = { item, distance };
    }
  }
  return best ? best.item : null;
}

/**
 * Truthful label from the position only. Choosing a destination never
 * changes this label.
 * @param {import('../types/commute').Coordinate} coordinate
 * @returns {Promise<string>}
 */
export async function resolveLocationLabel(coordinate) {
  if (!isValidCoordinate(coordinate)) return LOCATION_LABELS.unavailable;
  if (!isWithinServiceArea(coordinate)) return LOCATION_LABELS.outsideArea;
  const landmark = nearestLandmark(coordinate);
  return landmark ? `Near ${landmark.name}` : LOCATION_LABELS.insideArea;
}

/**
 * Avoids a new label lookup for every small movement. The cached label is
 * reused while the position stays within a short distance AND on the same
 * side of the service boundary.
 */
export function createLabelCache(resolve, reuseMeters) {
  const lookup = resolve || resolveLocationLabel;
  const reuseDistance = reuseMeters || LABEL_REUSE_DISTANCE_METERS;
  let last = null;
  return async function labelFor(coordinate) {
    const inside = isWithinServiceArea(coordinate);
    if (
      last &&
      last.inside === inside &&
      distanceMeters(last.coordinate, coordinate) < reuseDistance
    ) {
      return last.label;
    }
    const label = await lookup(coordinate);
    last = {
      coordinate: {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      },
      inside,
      label,
    };
    return label;
  };
}

// ---------- snapshots ----------

function makeSnapshot(status, position, label, inServiceArea) {
  return { status, position, label, inServiceArea };
}

export function createInitialSnapshot() {
  return makeSnapshot(
    LOCATION_STATUS.IDLE,
    null,
    LOCATION_LABELS.finding,
    null,
  );
}

function unavailableSnapshot(label) {
  return makeSnapshot(
    LOCATION_STATUS.UNAVAILABLE,
    null,
    label || LOCATION_LABELS.unavailable,
    null,
  );
}

function deniedSnapshot() {
  return makeSnapshot(
    LOCATION_STATUS.DENIED,
    null,
    LOCATION_LABELS.denied,
    null,
  );
}

function toIsoTimestamp(value) {
  if (Number.isFinite(value) && Math.abs(value) <= 8.64e15) {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
}

// Converts an expo-location fix into the shared Position format.
function readFix(fix) {
  const coords = fix && fix.coords;
  if (!isValidCoordinate(coords)) return null;
  const accuracy = Number.isFinite(coords.accuracy) ? coords.accuracy : null;
  const heading =
    Number.isFinite(coords.heading) && coords.heading >= 0
      ? coords.heading
      : null;
  return {
    position: {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracyMeters: accuracy,
      headingDegrees: heading,
      timestamp: toIsoTimestamp(fix.timestamp),
    },
    poor: accuracy !== null && accuracy > MAX_ACCEPTABLE_ACCURACY_METERS,
  };
}

async function snapshotFromReading(reading, labelFor) {
  const inside = isWithinServiceArea(reading.position);
  const label = await labelFor(reading.position);
  return makeSnapshot(
    inside ? LOCATION_STATUS.READY : LOCATION_STATUS.OUTSIDE_AREA,
    reading.position,
    label,
    inside,
  );
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("Location request timed out.")),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ---------- the four prepared functions ----------

/**
 * Asks for foreground permission (if needed) and returns one location fix.
 * Never throws: failures become a snapshot with a clear status.
 * @returns {Promise<import('../types/commute').LocationSnapshot>}
 */
export async function requestForegroundLocation() {
  const native = getNativeLocation();
  if (!native) return unavailableSnapshot();

  try {
    const permission = await native.requestForegroundPermissionsAsync();
    if (!permission || permission.status !== "granted") {
      return deniedSnapshot();
    }

    if (
      typeof native.hasServicesEnabledAsync === "function" &&
      !(await native.hasServicesEnabledAsync())
    ) {
      return unavailableSnapshot();
    }

    const accuracy = native.Accuracy ? native.Accuracy.Balanced : undefined;
    const fix = await withTimeout(
      native.getCurrentPositionAsync({ accuracy }),
      fixTimeoutMs,
    );

    const reading = readFix(fix);
    if (!reading) return unavailableSnapshot();
    if (reading.poor) return unavailableSnapshot(LOCATION_LABELS.weakSignal);

    return await snapshotFromReading(reading, resolveLocationLabel);
  } catch {
    return unavailableSnapshot();
  }
}

/**
 * Starts one foreground subscription. Updates with poor accuracy are
 * ignored, and nothing is delivered after remove() is called.
 * @param {(snapshot: import('../types/commute').LocationSnapshot) => void} onUpdate
 * @param {(error: Error) => void} onError
 * @returns {Promise<import('../types/commute').LocationHandle>}
 */
export async function watchForegroundLocation(onUpdate, onError) {
  const native = getNativeLocation();
  if (!native) {
    const error = new Error("expo-location is not available in this build.");
    error.code = "location/unavailable";
    throw error;
  }

  let removed = false;
  let sequence = 0;
  let delivered = 0;
  const labelFor = createLabelCache();
  const accuracy = native.Accuracy ? native.Accuracy.Balanced : undefined;

  const subscription = await native.watchPositionAsync(
    { accuracy, ...WATCH_OPTIONS },
    async (fix) => {
      if (removed) return;
      const mine = ++sequence;
      try {
        const reading = readFix(fix);
        if (!reading || reading.poor) return;
        const snapshot = await snapshotFromReading(reading, labelFor);
        // Late or out-of-order results are dropped.
        if (removed || mine <= delivered) return;
        delivered = mine;
        onUpdate(snapshot);
      } catch (error) {
        if (!removed && typeof onError === "function") onError(error);
      }
    },
  );

  return {
    remove() {
      if (removed) return;
      removed = true;
      try {
        subscription.remove();
      } catch {
        // already removed by the system
      }
    },
  };
}

// ---------- tracker used by LocationProvider ----------

/**
 * Owns the single foreground subscription and all start/stop rules, so the
 * React provider stays thin and these rules can be tested without React.
 *
 * - start()/stop() are safe to call repeatedly.
 * - Tracking stops when the position leaves the service area, when
 *   permission is denied, in the background, on logout (reset) and on
 *   dispose. Late callbacks from an old session are ignored.
 */
export function createLocationTracker(onSnapshot) {
  let snapshot = createInitialSnapshot();
  let disposed = false;
  let handle = null;
  let starting = false;
  let wantsTracking = false;
  let watchToken = 0;
  let refreshToken = 0;

  function emit(next) {
    if (disposed) return;
    snapshot = next;
    onSnapshot(next);
  }

  function stopWatching() {
    watchToken += 1;
    starting = false;
    const current = handle;
    handle = null;
    if (current) {
      try {
        current.remove();
      } catch {
        // ignore
      }
    }
  }

  async function refresh() {
    if (disposed) return snapshot;
    const token = ++refreshToken;
    const previous = snapshot;
    if (snapshot.status !== LOCATION_STATUS.READY) {
      emit({
        ...snapshot,
        status: LOCATION_STATUS.LOCATING,
        label: LOCATION_LABELS.finding,
      });
    }
    let next = await requestForegroundLocation();
    if (disposed || token !== refreshToken) return snapshot;
    // A weak-signal reading must not erase a good earlier position.
    if (
      next.status === LOCATION_STATUS.UNAVAILABLE &&
      next.label === LOCATION_LABELS.weakSignal &&
      previous.position
    ) {
      next = previous;
    }
    emit(next);
    if (
      next.status === LOCATION_STATUS.DENIED ||
      next.status === LOCATION_STATUS.OUTSIDE_AREA
    ) {
      stopWatching();
    }
    return next;
  }

  async function start() {
    if (disposed) return;
    wantsTracking = true;
    if (handle || starting) return;
    starting = true;
    const token = ++watchToken;

    await refresh();
    if (disposed || token !== watchToken) return;

    const onUpdate = (next) => {
      if (disposed || token !== watchToken) return;
      emit(next);
      if (next.status === LOCATION_STATUS.OUTSIDE_AREA) stopWatching();
    };
    const onError = () => {
      if (disposed || token !== watchToken) return;
      emit(unavailableSnapshot());
    };

    let created;
    try {
      created = await watchForegroundLocation(onUpdate, onError);
    } catch {
      if (!disposed && token === watchToken) {
        starting = false;
        emit(unavailableSnapshot());
      }
      return;
    }

    if (disposed || token !== watchToken) {
      created.remove();
      return;
    }
    handle = created;
    starting = false;
  }

  function stop() {
    wantsTracking = false;
    stopWatching();
  }

  function suspend() {
    refreshToken += 1;
    stopWatching();
  }

  async function resume() {
    if (disposed) return snapshot;
    if (wantsTracking) {
      await start();
      return snapshot;
    }
    return refresh();
  }

  function reset() {
    refreshToken += 1;
    stop();
    emit(createInitialSnapshot());
  }

  function dispose() {
    disposed = true;
    refreshToken += 1;
    wantsTracking = false;
    stopWatching();
  }

  return {
    refresh,
    start,
    stop,
    suspend,
    resume,
    reset,
    dispose,
    isTracking: () => Boolean(handle) || starting,
    getSnapshot: () => snapshot,
  };
}

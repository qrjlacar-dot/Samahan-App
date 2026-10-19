import { LOCATION_STATUS } from "../constants/commute";
import { isWithinServiceArea } from "./location";

export function currentLocationPlace(snapshot, now = Date.now()) {
  const position = snapshot?.position;

  if (
    snapshot?.status === LOCATION_STATUS.OUTSIDE_AREA ||
    (position && !isWithinServiceArea(position))
  ) {
    throw new Error(
      "Your current location is outside our demo area. Choose two places inside the area to preview a route.",
    );
  }

  if (
    snapshot?.status !== LOCATION_STATUS.READY ||
    snapshot.inServiceArea !== true ||
    !position
  ) {
    throw new Error(
      "Your location is not ready. Turn on Location, allow access, and try Current location again.",
    );
  }

  const timestamp = Date.parse(position.timestamp);

  if (
    !Number.isFinite(timestamp) ||
    now - timestamp > 30000 ||
    timestamp - now > 5000
  ) {
    throw new Error(
      "A fresh location reading is needed. Try Current location again.",
    );
  }

  return {
    id: `device:${position.latitude},${position.longitude}`,
    name: "Current location",
    address:
      `${position.latitude.toFixed(5)}, ` +
      position.longitude.toFixed(5),
    coordinate: {
      latitude: position.latitude,
      longitude: position.longitude,
    },
    source: "device",
  };
}

export function readDeviceHeading(reading) {
  if (
    !reading ||
    !Number.isFinite(reading.accuracy) ||
    reading.accuracy < 1
  ) {
    return null;
  }

  const heading =
    Number.isFinite(reading.trueHeading) &&
    reading.trueHeading >= 0
      ? reading.trueHeading
      : reading.magHeading;

  return (
    Number.isFinite(heading) &&
    heading >= 0 &&
    heading <= 360
  )
    ? heading % 360
    : null;
}

export function headingBeam(
  position,
  heading,
  radiusMeters = 35,
) {
  if (
    !position ||
    !Number.isFinite(position.latitude) ||
    !Number.isFinite(position.longitude) ||
    Math.abs(position.latitude) > 90 ||
    Math.abs(position.longitude) > 180 ||
    !Number.isFinite(heading) ||
    !Number.isFinite(radiusMeters) ||
    radiusMeters <= 0
  ) {
    return [];
  }

  const radians = Math.PI / 180;
  const lat = position.latitude * radians;
  const lon = position.longitude * radians;
  const distance = radiusMeters / 6371000;

  const points = [
    {
      latitude: position.latitude,
      longitude: position.longitude,
    },
  ];

  for (let offset = -28; offset <= 28; offset += 7) {
    const bearing = (heading + offset) * radians;

    const nextLat = Math.asin(
      Math.sin(lat) * Math.cos(distance) +
      Math.cos(lat) *
        Math.sin(distance) *
        Math.cos(bearing),
    );

    const nextLon =
      lon +
      Math.atan2(
        Math.sin(bearing) *
          Math.sin(distance) *
          Math.cos(lat),
        Math.cos(distance) -
          Math.sin(lat) * Math.sin(nextLat),
      );

    points.push({
      latitude: nextLat / radians,
      longitude:
        ((nextLon / radians + 540) % 360) - 180,
    });
  }

  return points;
}

export function createHeadingTracker(native, onHeading) {
  let wanted = false;
  let generation = 0;
  let handle = null;
  let pending = null;

  function stop() {
    wanted = false;
    generation += 1;

    const previous = handle;
    handle = null;

    try {
      previous?.remove();
    } catch {}

    onHeading(null);
  }

  async function start() {
    wanted = true;

    if (handle || pending) return pending;

    const token = generation;

    pending = (async () => {
      const permission =
        await native.getForegroundPermissionsAsync();

      if (permission?.status !== "granted") return;

      if (!(await native.hasServicesEnabledAsync())) {
        return;
      }

      if (!wanted || token !== generation) return;

      const subscription = await native.watchHeadingAsync(
        (reading) => {
          if (wanted && token === generation) {
            onHeading(readDeviceHeading(reading));
          }
        },
        () => {
          if (wanted && token === generation) {
            stop();
          }
        },
      );

      if (!wanted || token !== generation) {
        try {
          subscription.remove();
        } catch {}
      } else {
        handle = subscription;
      }
    })().catch(() => {
      if (wanted && token === generation) {
        onHeading(null);
      }
    });

    await pending;
    pending = null;

    if (
      wanted &&
      !handle &&
      token !== generation
    ) {
      await start();
    }
  }

  return { start, stop };
}

const listeners = new Set();

let sharedTracker = null;
let latestHeading = null;

export function subscribeDeviceHeading(listener) {
  if (!sharedTracker) {
    try {
      const native = require("expo-location");

      if (
        typeof native.watchHeadingAsync !== "function"
      ) {
        return () => {};
      }

      sharedTracker = createHeadingTracker(
        native,
        (heading) => {
          latestHeading = heading;

          for (const callback of listeners) {
            callback(heading);
          }
        },
      );
    } catch {
      listener(null);
      return () => {};
    }
  }

  listeners.add(listener);
  listener(latestHeading);
  sharedTracker.start();

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      sharedTracker.stop();
    }
  };
}
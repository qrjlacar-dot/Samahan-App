import {
  distanceMeters,
  isWithinServiceArea,
} from "./location";
import { LOCATION_STATUS } from "../constants/commute";

export const MAX_TRIP_FIX_AGE_MS = 30000;
export const MAX_TRIP_ACCURACY_METERS = 50;
export const START_DISTANCE_METERS = 75;
export const ROUTE_DISTANCE_METERS = 75;

export function distanceToRouteMeters(position, polyline) {
  if (!isWithinServiceArea(position) || !Array.isArray(polyline)) {
    return Infinity;
  }

  const scale = (Math.PI / 180) * 6371000;
  const cos = Math.cos((position.latitude * Math.PI) / 180);
  let nearest = Infinity;

  for (let i = 1; i < polyline.length; i += 1) {
    const a = polyline[i - 1];
    const b = polyline[i];

    if (!isWithinServiceArea(a) || !isWithinServiceArea(b)) {
      return Infinity;
    }

    const ax = (a.longitude - position.longitude) * scale * cos;
    const ay = (a.latitude - position.latitude) * scale;
    const bx = (b.longitude - position.longitude) * scale * cos;
    const by = (b.latitude - position.latitude) * scale;
    const dx = bx - ax;
    const dy = by - ay;
    const squared = dx * dx + dy * dy;

    const t =
      squared === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, -(ax * dx + ay * dy) / squared),
          );

    nearest = Math.min(
      nearest,
      Math.hypot(ax + t * dx, ay + t * dy),
    );
  }

  return nearest;
}

export function getTripIssue(
  route,
  snapshot,
  {
    requireOrigin = true,
    requireFresh = true,
    now = Date.now(),
  } = {},
) {
  const issue = (code, message) => ({ code, message });

  if (!route || route.preferredMode !== "walk") {
    return issue(
      "no-route",
      "Find a walking route before starting your trip.",
    );
  }

  if (
    !isWithinServiceArea(route.origin?.coordinate) ||
    !isWithinServiceArea(route.destination?.coordinate) ||
    !Array.isArray(route.polyline) ||
    route.polyline.length < 2 ||
    route.polyline.some((point) => !isWithinServiceArea(point))
  ) {
    return issue(
      "route-area",
      "Choose a route fully inside our current demo area.",
    );
  }

  if (
    snapshot?.status === LOCATION_STATUS.OUTSIDE_AREA ||
    (snapshot?.position && !isWithinServiceArea(snapshot.position))
  ) {
    return issue(
      "outside-area",
      "Your location is outside our demo area. You can preview routes, but a trip can only run inside the area.",
    );
  }

  if (
    snapshot?.status !== LOCATION_STATUS.READY ||
    snapshot.inServiceArea !== true ||
    !snapshot.position
  ) {
    return issue(
      "location-unavailable",
      "Your location is not ready. Turn on Location, allow access, and try again.",
    );
  }

  const accuracy = snapshot.position.accuracyMeters;

  if (
    !Number.isFinite(accuracy) ||
    accuracy < 0 ||
    accuracy > MAX_TRIP_ACCURACY_METERS
  ) {
    return issue(
      "weak-signal",
      "Wait for a more accurate location reading, then try again.",
    );
  }

  const timestamp = Date.parse(snapshot.position.timestamp);

  if (
    requireFresh &&
    (
      !Number.isFinite(timestamp) ||
      now - timestamp > MAX_TRIP_FIX_AGE_MS ||
      timestamp - now > 5000
    )
  ) {
    return issue(
      "old-location",
      "Your location reading is out of date. Refresh your location and try again.",
    );
  }

  if (
    requireOrigin &&
    distanceMeters(
      snapshot.position,
      route.origin.coordinate,
    ) > START_DISTANCE_METERS
  ) {
    return issue(
      "far-from-start",
      "Move closer to your selected starting point before starting this trip.",
    );
  }

  if (
    distanceToRouteMeters(
      snapshot.position,
      route.polyline,
    ) > ROUTE_DISTANCE_METERS
  ) {
    return issue(
      "far-from-route",
      "Move closer to the walking route, then try again.",
    );
  }

  return null;
}
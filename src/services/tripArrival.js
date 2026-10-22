import { distanceMeters } from "./location";
import { getTripIssue } from "./trips";

export function updateArrival(route, snapshot, progress, previous, startedPosition, now = Date.now()) {
  if (!startedPosition || !progress || getTripIssue(route, snapshot, { requireOrigin: false, now })) return null;
  const position = snapshot.position;
  if (position.accuracyMeters > 25 ||
      distanceMeters(position, route.destination.coordinate) > 25 ||
      progress.stepIndex !== route.steps.length - 1 ||
      progress.remainingDistanceMeters > 50 || progress.fraction < 0.8) return null;
  if (distanceMeters(startedPosition, route.destination.coordinate) <= 25 &&
      distanceMeters(startedPosition, position) < 10) return null;
  const timestamp = Date.parse(position.timestamp);
  if (!previous) return { firstTimestamp: timestamp, lastTimestamp: timestamp, arrived: false };
  if (timestamp <= previous.lastTimestamp) return previous;
  return { ...previous, lastTimestamp: timestamp, arrived: timestamp - previous.firstTimestamp >= 5000 };
}

export function updateOffRoute(previous, position) {
  const timestamp = Date.parse(position?.timestamp);
  if (!Number.isFinite(timestamp)) return null;
  if (!previous) return { firstTimestamp: timestamp, lastTimestamp: timestamp, reroute: false };
  if (timestamp <= previous.lastTimestamp) return previous;
  return { ...previous, lastTimestamp: timestamp, reroute: timestamp - previous.firstTimestamp >= 5000 };
}

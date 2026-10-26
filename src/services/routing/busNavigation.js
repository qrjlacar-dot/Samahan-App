import { cleanStopName, busReturnNotice, simplifyWalkingInstruction } from "./busPresentation";
import { distanceMeters } from "../location";
import { getWalkingProgress } from "../walkingProgress";

const length = (step) =>
  step.polyline.slice(1).reduce((n, p, i) => n + distanceMeters(step.polyline[i], p), 0);
export function busStepIndex(route) {
  return route?.steps?.findIndex((step) => step.mode === "bus") ?? -1;
}

export function getBusProgress(route, snapshot, phase, previous = null, now = Date.now()) {
  const index = busStepIndex(route);
  if (index < 0) return null;
  const lengths = route.steps.map(length);
  const total = lengths.reduce((a, b) => a + b, 0);
  const offset = phase === "access" ? 0 : phase === "egress" ? index + 1 : index;
  const steps =
    phase === "access"
      ? route.steps.slice(0, index)
      : phase === "egress"
        ? route.steps.slice(index + 1)
        : [route.steps[index]];
  if (!steps.length) return previous;
  const before = lengths.slice(0, offset).reduce((a, b) => a + b, 0);
  const segmentLength = lengths.slice(offset, offset + steps.length).reduce((a, b) => a + b, 0);
  const segment = {
    ...route,
    id: `${route.id}:${phase}`,
    preferredMode: "walk",
    steps,
    origin: { coordinate: steps[0].polyline[0] },
    destination: { coordinate: steps.at(-1).polyline.at(-1) },
    polyline: steps.flatMap((step) => step.polyline),
    distanceMeters: segmentLength,
    durationSeconds: null,
  };
  const local = getWalkingProgress(
    segment,
    snapshot,
    previous?.phase === phase ? previous.local : null,
    now,
  );
  const along =
    phase === "boarding"
      ? before
      : phase === "finishing"
        ? total
        : before + (local?.alongMeters ?? 0);
  const stepIndex = offset + (local?.stepIndex ?? 0);
  return {
    phase,
    local,
    stepIndex,
    stepCount: route.steps.length,
    alongMeters: along,
    fraction: total ? along / total : 0,
    remainingDistanceMeters: Math.max(0, total - along),
    remainingDurationSeconds: null,
    stepRemainingDistanceMeters:
      phase === "boarding"
        ? lengths[index]
        : phase === "finishing"
          ? 0
          : (local?.stepRemainingDistanceMeters ?? lengths[stepIndex]),
  };
}

export function busInstruction(route, phase, progress) {
  const ride = route?.steps?.[busStepIndex(route)];
  if (!ride) return "";
  if (phase === "boarding")
    return ride.direction === "anonas-bound"
      ? busReturnNotice(route)
      : `Check the ${ride.placards.join(" / ")} signboard and confirm your stop before boarding.`;
  if (phase === "riding")
    return progress?.stepRemainingDistanceMeters <= 200
      ? `Your drop-off is approaching: ${cleanStopName(ride.alightingStop)}. Get off at a permitted stop.`
      : `Stay on the bus until ${cleanStopName(ride.alightingStop)}.`;
  if (phase === "finishing")
    return `Walk safely to ${route.destination.name}. Waiting for GPS to confirm arrival.`;
  const step = route.steps[progress?.stepIndex ?? 0];
  return step?.mode === "walk"
    ? simplifyWalkingInstruction(step.instruction) || "Follow the route."
    : (step?.instruction ?? "Follow the route.");
}

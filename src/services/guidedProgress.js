import { distanceMeters } from "./location";
import { getWalkingProgress } from "./walkingProgress";

export function guidedStepDistance(step) {
  if (Number.isFinite(step?.distanceMeters))
    return Math.max(0, step.distanceMeters);
  const points = step?.polyline ?? [];
  return points
    .slice(1)
    .reduce((sum, point, i) => sum + distanceMeters(points[i], point), 0);
}

// Keep explicit boarding/platform stages while reusing walking-route projection.
export function getGuidedProgress(
  route,
  stepIndex,
  snapshot,
  previous = null,
  now = Date.now(),
) {
  const steps = route?.steps ?? [];
  const step = steps[stepIndex];
  if (!step) return null;
  const lengths = steps.map(guidedStepDistance);
  const total = lengths.reduce((a, b) => a + b, 0);
  const leg = lengths[stepIndex];
  let remaining = leg;
  const p = snapshot?.position;
  if (p && step.end) {
    remaining = Math.min(leg, distanceMeters(p, step.end));
    if (
      (step.kind === "walk" || !step.schematic) &&
      step.polyline?.length > 1
    ) {
      const segment = {
        ...route,
        id: `${route.id}:${step.id}`,
        preferredMode: "walk",
        origin: { coordinate: step.start ?? step.polyline[0] },
        destination: { coordinate: step.end },
        polyline: step.polyline,
        steps: [step],
        distanceMeters: leg,
        durationSeconds: null,
      };
      const projected = getWalkingProgress(
        segment,
        snapshot,
        previous?.stepIndex === stepIndex ? previous.local : null,
        now,
      );
      if (projected) remaining = projected.remainingDistanceMeters;
      previous = { local: projected };
    }
  }
  const future = lengths.slice(stepIndex + 1).reduce((a, b) => a + b, 0);
  const totalRemaining = future + remaining;
  return {
    stepIndex,
    stepCount: steps.length,
    stepRemainingDistanceMeters: remaining,
    remainingDistanceMeters: totalRemaining,
    remainingDurationSeconds: null,
    fraction: total ? Math.max(0, Math.min(1, 1 - totalRemaining / total)) : 0,
    local: previous?.local ?? null,
  };
}

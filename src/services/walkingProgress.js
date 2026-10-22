import {
  distanceMeters,
  isWithinServiceArea,
} from "./location";
import { getTripIssue } from "./trips";

function routeKey(route) {
  return `${route?.id ?? ""}:${route?.calculatedAt ?? ""}`;
}

function makeSegments(route) {
  if (
    !Array.isArray(route.steps) ||
    route.steps.length === 0
  ) {
    return null;
  }

  const segments = [];
  const ends = [];
  let total = 0;

  for (const step of route.steps) {
    const points = step.polyline;

    if (
      !Array.isArray(points) ||
      points.length === 0 ||
      points.some(
        (point) => !isWithinServiceArea(point),
      )
    ) {
      return null;
    }

    for (
      let index = 1;
      index < points.length;
      index += 1
    ) {
      const start = points[index - 1];
      const end = points[index];
      const length = distanceMeters(start, end);

      if (!Number.isFinite(length)) return null;
      if (length === 0) continue;

      segments.push({
        start,
        end,
        length,
        offset: total,
      });

      total += length;
    }

    ends.push(total);
  }

  return total > 0
    ? { segments, ends, total }
    : null;
}

function project(position, segment) {
  const scale = (Math.PI / 180) * 6371000;

  const cosine = Math.cos(
    (position.latitude * Math.PI) / 180,
  );

  const ax =
    (segment.start.longitude - position.longitude) *
    scale *
    cosine;

  const ay =
    (segment.start.latitude - position.latitude) *
    scale;

  const dx =
    (
      segment.end.longitude -
      segment.start.longitude
    ) *
    scale *
    cosine;

  const dy =
    (
      segment.end.latitude -
      segment.start.latitude
    ) *
    scale;

  const squared = dx * dx + dy * dy;

  const fraction =
    squared > 0
      ? Math.max(
          0,
          Math.min(
            1,
            -(ax * dx + ay * dy) / squared,
          ),
        )
      : 0;

  return {
    distance: Math.hypot(
      ax + fraction * dx,
      ay + fraction * dy,
    ),
    along:
      segment.offset +
      fraction * segment.length,
  };
}

export function getWalkingProgress(
  route,
  snapshot,
  previous = null,
  now = Date.now(),
) {
  const key = routeKey(route);

  const saved =
    previous?.routeKey === key
      ? previous
      : null;

  if (
    getTripIssue(route, snapshot, {
      requireOrigin: false,
      requireFresh: true,
      now,
    })
  ) {
    return saved;
  }

  const model = makeSegments(route);

  if (!model) return saved;

  const candidates = model.segments.map(
    (segment) =>
      project(snapshot.position, segment),
  );

  const closest = candidates.reduce(
    (minimum, item) =>
      Math.min(minimum, item.distance),
    Infinity,
  );

  const reference = saved?.alongMeters ?? 0;

  const nearest = candidates
    .filter(
      (item) => item.distance <= closest + 2,
    )
    .reduce((best, item) =>
      Math.abs(item.along - reference) <
      Math.abs(best.along - reference)
        ? item
        : best,
    );

  const along = Math.max(
    0,
    Math.min(model.total, nearest.along),
  );

  let stepIndex = 0;

  while (
    stepIndex < model.ends.length - 1 &&
    along >= model.ends[stepIndex]
  ) {
    stepIndex += 1;
  }

  const stepStart =
    stepIndex > 0
      ? model.ends[stepIndex - 1]
      : 0;

  const stepLength =
    model.ends[stepIndex] - stepStart;

  const stepDistance =
    route.steps[stepIndex].distanceMeters;

  const stepTotal =
    Number.isFinite(stepDistance) &&
    stepDistance >= 0
      ? stepDistance
      : stepLength;

  const stepRemaining =
    stepLength > 0
      ? stepTotal *
        Math.max(
          0,
          (
            model.ends[stepIndex] - along
          ) / stepLength,
        )
      : 0;

  const fraction = along / model.total;

  const totalDistance =
    Number.isFinite(route.distanceMeters) &&
    route.distanceMeters >= 0
      ? route.distanceMeters
      : model.total;

  const totalTime =
    Number.isFinite(route.durationSeconds) &&
    route.durationSeconds >= 0
      ? route.durationSeconds
      : null;

  return {
    routeKey: key,
    stepIndex,
    stepCount: model.ends.length,
    stepRemainingDistanceMeters: stepRemaining,
    alongMeters: along,
    fraction,
    remainingDistanceMeters: Math.max(
      0,
      totalDistance * (1 - fraction),
    ),
    remainingDurationSeconds:
      totalTime === null
        ? null
        : Math.max(
            0,
            totalTime * (1 - fraction),
          ),
  };
}
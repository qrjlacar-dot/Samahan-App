import { BUS_LINES } from "../data/busCatalog";
import { distanceMeters, isWithinServiceArea } from "./location";

function failure(code, message) {
  return Object.assign(new Error(message), { code: `commute/${code}` });
}

function checkCancelled(signal) {
  if (signal?.aborted) {
    throw Object.assign(new Error("Request cancelled."), { name: "AbortError" });
  }
}

function pathLength(path) {
  return path.slice(1).reduce((total, point, index) => total + distanceMeters(path[index], point), 0);
}

// Local metre projection is sufficient for this short corridor. The actual
// ride distance is measured along the published road shape, not this projection.
function project(point, path) {
  const longitudeScale = Math.cos(point.latitude * Math.PI / 180);
  let travelled = 0;
  let best = null;
  for (let index = 0; index < path.length - 1; index += 1) {
    const a = path[index], b = path[index + 1];
    const dx = (b.longitude - a.longitude) * longitudeScale;
    const dy = b.latitude - a.latitude;
    const length = distanceMeters(a, b);
    const denominator = dx * dx + dy * dy;
    if (!denominator || !length) continue;
    const raw = (((point.longitude - a.longitude) * longitudeScale) * dx + (point.latitude - a.latitude) * dy) / denominator;
    const ratio = Math.max(0, Math.min(1, raw));
    const coordinate = { latitude: a.latitude + ratio * dy, longitude: a.longitude + ratio * (b.longitude - a.longitude) };
    const distance = distanceMeters(point, coordinate);
    if (!best || distance < best.distance) {
      best = { index, coordinate, distance, along: travelled + ratio * length,
        overshoot: index === 0 && raw < 0 ? -raw * length : index === path.length - 2 && raw > 1 ? (raw - 1) * length : 0 };
    }
    travelled += length;
  }
  return best;
}

function ridePath(line, boarding, alighting) {
  const start = project(boarding.coordinate, line.path);
  const end = project(alighting.coordinate, line.path);
  return [boarding.coordinate, start.coordinate,
    ...line.path.slice(start.index + 1, end.index + 1), end.coordinate, alighting.coordinate];
}

export async function getBusRoutes(request, { signal, getWalkingRoutes, lines = BUS_LINES } = {}) {
  checkCancelled(signal);
  const { origin, destination } = request ?? {};
  if (!origin?.coordinate || !destination?.coordinate ||
      !isWithinServiceArea(origin.coordinate) || !isWithinServiceArea(destination.coordinate)) {
    throw failure("invalid-places", "Select two places inside our demo area.");
  }
  const direct = distanceMeters(origin.coordinate, destination.coordinate);
  if (direct < 1) throw failure("same-place", "Choose a different destination.");

  const candidates = [];
  for (const line of lines) {
    if (line.mode !== "bus" || line.path?.length < 2) continue;
    const start = project(origin.coordinate, line.path);
    const end = project(destination.coordinate, line.path);
    if (!start || !end || start.distance > line.maxAccessMeters || end.distance > line.maxEgressMeters ||
        start.overshoot > 100 || end.overshoot > 150 || end.along <= start.along + 50) continue;
    for (let from = 0; from < line.stops.length - 1; from += 1) {
      for (let to = from + 1; to < line.stops.length; to += 1) {
        const boarding = line.stops[from], alighting = line.stops[to];
        const access = distanceMeters(origin.coordinate, boarding.coordinate);
        const egress = distanceMeters(alighting.coordinate, destination.coordinate);
        const boardingProgress = project(boarding.coordinate, line.path);
        if (boardingProgress.along < start.along - 100 || access > line.maxAccessMeters ||
            egress > line.maxEgressMeters || access + egress > direct * 1.5 + 200) continue;
        candidates.push({ line, boarding, alighting, from, to, score: access + egress });
      }
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  if (!candidates.length) {
    throw failure("no-route", "The bus preview serves Aurora toward Cubao only, near its listed stops. No direct Ali Mall or reverse bus service is included. Try Walk for this journey.");
  }

  const { line, boarding, alighting, from, to } = candidates[0];
  const walking = async (a, b) => {
    if (distanceMeters(a.coordinate, b.coordinate) < 5) return null;
    const route = (await getWalkingRoutes({ origin: a, destination: b, preferredMode: "walk" }, { signal }))[0];
    if (!route?.steps?.length) throw failure("no-route", "A walking connection to the bus stop could not be found. Try Walk or another starting point.");
    return route;
  };
  const [access, egress] = await Promise.all([walking(origin, boarding), walking(alighting, destination)]);
  checkCancelled(signal);
  const id = `local:${line.id}:${boarding.id}:${alighting.id}:${origin.id}:${destination.id}`;
  const polyline = ridePath(line, boarding, alighting);
  const ride = {
    id: `${id}:ride`, mode: "bus",
    instruction: `At ${boarding.name}, look for an air-conditioned bus on the Antipolo–Quiapo via Cubao service, travelling toward Cubao / Quiapo. Confirm that it will stop at ${alighting.name} before boarding. Ride along Aurora Boulevard, then get off at ${alighting.name}.`,
    start: boarding.coordinate, end: alighting.coordinate, polyline,
    distanceMeters: Math.round(pathLength(polyline)), durationSeconds: null,
    lineName: line.name, boardingStop: boarding.name, alightingStop: alighting.name,
    stopCount: to - from, operatorId: line.operatorId, schematic: true, sourceUrl: line.sourceUrl,
  };
  const steps = [
    ...(access?.steps ?? []).map((step, index) => ({ ...step, id: `${id}:access:${index}` })),
    ride,
    ...(egress?.steps ?? []).map((step, index) => ({ ...step, id: `${id}:egress:${index}` })),
  ];
  return [{
    id, origin, destination, preferredMode: "bus", actualModes: [...new Set(steps.map((step) => step.mode))],
    distanceMeters: steps.every((step) => Number.isFinite(step.distanceMeters)) ? steps.reduce((sum, step) => sum + step.distanceMeters, 0) : null,
    durationSeconds: null, polyline: steps.flatMap((step) => step.polyline), steps,
    source: "verified-local", sources: ["geoapify", "verified-local"],
    sourceUrls: line.sourceUrls, preview: true, calculatedAt: new Date().toISOString(),
    warnings: [
      "Bus preview only. Listed stops have not been checked on site. Confirm the correct loading area, current service, and drop-off with the conductor before boarding.",
      "The dashed bus path is indicative. It does not show a live bus location. Bus arrival times and total travel time are unavailable.",
      "The fare estimate is for an air-conditioned city bus. Confirm the vehicle's current posted fare matrix and bring valid ID when claiming a discount.",
      "Ali Mall and other destinations away from Aurora require a final walk from the selected bus stop; the bus does not go directly to the mall.",
    ],
  }];
}

import { getJeepRoutes } from "./jeepRoutes";
import { TRANSIT_LINES } from "../../data/transitCatalog";
import { getBusRoutes } from "./busRoutes";
import { distanceMeters, isWithinServiceArea } from "../location";

function failure(code, message) {
  return Object.assign(new Error(message), { code: `commute/${code}` });
}

export async function getTransitRoutes(
  request,
  { signal, getWalkingRoutes, getBusGeometry, lines = TRANSIT_LINES } = {},
) {
  if (request?.preferredMode === "bus")
    return getBusRoutes(request, { signal, getWalkingRoutes, getBusGeometry });
  if (request?.preferredMode === "jeep")
    return getJeepRoutes(request, { signal, getWalkingRoutes, getBusGeometry, lines });
  const { origin, destination, preferredMode, operatorId } = request ?? {};
  const available = lines.filter(
    (line) =>
      line.mode === preferredMode &&
      (preferredMode !== "jeep" || line.operatorId === (operatorId || "jeep-traditional")),
  );
  if (!available.length)
    throw failure(
      "unsupported-mode",
      "No confirmed route for this transport mode is included yet. Choose Walk or Train Lines.",
    );
  if (
    !origin?.coordinate ||
    !destination?.coordinate ||
    !isWithinServiceArea(origin.coordinate) ||
    !isWithinServiceArea(destination.coordinate)
  ) {
    throw failure("invalid-places", "Select two places inside our service area.");
  }
  if (
    origin.coordinate.latitude === destination.coordinate.latitude &&
    origin.coordinate.longitude === destination.coordinate.longitude
  ) {
    throw failure("same-place", "Choose a different destination.");
  }
  const direct = distanceMeters(origin.coordinate, destination.coordinate);
  const candidates = [];
  for (const line of available) {
    const directions = [{ stops: line.stops, headsign: line.headsign, path: line.path }];
    if (line.bidirectional)
      directions.push({
        stops: [...line.stops].reverse(),
        headsign: line.reverseHeadsign,
        path: line.reversePath,
      });
    for (const direction of directions) {
      for (let from = 0; from < direction.stops.length - 1; from += 1) {
        for (let to = from + 1; to < direction.stops.length; to += 1) {
          const boarding = direction.stops[from];
          const alighting = direction.stops[to];
          const access = distanceMeters(origin.coordinate, boarding.coordinate);
          const egress = distanceMeters(alighting.coordinate, destination.coordinate);
          if (access <= 1500 && egress <= 1500 && access + egress <= direct * 1.5 + 200) {
            candidates.push({
              line,
              direction,
              from,
              to,
              boarding,
              alighting,
              score: access + egress,
            });
          }
        }
      }
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  if (!candidates.length)
    throw failure(
      "no-route",
      "The included transport routes do not serve this journey. Try Walk or different places near the listed stops.",
    );
  const candidate = candidates[0];
  const { line, direction, from, to, boarding, alighting } = candidate;
  const walking = async (a, b) => {
    if (distanceMeters(a.coordinate, b.coordinate) < 5) return null;
    return (
      await getWalkingRoutes({ origin: a, destination: b, preferredMode: "walk" }, { signal })
    )[0];
  };
  const [access, egress] = await Promise.all([
    walking(origin, boarding),
    walking(alighting, destination),
  ]);
  if (signal?.aborted)
    throw Object.assign(new Error("Request cancelled."), {
      name: "AbortError",
    });
  const id = `local:${line.id}:${boarding.id}:${alighting.id}:${origin.id}:${destination.id}`;
  let ridePolyline =
    direction.path ?? direction.stops.slice(from, to + 1).map((item) => item.coordinate);
  let geometryVerified = false;
  if (preferredMode === "jeep" && getBusGeometry && direction.path) {
    const road = await getBusGeometry(
      { ...line, id: `${line.id}:${boarding.id}`, path: direction.path },
      { signal },
    );
    if (
      road?.polyline?.length < 2 ||
      !road?.polyline ||
      road.polyline.some((point) => !isWithinServiceArea(point))
    )
      throw failure("no-route", "No route was found for these places.");
    ridePolyline = road.polyline;
    geometryVerified = true;
  }
  const rideDistance = ridePolyline
    .slice(1)
    .reduce((sum, p, i) => sum + distanceMeters(ridePolyline[i], p), 0);
  const ride = {
    id: `${id}:ride`,
    mode: line.mode,
    kind: "ride",
    withinMinimumFare: geometryVerified ? rideDistance <= 4000 : line.withinMinimumFare === true,
    instruction: `Board ${line.name} marked ${direction.headsign}.`,
    start: boarding.coordinate,
    end: alighting.coordinate,
    polyline: ridePolyline,
    distanceMeters: geometryVerified ? Math.round(rideDistance) : null,
    durationSeconds: null,
    lineName: line.name,
    boardingStop: boarding.name,
    alightingStop: alighting.name,
    stopCount: to - from,
    operatorId: line.operatorId,
    schematic: !geometryVerified,
    sourceUrl: line.sourceUrl,
  };
  const steps = [
    ...(access?.steps ?? []).map((step, index, steps) => ({
      ...step,
      kind: "walk",
      instruction:
        index === steps.length - 1
          ? `Go to the boarding area at ${boarding.name}.`
          : step.instruction,
      id: `${id}:access:${index}`,
    })),
    ride,
    ...(egress?.steps ?? []).map((step, index) => ({
      ...step,
      kind: "walk",
      id: `${id}:egress:${index}`,
    })),
  ];
  return [
    {
      id,
      origin,
      destination,
      preferredMode,
      operatorId: line.operatorId,
      actualModes: [...new Set(steps.map((step) => step.mode))],
      distanceMeters: geometryVerified
        ? Math.round(steps.reduce((sum, step) => sum + (step.distanceMeters ?? 0), 0))
        : null,
      durationSeconds: null,
      polyline: steps.flatMap((step) => step.polyline),
      steps,
      source: "verified-local",
      sources: ["geoapify", "verified-local"],
      calculatedAt: new Date().toISOString(),
      warnings: [
        "Transport preview only. Dashed sections connect the listed stops; the exact road alignment and current service are not verified.",
        "Boarding and drop-off locations use the team's landmark points. Confirm permitted stops with the driver.",
        "Waiting times, service availability, and the total travel time are not provided.",
        "Fare estimates use the project's saved rules. Confirm the current fare with the operator.",
      ],
    },
  ];
}

import { BUS_LINES, BUS_TERMINAL } from "../../data/busCatalog";
import { prepareBusWalkSteps } from "./busPresentation";
import { FARE_RULES } from "../../data/fareRules";
import { distanceMeters, isWithinServiceArea } from "../location";

function failure(code, message) {
  return Object.assign(new Error(message), { code: `commute/${code}` });
}

function checkCancelled(signal) {
  if (signal?.aborted) {
    throw Object.assign(new Error("Request cancelled."), { name: "AbortError" });
  }
}

function pathLength(path) {
  return path
    .slice(1)
    .reduce((total, point, index) => total + distanceMeters(path[index], point), 0);
}

// Project onto each direction’s ordered corridor. Live road geometry is
// validated before clipping the selected boarding-to-drop-off segment.
export function projectBusPoint(point, path) {
  const longitudeScale = Math.cos((point.latitude * Math.PI) / 180);
  let travelled = 0;
  let best = null;
  for (let index = 0; index < path.length - 1; index += 1) {
    const a = path[index],
      b = path[index + 1];
    const dx = (b.longitude - a.longitude) * longitudeScale;
    const dy = b.latitude - a.latitude;
    const length = distanceMeters(a, b);
    const denominator = dx * dx + dy * dy;
    if (!denominator || !length) continue;
    const raw =
      ((point.longitude - a.longitude) * longitudeScale * dx + (point.latitude - a.latitude) * dy) /
      denominator;
    const ratio = Math.max(0, Math.min(1, raw));
    const coordinate = {
      latitude: a.latitude + ratio * dy,
      longitude: a.longitude + ratio * (b.longitude - a.longitude),
    };
    const distance = distanceMeters(point, coordinate);
    if (!best || distance < best.distance) {
      best = {
        index,
        coordinate,
        distance,
        along: travelled + ratio * length,
        overshoot:
          index === 0 && raw < 0
            ? -raw * length
            : index === path.length - 2 && raw > 1
              ? (raw - 1) * length
              : 0,
      };
    }
    travelled += length;
  }
  return best;
}

function ridePath(line, start, end) {
  // Keep the selected projection indices. Reprojecting repeated road points
  // can jump to another occurrence on a looping provider geometry.
  return [
    start.coordinate,
    ...line.path.slice(start.index + 1, end.index + 1),
    end.coordinate,
  ].filter((point, index, points) => index === 0 || distanceMeters(points[index - 1], point) > 0.1);
}

async function planBusRide(
  request,
  { signal, getWalkingRoutes, getBusGeometry, lines = BUS_LINES } = {},
) {
  checkCancelled(signal);
  const { origin, destination } = request ?? {};
  if (
    !origin?.coordinate ||
    !destination?.coordinate ||
    !isWithinServiceArea(origin.coordinate) ||
    !isWithinServiceArea(destination.coordinate)
  ) {
    throw failure("invalid-places", "Select two places inside the supported Cubao area.");
  }
  const direct = distanceMeters(origin.coordinate, destination.coordinate);
  if (direct < 1) throw failure("same-place", "Choose a different destination.");

  // For short journeys, offer an actual walking route instead of an
  // unnecessary ride. A distance on the map alone is not enough.
  if (direct <= 650 && typeof getWalkingRoutes === "function") {
    try {
      const walk = await walkingAlternative(
        request,
        { signal, getWalkingRoutes },
        "These places are close, so this trip is walking-only. No bus fare.",
        650,
      );
      if (walk) return walk;
    } catch (error) {
      checkCancelled(signal);
      if (error.name === "AbortError" || (error.code && error.code !== "commute/no-route"))
        throw error;
    }
  }

  const candidates = [];
  let geometryFailure = null;
  for (const definition of lines) {
    if (definition.mode !== "bus" || !Array.isArray(definition.path) || definition.path.length < 2)
      continue;
    const first = definition.stops[0],
      terminal = definition.stops.at(-1);
    const isAliMall = (place) =>
      /\bali\s*mall\b/i.test(place.name ?? "") || place.id === "ali-mall";
    const isGateway = (place) => /\bgateway(?:\s*mall)?(?:\s*[12])?\b/i.test(place.name ?? "");
    const returning = definition.direction === "anonas-bound";
    const aliReturnOrigin =
      isAliMall(origin) ||
      origin.id === BUS_TERMINAL.id ||
      (/\b(?:cubao terminal complex|araneta (?:city|center) bus (?:station|terminal))\b/i.test(
        origin.name ?? "",
      ) &&
        distanceMeters(origin.coordinate, BUS_TERMINAL.coordinate) <= 250);
    if (!returning && isAliMall(destination) && definition.id !== "bus-ali-mall") continue;
    if (returning && aliReturnOrigin && definition.id !== "bus-ali-mall-anonas") continue;
    if (returning && isGateway(origin) && definition.id !== "bus-gateway-anonas") continue;
    const terminalDestination =
      !returning &&
      (isAliMall(destination) ||
        (definition.id === "bus-cubao-gateway" && isGateway(destination))) &&
      distanceMeters(destination.coordinate, terminal.coordinate) <=
        (definition.terminalWalkMeters ?? definition.maxEgressMeters);
    const terminalOrigin =
      returning &&
      (aliReturnOrigin || (definition.id === "bus-gateway-anonas" && isGateway(origin))) &&
      distanceMeters(origin.coordinate, first.coordinate) <=
        (definition.terminalWalkMeters ?? definition.maxAccessMeters);
    const startCoordinate =
      terminalOrigin || origin.id === first.id ? first.coordinate : origin.coordinate;
    const endCoordinate =
      terminalDestination || destination.id === terminal.id
        ? terminal.coordinate
        : destination.coordinate;
    const maxAccess = terminalOrigin
      ? (definition.terminalWalkMeters ?? definition.maxAccessMeters)
      : definition.maxAccessMeters;
    const maxEgress = terminalDestination
      ? (definition.terminalWalkMeters ?? definition.maxEgressMeters)
      : definition.maxEgressMeters;
    const coarseStart = projectBusPoint(startCoordinate, definition.path);
    const coarseEnd = projectBusPoint(endCoordinate, definition.path);
    if (
      !coarseStart ||
      !coarseEnd ||
      distanceMeters(origin.coordinate, coarseStart.coordinate) > maxAccess ||
      distanceMeters(destination.coordinate, coarseEnd.coordinate) > maxEgress ||
      coarseStart.overshoot > 75 ||
      coarseEnd.overshoot > 75 ||
      coarseEnd.along <= coarseStart.along + 40
    )
      continue;
    let road = null;
    try {
      road = getBusGeometry ? await getBusGeometry(definition, { signal }) : null;
    } catch (error) {
      checkCancelled(signal);
      if (error.name === "AbortError") throw error;
      geometryFailure = error;
      continue;
    }
    checkCancelled(signal);
    const line = road ? { ...definition, path: road.polyline, geometryVerified: true } : definition;
    const start = projectBusPoint(startCoordinate, line.path);
    const end = projectBusPoint(endCoordinate, line.path);
    const accessDistance = distanceMeters(origin.coordinate, start.coordinate);
    const egressDistance = distanceMeters(destination.coordinate, end.coordinate);
    if (
      accessDistance > maxAccess ||
      egressDistance > maxEgress ||
      start.overshoot > 75 ||
      end.overshoot > 75 ||
      end.along <= start.along + 75 ||
      accessDistance + egressDistance >= direct
    )
      continue;
    const pointPlace = (projection, place, role) => ({
      id: `${line.id}:${role}:${projection.along.toFixed(0)}`,
      name: `${role === "board" ? "Boarding area" : "Drop-off area"} near ${place.name}`,
      address: "Along the selected bus route, Cubao, Quezon City",
      coordinate: projection.coordinate,
      source: "verified-local",
    });
    const boarding = terminalOrigin
      ? { ...first, coordinate: start.coordinate }
      : pointPlace(start, origin, "board");
    const alighting =
      distanceMeters(end.coordinate, line.path.at(-1)) < 20
        ? { ...terminal, coordinate: end.coordinate }
        : pointPlace(end, destination, "alight");
    candidates.push({
      line,
      boarding,
      alighting,
      start,
      end,
      score: accessDistance + egressDistance + (end.along - start.along) * 0.1,
    });
  }
  candidates.sort((a, b) => a.score - b.score);
  if (!candidates.length) {
    if (geometryFailure) throw geometryFailure;
    throw failure(
      "no-route",
      "No supported bus route for these places or this direction. Try Walk.",
    );
  }

  const { line, boarding, alighting, start, end } = candidates[0];
  const walking = async (a, b) => {
    if (distanceMeters(a.coordinate, b.coordinate) < 5) return null;
    if (typeof getWalkingRoutes !== "function") {
      throw failure(
        "no-route",
        "Walking directions to the bus stop are unavailable. Please try again.",
      );
    }
    const route = (
      await getWalkingRoutes({ origin: a, destination: b, preferredMode: "walk" }, { signal })
    )?.[0];
    if (
      !route?.steps?.length ||
      route.steps.some((step) => step.mode !== "walk" || !step.polyline?.length)
    ) {
      throw failure(
        "no-route",
        "A walking connection to the bus stop could not be found. Try Walk or another starting point.",
      );
    }
    const walkingDistance = route.steps.reduce(
      (sum, step) => sum + (step.distanceMeters ?? Infinity),
      0,
    );
    if (walkingDistance > 800)
      throw failure(
        "no-route",
        "The walking connection to this bus route is too long. Choose a closer street entrance or use Walk.",
      );
    return route;
  };
  const [access, egress] = await Promise.all([
    walking(origin, boarding),
    walking(alighting, destination),
  ]);
  checkCancelled(signal);

  const id = `local:${line.id}:${boarding.id}:${alighting.id}:${origin.id}:${destination.id}`;
  const polyline = ridePath(line, start, end);
  const placards = line.placards.join(" / ");
  const ride = {
    id: `${id}:ride`,
    mode: "bus",
    instruction:
      line.placards.length
        ? `Board a bus marked ${placards}.`
        : "Board a bus toward Anonas.",
    start: boarding.coordinate,
    end: alighting.coordinate,
    polyline,
    distanceMeters: Math.round(pathLength(polyline)),
    durationSeconds: null,
    lineName: line.name,
    placards: [...line.placards],
    direction: line.direction,
    boardingStop: boarding.name,
    alightingStop: alighting.name,
    stopCount: null,
    operatorId: line.operatorId,
    schematic: !line.geometryVerified,
  };
  const steps = [
    ...prepareBusWalkSteps(access?.steps ?? [], boarding.name, "access").map((step, index) => ({
      ...step,
      id: `${id}:access:${index}`,
    })),
    ride,
    ...prepareBusWalkSteps(egress?.steps ?? [], destination.name, "egress").map((step, index) => ({
      ...step,
      id: `${id}:egress:${index}`,
    })),
  ];
  const aircon = FARE_RULES["bus-city-aircon"];
  return [
    {
      id,
      origin,
      destination,
      preferredMode: "bus",
      actualModes: [...new Set(steps.map((step) => step.mode))],
      distanceMeters: steps.every((step) => Number.isFinite(step.distanceMeters))
        ? steps.reduce((sum, step) => sum + step.distanceMeters, 0)
        : null,
      durationSeconds: null,
      polyline: steps.flatMap((step) => step.polyline),
      steps,
      source: "verified-local",
      sources:
        access || egress || line.geometryVerified
          ? ["geoapify", "verified-local"]
          : ["verified-local"],
      calculatedAt: new Date().toISOString(),
      warnings: [
        `Aircon bus: ₱${aircon.regular.toFixed(2)} regular / ₱${aircon.discounted.toFixed(2)} discounted for the first 5 km. Bring valid ID for discounts.`,
        ...(!line.geometryVerified ? ["Dashed bus sections show an approximate route."] : []),
      ],
    },
  ];
}

async function walkingAlternative(
  request,
  { signal, getWalkingRoutes },
  explanation,
  maxMeters = Infinity,
) {
  checkCancelled(signal);
  if (typeof getWalkingRoutes !== "function")
    throw failure("no-route", "Walking directions are unavailable. Please try again.");
  const chosen = (
    await getWalkingRoutes(
      { origin: request.origin, destination: request.destination, preferredMode: "walk" },
      { signal },
    )
  )?.[0];
  checkCancelled(signal);
  if (
    !chosen?.steps?.length ||
    chosen.steps.some(
      (step) =>
        step.mode !== "walk" ||
        !step.polyline?.length ||
        step.polyline.some((point) => !isWithinServiceArea(point)),
    )
  ) {
    throw failure("no-route", "No walking route was found either. Try a nearby street entrance.");
  }
  const distance = chosen.steps.every(
    (step) => Number.isFinite(step.distanceMeters) && step.distanceMeters >= 0,
  )
    ? chosen.steps.reduce((sum, step) => sum + step.distanceMeters, 0)
    : null;
  if (Number.isFinite(maxMeters) && (distance === null || distance > maxMeters)) return null;
  const steps = prepareBusWalkSteps(chosen.steps, request.destination.name, "egress");
  const polyline = steps.flatMap((step) => step.polyline);
  if (polyline.length < 2)
    throw failure("no-route", "No usable walking route was found. Try a nearby street entrance.");
  return [
    {
      ...chosen,
      id: `${chosen.id ?? "geoapify"}:bus-walk:${request.origin.id}:${request.destination.id}`,
      origin: request.origin,
      destination: request.destination,
      preferredMode: "walk",
      requestedMode: "bus",
      actualModes: ["walk"],
      recommendation: explanation,
      steps,
      polyline,
      distanceMeters: distance,
      durationSeconds: steps.every(
        (step) => Number.isFinite(step.durationSeconds) && step.durationSeconds >= 0,
      )
        ? steps.reduce((sum, step) => sum + step.durationSeconds, 0)
        : null,
      source: chosen.source ?? "geoapify",
      calculatedAt: new Date().toISOString(),
      warnings: [],
    },
  ];
}

export async function getBusRoutes(request, options = {}) {
  try {
    return await planBusRide(request, options);
  } catch (error) {
    checkCancelled(options.signal);
    // Invalid inputs and provider failures keep their actual error. A valid
    // unsupported bus journey gets a real walking route, never a straight line.
    if (
      error.name === "AbortError" ||
      ![
        "commute/no-route",
        "commute/route-outside-service-area",
        "commute/unsupported-mode",
      ].includes(error.code)
    )
      throw error;
    return walkingAlternative(
      request,
      options,
      "No supported bus route for this journey. Showing a walking route; no bus fare.",
    );
  }
}

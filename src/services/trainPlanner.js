import {
  TRAIN_PLACE_BY_ID,
  TRAIN_PLACES,
  TRAIN_SOURCES,
  TRAIN_STATIONS,
} from "../data/trainNetwork";
import { TRAIN_FARE_SOURCES } from "../data/trainFares";
import { distanceMeters, isWithinServiceArea } from "./location";

const WALK_METERS_PER_SECOND = 1.15;
const WAIT_SECONDS = 7 * 60; // planning assumption only, NOT a live departure

function issue(code, message) {
  return Object.assign(new Error(message), { code: `commute/${code}` });
}

export function closestTrainStation(position, maxMeters = 450) {
  if (!position || !isWithinServiceArea(position)) return null;
  const nearest = TRAIN_STATIONS.map((station) => ({
    station, meters: distanceMeters(position, station.coordinate),
  })).sort((a, b) => a.meters - b.meters)[0];
  return nearest && nearest.meters <= maxMeters ? nearest : null;
}

function walk(from, to, label, id, extraSeconds = 0) {
  const meters = distanceMeters(from.coordinate, to.coordinate);
  return {
    id, mode: "walk", kind: "walk", instruction: label,
    start: from.coordinate, end: to.coordinate,
    polyline: [from.coordinate, to.coordinate],
    // A straight schematic connection is not an indoor walking route.
    schematic: true,
    distanceMeters: Math.round(meters),
    durationSeconds: Math.round(meters / WALK_METERS_PER_SECOND + extraSeconds),
    sourceUrl: TRAIN_SOURCES.walkway,
  };
}

function stationPlatform(place, headsign, id) {
  return {
    id, mode: "walk", kind: "platform",
    instruction: `Follow signs to the ${place.name} platform toward ${headsign}.`,
    start: place.coordinate, end: place.coordinate,
    polyline: [place.coordinate],
    distanceMeters: 0, durationSeconds: 90,
    sourceUrl: TRAIN_SOURCES.stations,
  };
}

function transferLabel(from, to) {
  const transfer = [from.id, to.id].includes("mrt3-cubao");
  if (transfer) {
    return `Walk to ${to.name} via Gateway Mall and the Farmers Plaza bridgeway.`;
  }
  return `Walk to ${to.name} using the signed Gateway Mall access.`;
}

// Offline route guide: only the bounded LRT-2 ride and Cubao walking links.
// No MRT-3 train segment can exist with just one in-boundary MRT station.
export function getTrainGuide(request) {
  const from = TRAIN_PLACE_BY_ID[request?.origin?.id];
  const to = TRAIN_PLACE_BY_ID[request?.destination?.id];
  if (!from || !to) {
    throw issue("train-outside-boundary", "Train Lines covers Anonas, the two Cubao stations and Gateway Mall only. Choose a listed place.");
  }
  if (from.id === to.id) {
    throw issue("same-place", "You are already at the selected destination. Choose another station or Gateway Mall.");
  }

  const id = `train-guide:${from.id}:${to.id}`;
  const steps = [];
  const fromAnonas = from.id === "lrt2-anonas";
  const toAnonas = to.id === "lrt2-anonas";
  const hasRide = fromAnonas || toAnonas;
  const startStation = TRAIN_PLACE_BY_ID[fromAnonas ? "lrt2-anonas" : "lrt2-cubao"];
  const endStation = TRAIN_PLACE_BY_ID[toAnonas ? "lrt2-anonas" : "lrt2-cubao"];
  const headsign = fromAnonas ? "Recto" : "Antipolo";

  const required = hasRide ? [startStation, endStation] : [from, to];
  if (required.some((place) => place.serviceStatus === "closed")) {
    throw issue("station-closed", "A required station is marked closed for maintenance. Check the operator advisory and choose another route.");
  }

  if (hasRide) {
    if (from.id !== startStation.id) {
      steps.push(walk(from, startStation, transferLabel(from, startStation), `${id}:access`, 180));
    }
    steps.push(stationPlatform(startStation, headsign, `${id}:platform`));
    steps.push({
      id: `${id}:ride`, mode: "train", kind: "ride", operatorId: "train-lrt2",
      lineName: "LRT-2", headsign,
      boardingStop: startStation.name, alightingStop: endStation.name,
      stopCount: 1,
      stationIds: [startStation.id, endStation.id],
      instruction: `Ride LRT-2 toward ${headsign} · alight at ${endStation.name} (1 stop).`,
      start: startStation.coordinate, end: endStation.coordinate,
      polyline: [startStation.coordinate, endStation.coordinate],
      schematic: true, distanceMeters: 1438, durationSeconds: 240,
      sourceUrl: TRAIN_SOURCES.stations,
    });
    if (to.id !== endStation.id) {
      steps.push(walk(endStation, to, transferLabel(endStation, to), `${id}:egress`, to.id === "mrt3-cubao" ? 180 : 60));
    }
  } else {
    steps.push(walk(from, to, transferLabel(from, to), `${id}:walk`, 120));
  }

  const totalSeconds = steps.reduce((sum, step) => sum + step.durationSeconds, 0) +
    (hasRide ? WAIT_SECONDS : 0);
  // Display only stations belonging to this selected journey; the complete
  // verified boundary remains in TRAIN_STATIONS and TRAIN_FARE_TABLE.
  const usedStationIds = new Set(steps.flatMap((step) => step.stationIds ?? []));
  if (from.line) usedStationIds.add(from.id);
  if (to.line) usedStationIds.add(to.id);
  return {
    id, origin: from, destination: to, preferredMode: "train",
    actualModes: [...new Set(steps.map((step) => step.mode))],
    steps,
    stationMarkers: TRAIN_STATIONS.filter((station) => usedStationIds.has(station.id)),
    coveredPlaces: TRAIN_PLACES,
    trainStopCount: hasRide ? 1 : 0,
    nextTrainDirection: hasRide ? `LRT-2 toward ${headsign}` : "No train boarding needed",
    distanceMeters: steps.reduce((sum, step) => sum + (step.distanceMeters || 0), 0),
    durationSeconds: totalSeconds,
    polyline: steps.flatMap((step) => step.polyline),
    source: "verified-local",
    sources: ["verified-local"],
    calculatedAt: new Date().toISOString(),
    warnings: [
      "Offline station and fare data. Walking and train polylines are schematic, not surveyed platform or indoor turn-by-turn paths.",
      "Travel time includes an assumed seven-minute wait, not a live arrival prediction. Check station displays for the next train.",
      "The transfer between MRT-3 and LRT-2 requires exiting one paid area and walking via the mall/bridgeway. No MRT-3 ride falls inside this boundary.",
      "Elevator, lift and maintenance status cannot be verified live. Check station staff and official advisories before traveling.",
      `Fare source effective ${TRAIN_FARE_SOURCES.lrt2.effectiveDate}; station list checked ${TRAIN_SOURCES.checkedAt}.`,
    ],
  };
}

// Compose the existing station guide with the same street-routing service used
// by Walk mode. Offline failures retain an explicitly schematic walking leg.
export async function getMultimodalTrainGuide(request, { signal, getWalkingRoutes } = {}) {
  const { origin, destination } = request ?? {};
  if (!origin?.coordinate || !destination?.coordinate ||
      !isWithinServiceArea(origin.coordinate) || !isWithinServiceArea(destination.coordinate)) {
    throw issue("train-outside-boundary", "Choose places inside the Cubao area.");
  }
  if (distanceMeters(origin.coordinate, destination.coordinate) < 10) {
    throw issue("same-place", "Choose a destination different from your starting point.");
  }
  const lineStations = [TRAIN_PLACE_BY_ID["lrt2-anonas"], TRAIN_PLACE_BY_ID["lrt2-cubao"]];
  const nearest = (place) => [...lineStations].sort((a, b) =>
    distanceMeters(place.coordinate, a.coordinate) - distanceMeters(place.coordinate, b.coordinate))[0];
  const first = nearest(origin);
  const last = nearest(destination);
  const id = `train-multimodal:${origin.id}:${destination.id}`;
  const warnings = [];
  const allSteps = [];
  let rail = null;

  async function appendWalk(from, to, label, suffix) {
    // A short station connector can be omitted, but a whole walking-only
    // journey still needs instructions and a drawable route.
    if (suffix !== "direct" && distanceMeters(from.coordinate, to.coordinate) < 25) return;
    if (signal?.aborted) throw Object.assign(new Error("Request cancelled."), { name: "AbortError" });
    try {
      if (!getWalkingRoutes) throw new Error("Walking directions unavailable");
      const results = await getWalkingRoutes({ origin: from, destination: to, preferredMode: "walk" }, { signal });
      const chosen = results[0];
      if (!chosen?.steps?.length) throw new Error("Walking directions unavailable");
      const legSteps = chosen.steps.map((step, i) => ({
        ...step, id: `${id}:${suffix}:${i}`, kind: "walk",
      }));
      // Geoapify treats each independent walking request as a complete trip.
      // Access to a station is only an intermediate leg of the whole journey.
      if (suffix === "access") {
        legSteps[legSteps.length - 1] = {
          ...legSteps[legSteps.length - 1],
          instruction: `Enter ${to.name}.`,
        };
      }
      allSteps.push(...legSteps);
    } catch (error) {
      if (signal?.aborted || error.name === "AbortError") throw error;
      allSteps.push(walk(from, to, label, `${id}:${suffix}`));
      warnings.push(`Walking leg ${suffix} is an approximate straight line (offline/unavailable walking directions).`);
    }
  }

  if (first.id !== last.id) {
    await appendWalk(origin, first, `Walk to ${first.name}.`, "access");
    rail = getTrainGuide({ origin: first, destination: last });
    allSteps.push(...rail.steps);
    await appendWalk(last, destination, `Walk to ${destination.name}.`, "egress");
  } else {
    // Train travel between the same boarding station would be a needless detour.
    await appendWalk(origin, destination, `Walk to ${destination.name}.`, "direct");
    warnings.push("Both places are closest to the same LRT-2 station; no train ride is needed.");
  }
  if (signal?.aborted) throw Object.assign(new Error("Request cancelled."), { name: "AbortError" });
  const usedStations = new Set(allSteps.flatMap((step) => step.stationIds ?? []));
  return {
    id, origin, destination, preferredMode: "train",
    actualModes: [...new Set(allSteps.map((step) => step.mode))],
    steps: allSteps,
    stationMarkers: TRAIN_STATIONS.filter((station) => usedStations.has(station.id)),
    coveredPlaces: TRAIN_PLACES,
    trainStopCount: rail?.trainStopCount ?? 0,
    nextTrainDirection: rail?.nextTrainDirection ?? "No train boarding needed",
    distanceMeters: Math.round(allSteps.reduce((sum, step) => sum + (step.distanceMeters || 0), 0)),
    durationSeconds: null,
    polyline: allSteps.flatMap((step) => step.polyline ?? []),
    source: warnings.some((item) => item.includes("approximate")) ? "mixed-schematic" : "geoapify-and-local",
    calculatedAt: new Date().toISOString(),
    warnings: [...warnings, ...(rail?.warnings ?? [])],
  };
}

import { getTransitRoutes } from "./transitRoutes";
import { distanceMeters, isWithinServiceArea } from "./location";
import { projectBusPoint } from "./busRoutes";
import { simplifyWalkingInstruction } from "./busPresentation";
import { placeMatchScore, normalizePlaceText } from "./placeSearch";
import { SERVICE_AREA } from "../data/serviceArea";

const API_BASE = "https://api.geoapify.com/v1";

function routeError(code, message) {
  return Object.assign(new Error(message), {
    code: `commute/${code}`,
  });
}

function isCoordinate(point) {
  return (
    Number.isFinite(point?.latitude) &&
    Number.isFinite(point?.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}

function fromGeoJSON(pair) {
  const point = {
    latitude: pair?.[1],
    longitude: pair?.[0],
  };

  if (!isCoordinate(point)) {
    throw routeError(
      "invalid-response",
      "The route contains invalid coordinates. Please try again.",
    );
  }

  return point;
}

const measurement = (value) =>
  Number.isFinite(value) && value >= 0 ? value : null;

async function requestGeoapify(path, params, signal, version = "v1") {
  const apiKey =
    process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY?.trim();

  if (
    !apiKey ||
    apiKey === "PASTE_YOUR_GEOAPIFY_KEY_HERE"
  ) {
    throw routeError(
      "missing-api-key",
      "Add EXPO_PUBLIC_GEOAPIFY_API_KEY to .env.local, then restart Expo.",
    );
  }

  const controller = new AbortController();
  const abort = () => controller.abort();

  if (signal?.aborted) controller.abort();

  signal?.addEventListener("abort", abort);

  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 15000);

  const query = Object.entries({ ...params, apiKey })
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");

  try {
    const response = await fetch(
      `${API_BASE.replace(/v1$/, version)}/${path}?${query}`,
      { signal: controller.signal },
    );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      throw routeError(
        "api-key-rejected",
        "Geoapify rejected the request. Check your API key and its restrictions in MyProjects.",
      );
    }

    if (response.status === 429) {
      throw routeError(
        "rate-limit",
        "Geoapify's usage limit was reached. Wait before trying again and check your project usage.",
      );
    }

    if (!response.ok) {
      throw routeError(
        "provider-error",
        "Geoapify could not complete this request. Try another nearby place or try again later.",
      );
    }

    const data = await response.json();

    if (!Array.isArray(data.features)) {
      throw routeError(
        "invalid-response",
        "Geoapify returned an unexpected result. Please try again.",
      );
    }

    return data;
  } catch (error) {
    if (signal?.aborted) {
      throw Object.assign(
        new Error("Request cancelled."),
        { name: "AbortError" },
      );
    }

    if (timedOut) {
      throw routeError(
        "timeout",
        "The request took too long. Check your internet connection and try again.",
      );
    }

    if (
      error.code?.startsWith("commute/") ||
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw routeError(
      "network",
      "Could not connect to Geoapify. Check your internet connection and try again.",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

const placeSearchCache = new Map();
const SEARCH_CACHE_MS = 120000;

export async function searchPlaces(query, { signal, onResults } = {}) {
  const text = String(query ?? "").trim();
  const cancelled = () => Object.assign(new Error("Request cancelled."), { name: "AbortError" });
  if (signal?.aborted) throw cancelled();
  if (text.length < 2) return [];
  const key = normalizePlaceText(text);
  const exact = placeSearchCache.get(key);
  if (exact && Date.now() - exact.at < SEARCH_CACHE_MS) {
    const cached = exact.places.map(place => ({ ...place, coordinate: { ...place.coordinate } }));
    onResults?.(cached);
    return cached;
  }
  // Reuse only previous live API results while the new live query runs.
  // There are no named landmarks, pinned search choices, or alias lists.
  const nearbyCached = [...placeSearchCache.values()].filter(value => Date.now() - value.at < SEARCH_CACHE_MS)
    .flatMap(value => value.places).filter(place => placeMatchScore(place.name, text) < 9);
  if (nearbyCached.length) {
    const unique = [...new Map(nearbyCached.map(place => [place.id, place])).values()];
    onResults?.(unique.slice(0, 15));
  }

  const bounds = SERVICE_AREA.bounds;
  const rectangle = [bounds.minLongitude, bounds.minLatitude, bounds.maxLongitude, bounds.maxLatitude].join(",");
  const params = {
    text, filter: `rect:${rectangle}|countrycode:ph`,
    bias: `proximity:${(bounds.minLongitude + bounds.maxLongitude) / 2},${(bounds.minLatitude + bounds.maxLatitude) / 2}`,
    limit: 20, lang: "en", format: "geojson",
  };
  const results = [];
  const seen = new Set();
  const ranked = () => [...results].sort((a, b) => placeMatchScore(a.name, text) - placeMatchScore(b.name, text)).slice(0, 15);
  const merge = data => {
    if (signal?.aborted) return;
    for (const feature of data.features) {
      const p = feature?.properties ?? {};
      const coordinate = { latitude: p.lat ?? feature?.geometry?.coordinates?.[1], longitude: p.lon ?? feature?.geometry?.coordinates?.[0] };
      if (!isCoordinate(coordinate) || !isWithinServiceArea(coordinate)) continue;
      const id = String(p.place_id ?? `${coordinate.latitude},${coordinate.longitude}`);
      const name = p.name || p.address_line1 || p.formatted;
      if (!name) continue;
      const duplicate = `${normalizePlaceText(name)}|${coordinate.latitude}|${coordinate.longitude}`;
      if (seen.has(id) || seen.has(duplicate)) continue;
      seen.add(id); seen.add(duplicate);
      results.push({ id, name, address: p.formatted || p.address_line2 || "", coordinate, source: "geoapify" });
    }
    if (results.length) onResults?.(ranked());
  };
  const tasks = [
    ["geocode/autocomplete", { ...params, type: "amenity" }, "v1"],
    ["geocode/autocomplete", params, "v1"],
    ["places", {
      categories: "commercial,catering,education,healthcare,public_transport,service,entertainment,leisure,accommodation",
      name: text, filter: `rect:${rectangle}`, bias: params.bias, limit: 20, lang: "en",
    }, "v2"],
  ];
  const responses = await Promise.allSettled(tasks.map(async ([path, queryParams, version]) => {
    const data = await requestGeoapify(path, queryParams, signal, version);
    merge(data);
    return data;
  }));
  if (signal?.aborted) throw cancelled();
  let failure = responses.find(response => response.status === "rejected")?.reason;
  if (!results.length && text.length >= 3 && !failure) {
    try { merge(await requestGeoapify("geocode/search", { ...params, text: `${text}, Quezon City` }, signal)); }
    catch (error) { failure = error; }
  }
  if (signal?.aborted) throw cancelled();
  if (!results.length && failure) throw failure;
  const places = ranked();
  if (places.length) {
    if (placeSearchCache.size >= 30) placeSearchCache.delete(placeSearchCache.keys().next().value);
    placeSearchCache.set(key, { at: Date.now(), places });
  }
  return places;
}

export async function getWalkingRoutes(
  request,
  { signal } = {},
) {
  const {
    origin,
    destination,
    preferredMode,
  } = request ?? {};

  if (preferredMode !== "walk") {
    throw routeError(
      "unsupported-mode",
      "Choose Walk for now. Bus, jeepney, and train routes are not connected yet.",
    );
  }

  if (
    !isCoordinate(origin?.coordinate) ||
    !isCoordinate(destination?.coordinate)
  ) {
    throw routeError(
      "invalid-places",
      "Select both places from the search suggestions first.",
    );
  }

  const a = origin.coordinate;
  const b = destination.coordinate;

  if (
    !isWithinServiceArea(a) ||
    !isWithinServiceArea(b)
  ) {
    throw routeError(
      "outside-service-area",
      "Choose a starting point and destination inside our current Cubao service area, including TIP QC and Anonas.",
    );
  }

  if (
    a.latitude === b.latitude &&
    a.longitude === b.longitude
  ) {
    throw routeError(
      "same-place",
      "Choose a destination different from your starting point.",
    );
  }

  const data = await requestGeoapify(
    "routing",
    {
      waypoints:
        `${a.latitude},${a.longitude}|` +
        `${b.latitude},${b.longitude}`,
      mode: "walk",
      units: "metric",
      lang: "en",
      format: "geojson",
      details: "instruction_details",
    },
    signal,
  );

  if (!data.features.length) {
    throw routeError(
      "no-route",
      "No walking route was found between these places. Try a nearby street or entrance.",
    );
  }

  return data.features.map((feature, routeIndex) => {
    const geometry = feature.geometry;

    const rawLines =
      geometry?.type === "MultiLineString"
        ? geometry.coordinates
        : geometry?.type === "LineString"
          ? [geometry.coordinates]
          : [];

    if (
      !Array.isArray(rawLines) ||
      !rawLines.length ||
      rawLines.some(
        (line) =>
          !Array.isArray(line) || !line.length,
      )
    ) {
      throw routeError(
        "invalid-response",
        "Geoapify returned an incomplete route. Please try again.",
      );
    }

    const lines = rawLines.map((line) =>
      line.map(fromGeoJSON),
    );

    const polyline = lines.flat();

    if (polyline.length < 2) {
      throw routeError(
        "no-route",
        "No walking route was found. Try another nearby place.",
      );
    }

    if (
      polyline.some(
        (point) => !isWithinServiceArea(point),
      )
    ) {
      throw routeError(
        "route-outside-service-area",
        "This walking route leaves our current service area. Try another route or choose closer places inside the area.",
      );
    }

    const properties = feature.properties ?? {};

    const id =
      `geoapify:${origin.id}:${destination.id}` +
      `:walk:${routeIndex}`;

    const steps = (properties.legs ?? []).flatMap(
      (leg, legIndex) => {
        const line = lines[legIndex];

        if (!line || !Array.isArray(leg.steps)) {
          throw routeError(
            "invalid-response",
            "The route instructions are incomplete. Please try again.",
          );
        }

        return leg.steps.map((step, index) => {
          const from = step.from_index;
          const to = step.to_index;

          if (
            !Number.isInteger(from) ||
            !Number.isInteger(to) ||
            from < 0 ||
            to < from ||
            to >= line.length
          ) {
            throw routeError(
              "invalid-response",
              "The route instructions are incomplete. Please try again.",
            );
          }

          const segment = line.slice(from, to + 1);

          return {
            id: `${id}:${legIndex}:${index}`,
            mode: "walk",
            instruction:
              simplifyWalkingInstruction(step.instruction?.text) ||
              "Continue walking along the route.",
            start: segment[0],
            end: segment[segment.length - 1],
            polyline: segment,
            distanceMeters: measurement(step.distance),
            durationSeconds: measurement(step.time),
            lineName: null,
            boardingStop: null,
            alightingStop: null,
            stopCount: null,
            operatorId: null,
          };
        });
      },
    );

    if (!steps.length) {
      throw routeError(
        "invalid-response",
        "The route has no walking instructions. Please try again.",
      );
    }

    return {
      id,
      origin,
      destination,
      preferredMode,
      actualModes: ["walk"],
      distanceMeters: measurement(properties.distance),
      durationSeconds: measurement(properties.time),
      polyline,
      steps,
      source: "geoapify",
      calculatedAt: new Date().toISOString(),
      warnings: [
        "Stay on public walkways and use designated crossings.",
      ],
    };
  });
}

// A bounded, session-only geometry cache avoids repeated routing requests.
const busGeometryCache = new Map();
export async function getBusGeometry(line, { signal } = {}) {
  const key = JSON.stringify([line.id, line.path]);
  if (signal?.aborted) throw Object.assign(new Error("Request cancelled."), { name: "AbortError" });
  const cached = busGeometryCache.get(key);
  if (cached && Date.now() - cached.at < 300000) return cached.value;
  const data = await requestGeoapify("routing", {
    waypoints: line.path.map(p => `${p.latitude},${p.longitude}`).join("|"),
    mode: "bus", units: "metric", format: "geojson",
    intermediate_waypoint_mode: "through_stop",
  }, signal);
  const geometry = data.features[0]?.geometry;
  const pairs = geometry?.type === "MultiLineString" ? geometry.coordinates.flat()
    : geometry?.type === "LineString" ? geometry.coordinates : [];
  const polyline = pairs.map(fromGeoJSON);
  // A road route can stay near the corridor yet double back for a U-turn.
  // Reject those loops before choosing boarding and alighting projections.
  let furthestAlong = 0;
  const doublesBack = polyline.some(point => {
    const along = projectBusPoint(point, line.path)?.along;
    if (!Number.isFinite(along)) return true;
    const backwards = furthestAlong - along > 65;
    furthestAlong = Math.max(furthestAlong, along);
    return backwards;
  });
  const length = points => points.slice(1).reduce((sum, p, i) => sum + distanceMeters(points[i], p), 0);
  // Reject shortcuts, large detours, and geometry outside the authored corridor.
  if (polyline.length < 2 || doublesBack || polyline.some(p => !isWithinServiceArea(p) || projectBusPoint(p, line.path)?.distance > 120) ||
      distanceMeters(polyline[0], line.path[0]) > 100 ||
      distanceMeters(polyline.at(-1), line.path.at(-1)) > 100 ||
      length(polyline) > length(line.path) * 1.6 ||
      line.path.some(p => projectBusPoint(p, polyline)?.distance > 100)) {
    throw routeError("no-route", "A road route within the supported bus corridor could not be found. Try Walk or another nearby place.");
  }
  const value = { polyline };
  if (busGeometryCache.size >= 4) busGeometryCache.delete(busGeometryCache.keys().next().value);
  busGeometryCache.set(key, { at: Date.now(), value });
  return value;
}

export async function getRoutes(
  request,
  options = {},
) {
  if (request?.preferredMode === "walk") {
    return getWalkingRoutes(request, options);
  }

  return getTransitRoutes(request, {
    ...options,
    getWalkingRoutes,
    getBusGeometry,
  });
}

import { isWithinServiceArea } from "./location";

const API_BASE = "https://api.geoapify.com/v1";

function routeError(code, message) {
  return Object.assign(new Error(message), { code: `commute/${code}` });
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
  const point = { latitude: pair?.[1], longitude: pair?.[0] };

  if (!isCoordinate(point))
    throw routeError(
      "invalid-response",
      "The route contains invalid coordinates. Please try again.",
    );

  return point;
}

const measurement = (value) =>
  Number.isFinite(value) && value >= 0 ? value : null;

async function requestGeoapify(path, params, signal) {
  const apiKey = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY?.trim();

  if (!apiKey || apiKey === "PASTE_YOUR_GEOAPIFY_KEY_HERE") {
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
    const response = await fetch(`${API_BASE}/${path}?${query}`, {
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      throw routeError(
        "api-key-rejected",
        "Geoapify rejected the request. Check your API key and its restrictions in MyProjects.",
      );
    }

    if (response.status === 429)
      throw routeError(
        "rate-limit",
        "Geoapify's usage limit was reached. Wait before trying again and check your project usage.",
      );

    if (!response.ok)
      throw routeError(
        "provider-error",
        "Geoapify could not complete this request. Try another nearby place or try again later.",
      );

    const data = await response.json();

    if (!Array.isArray(data.features))
      throw routeError(
        "invalid-response",
        "Geoapify returned an unexpected result. Please try again.",
      );

    return data;
  } catch (error) {
    if (signal?.aborted)
      throw Object.assign(new Error("Request cancelled."), {
        name: "AbortError",
      });

    if (timedOut)
      throw routeError(
        "timeout",
        "The request took too long. Check your internet connection and try again.",
      );

    if (error.code?.startsWith("commute/") || error.name === "AbortError")
      throw error;

    throw routeError(
      "network",
      "Could not connect to Geoapify. Check your internet connection and try again.",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export async function searchPlaces(query, { signal } = {}) {
  let text = String(query ?? "").trim();

  if (text.length < 3) return [];

  if (/^tip\s*(qc|quezon city)?$/i.test(text))
    text = "Technological Institute of the Philippines Quezon City";

  const data = await requestGeoapify(
    "geocode/autocomplete",
    {
      text,
      filter: "countrycode:ph",
      bias: "proximity:121.0603,14.6255",
      limit: 5,
      lang: "en",
      format: "geojson",
    },
    signal,
  );

  const seen = new Set();

  return data.features.flatMap((feature) => {
    const p = feature.properties ?? {};
    const point = { latitude: p.lat, longitude: p.lon };

    if (!isCoordinate(point)) return [];

    const id = String(p.place_id ?? `${point.latitude},${point.longitude}`);

    if (seen.has(id)) return [];

    seen.add(id);

    return [
      {
        id,
        name: p.name || p.address_line1 || p.formatted || text,
        address: p.formatted || p.address_line2 || "",
        coordinate: point,
        source: "geoapify",
      },
    ];
  });
}

export async function getRoutes(request, { signal } = {}) {
  const { origin, destination, preferredMode } = request ?? {};

  if (preferredMode !== "walk")
    throw routeError(
      "unsupported-mode",
      "Choose Walk for now. Bus, jeepney, and train routes are not connected yet.",
    );

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

  if (!isWithinServiceArea(a) || !isWithinServiceArea(b)) {
    throw routeError(
      "outside-service-area",
      "Choose a starting point and destination inside our current Cubao demo area, including TIP QC and Anonas.",
    );
  }

  if (a.latitude === b.latitude && a.longitude === b.longitude)
    throw routeError(
      "same-place",
      "Choose a destination different from your starting point.",
    );

  const data = await requestGeoapify(
    "routing",
    {
      waypoints: `${a.latitude},${a.longitude}|${b.latitude},${b.longitude}`,
      mode: "walk",
      units: "metric",
      lang: "en",
      format: "geojson",
      details: "instruction_details",
    },
    signal,
  );

  if (!data.features.length)
    throw routeError(
      "no-route",
      "No walking route was found between these places. Try a nearby street or entrance.",
    );

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
      rawLines.some((line) => !Array.isArray(line) || !line.length)
    ) {
      throw routeError(
        "invalid-response",
        "Geoapify returned an incomplete route. Please try again.",
      );
    }

    const lines = rawLines.map((line) => line.map(fromGeoJSON));
    const polyline = lines.flat();

    if (polyline.length < 2)
      throw routeError(
        "no-route",
        "No walking route was found. Try another nearby place.",
      );

    if (polyline.some((point) => !isWithinServiceArea(point))) {
      throw routeError(
        "route-outside-service-area",
        "This walking route leaves our current demo area. Try another route or choose closer places inside the area.",
      );
    }

    const properties = feature.properties ?? {};
    const id = `geoapify:${origin.id}:${destination.id}:walk:${routeIndex}`;

    const steps = (properties.legs ?? []).flatMap((leg, legIndex) => {
      const line = lines[legIndex];

      if (!line || !Array.isArray(leg.steps))
        throw routeError(
          "invalid-response",
          "The route instructions are incomplete. Please try again.",
        );

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
            step.instruction?.text || "Continue walking along the route.",
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
    });

    if (!steps.length)
      throw routeError(
        "invalid-response",
        "The route has no walking instructions. Please try again.",
      );

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
        "This route uses our draft service area. The final boundary is not verified.",
      ],
    };
  });
}
const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const load = require("./helpers/source-loader.cjs")();
const root = (f) => path.resolve(__dirname, "../src", f);
const { TRANSIT_LINES } = load(root("data/transitCatalog.js"));
const { getTransitRoutes } = load(root("services/routing/transitRoutes.js"));
const { distanceMeters } = load(root("services/location.js"));
const { quoteFare } = load(root("services/fares.js"));
const line = TRANSIT_LINES.find((l) => l.id === "jeep-tip-ali-traditional");
const lerp = (a, b, t) => ({
  latitude: a.latitude + (b.latitude - a.latitude) * t,
  longitude: a.longitude + (b.longitude - a.longitude) * t,
});
const place = (id, coordinate) => ({ id, name: id, coordinate, source: "verified-local" });
const walk = async ({ origin, destination }) => [
  {
    id: "walking",
    preferredMode: "walk",
    origin,
    destination,
    steps: [
      {
        id: "walk",
        kind: "walk",
        mode: "walk",
        start: origin.coordinate,
        end: destination.coordinate,
        polyline: [origin.coordinate, destination.coordinate],
        distanceMeters: distanceMeters(origin.coordinate, destination.coordinate),
        durationSeconds: 60,
        instruction: "You have arrived at your destination.",
      },
    ],
  },
];
const options = {
  lines: [line],
  getWalkingRoutes: walk,
  getBusGeometry: async (definition) => ({ polyline: definition.path }),
};
const request = (origin, destination, operatorId = line.operatorId) => ({
  origin,
  destination,
  preferredMode: "jeep",
  operatorId,
});

test("jeep mid-corridor journeys clip both ride ends instead of drawing the entire line", async () => {
  const origin = place("near-origin", lerp(line.path[0], line.path[1], 0.5));
  const destination = place("near-destination", lerp(line.path.at(-2), line.path.at(-1), 0.5));
  const [route] = await getTransitRoutes(request(origin, destination), options);
  const ride = route.steps.find((s) => s.mode === "jeep");
  assert.ok(ride);
  assert.ok(distanceMeters(ride.polyline[0], origin.coordinate) < 1);
  assert.ok(distanceMeters(ride.polyline.at(-1), destination.coordinate) < 1);
  assert.ok(distanceMeters(ride.polyline[0], line.path[0]) > 20);
  assert.ok(distanceMeters(ride.polyline.at(-1), line.path.at(-1)) > 20);
  assert.equal(ride.schematic, false);
  assert.equal(route.operatorId, "jeep-traditional");
  assert.ok(Number.isFinite(route.distanceMeters));
});

test("jeep return journeys use the separate return corridor and reverse headsign", async () => {
  const [route] = await getTransitRoutes(request(line.stops[1], line.stops[0]), options);
  const ride = route.steps.find((s) => s.mode === "jeep");
  assert.equal(ride.direction, "anonas-bound");
  assert.match(ride.instruction, /Cogeo \/ Parang \/ Marikina/);
  assert.ok(distanceMeters(ride.start, line.stops[1].coordinate) < 1);
  assert.ok(distanceMeters(ride.end, line.stops[0].coordinate) < 1);
});

test("short jeep selections become walking-only with no jeepney fare", async () => {
  const a = place("a", line.path[0]);
  const b = place("b", lerp(line.path[0], line.path[1], 0.3));
  const [route] = await getTransitRoutes(request(a, b), options);
  assert.equal(route.preferredMode, "walk");
  assert.equal(route.requestedMode, "jeep");
  assert.ok(route.steps.every((s) => s.mode === "walk"));
  assert.match(route.recommendation, /No jeepney fare/);
  assert.equal((await quoteFare(route, "regular")).selectedTotal, 0);
});

test("unsupported jeep journey returns a real walking route, never a fabricated jeep ride", async () => {
  const a = place("off-corridor", { latitude: 14.635, longitude: 121.058 });
  const [route] = await getTransitRoutes(request(a, line.stops[1]), options);
  assert.equal(route.preferredMode, "walk");
  assert.equal(route.requestedMode, "jeep");
  assert.match(route.recommendation, /No supported jeepney route/);
  assert.ok(route.polyline.length >= 2);
});

test("aborted jeep road geometry never becomes a walking fallback", async () => {
  const abort = new AbortController();
  let walkingCalls = 0;
  await assert.rejects(
    getTransitRoutes(request(...line.stops), {
      ...options,
      signal: abort.signal,
      getWalkingRoutes: async (r) => {
        walkingCalls++;
        return walk(r);
      },
      getBusGeometry: async () => {
        abort.abort();
        throw Object.assign(new Error("cancelled"), { name: "AbortError" });
      },
    }),
    { name: "AbortError" },
  );
  assert.equal(walkingCalls, 0);
});

test("failed jeep walking connections cannot return a partial ride", async () => {
  const origin = place("offset", {
    latitude: line.stops[0].coordinate.latitude + 0.0003,
    longitude: line.stops[0].coordinate.longitude,
  });
  await assert.rejects(
    getTransitRoutes(request(origin, line.stops[1]), {
      ...options,
      getWalkingRoutes: async () => {
        throw Object.assign(new Error("provider unavailable"), {
          code: "commute/provider-unavailable",
        });
      },
    }),
    { code: "commute/provider-unavailable" },
  );
});

test("modern jeep selections retain their operator and fare after road clipping", async () => {
  const modern = TRANSIT_LINES.find((l) => l.id === "jeep-tip-ali-modern");
  const [route] = await getTransitRoutes(request(...modern.stops, modern.operatorId), {
    ...options,
    lines: [modern],
  });
  assert.equal(route.operatorId, "jeep-modern");
  assert.equal(route.steps.find((s) => s.mode === "jeep").operatorId, "jeep-modern");
  assert.equal((await quoteFare(route, "regular")).selectedTotal, 17);
});

test("provider walking steps without a kind become guided jeep access and egress steps", async () => {
  const origin = place("offset-origin", {
    latitude: line.stops[0].coordinate.latitude + 0.0003,
    longitude: line.stops[0].coordinate.longitude,
  });
  const destination = place("offset-destination", {
    latitude: line.stops[1].coordinate.latitude + 0.0003,
    longitude: line.stops[1].coordinate.longitude,
  });
  const [route] = await getTransitRoutes(request(origin, destination), {
    ...options,
    getWalkingRoutes: async (input) => {
      const result = await walk(input);
      for (const step of result[0].steps) delete step.kind;
      return result;
    },
  });
  assert.equal(route.steps[0].mode, "walk");
  assert.equal(route.steps[0].kind, "walk");
  assert.equal(route.steps.at(-1).mode, "walk");
  assert.equal(route.steps.at(-1).kind, "walk");
  assert.doesNotMatch(route.steps[0].instruction, /arrived/i);
});

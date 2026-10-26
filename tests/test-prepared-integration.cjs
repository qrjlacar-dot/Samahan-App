const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");
const root = path.resolve(__dirname, "..");
const load = createLoader();
const { parseJourneyParam } = load(path.join(root, "src/services/journeys.js"));
const { updateArrival, updateOffRoute } = load(path.join(root, "src/services/tripArrival.js"));
const { getTransitRoutes } = load(path.join(root, "src/services/routing/transitRoutes.js"));
const { getWalkingProgress } = load(path.join(root, "src/services/walkingProgress.js"));
const a = { latitude: 14.625, longitude: 121.06 };
const b = { latitude: 14.626, longitude: 121.06 };
const place = (id, coordinate = a) => ({
  id,
  name: id,
  address: "Cubao",
  coordinate,
  source: "geoapify",
});
const journey = {
  origin: place("origin"),
  destination: place("destination", b),
  preferredMode: "walk",
  ticketType: "regular",
};
const route = {
  ...journey,
  id: "walk",
  calculatedAt: "one",
  distanceMeters: 111,
  durationSeconds: 90,
  polyline: [a, b],
  steps: [
    {
      id: "step",
      mode: "walk",
      polyline: [a, b],
      distanceMeters: 111,
      durationSeconds: 90,
      instruction: "Continue",
    },
  ],
};
const now = Date.now();
const fix = (coordinate, timestamp = now, accuracyMeters = 10) => ({
  status: "ready",
  inServiceArea: true,
  position: { ...coordinate, timestamp: new Date(timestamp).toISOString(), accuracyMeters },
});

test("saved Geoapify journeys parse and preserve their selected choices", () => {
  const parsed = parseJourneyParam(JSON.stringify(journey));
  assert.equal(parsed.origin.source, "geoapify");
  assert.equal(parsed.preferredMode, "walk");
  assert.equal(parsed.destination.coordinate.latitude, b.latitude);
  assert.equal(parseJourneyParam([JSON.stringify(journey)]).origin.id, "origin");
});
test("invalid, oversized, and malformed journey parameters are rejected", () => {
  for (const item of [
    "{",
    "a".repeat(20001),
    JSON.stringify({ ...journey, preferredMode: "teleport" }),
    JSON.stringify({ ...journey, origin: place("bad", { latitude: 91, longitude: 0 }) }),
  ])
    assert.equal(parseJourneyParam(item), null);
});
test("walking progress advances and holds its estimate on an invalid fix", () => {
  const first = getWalkingProgress(route, fix(a), null, now);
  const middle = getWalkingProgress(
    route,
    fix({ latitude: 14.6255, longitude: 121.06 }),
    first,
    now,
  );
  assert.ok(middle.remainingDistanceMeters < first.remainingDistanceMeters);
  assert.equal(getWalkingProgress(route, { status: "denied" }, middle, now), middle);
});
test("arrival needs distinct accurate fixes spanning five seconds", () => {
  const progress = getWalkingProgress(route, fix(b), null, now);
  const first = updateArrival(route, fix(b), progress, null, a, now);
  assert.equal(first.arrived, false);
  assert.equal(updateArrival(route, fix(b), progress, first, a, now), first);
  const final = updateArrival(route, fix(b, now + 5000), progress, first, a, now + 5000);
  assert.equal(final.arrived, true);
});
test("arrival rejects stale fixes, weak accuracy, and missing progress", () => {
  const progress = getWalkingProgress(route, fix(b), null, now);
  assert.equal(updateArrival(route, fix(b, now - 31000), progress, null, a, now), null);
  assert.equal(updateArrival(route, fix(b, now, 35), progress, null, a, now), null);
  assert.equal(updateArrival(route, fix(b), null, null, a, now), null);
});
test("starting at the destination without moving does not finish a trip", () => {
  const progress = getWalkingProgress(route, fix(b), null, now);
  assert.equal(updateArrival(route, fix(b), progress, null, b, now), null);
});
test("off-route confirmation ignores repeated timestamps and needs five seconds", () => {
  const first = updateOffRoute(null, fix(a).position);
  assert.equal(updateOffRoute(first, fix(a).position), first);
  assert.equal(updateOffRoute(first, fix(a, now + 5000).position).reroute, true);
});
test("Geoapify favorites save, reload, and deduplicate", async () => {
  const data = new Map();
  const storage = {
    __esModule: true,
    default: {
      getItem: async (key) => data.get(key) ?? null,
      setItem: async (key, value) => data.set(key, value),
    },
  };
  const api = createLoader({ "@react-native-async-storage/async-storage": storage })(
    path.join(root, "src/services/favorites.js"),
  );
  const first = await api.saveFavorite("account", journey);
  const second = await api.saveFavorite("account", journey);
  assert.equal(first.id, second.id);
  assert.equal((await api.loadFavorites("account")).length, 1);
});
const walking = async (request) => [
  {
    ...route,
    origin: request.origin,
    destination: request.destination,
    steps: [
      { ...route.steps[0], polyline: [request.origin.coordinate, request.destination.coordinate] },
    ],
  },
];
const anonas = place("anonas", { latitude: 14.628168930096757, longitude: 121.06384272314689 });
const cubao = place("cubao", { latitude: 14.62322724862286, longitude: 121.05296361719164 });
test("LRT preview includes the selected ride with boarding and alighting stations", async () => {
  const [planned] = await getTransitRoutes(
    { origin: anonas, destination: cubao, preferredMode: "train" },
    { getWalkingRoutes: walking },
  );
  const ride = planned.steps.find((step) => step.mode === "train");
  assert.ok(ride.boardingStop.includes("Anonas"));
  assert.ok(ride.alightingStop.includes("Cubao"));
  assert.ok(ride.instruction.includes("Recto"));
  assert.equal(ride.schematic, true);
  assert.equal(planned.durationSeconds, null);
});
test("reverse LRT preview changes direction and station order", async () => {
  const [planned] = await getTransitRoutes(
    { origin: cubao, destination: anonas, preferredMode: "train" },
    { getWalkingRoutes: walking },
  );
  const ride = planned.steps.find((step) => step.mode === "train");
  assert.ok(ride.boardingStop.includes("Cubao"));
  assert.ok(ride.instruction.includes("Antipolo"));
});
test("unlisted jeep routes remain unavailable", async () => {
  await assert.rejects(
    getTransitRoutes(
      { ...journey, preferredMode: "jeep", operatorId: "jeep-unlisted" },
      { getWalkingRoutes: walking },
    ),
    (error) => error.code === "commute/unsupported-mode",
  );
});
test("cancelled transit requests do not return a route", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    getTransitRoutes(
      { origin: anonas, destination: cubao, preferredMode: "train" },
      { getWalkingRoutes: walking, signal: controller.signal },
    ),
    (error) => error.name === "AbortError",
  );
});

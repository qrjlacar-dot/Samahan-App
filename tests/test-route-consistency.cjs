const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");
const fs = require("node:fs");
const createLoader = require("./helpers/source-loader.cjs");
const fixture = require("./helpers/guided-fixture.cjs");
const root = path.resolve(__dirname, "../src");
const a = { latitude: 14.625, longitude: 121.06 },
  b = { latitude: 14.627, longitude: 121.06 };
const place = (name, coordinate) => ({
  id: name,
  name,
  address: "Cubao",
  source: "geoapify",
  coordinate,
});
const route = (mode, kind = "ride") => ({
  id: `route:${mode}`,
  preferredMode: mode,
  origin: place("A", a),
  destination: place("B", b),
  polyline: [a, b],
  distanceMeters: 222,
  steps: [
    {
      id: "leg",
      mode: kind === "ride" ? mode : "walk",
      kind,
      start: a,
      end: b,
      polyline: [a, b],
      distanceMeters: 222,
      instruction: "Continue to B.",
      boardingStop: "A",
      alightingStop: "B",
    },
  ],
});
for (const mode of ["train", "jeep"]) {
  test(`${mode}: failed native watcher startup cannot create an active session`, async () => {
    const f = fixture(mode, route(mode), { trackingResult: false });
    try {
      assert.equal(await f.h.result.start(), false);
      f.h.flush();
      assert.equal(f.h.result.state, "idle");
      assert.equal(f.h.result.open, false);
      assert.equal(f.completed.length, 0);
      assert.equal(f.stopped(), 1);
    } finally {
      f.h.dispose();
    }
  });
  test(`${mode}: weak or missing GPS pauses, then a good reading clears the warning and resumes`, async () => {
    const f = fixture(mode, route(mode));
    try {
      await f.h.result.start();
      f.h.flush();
      f.move(1000, a, 100);
      assert.equal(f.h.result.state, "paused");
      assert.equal(f.h.result.following, false);
      f.move(1000, a);
      assert.equal(f.h.result.state, "active");
      assert.equal(f.h.result.message, "");
      f.h.props.snapshot = { status: "unavailable", position: null };
      f.h.flush();
      assert.equal(f.h.result.state, "paused");
      f.move(1000, a);
      assert.equal(f.h.result.state, "active");
      assert.equal(f.h.result.message, "");
    } finally {
      f.h.dispose();
    }
  });
  test(`${mode}: the freshness timer pauses when no new GPS samples arrive`, async () => {
    const f = fixture(mode, route(mode));
    try {
      await f.h.result.start();
      f.h.flush();
      f.move(31000);
      assert.equal(f.h.result.state, "paused");
      assert.equal(f.h.result.actionLabel, null);
    } finally {
      f.h.dispose();
    }
  });
  test(`${mode}: GPS and manual Next cannot silently board, alight or finish a trip`, async () => {
    const f = fixture(mode, route(mode));
    try {
      await f.h.result.start();
      f.h.flush();
      assert.equal(f.h.result.actionLabel, "I've boarded");
      f.move(6000, b);
      f.move(6000, b);
      assert.equal(f.h.result.state, "active");
      assert.equal(f.completed.length, 0);
      assert.equal(await f.h.result.advance(), false);
      f.h.flush();
      assert.equal(f.completed.length, 0);
    } finally {
      f.h.dispose();
    }
  });
  test(`${mode}: a final walking step requires distinct accurate arrival readings`, async () => {
    const f = fixture(mode, route(mode, "walk"));
    try {
      await f.h.result.start();
      f.h.flush();
      f.h.props.snapshot = { status: "unavailable", position: null };
      f.h.flush();
      assert.equal(f.h.result.advance(), false);
      f.h.flush();
      assert.equal(f.completed.length, 0);
      f.move(6000, b);
      assert.equal(f.h.result.state, "active");
      f.move(6000, b);
      assert.equal(f.h.result.state, "arrived");
      assert.equal(f.completed.length, 1);
      f.h.result.cancel();
      f.h.flush();
      assert.equal(f.cancelled.length, 0);
    } finally {
      f.h.dispose();
    }
  });
  test(`${mode}: a pending boarding confirmation cannot revive a cancelled trip`, async () => {
    let resolve;
    const f = fixture(mode, route(mode));
    try {
      await f.h.result.start();
      f.h.flush();
      f.h.props.refreshLocation = () => new Promise((done) => (resolve = done));
      f.h.flush();
      const pending = f.h.result.confirmStage();
      f.h.result.cancel();
      f.h.flush();
      resolve(f.fix(a));
      assert.equal(await pending, false);
      f.h.flush();
      assert.equal(f.h.result.state, "idle");
      assert.equal(f.cancelled.length, 1);
    } finally {
      f.h.dispose();
    }
  });
}
test("shared GPS leases survive ending one owner and recover after a native stream error", async () => {
  const loc = createLoader()(path.join(root, "services/location.js"));
  let onError,
    watches = 0,
    removes = 0;
  loc.__configureLocationForTests({
    native: {
      Accuracy: { High: 4 },
      getForegroundPermissionsAsync: async () => ({ status: "granted" }),
      hasServicesEnabledAsync: async () => true,
      getCurrentPositionAsync: async () => ({
        coords: { ...a, accuracy: 10 },
        timestamp: Date.now(),
      }),
      watchPositionAsync: async (options, callback, error) => {
        onError = error;
        watches++;
        return {
          remove() {
            removes++;
          },
        };
      },
    },
  });
  const tracker = loc.createLocationTracker(() => {}),
    map = {},
    trip = {};
  try {
    assert.deepEqual(
      await Promise.all([
        tracker.start({ owner: map }),
        tracker.start({ owner: trip }),
      ]),
      [true, true],
    );
    assert.equal(watches, 1);
    tracker.stop(trip);
    assert.equal(tracker.isTracking(), true);
    assert.equal(removes, 0);
    onError("Provider interrupted");
    assert.equal(tracker.isTracking(), false);
    assert.equal(tracker.hasOwners(), true);
    await tracker.resume();
    assert.equal(tracker.isTracking(), true);
    assert.equal(watches, 2);
    tracker.stop(map);
    assert.equal(tracker.isTracking(), false);
    assert.equal(removes, 2);
  } finally {
    tracker.dispose();
  }
});
test("a failed first location read reports false rather than claiming a running GPS watcher", async () => {
  const loc = createLoader()(path.join(root, "services/location.js"));
  loc.__configureLocationForTests({
    native: {
      getForegroundPermissionsAsync: async () => ({ status: "granted" }),
      hasServicesEnabledAsync: async () => true,
      getCurrentPositionAsync: async () => {
        throw Error("No signal");
      },
    },
  });
  const tracker = loc.createLocationTracker(() => {});
  try {
    assert.equal(await tracker.start(), false);
    assert.equal(tracker.isTracking(), false);
  } finally {
    tracker.dispose();
  }
});
test("policy entry points are present before either sign-in method and in Profile", () => {
  for (const file of [
    "app/(auth)/login.jsx",
    "app/(auth)/sign-up.jsx",
    "app/(tabs)/profile.jsx",
  ])
    assert.match(fs.readFileSync(path.join(root, file), "utf8"), /<LegalLinks/);
  const links = fs.readFileSync(
    path.join(root, "components/LegalLinks.jsx"),
    "utf8",
  );
  assert.match(links, /Privacy Policy/);
  assert.match(links, /Terms of Service/);
});

test("jeepney road geometry follows the selected corridor and keeps the existing instruction", async () => {
  const load = createLoader();
  const { TRANSIT_LINES } = load(path.join(root, "data/transitCatalog.js"));
  const { getTransitRoutes } = load(
    path.join(root, "services/routing/transitRoutes.js"),
  );
  const line = TRANSIT_LINES.find((x) => x.id === "jeep-tip-ali-traditional");
  let requested;
  const [result] = await getTransitRoutes(
    {
      origin: line.stops[0],
      destination: line.stops[1],
      preferredMode: "jeep",
      operatorId: line.operatorId,
    },
    {
      getWalkingRoutes: async () => {
        throw Error("Unnecessary connector");
      },
      getBusGeometry: async (definition) => {
        requested = definition;
        return { polyline: definition.path };
      },
    },
  );
  const ride = result.steps.find((s) => s.mode === "jeep");
  assert.ok(
    requested.path.some((p) => Math.abs(p.latitude - 14.62119) < 0.00001),
  );
  assert.equal(ride.schematic, false);
  assert.ok(ride.distanceMeters > 1000);
  assert.equal(ride.instruction, "Board Traditional Jeepney marked Ali Mall.");
  assert.equal(result.preferredMode, "jeep");
});
test("jeepney geometry failure cannot silently return a fabricated road route", async () => {
  const load = createLoader();
  const { TRANSIT_LINES } = load(path.join(root, "data/transitCatalog.js"));
  const { getTransitRoutes } = load(
    path.join(root, "services/routing/transitRoutes.js"),
  );
  const line = TRANSIT_LINES.find((x) => x.id === "jeep-tip-ali-modern");
  await assert.rejects(
    getTransitRoutes(
      {
        origin: line.stops[0],
        destination: line.stops[1],
        preferredMode: "jeep",
        operatorId: line.operatorId,
      },
      {
        getWalkingRoutes: async () => [],
        getBusGeometry: async () => {
          throw Error("Provider unavailable");
        },
      },
    ),
    /Provider unavailable/,
  );
});

test("a verified jeepney road leg reports distance along its turns, not across the block", () => {
  const { getGuidedProgress } = createLoader()(
    path.join(root, "services/guidedProgress.js"),
  );
  const corner = { latitude: b.latitude, longitude: a.longitude };
  const end = { latitude: b.latitude, longitude: a.longitude + 0.002 };
  const r = route("jeep");
  r.destination = place("B", end);
  r.polyline = [a, corner, end];
  r.steps[0] = {
    ...r.steps[0],
    end,
    polyline: r.polyline,
    schematic: false,
    distanceMeters: 440,
  };
  const snapshot = {
    status: "ready",
    inServiceArea: true,
    position: { ...a, accuracyMeters: 10, timestamp: new Date().toISOString() },
  };
  const progress = getGuidedProgress(r, 0, snapshot);
  assert.equal(progress.remainingDistanceMeters, 440);
});

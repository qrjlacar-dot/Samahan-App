const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");

const load = createLoader();
const root = (file) => path.resolve(__dirname, "../src/" + file);
const {
  TRAIN_PLACES, TRAIN_STATIONS,
} = load(root("data/trainNetwork.js"));
const { TRAIN_FARE_TABLE, TRAIN_FARE_SOURCES } = load(root("data/trainFares.js"));
const { getTrainGuide, getMultimodalTrainGuide, closestTrainStation } = load(root("services/trainPlanner.js"));
const { quoteFare } = load(root("services/fares.js"));

const byId = Object.fromEntries(TRAIN_PLACES.map((place) => [place.id, place]));
const guide = (a, b) => getTrainGuide({ origin: byId[a], destination: byId[b] });
const allStations = ["lrt2-anonas", "lrt2-cubao", "mrt3-cubao"];

test("all three railway stations and Gateway remain in the offline fare matrix", () => {
  assert.deepEqual(Array.from(TRAIN_STATIONS, (p) => p.id), allStations);
  assert.equal(TRAIN_PLACES.length, 4);
  for (const origin of TRAIN_PLACES) {
    assert.deepEqual(Object.keys(TRAIN_FARE_TABLE[origin.id]), Array.from(TRAIN_PLACES, (p) => p.id));
    for (const destination of TRAIN_PLACES) {
      const value = TRAIN_FARE_TABLE[origin.id][destination.id];
      assert.ok(Number.isFinite(value.regular));
      assert.ok(Number.isFinite(value.discounted));
      if (origin.id !== destination.id) {
        const route = guide(origin.id, destination.id);
        const visited = new Set(route.steps.flatMap((step) => step.stationIds ?? []));
        if (origin.line) visited.add(origin.id);
        if (destination.line) visited.add(destination.id);
        assert.deepEqual(Array.from(route.stationMarkers, (p) => p.id),
          allStations.filter((id) => visited.has(id)));
      }
    }
  }
});

test("all three rail pins use their mapped station footprints", () => {
  const mappedCenters = {
    "lrt2-anonas": { latitude: 14.62799, longitude: 121.06472 },
    "lrt2-cubao": { latitude: 14.62286, longitude: 121.05313 },
    "mrt3-cubao": { latitude: 14.61947, longitude: 121.05107 },
  };
  for (const [id, expected] of Object.entries(mappedCenters)) {
    assert.ok(Math.abs(byId[id].coordinate.latitude - expected.latitude) < 0.00001, `${id} latitude`);
    assert.ok(Math.abs(byId[id].coordinate.longitude - expected.longitude) < 0.00001, `${id} longitude`);
  }
});

test("Anonas to Gateway takes exactly one LRT-2 stop toward Recto, then walks", async () => {
  const route = guide("lrt2-anonas", "gateway-mall");
  const train = route.steps.filter((p) => p.mode === "train");
  assert.equal(train.length, 1);
  assert.equal(train[0].stopCount, 1);
  assert.equal(train[0].headsign, "Recto");
  assert.deepEqual(Array.from(train[0].stationIds), ["lrt2-anonas", "lrt2-cubao"]);
  assert.equal(route.steps.at(-1).mode, "walk");
  assert.ok(route.durationSeconds > 0);
  const quote = await quoteFare(route, "regular");
  assert.equal(quote.regularTotal, 8);
  assert.equal(quote.discountedTotal, 8);
  assert.equal(TRAIN_FARE_TABLE["lrt2-anonas"]["gateway-mall"].regular, 8);
});

test("MRT-3 Cubao to Anonas walks to LRT-2 and boards toward Antipolo", async () => {
  const route = guide("mrt3-cubao", "lrt2-anonas");
  assert.equal(route.steps[0].mode, "walk");
  assert.match(route.steps[0].instruction, /Farmers Plaza/);
  assert.equal(route.steps.filter((p) => p.mode === "train").length, 1);
  assert.equal(route.steps.find((p) => p.mode === "train").headsign, "Antipolo");
  assert.equal((await quoteFare(route, "discounted")).selectedTotal, 8);
  assert.equal(route.steps.some((p) => p.operatorId === "train-mrt3"), false);
});

test("within-Cubao station transfers need walking, not a fabricated paid MRT ride", async () => {
  for (const [from, to] of [
    ["lrt2-cubao", "mrt3-cubao"],
    ["mrt3-cubao", "gateway-mall"],
    ["lrt2-cubao", "gateway-mall"],
  ]) {
    const route = guide(from, to);
    assert.equal(route.trainStopCount, 0);
    assert.ok(route.steps.every((p) => p.mode === "walk"));
    assert.equal((await quoteFare(route, "regular")).selectedTotal, 0);
    assert.equal(TRAIN_FARE_TABLE[from][to].regular, 0);
  }
});

test("same place, unknown stations and outside-boundary GPS are guarded", () => {
  assert.throws(() => guide("lrt2-anonas", "lrt2-anonas"), /already at/);
  assert.throws(() => getTrainGuide({ origin: { id: "katipunan" }, destination: byId["gateway-mall"] }), /covers Anonas/);
  assert.equal(closestTrainStation({ latitude: 14.9, longitude: 121.3 }), null);
  assert.equal(closestTrainStation(byId["lrt2-anonas"].coordinate).station.id, "lrt2-anonas");
  assert.equal(TRAIN_FARE_SOURCES.lrt2.effectiveDate, "2026-03-23");
});

test("a station marked closed prevents a route that needs that station", () => {
  const station = byId["lrt2-cubao"];
  const previous = station.serviceStatus;
  station.serviceStatus = "closed";
  try {
    assert.throws(() => guide("lrt2-anonas", "gateway-mall"), /closed for maintenance/);
  } finally {
    station.serviceStatus = previous;
  }
});

test("TIP QC to Gateway combines real walking directions and one LRT-2 ride", async () => {
  const tip = { id: "tip-qc", name: "TIP QC", coordinate: { latitude: 14.62584479, longitude: 121.06225382 } };
  const walked = [];
  const route = await getMultimodalTrainGuide({ origin: tip, destination: byId["gateway-mall"] }, {
    getWalkingRoutes: async ({ origin, destination }) => {
      walked.push([origin.id, destination.id]);
      return [{ steps: [{ id: "walk", mode: "walk", instruction: "You have arrived at your destination.", start: origin.coordinate,
        end: destination.coordinate, polyline: [origin.coordinate, destination.coordinate], distanceMeters: 300 }] }];
    },
  });
  assert.deepEqual(walked, [["tip-qc", "lrt2-anonas"], ["lrt2-cubao", "gateway-mall"]]);
  assert.deepEqual(Array.from(route.actualModes), ["walk", "train"]);
  assert.equal(route.steps[0].instruction, "Enter Anonas (LRT-2).");
  assert.equal(route.steps.at(-1).instruction, "You have arrived at your destination.");
  assert.equal(route.steps.find((step) => step.mode === "train").headsign, "Recto");
  assert.equal((await quoteFare(route, "regular")).regularTotal, 8);
  assert.equal(route.origin.id, "tip-qc");
});

test("arbitrary places within walking boundary get a safe no-train walking route when both near Cubao", async () => {
  const a = { id: "ali", name: "Ali Mall", coordinate: { latitude: 14.61976, longitude: 121.05674 } };
  const route = await getMultimodalTrainGuide({ origin: a, destination: byId["gateway-mall"] });
  assert.equal(route.trainStopCount, 0);
  assert.ok(route.steps.every((step) => step.mode === "walk"));
  assert.match(route.warnings.join(" "), /approximate/);
  assert.equal((await quoteFare(route, "discounted")).selectedTotal, 0);
});

test("outside walking boundary is rejected and cancelled walking routes are not converted to schematics", async () => {
  const far = { id: "far", name: "Outside", coordinate: { latitude: 14.8, longitude: 121.1 } };
  await assert.rejects(getMultimodalTrainGuide({ origin: far, destination: byId["gateway-mall"] }), /Cubao area/);
  await assert.rejects(getMultimodalTrainGuide({ origin: byId["lrt2-anonas"], destination: byId["gateway-mall"] }, {
    signal: { aborted: true },
  }), /cancelled/);
});

test("GPS trip starts with permission, advances manually and stops tracking on arrival", async () => {
  const { react, render } = require("./helpers/hook-harness.cjs")();
  const alerts = [];
  const loadHook = createLoader({ react, "react-native": { Alert: { alert: (...args) => alerts.push(args) } } });
  const { useTrainTrip } = loadHook(root("hooks/useTrainTrip.js"));
  const route = guide("lrt2-anonas", "gateway-mall");
  let watches = 0, stops = 0;
  const fix = {
    status: "ready", inServiceArea: true,
    position: { ...route.origin.coordinate, accuracyMeters: 15, timestamp: new Date().toISOString() },
  };
  const h = render(useTrainTrip, {
    route, snapshot: fix,
    refreshLocation: async () => fix,
    startTracking: async () => { watches++; },
    stopTracking: () => { stops++; },
    onRouteChange: () => {},
  });
  assert.equal(await h.result.start(), true);
  h.flush();
  assert.equal(h.result.state, "active");
  assert.equal(watches, 1);
  assert.equal(h.result.following, true);
  assert.ok(h.result.recenterRequest > 0);
  assert.equal(h.result.progress.remainingDistanceMeters, route.distanceMeters);
  assert.equal(h.result.progress.remainingDurationSeconds, null);
  for (let i = 0; i < route.steps.length; i++) {
    h.result.advance(); h.flush();
  }
  assert.equal(h.result.state, "arrived");
  assert.equal(stops, 1);
  h.dispose();
  assert.equal(stops, 1);
});

test("a fresh Cubao-area fix near Anonas starts live train guidance with a remaining distance", async () => {
  const { react, render } = require("./helpers/hook-harness.cjs")();
  const loadHook = createLoader({ react, "react-native": { Alert: { alert() {} } } });
  const { useTrainTrip } = loadHook(root("hooks/useTrainTrip.js"));
  const route = guide("lrt2-anonas", "lrt2-cubao");
  const fix = {
    status: "ready", inServiceArea: true,
    position: { latitude: 14.62584479, longitude: 121.06225382,
      accuracyMeters: 15, timestamp: new Date().toISOString() },
  };
  let tracking = 0;
  const h = render(useTrainTrip, {
    route, snapshot: fix,
    refreshLocation: async () => fix,
    startTracking: async () => { tracking++; },
    stopTracking: () => {}, onRouteChange: () => {},
  });
  assert.equal(await h.result.start(), true);
  h.flush();
  assert.equal(h.result.state, "active");
  assert.equal(h.result.following, true);
  assert.equal(tracking, 1);
  assert.ok(h.result.progress.stepRemainingDistanceMeters > 250);
  assert.ok(h.result.progress.remainingDistanceMeters > route.distanceMeters);
  h.dispose();
});

test("denied GPS retains offline guide and never opens a watcher", async () => {
  const { react, render } = require("./helpers/hook-harness.cjs")();
  const loadHook = createLoader({ react, "react-native": { Alert: { alert() {} } } });
  const { useTrainTrip } = loadHook(root("hooks/useTrainTrip.js"));
  const route = guide("lrt2-anonas", "gateway-mall");
  let watches = 0;
  const h = render(useTrainTrip, {
    route, snapshot: { status: "denied", position: null },
    refreshLocation: async () => ({ status: "denied", position: null }),
    startTracking: async () => { watches++; },
    stopTracking: () => {},
    onRouteChange: () => {},
  });
  assert.equal(await h.result.start(), false);
  h.flush();
  assert.equal(h.result.state, "idle");
  assert.match(h.result.message, /permission/);
  assert.equal(watches, 0);
  h.dispose();
});

test("three accurate off-route GPS fixes offer offline recalculation", async () => {
  const { react, render } = require("./helpers/hook-harness.cjs")();
  const loadHook = createLoader({ react, "react-native": { Alert: { alert() {} } } });
  const { useTrainTrip } = loadHook(root("hooks/useTrainTrip.js"));
  const route = guide("lrt2-cubao", "gateway-mall");
  const startFix = {
    status: "ready", inServiceArea: true,
    position: { ...route.origin.coordinate, accuracyMeters: 15, timestamp: new Date().toISOString() },
  };
  const h = render(useTrainTrip, {
    route, snapshot: startFix,
    refreshLocation: async () => startFix,
    startTracking: async () => {}, stopTracking: () => {},
    onRouteChange: () => {},
  });
  assert.equal(await h.result.start(), true);
  h.flush();
  for (let index = 0; index < 3; index++) {
    h.props = { ...h.props, snapshot: {
      status: "ready", inServiceArea: true,
      position: { latitude: 14.637, longitude: 121.074, accuracyMeters: 15,
        timestamp: new Date(Date.now() + index + 1).toISOString() },
    } };
    h.flush();
  }
  assert.equal(h.result.state, "off-route");
  assert.match(h.result.message, /Recalculate/);
  assert.equal(await h.result.reroute(), true);
  h.flush();
  assert.match(h.result.message, /recalculated/);
  h.dispose();
});

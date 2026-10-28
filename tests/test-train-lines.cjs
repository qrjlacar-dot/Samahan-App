const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");

const load = createLoader();
const root = (file) => path.resolve(__dirname, "../src/" + file);
const { TRAIN_PLACES, TRAIN_STATIONS } = load(root("data/trainNetwork.js"));
const { TRAIN_FARE_TABLE, TRAIN_FARE_SOURCES } = load(
  root("data/trainFares.js"),
);
const { getTrainGuide, getMultimodalTrainGuide, closestTrainStation } = load(
  root("services/routing/trainPlanner.js"),
);
const { quoteFare } = load(root("services/fares.js"));

const byId = Object.fromEntries(TRAIN_PLACES.map((place) => [place.id, place]));
const guide = (a, b) =>
  getTrainGuide({ origin: byId[a], destination: byId[b] });
const allStations = ["lrt2-anonas", "lrt2-cubao", "mrt3-cubao"];

test("all three railway stations and Gateway remain in the offline fare matrix", () => {
  assert.deepEqual(
    Array.from(TRAIN_STATIONS, (p) => p.id),
    allStations,
  );
  assert.equal(TRAIN_PLACES.length, 4);
  for (const origin of TRAIN_PLACES) {
    assert.deepEqual(
      Object.keys(TRAIN_FARE_TABLE[origin.id]),
      Array.from(TRAIN_PLACES, (p) => p.id),
    );
    for (const destination of TRAIN_PLACES) {
      const value = TRAIN_FARE_TABLE[origin.id][destination.id];
      assert.ok(Number.isFinite(value.regular));
      assert.ok(Number.isFinite(value.discounted));
      if (origin.id !== destination.id) {
        const route = guide(origin.id, destination.id);
        const visited = new Set(
          route.steps.flatMap((step) => step.stationIds ?? []),
        );
        if (origin.line) visited.add(origin.id);
        if (destination.line) visited.add(destination.id);
        assert.deepEqual(
          Array.from(route.stationMarkers, (p) => p.id),
          allStations.filter((id) => visited.has(id)),
        );
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
    assert.ok(
      Math.abs(byId[id].coordinate.latitude - expected.latitude) < 0.00001,
      `${id} latitude`,
    );
    assert.ok(
      Math.abs(byId[id].coordinate.longitude - expected.longitude) < 0.00001,
      `${id} longitude`,
    );
  }
});

test("Anonas to Gateway takes exactly one LRT-2 stop toward Recto, then walks", async () => {
  const route = guide("lrt2-anonas", "gateway-mall");
  const train = route.steps.filter((p) => p.mode === "train");
  assert.equal(train.length, 1);
  assert.equal(train[0].stopCount, 1);
  assert.equal(train[0].headsign, "Recto");
  assert.deepEqual(Array.from(train[0].stationIds), [
    "lrt2-anonas",
    "lrt2-cubao",
  ]);
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
  assert.equal(
    route.steps.find((p) => p.mode === "train").headsign,
    "Antipolo",
  );
  assert.equal((await quoteFare(route, "discounted")).selectedTotal, 8);
  assert.equal(
    route.steps.some((p) => p.operatorId === "train-mrt3"),
    false,
  );
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
  assert.throws(
    () =>
      getTrainGuide({
        origin: { id: "katipunan" },
        destination: byId["gateway-mall"],
      }),
    /covers Anonas/,
  );
  assert.equal(closestTrainStation({ latitude: 14.9, longitude: 121.3 }), null);
  assert.equal(
    closestTrainStation(byId["lrt2-anonas"].coordinate).station.id,
    "lrt2-anonas",
  );
  assert.equal(TRAIN_FARE_SOURCES.lrt2.effectiveDate, "2026-03-23");
});

test("a station marked closed prevents a route that needs that station", () => {
  const station = byId["lrt2-cubao"];
  const previous = station.serviceStatus;
  station.serviceStatus = "closed";
  try {
    assert.throws(
      () => guide("lrt2-anonas", "gateway-mall"),
      /closed for maintenance/,
    );
  } finally {
    station.serviceStatus = previous;
  }
});

test("TIP QC to Gateway combines real walking directions and one LRT-2 ride", async () => {
  const tip = {
    id: "tip-qc",
    name: "TIP QC",
    coordinate: { latitude: 14.62584479, longitude: 121.06225382 },
  };
  const walked = [];
  const route = await getMultimodalTrainGuide(
    { origin: tip, destination: byId["gateway-mall"] },
    {
      getWalkingRoutes: async ({ origin, destination }) => {
        walked.push([origin.id, destination.id]);
        return [
          {
            steps: [
              {
                id: "walk",
                mode: "walk",
                instruction: "You have arrived at your destination.",
                start: origin.coordinate,
                end: destination.coordinate,
                polyline: [origin.coordinate, destination.coordinate],
                distanceMeters: 300,
              },
            ],
          },
        ];
      },
    },
  );
  assert.deepEqual(walked, [
    ["tip-qc", "lrt2-anonas"],
    ["lrt2-cubao", "gateway-mall"],
  ]);
  assert.deepEqual(Array.from(route.actualModes), ["walk", "train"]);
  assert.equal(route.steps[0].instruction, "Enter Anonas (LRT-2).");
  assert.equal(
    route.steps.at(-1).instruction,
    "You have arrived at your destination.",
  );
  assert.equal(
    route.steps.find((step) => step.mode === "train").headsign,
    "Recto",
  );
  assert.equal((await quoteFare(route, "regular")).regularTotal, 8);
  assert.equal(route.origin.id, "tip-qc");
});

test("arbitrary places within walking boundary get a safe no-train walking route when both near Cubao", async () => {
  const a = {
    id: "ali",
    name: "Ali Mall",
    coordinate: { latitude: 14.61976, longitude: 121.05674 },
  };
  const route = await getMultimodalTrainGuide({
    origin: a,
    destination: byId["gateway-mall"],
  });
  assert.equal(route.trainStopCount, 0);
  assert.ok(route.steps.every((step) => step.mode === "walk"));
  assert.match(route.warnings.join(" "), /approximate/);
  assert.equal((await quoteFare(route, "discounted")).selectedTotal, 0);
});

test("outside walking boundary is rejected and cancelled walking routes are not converted to schematics", async () => {
  const far = {
    id: "far",
    name: "Outside",
    coordinate: { latitude: 14.8, longitude: 121.1 },
  };
  await assert.rejects(
    getMultimodalTrainGuide({ origin: far, destination: byId["gateway-mall"] }),
    /Cubao area/,
  );
  await assert.rejects(
    getMultimodalTrainGuide(
      { origin: byId["lrt2-anonas"], destination: byId["gateway-mall"] },
      {
        signal: { aborted: true },
      },
    ),
    /cancelled/,
  );
});

const guidedFixture = require("./helpers/guided-fixture.cjs");

test("train guidance confirms boarding and alighting, then verifies final walking arrival once", async () => {
  const route = guide("lrt2-anonas", "gateway-mall");
  const f = guidedFixture("train", route);
  try {
    assert.equal(await f.h.result.start(), true);
    f.h.flush();
    assert.equal(f.h.result.actionLabel, "I've boarded");
    assert.equal(await f.h.result.confirmStage(), true);
    f.h.flush();
    assert.equal(f.h.result.actionLabel, "I've got off");
    const ride = route.steps.find((step) => step.kind === "ride");
    f.move(6000, ride.end);
    assert.equal(f.h.result.state, "active");
    assert.equal(await f.h.result.confirmStage(), true);
    f.h.flush();
    f.move(6000, route.destination.coordinate);
    assert.equal(f.h.result.state, "active");
    f.move(6000, route.destination.coordinate);
    assert.equal(f.h.result.state, "arrived");
    assert.equal(f.completed.length, 1);
    assert.equal(f.stopped(), 1);
    f.h.result.cancel();
    f.h.flush();
    assert.equal(f.cancelled.length, 0);
  } finally {
    f.h.dispose();
  }
});
test("train guidance uses the same near-origin start requirement as the other modes", async () => {
  const route = guide("lrt2-anonas", "lrt2-cubao");
  const f = guidedFixture("train", route);
  try {
    f.move(1000, { latitude: 14.62584479, longitude: 121.06225382 });
    assert.equal(await f.h.result.start(), false);
    f.h.flush();
    assert.match(f.h.result.message, /closer/);
    assert.equal(f.tracking(), 0);
  } finally {
    f.h.dispose();
  }
});
test("denied GPS retains the train preview and never opens a watcher", async () => {
  const f = guidedFixture("train", guide("lrt2-anonas", "gateway-mall"), {
    refresh: async () => ({ status: "denied", position: null }),
  });
  try {
    assert.equal(await f.h.result.start(), false);
    f.h.flush();
    assert.equal(f.h.result.state, "idle");
    assert.match(f.h.result.message, /location/i);
    assert.equal(f.tracking(), 0);
  } finally {
    f.h.dispose();
  }
});
test("real train-access walking geometry detects sustained off-route readings", async () => {
  const route = guide("lrt2-cubao", "gateway-mall");
  route.steps[0].schematic = false;
  const f = guidedFixture("train", route);
  try {
    await f.h.result.start();
    f.h.flush();
    const off = { latitude: 14.625, longitude: 121.056 };
    f.move(1000, off);
    f.move(6000, off);
    assert.equal(f.h.result.state, "off-route");
  } finally {
    f.h.dispose();
  }
});

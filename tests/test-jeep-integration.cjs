const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");
const hookHarness = require("./helpers/hook-harness.cjs");
const root = (file) => path.resolve(__dirname, "../src", file);
const load = createLoader();
const { TRANSIT_LINES } = load(root("data/transitCatalog.js"));
const { getTransitRoutes } = load(root("services/routing/transitRoutes.js"));
const { quoteFare } = load(root("services/fares.js"));

async function routeFor(operatorId = "jeep-traditional") {
  const line = TRANSIT_LINES.find(
    (item) =>
      item.id ===
      `jeep-tip-ali-${operatorId === "jeep-modern" ? "modern" : "traditional"}`,
  );
  const [route] = await getTransitRoutes(
    {
      origin: line.stops[0],
      destination: line.stops.at(-1),
      preferredMode: "jeep",
      operatorId,
    },
    {
      getWalkingRoutes: async () => {
        throw Error(
          "An exact stop-to-stop ride must not request a walking ride geometry",
        );
      },
    },
  );
  return route;
}

test("jeep rides provide the start/end and metadata needed by GPS without requesting a walking road route", async () => {
  const route = await routeFor();
  const ride = route.steps[0];
  assert.equal(ride.mode, "jeep");
  assert.equal(ride.kind, "ride");
  assert.equal(ride.start.latitude, route.origin.coordinate.latitude);
  assert.equal(ride.end.latitude, route.destination.coordinate.latitude);
  assert.equal(ride.lineName, "Traditional Jeepney");
  assert.ok(ride.polyline.length >= 2);
  assert.equal(ride.schematic, true);
  assert.ok(route.warnings.some((item) => /preview/i.test(item)));
});

test("traditional and modern selection use their own fare rule while retaining bus discounts", async () => {
  const traditional = await routeFor();
  const modern = await routeFor("jeep-modern");
  assert.equal((await quoteFare(traditional, "regular")).selectedTotal, 14);
  assert.equal((await quoteFare(traditional, "discounted")).selectedTotal, 12);
  assert.equal((await quoteFare(modern, "regular")).selectedTotal, 17);
  assert.equal((await quoteFare(modern, "discounted")).selectedTotal, 14);
  assert.equal(
    (
      await quoteFare(
        {
          steps: [
            {
              mode: "bus",
              operatorId: "bus-city-aircon",
              distanceMeters: 1000,
            },
          ],
        },
        "discounted",
      )
    ).selectedTotal,
    14.5,
  );
});

const guidedFixture = require("./helpers/guided-fixture.cjs");
function fixture(route, refresh) {
  return guidedFixture("jeep", route, { refresh });
}

test("starting the generated jeep route does not crash and shows a nonzero remaining distance", async () => {
  const route = await routeFor();
  const s = fixture(route);
  assert.equal(await s.h.result.start(), true);
  assert.doesNotThrow(() => s.h.flush());
  assert.equal(s.h.result.state, "active");
  assert.ok(s.h.result.progress.remainingDistanceMeters > 100);
  assert.equal(s.tracking(), 1);
  s.h.dispose();
  assert.equal(s.stopped(), 1);
});

test("finishing a jeep guide records one completion and ending afterwards never records a cancellation", async () => {
  const s = fixture(await routeFor());
  await s.h.result.start();
  s.h.flush();
  await s.h.result.confirmStage();
  s.h.flush();
  s.move(6000, s.h.props.route.destination.coordinate);
  await s.h.result.confirmStage();
  s.h.flush();
  s.move(6000, s.h.props.route.destination.coordinate);
  s.move(6000, s.h.props.route.destination.coordinate);
  assert.equal(s.h.result.state, "arrived");
  assert.equal(s.completed.length, 1);
  assert.equal(s.completed[0][0], "account-a");
  assert.equal(s.completed[0][1].journey.preferredMode, "jeep");
  s.h.flush();
  s.h.result.cancel();
  s.h.flush();
  assert.equal(s.completed.length, 1);
  assert.equal(s.cancelled.length, 0);
  s.h.dispose();
});

test("cancelling a running jeep trip records one cancellation and stops tracking", async () => {
  const s = fixture(await routeFor());
  await s.h.result.start();
  s.h.flush();
  s.h.result.cancel();
  s.h.flush();
  s.h.result.cancel();
  s.h.flush();
  assert.equal(s.cancelled.length, 1);
  assert.equal(s.completed.length, 0);
  assert.equal(s.stopped(), 1);
  s.h.dispose();
});

test("changing accounts cancels a pending jeep start without notifying either account", async () => {
  let resolve;
  const waiting = new Promise((yes) => {
    resolve = yes;
  });
  const route = await routeFor();
  const s = fixture(route, () => waiting);
  const pending = s.h.result.start();
  s.h.props = { ...s.h.props, uid: "account-b" };
  s.h.flush();
  resolve(s.fix(route.origin.coordinate));
  assert.equal(await pending, false);
  s.h.flush();
  assert.equal(s.h.result.state, "idle");
  assert.equal(s.tracking(), 0);
  assert.equal(s.completed.length + s.cancelled.length, 0);
  s.h.dispose();
});

test("saved modern jeep journeys reopen with their class and reject unsupported classes", async () => {
  const route = await routeFor("jeep-modern");
  const { parseJourneyParam } = load(root("services/journeys.js"));
  const journey = {
    origin: route.origin,
    destination: route.destination,
    preferredMode: "jeep",
    ticketType: "regular",
    operatorId: "jeep-modern",
  };
  assert.equal(
    parseJourneyParam(JSON.stringify(journey)).operatorId,
    "jeep-modern",
  );
  assert.equal(
    parseJourneyParam(
      JSON.stringify({ ...journey, operatorId: "jeep-unlisted" }),
    ),
    null,
  );
});

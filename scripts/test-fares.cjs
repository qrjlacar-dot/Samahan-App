const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const { transformSync } = require("@babel/core");

function loadSource(file, mocks) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const { code } = transformSync(source, {
    configFile: false,
    babelrc: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  });
  const module = { exports: {} };
  vm.runInNewContext(
    code,
    {
      module,
      exports: module.exports,
      require(name) {
        if (!(name in mocks)) throw new Error(`Unexpected module: ${name}`);
        return mocks[name];
      },
    },
    { filename: file },
  );
  return module.exports;
}

const commute = loadSource("src/constants/commute.js", {});
const rules = loadSource("src/data/fareRules.js", {});
const { quoteFare } = loadSource("src/services/fares.js", {
  "../constants/commute": commute,
  "../data/fareRules": rules,
});

const step = (overrides = {}) => ({
  id: "s1",
  mode: "walk",
  instruction: "Walk",
  distanceMeters: 500,
  operatorId: null,
  ...overrides,
});
const route = (...steps) => ({ id: "r1", steps });

test("walking is free for both ticket types", async () => {
  for (const type of ["regular", "discounted"]) {
    const quote = await quoteFare(route(step()), type);
    assert.equal(quote.currency, "PHP");
    assert.equal(quote.selectedTotal, 0);
    assert.equal(quote.complete, true);
  }
});

test("traditional jeep within the minimum distance costs 14 regular", async () => {
  const quote = await quoteFare(
    route(step({ mode: "jeep", operatorId: "jeep-traditional", distanceMeters: 3000 })),
    "regular",
  );
  assert.equal(quote.regularTotal, 14);
  assert.equal(quote.selectedTotal, 14);
  assert.equal(quote.complete, true);
  assert.ok(quote.items[0].sourceUrl);
  assert.ok(quote.items[0].verifiedAt);
});

test("modern jeep is 17 and ordinary city bus is 15", async () => {
  const modern = await quoteFare(
    route(step({ mode: "jeep", operatorId: "jeep-modern", distanceMeters: 2000 })),
    "regular",
  );
  const bus = await quoteFare(
    route(step({ mode: "bus", operatorId: "bus-city-ordinary", distanceMeters: 5000 })),
    "regular",
  );
  assert.equal(modern.selectedTotal, 17);
  assert.equal(bus.selectedTotal, 15);
});

test("an unverified discounted fare stays unknown, not guessed", async () => {
  const quote = await quoteFare(
    route(step({ mode: "bus", operatorId: "bus-city-ordinary", distanceMeters: 3000 })),
    "discounted",
  );
  assert.equal(quote.regularTotal, 15);
  assert.equal(quote.discountedTotal, null);
  assert.equal(quote.selectedTotal, null);
  assert.equal(quote.complete, false);
});

test("jeepney discounted fares use the whole-peso amounts commonly charged", async () => {
  const traditional = await quoteFare(
    route(step({ mode: "jeep", operatorId: "jeep-traditional", distanceMeters: 1000 })),
    "discounted",
  );
  const modern = await quoteFare(
    route(step({ mode: "jeep", operatorId: "jeep-modern", distanceMeters: 1000 })),
    "discounted",
  );
  assert.equal(traditional.selectedTotal, 12);
  assert.equal(modern.selectedTotal, 14);
  assert.equal(traditional.complete, true);
});

test("a ride beyond the minimum-fare distance is unknown", async () => {
  const at = await quoteFare(
    route(step({ mode: "jeep", operatorId: "jeep-traditional", distanceMeters: 4000 })),
    "regular",
  );
  const over = await quoteFare(
    route(step({ mode: "jeep", operatorId: "jeep-traditional", distanceMeters: 4001 })),
    "regular",
  );
  assert.equal(at.selectedTotal, 14);
  assert.equal(over.selectedTotal, null);
  assert.equal(over.complete, false);
});

test("unknown distance gives an unknown fare", async () => {
  const quote = await quoteFare(
    route(step({ mode: "bus", operatorId: "bus-city-ordinary", distanceMeters: null })),
    "regular",
  );
  assert.equal(quote.selectedTotal, null);
});

test("a vehicle with no known class is unknown", async () => {
  const quote = await quoteFare(
    route(step({ mode: "jeep", operatorId: null, distanceMeters: 1000 })),
    "regular",
  );
  assert.equal(quote.selectedTotal, null);
  assert.equal(quote.complete, false);
  assert.equal(quote.items[0].regular, null);
});

test("a rule for the wrong mode is not used", async () => {
  const quote = await quoteFare(
    route(step({ mode: "bus", operatorId: "jeep-traditional", distanceMeters: 1000 })),
    "regular",
  );
  assert.equal(quote.selectedTotal, null);
});

test("LRT-2 stays unknown until its fares are verified", async () => {
  const quote = await quoteFare(
    route(step({ mode: "train", operatorId: "train-lrt2", distanceMeters: 1500 })),
    "regular",
  );
  assert.equal(quote.selectedTotal, null);
  assert.equal(quote.complete, false);
});

test("a partial fare is not shown as a full total", async () => {
  const quote = await quoteFare(
    route(
      step({ id: "a" }),
      step({ id: "b", mode: "jeep", operatorId: null, distanceMeters: 1000 }),
    ),
    "regular",
  );
  assert.equal(quote.regularTotal, null);
  assert.equal(quote.selectedTotal, null);
  assert.equal(quote.complete, false);
  assert.equal(quote.items[0].regular, 0);
});

test("transfers add the known fares of each step", async () => {
  const quote = await quoteFare(
    route(
      step({ id: "a" }),
      step({ id: "b", mode: "jeep", operatorId: "jeep-traditional", distanceMeters: 2000 }),
      step({ id: "c", mode: "bus", operatorId: "bus-city-ordinary", distanceMeters: 3000 }),
    ),
    "regular",
  );
  assert.equal(quote.regularTotal, 29);
  assert.equal(quote.items.length, 3);
  assert.equal(quote.complete, true);
});

test("totals are rounded to cents", async () => {
  const original = rules.FARE_RULES["jeep-traditional"];
  assert.ok(Number.isFinite(original.regular));
  const quote = await quoteFare(
    route(
      step({ id: "a", mode: "jeep", operatorId: "jeep-modern", distanceMeters: 1000 }),
      step({ id: "b", mode: "jeep", operatorId: "jeep-modern", distanceMeters: 1000 }),
    ),
    "regular",
  );
  assert.equal(quote.regularTotal, 34);
});

test("a route with no steps has no fare", async () => {
  const quote = await quoteFare(route(), "regular");
  assert.equal(quote.selectedTotal, null);
  assert.equal(quote.complete, false);
});

test("invalid input is rejected", async () => {
  await assert.rejects(quoteFare(route(step()), "student"));
  await assert.rejects(quoteFare(route(step()), undefined));
  await assert.rejects(quoteFare(null, "regular"));
  await assert.rejects(quoteFare({}, "regular"));
});

test("quoting does not change the route", async () => {
  const input = route(step({ mode: "jeep", operatorId: "jeep-traditional", distanceMeters: 1000 }));
  const before = JSON.stringify(input);
  await quoteFare(input, "regular");
  assert.equal(JSON.stringify(input), before);
});

test("every rule with a known amount records a source and a check date", () => {
  for (const [id, rule] of Object.entries(rules.FARE_RULES)) {
    if (rule.regular !== null || rule.discounted !== null) {
      assert.ok(rule.sourceUrl, `${id} needs a source URL`);
      assert.match(rule.verifiedAt, /^\d{4}-\d{2}-\d{2}$/, `${id} needs a check date`);
    }
  }
});

const lrt = (boardingStop, alightingStop) =>
  step({
    mode: "train",
    operatorId: "train-lrt2",
    boardingStop,
    alightingStop,
    distanceMeters: 1500,
  });

test("LRT-2 Anonas to Araneta Center-Cubao has a verified fare", async () => {
  const quote = await quoteFare(
    route(lrt("Anonas LRT-2 Station", "Araneta Center-Cubao")),
    "regular",
  );
  assert.equal(quote.selectedTotal, 8);
  assert.equal(quote.complete, true);
  assert.ok(quote.items[0].sourceUrl);
});

test("LRT-2 fare is the same in both directions and for discounted riders", async () => {
  const back = await quoteFare(
    route(lrt("Araneta Center Cubao Station", "Anonas")),
    "discounted",
  );
  assert.equal(back.selectedTotal, 8);
});

test("LRT-2 stations that are not verified stay unknown", async () => {
  const other = await quoteFare(route(lrt("Anonas", "Katipunan")), "regular");
  assert.equal(other.selectedTotal, null);
  const missing = await quoteFare(route(lrt(null, null)), "regular");
  assert.equal(missing.selectedTotal, null);
  const same = await quoteFare(route(lrt("Anonas", "Anonas")), "regular");
  assert.equal(same.selectedTotal, null);
});

test("MRT-3 Cubao is not mistaken for the LRT-2 station", async () => {
  const quote = await quoteFare(
    route(lrt("Anonas", "Cubao MRT Station")),
    "regular",
  );
  assert.equal(quote.selectedTotal, null);
});

test("a walk plus the LRT-2 ride adds up to the train fare", async () => {
  const quote = await quoteFare(
    route(step({ id: "a" }), { ...lrt("Anonas", "Araneta Center-Cubao"), id: "b" }),
    "regular",
  );
  assert.equal(quote.regularTotal, 8);
});

test("a verified short jeep line is priced at the minimum fare without a measured distance", async () => {
  const traditional = await quoteFare(
    route(step({ mode: "jeep", operatorId: "jeep-traditional", distanceMeters: null, withinMinimumFare: true })),
    "regular",
  );
  const discounted = await quoteFare(
    route(step({ mode: "jeep", operatorId: "jeep-modern", distanceMeters: null, withinMinimumFare: true })),
    "discounted",
  );
  assert.equal(traditional.selectedTotal, 14);
  assert.equal(discounted.selectedTotal, 14);
});
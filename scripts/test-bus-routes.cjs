const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const load = require("./helpers/source-loader.cjs")();
const root = path.resolve(__dirname, "..");
const { getBusRoutes } = load(path.join(root, "src/services/busRoutes.js"));
const { getTransitRoutes } = load(path.join(root, "src/services/transitRoutes.js"));
const { BUS_LINES } = load(path.join(root, "src/data/busCatalog.js"));
const { LANDMARKS } = load(path.join(root, "src/data/serviceArea.js"));
const { quoteFare } = load(path.join(root, "src/services/fares.js"));
const { getRoutes } = load(path.join(root, "src/services/routes.js"));
const line = BUS_LINES[0];
const [anonas, twentieth, miami, cubao] = line.stops;
const landmark = id => ({ ...LANDMARKS.find(item => item.id === id), address: "Cubao", source: "verified-local" });
const request = (origin = anonas, destination = cubao) => ({ origin, destination, preferredMode: "bus" });
const options = () => {
  const calls = [];
  return { calls, getWalkingRoutes: async input => {
    calls.push(input);
    return [{ steps: [{ id: "walk", mode: "walk", instruction: `Walk to ${input.destination.name}.`,
      polyline: [input.origin.coordinate, input.destination.coordinate], distanceMeters: 200, durationSeconds: 180 }] }];
  } };
};
const ride = route => route.steps.find(step => step.mode === "bus");

test("the public route API dispatches an exact-stop bus preview without GPS or provider requests", async () => {
  const [route] = await getRoutes(request());
  assert.equal(route.preview, true);
  assert.equal(route.steps.length, 1);
  assert.equal(route.steps[0].mode, "bus");
});

test("bus dispatch returns a westbound preview with a sourced road path and minimum fare", async () => {
  const [route] = await getTransitRoutes(request(), options());
  assert.equal(route.preview, true);
  assert.equal(route.preferredMode, "bus");
  assert.match(ride(route).boardingStop, /Anonas/);
  assert.match(ride(route).alightingStop, /Cubao/);
  assert.ok(ride(route).polyline.length > 10);
  assert.ok(ride(route).distanceMeters > 1200 && ride(route).distanceMeters < 1600);
  assert.equal(route.durationSeconds, null);
  assert.equal(ride(route).schematic, true);
  assert.match(ride(route).instruction, /Cubao \/ Quiapo/);
  assert.ok(route.sourceUrls.includes("https://www.glinerbuses.com/"));
  assert.match(route.warnings.join(" "), /not been checked on site/);
  for (const [type, expected] of [["regular", 18], ["discounted", 14.5]]) {
    const quote = await quoteFare(route, type);
    assert.equal(quote.selectedTotal, expected);
    assert.equal(quote.complete, true);
  }
});

test("TIP users board nearby instead of walking back to Anonas", async () => {
  const opts = options();
  const [route] = await getBusRoutes(request(landmark("tip-qc"), landmark("gateway-mall")), opts);
  assert.equal(route.steps[0].mode, "walk");
  assert.match(ride(route).boardingStop, /20th/);
  assert.equal(opts.calls.length, 2);
  assert.equal(opts.calls[0].destination.id, twentieth.id);
  assert.equal(route.steps.at(-1).mode, "walk");
  assert.equal(route.destination.id, "gateway-mall");
  assert.equal(new Set(route.steps.map(step => step.id)).size, route.steps.length);
});

test("Ali Mall is reached with a final walk, never an invented direct bus branch", async () => {
  const opts = options();
  const [route] = await getBusRoutes(request(landmark("tip-qc"), landmark("ali-mall")), opts);
  assert.equal(route.steps.at(-1).mode, "walk");
  assert.match(route.steps.at(-1).instruction, /Ali Mall/);
  assert.doesNotMatch(ride(route).alightingStop, /Ali Mall/);
  assert.match(route.warnings.join(" "), /does not go directly to the mall/);
  assert.equal(opts.calls.at(-1).destination.id, "ali-mall");
});

test("nearby intermediate stops support a shorter ride with a smaller path", async () => {
  const [short] = await getBusRoutes(request(twentieth, miami), options());
  const [full] = await getBusRoutes(request(), options());
  assert.ok(ride(short).distanceMeters < ride(full).distanceMeters);
  assert.ok(ride(short).distanceMeters > 200);
  assert.equal(ride(short).polyline[0].latitude, twentieth.coordinate.latitude);
  assert.equal(ride(short).polyline.at(-1).longitude, miami.coordinate.longitude);
});

test("reverse trips, off-corridor starts, and points beyond Anonas are unavailable before walking requests", async () => {
  for (const input of [request(cubao, anonas), request(miami, twentieth),
    request({ ...anonas, coordinate: { latitude: 14.64, longitude: 121.06 } }, cubao),
    request({ ...anonas, coordinate: { latitude: 14.6294, longitude: 121.069 } }, cubao)]) {
    const opts = options();
    await assert.rejects(getBusRoutes(input, opts), { code: "commute/no-route" });
    assert.equal(opts.calls.length, 0);
  }
});

test("same places and outside-area coordinates are rejected", async () => {
  await assert.rejects(getBusRoutes(request(anonas, anonas), options()), { code: "commute/same-place" });
  await assert.rejects(getBusRoutes(request({ ...anonas, coordinate: { latitude: 15, longitude: 121 } }), options()), { code: "commute/invalid-places" });
});

test("an unavailable walking connection cannot produce a partial bus journey", async () => {
  await assert.rejects(getBusRoutes(request(landmark("tip-qc"), cubao), { getWalkingRoutes: async () => [] }), { code: "commute/no-route" });
});

test("cancelled bus requests never return a late preview", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(getBusRoutes(request(), { ...options(), signal: controller.signal }), { name: "AbortError" });
  const late = new AbortController();
  const opts = options();
  const original = opts.getWalkingRoutes;
  opts.getWalkingRoutes = async input => { const result = await original(input); late.abort(); return result; };
  await assert.rejects(getBusRoutes(request(landmark("tip-qc"), cubao), { ...opts, signal: late.signal }), { name: "AbortError" });
});

test("published bus discounts and minimum-distance boundaries are explicit", async () => {
  for (const [operatorId, regular, discounted] of [["bus-city-ordinary", 15, 12], ["bus-city-aircon", 18, 14.5]]) {
    const route = distanceMeters => ({ steps: [{ id: "bus", mode: "bus", operatorId, distanceMeters }] });
    const regularQuote = await quoteFare(route(5000), "regular");
    const discountQuote = await quoteFare(route(5000), "discounted");
    assert.equal(regularQuote.selectedTotal, regular);
    assert.equal(discountQuote.selectedTotal, discounted);
    assert.match(discountQuote.items[0].note, /ID/);
    assert.match(discountQuote.items[0].sourceUrl, /ptvnews/);
    assert.equal((await quoteFare(route(5001), "regular")).selectedTotal, null);
    assert.equal((await quoteFare(route(null), "regular")).selectedTotal, null);
  }
});

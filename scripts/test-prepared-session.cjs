const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");
const hookHarness = require("./helpers/hook-harness.cjs");
const root = path.resolve(__dirname, "..");
const a = { latitude: 14.625, longitude: 121.06 };
const b = { latitude: 14.626, longitude: 121.06 };
const point = (id, coordinate) => ({ id, name: id, address: "Cubao", coordinate, source: "geoapify" });
const journey = { origin: point("A", a), destination: point("B", b), preferredMode: "walk", ticketType: "regular" };
const baseRoute = { ...journey, id: "walk", calculatedAt: "original", polyline: [a, b], distanceMeters: 111, durationSeconds: 90, steps: [{ id: "one", mode: "walk", instruction: "Go north", polyline: [a, b], distanceMeters: 111, durationSeconds: 90 }] };

function fixture(options = {}) {
  let clock = Date.now();
  class TestDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
  const timers = new Map(); let timerId = 0; let h;
  const { react, render } = hookHarness();
  const notifications = [], requests = [], routeChanges = [];
  const mockRoutes = async (request, config) => {
    requests.push({ request, config });
    if (options.routes) return options.routes(request, config);
    return [{ ...baseRoute, origin: request.origin, destination: request.destination, id: "rerouted", calculatedAt: "updated", polyline: [request.origin.coordinate, b], steps: [{ ...baseRoute.steps[0], polyline: [request.origin.coordinate, b] }] }];
  };
  const load = createLoader({
    react,
    "../services/routes": { getRoutes: mockRoutes },
    "../services/notifications": { notifyArrival: async (...args) => { notifications.push(args); return {}; } },
  }, {
    Date: TestDate,
    setInterval(fn) { timers.set(++timerId, fn); return timerId; },
    clearInterval(id) { timers.delete(id); },
  });
  const { useWalkingTrip } = load(path.join(root, "src/hooks/useWalkingTrip.js"));
  const fix = (coordinate, accuracyMeters = 10) => ({ status: "ready", inServiceArea: true, position: { ...coordinate, timestamp: new TestDate().toISOString(), accuracyMeters } });
  h = render(useWalkingTrip, {
    uid: "account-a", journey, route: baseRoute, snapshot: fix(a),
    refreshLocation: () => options.refresh ? options.refresh() : Promise.resolve(h.props.snapshot),
    onRouteChange(value) { routeChanges.push(value); h.props = { ...h.props, route: value }; h.dirty = true; },
  });
  const advance = (ms, coordinate, accuracy = 10) => {
    clock += ms;
    if (coordinate) h.props = { ...h.props, snapshot: fix(coordinate, accuracy) };
    for (const fn of [...timers.values()]) fn();
    h.flush();
  };
  return { h, fix, advance, requests, notifications, routeChanges };
}
const settle = async () => { await new Promise((resolve) => setImmediate(resolve)); };

test("Start enables following; Recenter restores it after a pan", async () => {
  const f = fixture(); assert.equal(await f.h.result.start(), true); f.h.flush();
  assert.equal(f.h.result.state, "active"); assert.equal(f.h.result.following, true);
  f.h.result.stopFollowing(); f.h.flush(); assert.equal(f.h.result.following, false);
  const request = f.h.result.recenterRequest;
  f.h.result.recenter(); f.h.flush(); assert.equal(f.h.result.following, true); assert.equal(f.h.result.recenterRequest, request + 1);
  f.h.dispose();
});
test("arrival transitions once and creates one notification for the original journey", async () => {
  const f = fixture(); await f.h.result.start(); f.h.flush();
  f.advance(6000, b); assert.equal(f.h.result.state, "active");
  f.advance(6000, b); assert.equal(f.h.result.state, "arrived");
  assert.equal(f.notifications.length, 1); assert.equal(f.notifications[0][0], "account-a");
  assert.equal(f.notifications[0][1].journey.origin.id, "A");
  f.advance(6000, b); assert.equal(f.notifications.length, 1); f.h.dispose();
});
test("no fresh GPS reading pauses an active trip after the freshness limit", async () => {
  const f = fixture(); await f.h.result.start(); f.h.flush();
  f.advance(31000); assert.equal(f.h.result.state, "paused"); assert.equal(f.h.result.following, false);
  assert.ok(f.h.result.message.includes("out of date")); f.h.dispose();
});
test("weak GPS pauses the trip and a new accurate fix automatically resumes following", async () => {
  const f = fixture(); await f.h.result.start(); f.h.flush();
  f.advance(1000, a, 100); assert.equal(f.h.result.state, "paused");
  f.advance(1000, a);
  assert.equal(f.h.result.state, "active");
  assert.equal(f.h.result.following, true);
  f.h.dispose();
});
test("off-route fixes trigger one reroute using the live position and original destination", async () => {
  const f = fixture(); await f.h.result.start(); f.h.flush();
  const off = { latitude: 14.6255, longitude: 121.062 };
  f.advance(1000, off); assert.equal(f.requests.length, 0);
  f.advance(5000, off); await settle(); f.h.flush();
  assert.equal(f.requests.length, 1); assert.equal(f.routeChanges.length, 1);
  assert.equal(f.requests[0].request.origin.coordinate.longitude, off.longitude);
  assert.equal(f.requests[0].request.destination.id, "B");
  assert.equal(f.h.result.state, "active"); assert.equal(f.h.result.following, true); f.h.dispose();
});
test("ending while Start checks location ignores the late result", async () => {
  let resolve; const f = fixture({ refresh: () => new Promise((done) => { resolve = done; }) });
  const start = f.h.result.start(); f.h.flush(); f.h.result.end(); f.h.flush();
  resolve(f.fix(a)); assert.equal(await start, false); f.h.flush();
  assert.equal(f.h.result.state, "idle"); assert.equal(f.h.result.following, false); f.h.dispose();
});
test("ending while rerouting aborts the request and ignores its late result", async () => {
  let resolve; const f = fixture({ routes: () => new Promise((done) => { resolve = done; }) });
  await f.h.result.start(); f.h.flush();
  const reroute = f.h.result.reroute(f.fix(a)); f.h.flush();
  assert.equal(f.h.result.state, "rerouting"); f.h.result.end(); f.h.flush();
  assert.equal(f.requests[0].config.signal.aborted, true);
  resolve([baseRoute]); assert.equal(await reroute, false); f.h.flush();
  assert.equal(f.routeChanges.length, 0); assert.equal(f.h.result.state, "idle"); f.h.dispose();
});
test("fresh on-route GPS recovers a stale trip without another Start press", async () => {
  const f = fixture();
  await f.h.result.start(); f.h.flush();
  f.advance(31000);
  assert.equal(f.h.result.state, "paused");
  const request = f.h.result.recenterRequest;
  f.advance(1000, { latitude: 14.6252, longitude: 121.06 });
  assert.equal(f.h.result.state, "active");
  assert.equal(f.h.result.following, true);
  assert.equal(f.h.result.recenterRequest, request + 1);
  assert.equal(f.notifications.length, 0);
  f.h.dispose();
});

test("recovering GPS preserves the user's manually selected route overview", async () => {
  const f = fixture();
  await f.h.result.start(); f.h.flush();
  f.h.result.stopFollowing(); f.h.flush();
  f.advance(31000);
  f.advance(1000, a);
  assert.equal(f.h.result.state, "active");
  assert.equal(f.h.result.following, false);
  f.h.dispose();
});

test("fresh off-route GPS cannot automatically resume a stale trip", async () => {
  const f = fixture();
  await f.h.result.start(); f.h.flush();
  f.advance(31000);
  f.advance(1000, { latitude: 14.63, longitude: 121.07 });
  assert.equal(f.h.result.state, "paused");
  assert.equal(f.h.result.following, false);
  f.h.dispose();
});

test("leaving the service area requires a manual resume after returning", async () => {
  const f = fixture();
  await f.h.result.start(); f.h.flush();
  f.advance(1000, { latitude: 14.7, longitude: 121.2 });
  assert.equal(f.h.result.state, "paused");
  f.advance(1000, a);
  assert.equal(f.h.result.state, "paused");
  f.h.dispose();
});

test("ending a temporarily paused trip prevents later GPS from restarting it", async () => {
  const f = fixture();
  await f.h.result.start(); f.h.flush();
  f.advance(31000);
  f.h.result.end(); f.h.flush();
  f.advance(1000, a);
  assert.equal(f.h.result.state, "idle");
  assert.equal(f.h.result.following, false);
  f.h.dispose();
});

test("signing into a different account ends the old trip", async () => {
  const f = fixture(); await f.h.result.start(); f.h.flush();
  f.h.props = { ...f.h.props, uid: "account-b" }; f.h.flush();
  assert.equal(f.h.result.state, "idle"); assert.equal(f.notifications.length, 0); f.h.dispose();
});

const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");
const hookHarness = require("./helpers/hook-harness.cjs");

const root = path.resolve(__dirname, "..");
const a = { latitude: 14.625, longitude: 121.06 };
const b = { latitude: 14.626, longitude: 121.06 };
const point = (id, coordinate) => ({
  id,
  name: id,
  address: "Cubao",
  coordinate,
  source: "geoapify",
});
const journeyFor = (preferredMode) => ({
  origin: point("A", a),
  destination: point("B", b),
  preferredMode,
  ticketType: "regular",
});
const settle = () => new Promise((resolve) => setImmediate(resolve));

// ---------- phone notifications service ----------

function fakeExpoNotifications(state) {
  return {
    AndroidImportance: { DEFAULT: 3 },
    SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
    setNotificationHandler(handler) {
      state.handler = handler;
    },
    async setNotificationChannelAsync(id, config) {
      state.calls.push(["channel", id, config.name]);
    },
    async getPermissionsAsync() {
      return { granted: state.status === "granted", status: state.status };
    },
    async requestPermissionsAsync() {
      state.calls.push(["request"]);
      state.status = state.answer;
      return { granted: state.answer === "granted", status: state.answer };
    },
    async scheduleNotificationAsync(request) {
      if (state.failSchedule) throw new Error("schedule failed");
      state.scheduled.push(request);
    },
  };
}

function loadPhone(state, { missing = false, os = "android", appState } = {}) {
  const mocks = {
    "react-native": { Platform: { OS: os }, AppState: appState },
    "./expoNotificationsModule": {
      __esModule: true,
      default: missing ? null : fakeExpoNotifications(state),
    },
  };
  return createLoader(mocks)(path.join(root, "src/services/phoneNotifications.js"));
}

const phoneState = (overrides = {}) => ({
  status: "undetermined",
  answer: "granted",
  calls: [],
  scheduled: [],
  ...overrides,
});

test("an app build without the notification module keeps working (module wired as null)", async () => {
  const phone = loadPhone(phoneState(), { missing: true });
  assert.equal(phone.phoneNotificationsAvailable(), false);
  assert.equal(await phone.getPhonePermission(), "unavailable");
  assert.equal(await phone.requestPhonePermission(), "unavailable");
  assert.equal(await phone.showPhoneNotification({ title: "x", body: "y" }), false);
});

test("phone permission is reported as granted, denied, or not asked yet", async () => {
  for (const [status, expected] of [
    ["granted", "granted"],
    ["denied", "denied"],
    ["undetermined", "undetermined"],
  ]) {
    const phone = loadPhone(phoneState({ status }));
    assert.equal(await phone.getPhonePermission(), expected);
  }
});

test("asking for permission creates the Android channel first, then asks", async () => {
  const state = phoneState({ answer: "granted" });
  const phone = loadPhone(state);
  assert.equal(await phone.requestPhonePermission(), "granted");
  assert.deepEqual(
    state.calls.map((call) => call[0]),
    ["channel", "request"],
  );
  assert.equal(state.calls[0][2], "Trip updates");

  const denied = phoneState({ answer: "denied" });
  assert.equal(await loadPhone(denied).requestPhonePermission(), "denied");
});

test("iPhone does not create an Android channel", async () => {
  const state = phoneState();
  await loadPhone(state, { os: "ios" }).requestPhonePermission();
  assert.deepEqual(
    state.calls.map((call) => call[0]),
    ["request"],
  );
});

test("a phone notification is shown only when permission is granted", async () => {
  const granted = phoneState({ status: "granted" });
  const phone = loadPhone(granted);
  const shown = await phone.showPhoneNotification({
    title: "Trip completed",
    body: "Your walking trip to B is complete.",
    data: { kind: "completed" },
  });
  assert.equal(shown, true);
  assert.equal(granted.scheduled.length, 1);
  assert.equal(granted.scheduled[0].content.title, "Trip completed");
  assert.equal(granted.scheduled[0].content.body, "Your walking trip to B is complete.");
  assert.equal(granted.scheduled[0].trigger, null); // now, not later

  for (const status of ["denied", "undetermined"]) {
    const blocked = phoneState({ status });
    assert.equal(await loadPhone(blocked).showPhoneNotification({ title: "x", body: "y" }), false);
    assert.equal(blocked.scheduled.length, 0);
  }
});

test("notifications are allowed to appear while the app is open", async () => {
  const state = phoneState({ status: "granted" });
  await loadPhone(state).showPhoneNotification({ title: "x", body: "y" });
  const behavior = await state.handler.handleNotification();
  assert.equal(behavior.shouldShowBanner, true);
  assert.equal(behavior.shouldShowList, true);
});

test("a phone notification that fails to send returns false and never throws", async () => {
  const state = phoneState({ status: "granted", failSchedule: true });
  assert.equal(await loadPhone(state).showPhoneNotification({ title: "x", body: "y" }), false);
});

// ---------- walking trip: completed and cancelled ----------

function walkingFixture() {
  let clock = Date.now();
  class TestDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [clock]));
    }
    static now() {
      return clock;
    }
  }
  const timers = new Map();
  let timerId = 0;
  const { react, render } = hookHarness();
  const completed = [];
  const cancelled = [];
  const journey = journeyFor("walk");
  const route = {
    ...journey,
    id: "walk",
    calculatedAt: "original",
    polyline: [a, b],
    distanceMeters: 111,
    durationSeconds: 90,
    steps: [
      {
        id: "one",
        mode: "walk",
        instruction: "Go north",
        polyline: [a, b],
        distanceMeters: 111,
        durationSeconds: 90,
      },
    ],
  };
  const load = createLoader(
    {
      react,
      "../services/routes": { getRoutes: async () => [route] },
      "../services/notifications": {
        notifyTripCompleted: async (...args) => {
          completed.push(args);
          return {};
        },
        notifyTripCancelled: async (...args) => {
          cancelled.push(args);
          return {};
        },
      },
    },
    {
      Date: TestDate,
      setInterval(fn) {
        timers.set(++timerId, fn);
        return timerId;
      },
      clearInterval(id) {
        timers.delete(id);
      },
    },
  );
  const { useWalkingTrip } = load(path.join(root, "src/hooks/useWalkingTrip.js"));
  const fix = (coordinate, accuracyMeters = 10) => ({
    status: "ready",
    inServiceArea: true,
    position: {
      ...coordinate,
      timestamp: new TestDate().toISOString(),
      accuracyMeters,
    },
  });
  const h = render(useWalkingTrip, {
    uid: "account-a",
    journey,
    route,
    snapshot: fix(a),
    refreshLocation: () => Promise.resolve(h.props.snapshot),
    onRouteChange() {},
  });
  const advance = (ms, coordinate) => {
    clock += ms;
    if (coordinate) h.props = { ...h.props, snapshot: fix(coordinate) };
    for (const fn of [...timers.values()]) fn();
    h.flush();
  };
  return { h, advance, completed, cancelled };
}

test("walking: confirming the end of an active trip records one cancelled update", async () => {
  const f = walkingFixture();
  await f.h.result.start();
  f.h.flush();
  f.h.result.cancel();
  f.h.flush();
  assert.equal(f.h.result.state, "idle");
  assert.equal(f.cancelled.length, 1);
  assert.equal(f.cancelled[0][0], "account-a");
  assert.equal(f.cancelled[0][1].journey.destination.id, "B");
  assert.equal(typeof f.cancelled[0][1].tripId, "string");
  assert.equal(f.completed.length, 0);
  f.h.result.cancel(); // nothing left to cancel
  f.h.flush();
  assert.equal(f.cancelled.length, 1);
  f.h.dispose();
});

test("walking: a plain end (not a confirmed cancel) records nothing", async () => {
  const f = walkingFixture();
  await f.h.result.start();
  f.h.flush();
  f.h.result.end();
  f.h.flush();
  assert.equal(f.cancelled.length, 0);
  assert.equal(f.completed.length, 0);
  f.h.dispose();
});

test("walking: cancelling before any trip started records nothing", async () => {
  const f = walkingFixture();
  f.h.result.cancel();
  f.h.flush();
  assert.equal(f.cancelled.length, 0);
  f.h.dispose();
});

test("walking: completion is recorded once, and ending afterwards is not a cancellation", async () => {
  const f = walkingFixture();
  await f.h.result.start();
  f.h.flush();
  f.advance(6000, b);
  assert.equal(f.completed.length, 0); // not finished yet
  f.advance(6000, b);
  assert.equal(f.h.result.state, "arrived");
  assert.equal(f.completed.length, 1);
  f.advance(6000, b);
  assert.equal(f.completed.length, 1);
  f.h.result.cancel(); // the user taps End trip after arriving
  f.h.flush();
  assert.equal(f.cancelled.length, 0);
  assert.equal(f.completed.length, 1);
  f.h.dispose();
});

// ---------- train trip: completed and cancelled ----------

function trainFixture(props = {}) {
  const { react, render } = hookHarness();
  const completed = [];
  const cancelled = [];
  const load = createLoader({
    react,
    "react-native": { Alert: { alert() {} } },
    "../services/notifications": {
      notifyTripCompleted: async (...args) => {
        completed.push(args);
        return {};
      },
      notifyTripCancelled: async (...args) => {
        cancelled.push(args);
        return {};
      },
    },
  });
  const { useTrainTrip } = load(path.join(root, "src/hooks/useTrainTrip.js"));
  const route = {
    id: "train-route",
    preferredMode: "train",
    origin: point("A", a),
    destination: point("B", b),
    distanceMeters: 200,
    steps: [
      {
        id: "walk-1",
        kind: "walk",
        mode: "walk",
        instruction: "Walk to the station",
        polyline: [a, a],
        distanceMeters: 100,
        end: a,
      },
      {
        id: "ride-1",
        kind: "ride",
        mode: "train",
        instruction: "Ride the train",
        alightingStop: "B Station",
        polyline: [a, b],
        distanceMeters: 100,
        end: b,
      },
    ],
  };
  const fix = {
    status: "ready",
    inServiceArea: true,
    position: { ...a, accuracyMeters: 15, timestamp: new Date().toISOString() },
  };
  const h = render(useTrainTrip, {
    uid: "account-a",
    journey: journeyFor("train"),
    route,
    snapshot: fix,
    refreshLocation: async () => fix,
    startTracking: async () => {},
    stopTracking: () => {},
    onRouteChange: () => {},
    ...props,
  });
  return { h, route, completed, cancelled };
}

test("train: completion is recorded only after the last step, and only once", async () => {
  const f = trainFixture();
  assert.equal(await f.h.result.start(), true);
  f.h.flush();
  assert.equal(f.h.result.state, "active");
  f.h.result.advance(); // first of two steps
  f.h.flush();
  assert.equal(f.h.result.state, "active");
  assert.equal(f.completed.length, 0);
  f.h.result.advance(); // last step
  f.h.flush();
  assert.equal(f.h.result.state, "arrived");
  assert.equal(f.completed.length, 1);
  assert.equal(f.completed[0][0], "account-a");
  assert.equal(f.completed[0][1].journey.preferredMode, "train");
  f.h.flush();
  assert.equal(f.completed.length, 1);
  f.h.result.cancel(); // End trip after arriving
  f.h.flush();
  assert.equal(f.cancelled.length, 0);
  f.h.dispose();
});

test("train: confirming the end of an active trip records one cancelled update", async () => {
  const f = trainFixture();
  await f.h.result.start();
  f.h.flush();
  f.h.result.advance();
  f.h.flush();
  f.h.result.cancel();
  f.h.flush();
  assert.equal(f.h.result.state, "idle");
  assert.equal(f.cancelled.length, 1);
  assert.equal(f.cancelled[0][1].journey.destination.id, "B");
  assert.equal(f.completed.length, 0);
  f.h.result.cancel();
  f.h.flush();
  assert.equal(f.cancelled.length, 1);
  f.h.dispose();
});

test("train: a plain end, or cancelling with no trip, records nothing", async () => {
  const f = trainFixture();
  f.h.result.cancel();
  f.h.flush();
  await f.h.result.start();
  f.h.flush();
  f.h.result.end();
  f.h.flush();
  assert.equal(f.cancelled.length, 0);
  assert.equal(f.completed.length, 0);
  f.h.dispose();
});

test("train: without a signed-in account nothing is recorded", async () => {
  const f = trainFixture({ uid: undefined });
  await f.h.result.start();
  f.h.flush();
  f.h.result.advance();
  f.h.result.advance();
  f.h.flush();
  assert.equal(f.h.result.state, "arrived");
  assert.equal(f.completed.length, 0);
  f.h.result.cancel();
  f.h.flush();
  assert.equal(f.cancelled.length, 0);
  f.h.dispose();
});

test("a failed train start records nothing", async () => {
  const f = trainFixture({
    refreshLocation: async () => ({ status: "denied", inServiceArea: false, position: null }),
  });
  assert.equal(await f.h.result.start(), false);
  f.h.flush();
  f.h.result.cancel();
  f.h.flush();
  assert.equal(f.cancelled.length, 0);
  assert.equal(f.completed.length, 0);
  f.h.dispose();
  await settle();
});

test("trip phone alerts wait until leaving the route and are scheduled three seconds later", async () => {
  const state = phoneState({ status: "granted" });
  const phone = loadPhone(state);
  const release = phone.holdTripNotifications("account-a");
  assert.equal(
    await phone.showPhoneNotification({
      uid: "account-a",
      title: "Trip completed",
      body: "Done",
      data: { kind: "completed" },
    }),
    true,
  );
  assert.equal(state.scheduled.length, 0);
  release();
  release();
  await settle();
  assert.equal(state.scheduled.length, 1);
  assert.equal(state.scheduled[0].trigger.seconds, 3);
  assert.equal(state.scheduled[0].trigger.channelId, "trip-updates");
});

test("turning notifications off while an alert is queued prevents it from being sent", async () => {
  const state = phoneState({ status: "granted" });
  const phone = loadPhone(state);
  let enabled = true;
  const release = phone.holdTripNotifications("account-a");
  await phone.showPhoneNotification({
    uid: "account-a",
    title: "Trip completed",
    body: "Done",
    canShow: async () => enabled,
  });
  enabled = false;
  release();
  await settle();
  assert.equal(state.scheduled.length, 0);
});

test("phone permission is checked again when a queued trip alert is released", async () => {
  const state = phoneState({ status: "granted" });
  const phone = loadPhone(state);
  const release = phone.holdTripNotifications("account-a");
  await phone.showPhoneNotification({ uid: "account-a", title: "Trip completed", body: "Done" });
  state.status = "denied";
  release();
  await settle();
  assert.equal(state.scheduled.length, 0);
});

test("backgrounding a route releases queued trip alerts without waiting for the screen to unmount", async () => {
  const state = phoneState({ status: "granted" });
  let change;
  const appState = {
    currentState: "active",
    addEventListener: (_event, callback) => {
      change = callback;
      return { remove() {} };
    },
  };
  const phone = loadPhone(state, { appState });
  const release = phone.holdTripNotifications("account-a");
  await phone.showPhoneNotification({ uid: "account-a", title: "Done", body: "Trip complete" });
  assert.equal(state.scheduled.length, 0);
  appState.currentState = "background";
  change("background");
  await settle();
  assert.equal(state.scheduled.length, 1);
  assert.equal(state.scheduled[0].trigger.seconds, 3);
  release();
  await settle();
  assert.equal(state.scheduled.length, 1);
});

const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");
const hookHarness = require("./helpers/hook-harness.cjs");
const root = path.resolve(__dirname, "..");
const settle = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

function fixture({ scheduling, listingFails = false } = {}) {
  const state = {
    pending: new Map(),
    cancelled: [],
    count: 0,
    appState: { currentState: "active" },
  };
  const native = {
    AndroidImportance: { HIGH: 4 },
    AndroidNotificationPriority: { HIGH: "high" },
    SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
    getPermissionsAsync: async () => ({ granted: true }),
    setNotificationHandler: () => {},
    setNotificationChannelAsync: async () => {},
    scheduleNotificationAsync: async (request) => {
      const id = `scheduled-${++state.count}`;
      if (scheduling) await scheduling.promise;
      state.pending.set(id, { identifier: id, ...request });
      return id;
    },
    getAllScheduledNotificationsAsync: async () => {
      if (listingFails) throw new Error("Cannot list");
      return [...state.pending.values()];
    },
    cancelScheduledNotificationAsync: async (id) => {
      state.cancelled.push(id);
      state.pending.delete(id);
    },
  };
  const load = createLoader({
    "react-native": { Platform: { OS: "android" }, AppState: state.appState },
    "./expoNotificationsModule": { __esModule: true, default: native },
  });
  return {
    state,
    native,
    api: load(path.join(root, "src/services/phoneNotifications.js")),
    load,
  };
}

test("notification cancellation removes only the account's pending trip alerts", async () => {
  const { api, state } = fixture();
  state.pending.set("unrelated", {
    identifier: "unrelated",
    content: { data: { uid: "a" } },
  });
  await api.showPhoneNotification({ title: "A", uid: "a", delaySeconds: 3 });
  await api.showPhoneNotification({ title: "B", uid: "b", delaySeconds: 3 });
  await api.cancelPhoneNotifications("a");
  assert.deepEqual([...state.pending.keys()], ["unrelated", "scheduled-2"]);
  assert.deepEqual(state.cancelled, ["scheduled-1"]);
});

test("tracked IDs still cancel when native request listing fails", async () => {
  const { api, state } = fixture({ listingFails: true });
  await api.showPhoneNotification({ title: "A", uid: "a", delaySeconds: 3 });
  await api.cancelPhoneNotifications("a");
  assert.equal(state.pending.size, 0);
});

test("switching accounts cancels old queued and scheduled alerts and rejects further old-account work", async () => {
  const { api, state } = fixture();
  api.setNotificationAccount("a");
  await api.showPhoneNotification({
    title: "Scheduled",
    uid: "a",
    delaySeconds: 3,
  });
  const release = api.holdTripNotifications("a");
  await api.showPhoneNotification({ title: "Held", uid: "a" });
  api.setNotificationAccount("b");
  release();
  await settle();
  assert.equal(state.pending.size, 0);
  assert.equal(
    await api.showPhoneNotification({ title: "Old", uid: "a" }),
    false,
  );
  assert.equal(
    await api.showPhoneNotification({ title: "New", uid: "b" }),
    true,
  );
});

test("signing out while native scheduling is in flight cancels the returned request", async () => {
  const scheduling = deferred();
  const { api, state } = fixture({ scheduling });
  api.setNotificationAccount("a");
  const sending = api.showPhoneNotification({
    title: "A",
    uid: "a",
    delaySeconds: 3,
  });
  await settle();
  api.setNotificationAccount(null);
  scheduling.resolve();
  assert.equal(await sending, false);
  assert.equal(state.pending.size, 0);
});

test("turning preferences off cancels pending system alerts and suppresses held ones", async () => {
  const { api, load, state } = fixture();
  const data = new Map();
  const storage = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => data.set(key, value),
  };
  const service = createLoader({
    "@react-native-async-storage/async-storage": {
      __esModule: true,
      default: storage,
    },
    "./phoneNotifications": api,
  })(path.join(root, "src/services/notifications.js"));
  await api.showPhoneNotification({
    title: "Scheduled",
    uid: "a",
    delaySeconds: 3,
  });
  const release = api.holdTripNotifications("a");
  await api.showPhoneNotification({ title: "Held", uid: "a" });
  await service.setNotificationPreferences("a", { enabled: false });
  release();
  await settle();
  assert.equal(state.pending.size, 0);
  assert.equal(state.count, 1);
});

test("preferences changing during scheduling cancel the alert even before it can be tracked", async () => {
  const scheduling = deferred();
  const { api, state } = fixture({ scheduling });
  let allowed = true;
  const sending = api.showPhoneNotification({
    title: "A",
    uid: "a",
    delaySeconds: 3,
    canShow: async () => allowed,
  });
  await settle();
  allowed = false;
  scheduling.resolve();
  assert.equal(await sending, false);
  assert.equal(state.pending.size, 0);
});

function routingFixture(lastResponse) {
  const { react, render } = hookHarness();
  const state = {
    routes: [],
    accounts: [],
    listeners: [],
    removed: 0,
    cleared: 0,
  };
  const native = {
    DEFAULT_ACTION_IDENTIFIER: "default",
    getLastNotificationResponseAsync: async () => lastResponse,
    addNotificationResponseReceivedListener: (fn) => {
      state.listeners.push(fn);
      return { remove: () => state.removed++ };
    },
    clearLastNotificationResponseAsync: async () => state.cleared++,
  };
  const load = createLoader({
    react,
    "expo-router": {
      useRouter: () => ({ navigate: (route) => state.routes.push(route) }),
    },
    "../services/expoNotificationsModule": {
      __esModule: true,
      default: native,
    },
    "../services/phoneNotifications": {
      setNotificationAccount: (uid) => state.accounts.push(uid),
      clearNotificationAccount: (uid) => state.accounts.push(`clear:${uid}`),
    },
  });
  const hook = load(
    path.join(root, "src/hooks/useTripNotificationRouting.js"),
  ).useTripNotificationRouting;
  const h = render(({ uid }) => hook(uid), { uid: "a" });
  return { state, h };
}
const response = (uid, id = "request-1", data = {}) => ({
  actionIdentifier: "default",
  notification: {
    request: {
      identifier: id,
      content: {
        data: { uid, samahanTrip: true, notificationId: "record-1", ...data },
      },
    },
  },
});

test("a notification cold-start and listener tap open the notification list once for the signed-in account", async () => {
  const notice = response("a");
  const { state, h } = routingFixture(notice);
  await settle();
  state.listeners[0](notice);
  assert.deepEqual(state.routes, ["/(tabs)/notifications"]);
  assert.equal(state.cleared, 1);
  h.dispose();
  assert.equal(state.removed, 1);
});

test("an alert waits for its matching account and cannot navigate after unmount", async () => {
  const notice = response("b");
  const { state, h } = routingFixture(notice);
  await settle();
  assert.equal(state.routes.length, 0);
  h.props = { uid: "b" };
  h.flush();
  await settle();
  assert.equal(state.routes.length, 1);
  state.listeners[0](response("a", "late"));
  assert.equal(state.routes.length, 1);
  h.dispose();
  state.listeners[1](response("b", "late"));
  assert.equal(state.routes.length, 1);
});

test("unrelated, incomplete and custom-action notifications cannot open trip history", async () => {
  const { state, h } = routingFixture(null);
  await settle();
  for (const notice of [
    response("other"),
    response("a", "x", { samahanTrip: false }),
    response("a", "x", { notificationId: null }),
    { ...response("a"), actionIdentifier: "custom" },
    null,
  ]) {
    state.listeners[0](notice);
  }
  assert.equal(state.routes.length, 0);
  h.dispose();
});

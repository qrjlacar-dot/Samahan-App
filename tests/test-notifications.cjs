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

// The app code runs in a separate vm context, so compare plain copies of its
// objects and arrays (a direct deepEqual would fail on different prototypes).
const same = (actual, expected) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);

// Uses the real shared constants so category/mode names always match the app.
const commute = loadSource("src/constants/commute.js", {});

function storageMock(storage, overrides = {}) {
  return {
    __esModule: true,
    default: {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => {
        storage.set(key, value);
      },
      ...overrides,
    },
  };
}

// Phone notifications are mocked: every call is recorded in `phone.calls`.
function loadApi(storage, overrides, phone = {}) {
  phone.calls ??= [];
  return loadSource("src/services/notifications.js", {
    "@react-native-async-storage/async-storage": storageMock(storage, overrides),
    "../constants/commute": commute,
    "./phoneNotifications": {
      showPhoneNotification: async (notification) => {
        if (phone.fail) throw new Error("phone failed");
        phone.calls.push(notification);
        return true;
      },
    },
  });
}

const place = (id, name = id) => ({
  id,
  name,
  address: `${name}, Quezon City`,
  coordinate: { latitude: 14.6189, longitude: 121.0531 },
  source: "verified-local",
});

const journey = (overrides = {}) => ({
  origin: place("tip-qc", "TIP Quezon City"),
  destination: place("gateway-mall", "Gateway Mall"),
  preferredMode: "jeep",
  ticketType: "regular",
  ...overrides,
});

const event = (overrides = {}) => ({
  eventId: "favorite-saved:fav_1",
  category: "favorites",
  title: "Favorite saved",
  body: "TIP Quezon City to Gateway Mall was added to your favorites.",
  target: { screen: "favorites" },
  ...overrides,
});

test("preferences default to on, then save and reload", async () => {
  const api = loadApi(new Map());
  same(await api.getNotificationPreferences("account-a"), { enabled: true });
  const saved = await api.setNotificationPreferences("account-a", { enabled: false });
  same(saved, { enabled: false });
  same(await api.getNotificationPreferences("account-a"), { enabled: false });
});

test("the saved preference survives an app restart", async () => {
  const storage = new Map();
  await loadApi(storage).setNotificationPreferences("account-a", { enabled: false });
  const restarted = loadApi(storage); // new module instance, same device storage
  same(await restarted.getNotificationPreferences("account-a"), {
    enabled: false,
  });
});

test("preferences stay separate across accounts", async () => {
  const api = loadApi(new Map());
  await api.setNotificationPreferences("account-a", { enabled: false });
  assert.equal((await api.getNotificationPreferences("account-b")).enabled, true);
  await api.setNotificationPreferences("account-b", { enabled: true });
  assert.equal((await api.getNotificationPreferences("account-a")).enabled, false);
});

test("a preference must be a true/false value", async () => {
  const api = loadApi(new Map());
  await assert.rejects(() => api.setNotificationPreferences("account-a", {}));
  await assert.rejects(() => api.setNotificationPreferences("account-a", { enabled: "yes" }));
  await assert.rejects(() => api.setNotificationPreferences("account-a", null));
});

test("a corrupt saved preference falls back to on", async () => {
  const storage = new Map([["samahan:notification-preferences:v1:account-a", "{oops"]]);
  const api = loadApi(storage);
  assert.equal((await api.getNotificationPreferences("account-a")).enabled, true);
});

test("a notification is stored with id, time, unread status, and target", async () => {
  const api = loadApi(new Map());
  const created = await api.addNotification("account-a", event());
  assert.equal(typeof created.id, "string");
  assert.equal(Number.isNaN(Date.parse(created.createdAt)), false);
  assert.equal(created.readAt, null);
  same(created.target, { screen: "favorites" });
  const list = await api.loadNotifications("account-a");
  assert.equal(list.length, 1);
  assert.equal(list[0].title, "Favorite saved");
  assert.equal(list[0].category, "favorites");
});

test("notifications load newest first", async () => {
  const storage = new Map();
  const api = loadApi(storage);
  await api.addNotification("account-a", event({ eventId: "e1", title: "First" }));
  await api.addNotification("account-a", event({ eventId: "e2", title: "Second" }));
  const stored = JSON.parse(storage.get("samahan:notifications:v1:account-a"));
  stored[0].createdAt = "2026-10-19T10:00:00.000Z"; // e2
  stored[1].createdAt = "2026-10-19T09:00:00.000Z"; // e1
  storage.set("samahan:notifications:v1:account-a", JSON.stringify(stored));
  const list = await api.loadNotifications("account-a");
  same(
    list.map((item) => item.title),
    ["Second", "First"],
  );
});

test("the same eventId creates only one notification", async () => {
  const api = loadApi(new Map());
  const first = await api.addNotification("account-a", event());
  const second = await api.addNotification("account-a", event());
  assert.equal(second.id, first.id);
  assert.equal((await api.loadNotifications("account-a")).length, 1);
});

test("quick repeated or simultaneous events are not duplicated or lost", async () => {
  const api = loadApi(new Map());
  await Promise.all([
    api.addNotification("account-a", event({ eventId: "same" })),
    api.addNotification("account-a", event({ eventId: "same" })),
    api.addNotification("account-a", event({ eventId: "other-1" })),
    api.addNotification("account-a", event({ eventId: "other-2" })),
  ]);
  const list = await api.loadNotifications("account-a");
  assert.equal(list.length, 3);
  same(list.map((item) => item.eventId).sort(), ["other-1", "other-2", "same"]);
});

test("notifications stay separate across accounts", async () => {
  const api = loadApi(new Map());
  await api.addNotification("account-a", event());
  assert.equal((await api.loadNotifications("account-b")).length, 0);
  await api.addNotification("account-b", event()); // same eventId, other account
  assert.equal((await api.loadNotifications("account-a")).length, 1);
  assert.equal((await api.loadNotifications("account-b")).length, 1);
});

test("marking read saves the time once and leaves others unread", async () => {
  const api = loadApi(new Map());
  const a = await api.addNotification("account-a", event({ eventId: "e1" }));
  await api.addNotification("account-a", event({ eventId: "e2" }));
  await api.markNotificationRead("account-a", a.id);
  const firstRead = (await api.loadNotifications("account-a")).find(
    (item) => item.id === a.id,
  ).readAt;
  assert.equal(Number.isNaN(Date.parse(firstRead)), false);
  await api.markNotificationRead("account-a", a.id); // second time changes nothing
  const list = await api.loadNotifications("account-a");
  assert.equal(list.find((item) => item.id === a.id).readAt, firstRead);
  assert.equal(list.filter((item) => item.readAt === null).length, 1);
});

test("marking an unknown id or another account's id changes nothing", async () => {
  const api = loadApi(new Map());
  const a = await api.addNotification("account-a", event());
  await api.markNotificationRead("account-a", "missing-id");
  await api.markNotificationRead("account-b", a.id);
  assert.equal((await api.loadNotifications("account-a"))[0].readAt, null);
});

test("deleting removes only that notification and not another account's", async () => {
  const api = loadApi(new Map());
  const a1 = await api.addNotification("account-a", event({ eventId: "e1" }));
  await api.addNotification("account-a", event({ eventId: "e2" }));
  await api.addNotification("account-b", event({ eventId: "e1" }));
  await api.removeNotification("account-a", a1.id);
  const listA = await api.loadNotifications("account-a");
  same(
    listA.map((item) => item.eventId),
    ["e2"],
  );
  assert.equal((await api.loadNotifications("account-b")).length, 1);
  await api.removeNotification("account-a", "missing-id"); // no error
  assert.equal((await api.loadNotifications("account-a")).length, 1);
});

test("a directions target keeps the full journey choices", async () => {
  const api = loadApi(new Map());
  const created = await api.addNotification(
    "account-a",
    event({
      eventId: "arrival:t1",
      category: "trips",
      target: { screen: "directions", journey: journey() },
    }),
  );
  assert.equal(created.target.screen, "directions");
  assert.equal(created.target.journey.origin.id, "tip-qc");
  assert.equal(created.target.journey.destination.name, "Gateway Mall");
  assert.equal(created.target.journey.preferredMode, "jeep");
  assert.equal(created.target.journey.ticketType, "regular");
});

test("invalid notifications and missing accounts are rejected", async () => {
  const api = loadApi(new Map());
  await assert.rejects(() => api.addNotification("account-a", event({ eventId: "" })));
  await assert.rejects(() => api.addNotification("account-a", event({ category: "weather" })));
  await assert.rejects(() => api.addNotification("account-a", event({ title: "  " })));
  await assert.rejects(() =>
    api.addNotification("account-a", event({ target: { screen: "home" } })),
  );
  await assert.rejects(() =>
    api.addNotification(
      "account-a",
      event({ target: { screen: "directions", journey: { origin: place("x") } } }),
    ),
  );
  await assert.rejects(() => api.addNotification("account-a", null));
  await assert.rejects(() => api.addNotification("", event()));
  await assert.rejects(() => api.loadNotifications(undefined));
  await assert.rejects(() => api.getNotificationPreferences(""));
  assert.equal((await api.loadNotifications("account-a")).length, 0);
});

test("a null target is allowed", async () => {
  const api = loadApi(new Map());
  const created = await api.addNotification("account-a", event({ target: null }));
  assert.equal(created.target, null);
});

test("corrupt or invalid saved data is ignored", async () => {
  const storage = new Map([["samahan:notifications:v1:account-a", "{oops"]]);
  const api = loadApi(storage);
  same(await api.loadNotifications("account-a"), []);
  storage.set("samahan:notifications:v1:account-a", JSON.stringify([{ id: "bad" }, null, "text"]));
  same(await api.loadNotifications("account-a"), []);
  const created = await api.addNotification("account-a", event());
  assert.equal((await api.loadNotifications("account-a"))[0].id, created.id);
});

test("only the newest 100 notifications are kept", async () => {
  const api = loadApi(new Map());
  for (let i = 1; i <= 105; i += 1) {
    await api.addNotification("account-a", event({ eventId: `e${i}`, title: `Event ${i}` }));
  }
  const list = await api.loadNotifications("account-a");
  assert.equal(list.length, 100);
  assert.equal(
    list.some((item) => item.eventId === "e105"),
    true,
  );
  assert.equal(
    list.some((item) => item.eventId === "e1"),
    false,
  );
});

test("a failed save is reported and later saves still work", async () => {
  const storage = new Map();
  let fail = true;
  const api = loadApi(storage, {
    setItem: async (key, value) => {
      if (fail) throw new Error("disk full");
      storage.set(key, value);
    },
  });
  await assert.rejects(() => api.addNotification("account-a", event()), /disk full/);
  assert.equal((await api.loadNotifications("account-a")).length, 0);
  fail = false;
  assert.notEqual(await api.addNotification("account-a", event()), null);
  assert.equal((await api.loadNotifications("account-a")).length, 1);
});

test("a notification is saved even when phone notifications are switched off", async () => {
  const phone = {};
  const api = loadApi(new Map(), undefined, phone);
  await api.setNotificationPreferences("account-a", { enabled: false });
  const created = await api.addNotification("account-a", event({ eventId: "while-off" }));
  assert.equal(created.eventId, "while-off");
  assert.equal((await api.loadNotifications("account-a")).length, 1);
});

test("trip completed: saved with title, trip text and a Directions target, newest first", async () => {
  const phone = {};
  const api = loadApi(new Map(), undefined, phone);
  const saved = await api.notifyTripCompleted("account-a", { tripId: "t1", journey: journey() });
  assert.equal(saved.title, "Trip completed");
  assert.equal(saved.category, "trips");
  assert.equal(saved.eventId, "trip-completed:t1");
  assert.equal(saved.body, "Your jeepney trip to Gateway Mall is complete.");
  assert.equal(saved.readAt, null);
  assert.equal(saved.target.screen, "directions");
  assert.equal(saved.target.journey.destination.id, "gateway-mall");
  const walking = await api.notifyTripCompleted("account-a", {
    tripId: "t2",
    journey: journey({ preferredMode: "walk" }),
  });
  assert.equal(walking.body, "Your walking trip to Gateway Mall is complete.");
  const list = await api.loadNotifications("account-a");
  assert.equal(list.length, 2);
});

test("trip cancelled: saved with its own title and text", async () => {
  const api = loadApi(new Map());
  const saved = await api.notifyTripCancelled("account-a", {
    tripId: "t1",
    journey: journey({ preferredMode: "train" }),
  });
  assert.equal(saved.title, "Trip cancelled");
  assert.equal(saved.eventId, "trip-cancelled:t1");
  assert.equal(saved.body, "Your train trip to Gateway Mall was cancelled.");
  assert.equal(saved.category, "trips");
});

test("a phone notification is shown once per new trip update", async () => {
  const phone = {};
  const api = loadApi(new Map(), undefined, phone);
  const update = { tripId: "t1", journey: journey({ preferredMode: "walk" }) };
  const first = await api.notifyTripCompleted("account-a", update);
  const repeat = await api.notifyTripCompleted("account-a", update);
  assert.equal(repeat.id, first.id);
  assert.equal((await api.loadNotifications("account-a")).length, 1);
  assert.equal(phone.calls.length, 1);
  assert.equal(phone.calls[0].title, "Trip completed");
  assert.equal(phone.calls[0].body, first.body);
  await api.notifyTripCancelled("account-a", { tripId: "t2", journey: update.journey });
  assert.equal(phone.calls.length, 2);
  assert.equal(phone.calls[1].title, "Trip cancelled");
});

test("simultaneous repeats of one trip update save and show it only once", async () => {
  const phone = {};
  const api = loadApi(new Map(), undefined, phone);
  const update = { tripId: "t1", journey: journey() };
  await Promise.all([
    api.notifyTripCompleted("account-a", update),
    api.notifyTripCompleted("account-a", update),
    api.notifyTripCompleted("account-a", update),
  ]);
  assert.equal((await api.loadNotifications("account-a")).length, 1);
  assert.equal(phone.calls.length, 1);
});

test("trip updates are still saved, but no phone notification, when the switch is off", async () => {
  const phone = {};
  const api = loadApi(new Map(), undefined, phone);
  await api.setNotificationPreferences("account-a", { enabled: false });
  const saved = await api.notifyTripCompleted("account-a", { tripId: "t1", journey: journey() });
  const cancelled = await api.notifyTripCancelled("account-a", {
    tripId: "t2",
    journey: journey(),
  });
  assert.notEqual(saved, null);
  assert.notEqual(cancelled, null);
  assert.equal((await api.loadNotifications("account-a")).length, 2);
  assert.equal(phone.calls.length, 0);
  await api.setNotificationPreferences("account-a", { enabled: true });
  await api.notifyTripCompleted("account-a", { tripId: "t3", journey: journey() });
  assert.equal(phone.calls.length, 1);
});

test("the switch of one account does not affect another account's phone notifications", async () => {
  const phone = {};
  const api = loadApi(new Map(), undefined, phone);
  await api.setNotificationPreferences("account-a", { enabled: false });
  await api.notifyTripCompleted("account-a", { tripId: "t1", journey: journey() });
  await api.notifyTripCompleted("account-b", { tripId: "t1", journey: journey() });
  assert.equal(phone.calls.length, 1);
  assert.equal((await api.loadNotifications("account-a")).length, 1);
  assert.equal((await api.loadNotifications("account-b")).length, 1);
});

test("a failing phone notification never stops the update from being saved", async () => {
  const phone = { fail: true };
  const api = loadApi(new Map(), undefined, phone);
  const saved = await api.notifyTripCancelled("account-a", { tripId: "t1", journey: journey() });
  assert.notEqual(saved, null);
  assert.equal((await api.loadNotifications("account-a")).length, 1);
});

test("a trip update with an unusable journey is still saved, without a target", async () => {
  const api = loadApi(new Map());
  const saved = await api.notifyTripCompleted("account-a", { tripId: "t1", journey: null });
  assert.equal(saved.target, null);
  assert.equal(saved.body, "Your trip to your destination is complete.");
});

test("trip update helpers never throw, even when saving fails or input is missing", async () => {
  const api = loadApi(new Map(), {
    setItem: async () => {
      throw new Error("disk full");
    },
  });
  assert.equal(
    await api.notifyTripCompleted("account-a", { tripId: "t1", journey: journey() }),
    null,
  );
  assert.equal(
    await api.notifyTripCancelled("account-a", { tripId: "t1", journey: journey() }),
    null,
  );
  assert.equal(await api.notifyTripCompleted("", { tripId: "t1", journey: journey() }), null);
  assert.equal(await api.notifyTripCompleted("account-a", null), null);
  assert.equal(await api.notifyTripCancelled("account-a", { journey: journey() }), null);
});

test("Favorite saved is no longer a notification", async () => {
  const api = loadApi(new Map());
  assert.equal(api.notifyFavoriteSaved, undefined);
  assert.equal(api.notifyArrival, undefined);
});

test("a new account should be asked once; a saved choice or being asked stops it", async () => {
  const api = loadApi(new Map());
  assert.equal(await api.shouldAskNotificationPermission("account-a"), true);
  await api.markNotificationPermissionAsked("account-a");
  assert.equal(await api.shouldAskNotificationPermission("account-a"), false);
  assert.equal(await api.shouldAskNotificationPermission("account-b"), true);
  await api.setNotificationPreferences("account-b", { enabled: false });
  assert.equal(await api.shouldAskNotificationPermission("account-b"), false);
});

test("the question is remembered after an app restart", async () => {
  const storage = new Map();
  await loadApi(storage).markNotificationPermissionAsked("account-a");
  assert.equal(await loadApi(storage).shouldAskNotificationPermission("account-a"), false);
});

test("the question needs a signed-in account", async () => {
  const api = loadApi(new Map());
  await assert.rejects(() => api.shouldAskNotificationPermission(""));
  await assert.rejects(() => api.markNotificationPermissionAsked(undefined));
});

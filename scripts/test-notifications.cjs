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
const same = (actual, expected) =>
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);

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

function loadApi(storage, overrides) {
  return loadSource("src/services/notifications.js", {
    "@react-native-async-storage/async-storage": storageMock(storage, overrides),
    "../constants/commute": commute,
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
  same(list.map((item) => item.title), ["Second", "First"]);
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

test("switching notifications off blocks new events but keeps existing ones", async () => {
  const api = loadApi(new Map());
  await api.addNotification("account-a", event({ eventId: "before" }));
  await api.setNotificationPreferences("account-a", { enabled: false });
  assert.equal(await api.addNotification("account-a", event({ eventId: "while-off" })), null);
  const list = await api.loadNotifications("account-a");
  same(list.map((item) => item.eventId), ["before"]);
  await api.setNotificationPreferences("account-a", { enabled: true });
  const back = await api.addNotification("account-a", event({ eventId: "after" }));
  assert.equal(back.eventId, "after");
  assert.equal((await api.loadNotifications("account-a")).length, 2);
});

test("notifications stay separate across accounts", async () => {
  const api = loadApi(new Map());
  await api.addNotification("account-a", event());
  assert.equal((await api.loadNotifications("account-b")).length, 0);
  await api.addNotification("account-b", event()); // same eventId, other account
  assert.equal((await api.loadNotifications("account-a")).length, 1);
  assert.equal((await api.loadNotifications("account-b")).length, 1);
});

test("turning notifications off for one account does not block another", async () => {
  const api = loadApi(new Map());
  await api.setNotificationPreferences("account-a", { enabled: false });
  assert.equal(await api.addNotification("account-a", event()), null);
  assert.notEqual(await api.addNotification("account-b", event()), null);
});

test("marking read saves the time once and leaves others unread", async () => {
  const api = loadApi(new Map());
  const a = await api.addNotification("account-a", event({ eventId: "e1" }));
  await api.addNotification("account-a", event({ eventId: "e2" }));
  await api.markNotificationRead("account-a", a.id);
  const firstRead = (await api.loadNotifications("account-a")).find((item) => item.id === a.id)
    .readAt;
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
  same(listA.map((item) => item.eventId), ["e2"]);
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
  await assert.rejects(() => api.addNotification("account-a", event({ target: { screen: "home" } })));
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
  storage.set(
    "samahan:notifications:v1:account-a",
    JSON.stringify([{ id: "bad" }, null, "text"]),
  );
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
  assert.equal(list.some((item) => item.eventId === "e105"), true);
  assert.equal(list.some((item) => item.eventId === "e1"), false);
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

test("favorite saved: one notification per new favorite, repeats are ignored", async () => {
  const api = loadApi(new Map());
  const favorite = { id: "fav_1", ...journey(), createdAt: new Date().toISOString() };
  const first = await api.notifyFavoriteSaved("account-a", favorite);
  const repeat = await api.notifyFavoriteSaved("account-a", favorite);
  assert.equal(repeat.id, first.id);
  assert.equal(first.category, "favorites");
  same(first.target, { screen: "favorites" });
  assert.match(first.body, /TIP Quezon City to Gateway Mall/);
  await api.notifyFavoriteSaved("account-a", { ...favorite, id: "fav_2" });
  assert.equal((await api.loadNotifications("account-a")).length, 2);
});

test("arrival: repeated GPS callbacks for one trip create one notification", async () => {
  const api = loadApi(new Map());
  const arrival = { tripId: "trip-1", journey: journey() };
  const results = await Promise.all([
    api.notifyArrival("account-a", arrival),
    api.notifyArrival("account-a", arrival),
    api.notifyArrival("account-a", arrival),
  ]);
  assert.equal(new Set(results.map((item) => item.id)).size, 1);
  const list = await api.loadNotifications("account-a");
  assert.equal(list.length, 1);
  assert.equal(list[0].category, "trips");
  assert.equal(list[0].target.screen, "directions");
  assert.match(list[0].body, /Gateway Mall/);
  await api.notifyArrival("account-a", { tripId: "trip-2", journey: journey() });
  assert.equal((await api.loadNotifications("account-a")).length, 2);
});

test("event helpers never throw, even when notifications cannot be saved", async () => {
  const api = loadApi(new Map(), {
    setItem: async () => {
      throw new Error("disk full");
    },
  });
  const favorite = { id: "fav_1", ...journey(), createdAt: new Date().toISOString() };
  assert.equal(await api.notifyFavoriteSaved("account-a", favorite), null);
  assert.equal(await api.notifyArrival("account-a", { tripId: "t1", journey: journey() }), null);
  assert.equal(await api.notifyFavoriteSaved("", favorite), null);
  assert.equal(await api.notifyFavoriteSaved("account-a", null), null);
  assert.equal(await api.notifyArrival("account-a", { journey: journey() }), null);
});

test("event helpers respect the off switch", async () => {
  const api = loadApi(new Map());
  await api.setNotificationPreferences("account-a", { enabled: false });
  const favorite = { id: "fav_1", ...journey(), createdAt: new Date().toISOString() };
  assert.equal(await api.notifyFavoriteSaved("account-a", favorite), null);
  assert.equal(await api.notifyArrival("account-a", { tripId: "t1", journey: journey() }), null);
  assert.equal((await api.loadNotifications("account-a")).length, 0);
});

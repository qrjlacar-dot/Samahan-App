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

// Uses the real shared constants so mode/ticket names always match the app.
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

function loadFavoritesApi(storage, overrides) {
  return loadSource("src/services/favorites.js", {
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

test("favorites save, load, and keep the full journey choices", async () => {
  const api = loadFavoritesApi(new Map());
  const saved = await api.saveFavorite("account-a", journey());
  assert.equal(typeof saved.id, "string");
  assert.equal(Number.isNaN(Date.parse(saved.createdAt)), false);
  const list = await api.loadFavorites("account-a");
  assert.equal(list.length, 1);
  assert.equal(list[0].origin.id, "tip-qc");
  assert.equal(list[0].destination.name, "Gateway Mall");
  assert.equal(list[0].preferredMode, "jeep");
  assert.equal(list[0].ticketType, "regular");
});

test("favorites stay separate across accounts", async () => {
  const api = loadFavoritesApi(new Map());
  await api.saveFavorite("account-a", journey());
  assert.equal((await api.loadFavorites("account-b")).length, 0);
  await api.saveFavorite("account-b", journey({ preferredMode: "bus" }));
  const a = await api.loadFavorites("account-a");
  const b = await api.loadFavorites("account-b");
  assert.equal(a.length, 1);
  assert.equal(b.length, 1);
  assert.equal(a[0].preferredMode, "jeep");
  assert.equal(b[0].preferredMode, "bus");
});

test("removing one account's favorite does not touch another account", async () => {
  const api = loadFavoritesApi(new Map());
  const a = await api.saveFavorite("account-a", journey());
  await api.saveFavorite("account-b", journey());
  await api.removeFavorite("account-a", a.id);
  assert.equal((await api.loadFavorites("account-a")).length, 0);
  assert.equal((await api.loadFavorites("account-b")).length, 1);
});

test("saving the same journey twice keeps one favorite", async () => {
  const api = loadFavoritesApi(new Map());
  const first = await api.saveFavorite("account-a", journey());
  const second = await api.saveFavorite("account-a", journey());
  assert.equal(second.id, first.id);
  assert.equal((await api.loadFavorites("account-a")).length, 1);
});

test("a different ticket type, mode, or destination is a different favorite", async () => {
  const api = loadFavoritesApi(new Map());
  await api.saveFavorite("account-a", journey());
  await api.saveFavorite("account-a", journey({ ticketType: "discounted" }));
  await api.saveFavorite("account-a", journey({ preferredMode: "bus" }));
  await api.saveFavorite(
    "account-a",
    journey({ destination: place("anonas-station", "LRT 2 Anonas") }),
  );
  assert.equal((await api.loadFavorites("account-a")).length, 4);
});

test("quick simultaneous saves do not overwrite each other", async () => {
  const api = loadFavoritesApi(new Map());
  await Promise.all(
    ["p1", "p2", "p3", "p4", "p5"].map((id) =>
      api.saveFavorite("account-a", journey({ destination: place(id) })),
    ),
  );
  assert.equal((await api.loadFavorites("account-a")).length, 5);
});

test("simultaneous saves of the same journey create only one favorite", async () => {
  const api = loadFavoritesApi(new Map());
  const results = await Promise.all([
    api.saveFavorite("account-a", journey()),
    api.saveFavorite("account-a", journey()),
    api.saveFavorite("account-a", journey()),
  ]);
  assert.equal(new Set(results.map((item) => item.id)).size, 1);
  assert.equal((await api.loadFavorites("account-a")).length, 1);
});

test("favorites survive reloading the app on the same device", async () => {
  const storage = new Map();
  const first = loadFavoritesApi(storage);
  const saved = await first.saveFavorite("account-a", journey());
  const reloaded = loadFavoritesApi(storage);
  const list = await reloaded.loadFavorites("account-a");
  assert.equal(list.length, 1);
  assert.equal(list[0].id, saved.id);
});

test("removing a favorite persists after reloading", async () => {
  const storage = new Map();
  const api = loadFavoritesApi(storage);
  const saved = await api.saveFavorite("account-a", journey());
  await api.removeFavorite("account-a", saved.id);
  assert.equal((await loadFavoritesApi(storage).loadFavorites("account-a")).length, 0);
});

test("removing an unknown favorite is harmless", async () => {
  const api = loadFavoritesApi(new Map());
  await api.saveFavorite("account-a", journey());
  await api.removeFavorite("account-a", "does-not-exist");
  assert.equal((await api.loadFavorites("account-a")).length, 1);
});

test("favorites load newest first", async () => {
  const api = loadFavoritesApi(new Map());
  await api.saveFavorite("account-a", journey({ destination: place("older") }));
  await new Promise((resolve) => setTimeout(resolve, 5));
  await api.saveFavorite("account-a", journey({ destination: place("newer") }));
  const list = await api.loadFavorites("account-a");
  assert.equal(list[0].destination.id, "newer");
  assert.equal(list[1].destination.id, "older");
});

test("findFavorite supports the Directions heart state", async () => {
  const api = loadFavoritesApi(new Map());
  assert.equal(await api.findFavorite("account-a", journey()), null);
  const saved = await api.saveFavorite("account-a", journey());
  assert.equal((await api.findFavorite("account-a", journey())).id, saved.id);
  assert.equal(
    await api.findFavorite("account-a", journey({ ticketType: "discounted" })),
    null,
  );
  assert.equal(await api.findFavorite("account-b", journey()), null);
  assert.equal(await api.findFavorite("account-a", { origin: null }), null);
});

test("favorites need a signed-in account", async () => {
  const api = loadFavoritesApi(new Map());
  for (const uid of [undefined, null, "", "   ", 123]) {
    await assert.rejects(api.loadFavorites(uid));
    await assert.rejects(api.saveFavorite(uid, journey()));
    await assert.rejects(api.removeFavorite(uid, "x"));
  }
});

test("invalid journeys are rejected and nothing is stored", async () => {
  const storage = new Map();
  const api = loadFavoritesApi(storage);
  const bad = [
    null,
    {},
    journey({ origin: null }),
    journey({ destination: { id: "", name: "x", address: "x", coordinate: { latitude: 1, longitude: 1 }, source: "google" } }),
    journey({ destination: { ...place("x"), coordinate: { latitude: "1", longitude: 2 } } }),
    journey({ destination: { ...place("x"), source: "unknown" } }),
    journey({ preferredMode: "tricycle" }),
    journey({ preferredMode: undefined }),
    journey({ ticketType: "student" }),
    journey({ ticketType: null }),
  ];
  for (const item of bad) {
    await assert.rejects(api.saveFavorite("account-a", item));
  }
  assert.equal(storage.size, 0);
});

test("saved favorites keep only the journey fields, not extra data", async () => {
  const api = loadFavoritesApi(new Map());
  const input = journey();
  input.fare = 14;
  input.eta = 600;
  input.origin.openingHours = "24 hours";
  const saved = await api.saveFavorite("account-a", input);
  assert.equal("fare" in saved, false);
  assert.equal("eta" in saved, false);
  assert.equal("openingHours" in saved.origin, false);
});

test("corrupted stored data loads as empty instead of crashing", async () => {
  const storage = new Map();
  const api = loadFavoritesApi(storage);
  storage.set("samahan:favorites:v1:account-a", "{not json");
  assert.equal((await api.loadFavorites("account-a")).length, 0);
  storage.set("samahan:favorites:v1:account-a", JSON.stringify({ a: 1 }));
  assert.equal((await api.loadFavorites("account-a")).length, 0);
  // A new save still works after corruption.
  await api.saveFavorite("account-a", journey());
  assert.equal((await api.loadFavorites("account-a")).length, 1);
});

test("invalid stored entries are skipped but valid ones are kept", async () => {
  const storage = new Map();
  const api = loadFavoritesApi(storage);
  const saved = await api.saveFavorite("account-a", journey());
  const raw = JSON.parse(storage.get("samahan:favorites:v1:account-a"));
  raw.push({ id: "broken" }, null, "text");
  storage.set("samahan:favorites:v1:account-a", JSON.stringify(raw));
  const list = await api.loadFavorites("account-a");
  assert.equal(list.length, 1);
  assert.equal(list[0].id, saved.id);
});

test("failed storage reports the error and later saves still work", async () => {
  const storage = new Map();
  let fail = true;
  const api = loadFavoritesApi(storage, {
    setItem: async (key, value) => {
      if (fail) throw new Error("storage full");
      storage.set(key, value);
    },
  });
  await assert.rejects(api.saveFavorite("account-a", journey()), /storage full/);
  assert.equal((await api.loadFavorites("account-a")).length, 0);
  fail = false;
  await api.saveFavorite("account-a", journey());
  assert.equal((await api.loadFavorites("account-a")).length, 1);
});

test("failed storage while loading reports the error", async () => {
  const api = loadFavoritesApi(new Map(), {
    getItem: async () => {
      throw new Error("read failed");
    },
  });
  await assert.rejects(api.loadFavorites("account-a"), /read failed/);
});

test("favorites accept places found through Geoapify search", async () => {
  const api = loadFavoritesApi(new Map());
  const saved = await api.saveFavorite(
    "account-a",
    journey({
      origin: { ...place("tip-qc"), source: "geoapify" },
      destination: { ...place("gateway-mall"), source: "geoapify" },
      preferredMode: "walk",
    }),
  );
  assert.equal(saved.origin.source, "geoapify");
  assert.equal((await api.loadFavorites("account-a")).length, 1);
});
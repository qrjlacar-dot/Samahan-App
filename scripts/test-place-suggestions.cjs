const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");
const hookHarness = require("./helpers/hook-harness.cjs");

function fixture(respond = async () => ({ features: [] })) {
  const requests = [];
  const load = createLoader({}, {
    process: { env: { EXPO_PUBLIC_GEOAPIFY_API_KEY: "mock-key" } },
    fetch: async (url, options) => {
      const params = new URL(url).searchParams;
      requests.push(params);
      const data = await respond(params, options);
      return { ok: true, status: 200, json: async () => data };
    },
  });
  return { ...load(path.resolve(__dirname, "../src/services/routes.js")), requests };
}
const feature = (id, name = id, lat = 14.625, lon = 121.06) => ({
  properties: { place_id: id, name, lat, lon, formatted: `${name}, Cubao` },
});
const ids = results => Array.from(results, place => place.id);

test("partial text goes unchanged to live place and address autocomplete", async () => {
  const f = fixture();
  assert.deepEqual(ids(await f.searchPlaces("  exa  ")), []);
  assert.equal(f.requests.length, 2);
  assert.deepEqual(f.requests.map(p => p.get("type")), ["amenity", null]);
  for (const p of f.requests) {
    assert.equal(p.get("text"), "exa");
    assert.equal(p.get("filter"), "rect:121.03,14.6,121.08,14.645|countrycode:ph");
    assert.match(p.get("bias"), /^proximity:/);
  }
});

test("an arbitrary provider business is selectable without a local landmark entry", async () => {
  const f = fixture(async p => ({ features: p.get("type") ? [feature("cafe-123", "Example Cafe")] : [] }));
  const [place] = await f.searchPlaces("ex");
  assert.equal(place.name, "Example Cafe");
  assert.equal(place.source, "geoapify");
  assert.equal(place.coordinate.latitude, 14.625);
});

test("place suggestions merge with addresses and duplicate provider IDs appear once", async () => {
  const business = feature("cafe", "Example Cafe");
  const f = fixture(async p => ({ features: p.get("type") ? [business] : [business, feature("street", "Example Street")] }));
  assert.deepEqual(ids(await f.searchPlaces("exa")), ["cafe", "street"]);
});

test("same name and coordinates deduplicate across IDs without merging different branches", async () => {
  const f = fixture(async () => ({ features: [feature("a", "Cafe"), feature("b", "Cafe"), feature("c", "Cafe", 14.63)] }));
  assert.deepEqual(ids(await f.searchPlaces("caf")), ["a", "c"]);
});

test("outside and invalid provider coordinates are excluded", async () => {
  const f = fixture(async () => ({ features: [null, feature("outside", "Cafe", 14.8), feature("invalid", "Cafe", null), feature("inside")] }));
  assert.deepEqual(ids(await f.searchPlaces("caf")), ["inside"]);
});

test("known landmark names are not invented when the live provider has no match", async () => {
  const f = fixture();
  assert.deepEqual(ids(await f.searchPlaces("Gateway")), []);
  assert.deepEqual(ids(await f.searchPlaces("TIP")), []);
  assert.equal(f.requests.at(-1).get("text"), "TIP");
});

test("live results from one search remain usable if the other request fails", async () => {
  const f = fixture(async p => { if (p.get("type")) throw new Error("offline"); return { features: [feature("street")] }; });
  assert.deepEqual(ids(await f.searchPlaces("exa")), ["street"]);
});

test("an empty response plus a failed request reports the failure instead of no matches", async () => {
  const f = fixture(async p => { if (p.get("type")) throw new Error("offline"); return { features: [] }; });
  await assert.rejects(f.searchPlaces("exa"), { code: "commute/network" });
});

test("failure of both requests keeps the existing actionable network error", async () => {
  const f = fixture(async () => { throw new Error("offline"); });
  await assert.rejects(f.searchPlaces("exa"), { code: "commute/network" });
});

test("short or already canceled searches make no requests", async () => {
  const f = fixture();
  assert.deepEqual(ids(await f.searchPlaces(" a ")), []);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(f.searchPlaces("exa", { signal: controller.signal }), { name: "AbortError" });
  assert.equal(f.requests.length, 0);
});

test("canceling an in-flight query prevents a late provider result", async () => {
  const controller = new AbortController();
  const f = fixture(async () => { controller.abort(); return { features: [feature("late")] }; });
  await assert.rejects(f.searchPlaces("exa", { signal: controller.signal }), { name: "AbortError" });
});

test("the suggestion list stays capped at eight", async () => {
  const f = fixture(async () => ({ features: Array.from({ length: 12 }, (_, i) => feature(String(i), `Cafe ${i}`)) }));
  assert.equal((await f.searchPlaces("caf")).length, 8);
});

test("typing debounces, aborts older searches, ignores late responses, and selects current provider coordinates", async () => {
  const { react, runtime, render } = hookHarness();
  const timers = new Map(), requests = [], selected = [];
  let nextTimer = 0;
  const noop = () => {};
  const load = createLoader({
    react, "react/jsx-runtime": runtime,
    "@expo/vector-icons": { Ionicons: "Icon", MaterialIcons: "Icon" },
    "react-native": { View: "View", Text: "Text", TextInput: "Input", TouchableOpacity: "Button", ActivityIndicator: "Spinner", Keyboard: { dismiss: noop } },
    "../../services/routes": { searchPlaces: (query, { signal }) => new Promise(resolve => requests.push({ query, signal, resolve })) },
    "../../context/LocationContext": { useLocation: () => ({ refreshLocation: noop }) },
    "../../services/deviceLocation": { currentLocationPlace: noop },
    "../../styles/directions.styles": { styles: {} },
    "./ProviderAttribution": { __esModule: true, default: "Attribution" },
  }, {
    setTimeout: fn => { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id),
  });
  function nodes(tree, type) {
    if (Array.isArray(tree)) return tree.flatMap(node => nodes(node, type));
    if (!tree || typeof tree !== "object") return [];
    return [...(tree.type === type ? [tree] : []), ...nodes(tree.props?.children, type)];
  }
  const Screen = load(path.resolve(__dirname, "../src/components/directions/LocationInputCard.jsx")).default;
  const h = render(Screen, { locationText: "", destinationText: "", setLocationText: value => { h.props = { ...h.props, locationText: value }; }, setDestinationText: noop, onSwapLocations: noop, onSelectPlace: (...args) => selected.push(args) });
  const input = () => nodes(h.result, "Input")[0];
  const labels = () => nodes(h.result, "Text").map(n => n.props.children);
  async function runTimer() { const [id, fn] = timers.entries().next().value; timers.delete(id); const pending = fn(); await Promise.resolve(); return { pending }; }
  input().props.onFocus(); h.flush();
  input().props.onChangeText("ex"); h.flush();
  input().props.onChangeText("exa"); h.flush();
  assert.equal(timers.size, 1);
  const first = await runTimer();
  assert.equal(requests[0].query, "exa");
  input().props.onChangeText("exam"); h.flush();
  assert.equal(requests[0].signal.aborted, true);
  const second = await runTimer();
  const current = { id: "current", name: "Example Cafe", coordinate: { latitude: 14.625, longitude: 121.06 }, source: "geoapify" };
  requests[1].resolve([current]); await second.pending; h.flush();
  requests[0].resolve([{ ...current, id: "old", name: "Old Result" }]); await first.pending; h.flush();
  assert.ok(labels().includes("Example Cafe"));
  assert.ok(!labels().includes("Old Result"));
  const row = nodes(h.result, "Button").find(button => nodes(button, "Text").some(text => text.props.children === "Example Cafe"));
  row.props.onPress(); h.flush();
  assert.equal(selected[0][0], "origin");
  assert.equal(selected[0][1].coordinate.longitude, 121.06);
  h.dispose();
});

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
  assert.equal(f.requests.length, 4);
  assert.deepEqual(f.requests.map(p => p.get("type")), ["amenity", null, null, null]);
  for (const p of f.requests) {
    assert.equal(p.get("text")?.replace(", Quezon City", "") ?? p.get("name"), "exa");
    assert.equal(p.get("filter"), p.get("name") ? "rect:121.03,14.6,121.08,14.645" : "rect:121.03,14.6,121.08,14.645|countrycode:ph");
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

test("search never inserts saved landmarks when the provider has no match", async () => {
  const f = fixture();
  assert.deepEqual(ids(await f.searchPlaces("Gateway")), []);
  assert.deepEqual(ids(await f.searchPlaces("TIP")), []);
  assert.equal(f.requests.at(-1).get("text"), "TIP, Quezon City");
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

test("the suggestion list stays capped at fifteen", async () => {
  const f = fixture(async () => ({ features: Array.from({ length: 25 }, (_, i) => feature(String(i), `Cafe ${i}`)) }));
  assert.equal((await f.searchPlaces("caf")).length, 15);
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
    "../../services/routes": { searchPlaces: (query, { signal, onResults }) => new Promise(resolve => requests.push({ query, signal, onResults, resolve })) },
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
  requests[1].onResults([current]); h.flush();
  assert.ok(labels().includes("Example Cafe"));
  requests[0].onResults([{ ...current, name: "Late partial result" }]); h.flush();
  assert.ok(!labels().includes("Late partial result"));
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


test('business-name search adds multiple branches even when address autocomplete has no matches', async () => {
  const f = fixture(async p => ({ features: p.get('name') ? [feature('one', 'Robinsons EasyMart'), feature('two', 'Robinsons Supermarket', 14.624), feature('three', 'Robinsons Store', 14.626)] : [] }));
  const result = await f.searchPlaces('Rob');
  assert.equal(result.length, 3);
  assert.equal(f.requests[2].get('name'), 'Rob');
  assert.match(f.requests[2].get('categories'), /commercial/);
});

test('partial-name matches rank before less specific address matches while different branches remain selectable', async () => {
  const f = fixture(async p => ({ features: p.get('name') ? [feature('match', 'Robinsons EasyMart'), feature('branch', 'Robinsons EasyMart', 14.624)] : [feature('street', 'Aurora Boulevard')] }));
  assert.deepEqual(ids(await f.searchPlaces('Rob')), ['match', 'branch', 'street']);
});

test('POI results can use GeoJSON point coordinates when lat and lon properties are absent', async () => {
  const f = fixture(async p => ({ features: p.get('name') ? [{ properties: { place_id: 'poi', name: 'Small Shop' }, geometry: { type: 'Point', coordinates: [121.06, 14.625] } }] : [] }));
  const [result] = await f.searchPlaces('Small');
  assert.equal(result.coordinate.longitude, 121.06);
  assert.equal(result.coordinate.latitude, 14.625);
});

test('short names are sent to the provider without a fixed landmark alias list', async () => {
  for (const query of ['tip', 'Tech', 'Gate', 'Ali', 'LRT Anonas']) {
    const f = fixture();
    assert.deepEqual(ids(await f.searchPlaces(query)), []);
    assert.ok(f.requests.some(p => p.get('text') === query));
  }
});

test('a live place preserves its provider coordinates', async () => {
  const f = fixture(async () => ({ features: [feature('live', 'TIP QC', 14.6259, 121.0623)] }));
  const result = await f.searchPlaces('TIP');
  assert.equal(result.length, 1); assert.equal(result[0].id, 'live');
  assert.equal(result[0].coordinate.latitude, 14.6259);
});

test('Gateway Mall 2 remains a separate live search result from Gateway Mall', async () => {
  const f = fixture(async () => ({ features: [feature('gateway-two', 'Gateway Mall 2', 14.621, 121.052)] }));
  const results = await f.searchPlaces('Gate');
  assert.ok(results.some(place => place.id === 'gateway-two'));
  assert.equal(results.length, 1);
  assert.equal(results[0].source, 'geoapify');
});

test('forward geocoding finds a place missing from autocomplete and Places', async () => {
  const f = fixture(async p => ({ features: p.get('text') === 'Little Bakery, Quezon City' ? [feature('bakery', 'Little Bakery')] : [] }));
  assert.equal((await f.searchPlaces('Little Bakery'))[0].id, 'bakery');
});

test('a new offline query reports the network error without inventing landmark results', async () => {
  const f = fixture(async () => { throw new Error('offline'); });
  await assert.rejects(f.searchPlaces('TIP'), { code: 'commute/network' });
  await assert.rejects(f.searchPlaces('Unknown Cafe'), { code: 'commute/network' });
});

test('results are published before a slower provider request finishes', async () => {
  let finishSlow;
  const f = fixture(async p => p.get('type') ? new Promise(resolve => { finishSlow = resolve; }) : { features: [feature('fast', 'Example Shop')] });
  const batches = [];
  const pending = f.searchPlaces('Example', { onResults: places => batches.push(ids(places)) });
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(batches.some(batch => batch.includes('fast')));
  finishSlow({ features: [feature('slow', 'Example Bakery', 14.626)] });
  assert.deepEqual(ids(await pending), ['fast', 'slow']);
});

test('repeat queries reuse only recent live provider results without another request', async () => {
  const f = fixture(async () => ({ features: [feature('live', 'Example Shop')] }));
  const original = await f.searchPlaces('Example'); const count = f.requests.length;
  const repeated = await f.searchPlaces('Example');
  assert.deepEqual(ids(repeated), ids(original)); assert.equal(f.requests.length, count);
  assert.ok(repeated.every(place => place.source === 'geoapify'));
  repeated[0].coordinate.latitude = 99;
  assert.equal((await f.searchPlaces('Example'))[0].coordinate.latitude, 14.625);
});

test('a previous live result can appear immediately while a refined query loads', async () => {
  const f = fixture(async () => ({ features: [feature('live', 'Example Bakery')] }));
  await f.searchPlaces('Example');
  const batches = [];
  const pending = f.searchPlaces('Example Ba', { onResults: places => batches.push(ids(places)) });
  assert.deepEqual(batches[0], ['live']);
  assert.equal((await pending)[0].source, 'geoapify');
});

test('cancellation prevents publishing a late partial result', async () => {
  const controller = new AbortController(); const batches = [];
  const f = fixture(async () => { controller.abort(); return { features: [feature('late')] }; });
  await assert.rejects(f.searchPlaces('Late', { signal: controller.signal, onResults: places => batches.push(places) }), { name: 'AbortError' });
  assert.equal(batches.length, 0);
});

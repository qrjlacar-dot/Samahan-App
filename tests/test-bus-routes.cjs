const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");
const hookHarness = require("./helpers/hook-harness.cjs");
const root = path.resolve(__dirname, "..");
const load = createLoader();
const { getBusRoutes, projectBusPoint } = load(
  path.join(root, "src/services/routing/busRoutes.js"),
);
const { getTransitRoutes } = load(path.join(root, "src/services/routing/transitRoutes.js"));
const { getRoutes } = load(path.join(root, "src/services/routes.js"));
const { quoteFare } = load(path.join(root, "src/services/fares.js"));
const { BUS_LINES, BUS_BOARDING_STOPS, BUS_TERMINAL, BUS_GATEWAY, BUS_RETURN_PATH } = load(
  path.join(root, "src/data/busCatalog.js"),
);
const { LANDMARKS } = load(path.join(root, "src/data/serviceArea.js"));
const { distanceMeters } = load(path.join(root, "src/services/location.js"));
const [anonas, tip, twentieth] = BUS_BOARDING_STOPS;
const landmark = (id) => ({
  ...LANDMARKS.find((item) => item.id === id),
  address: "Cubao",
  source: "verified-local",
});
const input = (origin = anonas, destination = BUS_GATEWAY) => ({
  origin,
  destination,
  preferredMode: "bus",
});
const ride = (route) => route.steps.find((step) => step.mode === "bus");
function options() {
  const calls = [];
  return {
    calls,
    getWalkingRoutes: async (request) => {
      calls.push(request);
      const distance = distanceMeters(request.origin.coordinate, request.destination.coordinate);
      return [
        {
          steps: [
            {
              id: "walk",
              mode: "walk",
              instruction: `Walk to ${request.destination.name}.`,
              start: request.origin.coordinate,
              end: request.destination.coordinate,
              polyline: [request.origin.coordinate, request.destination.coordinate],
              distanceMeters: Math.ceil(distance * 1.2),
              durationSeconds: Math.ceil(distance),
            },
          ],
        },
      ];
    },
  };
}

test("both bus groups support endpoint destinations in the local planner", async () => {
  for (const destination of [BUS_GATEWAY, BUS_TERMINAL]) {
    const [route] = await getBusRoutes(input(anonas, destination), options());
    assert.equal(route.preferredMode, "bus");
    assert.equal(route.steps.length, 1);
    assert.equal(ride(route).alightingStop, destination.name);
    assert.equal(route.preview, undefined);
    assert.doesNotMatch(route.warnings.join(" "), /preview|draft|awaiting verification/i);
  }
});

test("Anonas to Ali Mall ends the bus at Cubao Terminal Complex and walks to the mall", async () => {
  const opts = options();
  const [route] = await getTransitRoutes(input(anonas, landmark("ali-mall")), opts);
  assert.match(route.id, /bus-ali-mall/);
  assert.equal(ride(route).alightingStop, "Cubao Terminal Complex");
  assert.equal(ride(route).end.latitude, 14.6203375);
  assert.equal(ride(route).end.longitude, 121.055671875);
  assert.notEqual(ride(route).end.latitude, route.destination.coordinate.latitude);
  assert.equal(route.steps.at(-1).mode, "walk");
  assert.match(route.steps.at(-1).instruction, /Ali Mall/);
  assert.equal(opts.calls.at(-1).origin.id, "cubao-terminal-complex");
  assert.equal(ride(route).instruction, "Board a bus marked Ali Mall.");
  assert.equal(ride(route).placards.join("|"), "Ali Mall");
});

test("TIP riders use TIP boarding for both destinations rather than returning to Anonas", async () => {
  for (const destination of [BUS_GATEWAY, landmark("ali-mall")]) {
    const opts = options();
    const [route] = await getBusRoutes(input(tip, destination), opts);
    assert.match(ride(route).boardingStop, /TIP QC/);
    assert.equal(route.steps[0].mode, "walk");
    assert.ok(opts.calls.every((call) => call.destination.id !== anonas.id));
    assert.equal(new Set(route.steps.map((step) => step.id)).size, route.steps.length);
  }
});

test("an origin between boarding points gets walking directions to a nearby stop", async () => {
  const origin = { ...tip, id: "near-tip", coordinate: { latitude: 14.6263, longitude: 121.0625 } };
  const opts = options();
  const [route] = await getBusRoutes(input(origin, BUS_GATEWAY), opts);
  assert.equal(route.steps[0].mode, "walk");
  assert.match(opts.calls[0].destination.id, /:board:/);
  assert.match(ride(route).boardingStop, /TIP QC/);
});

test("Gateway journeys use the straight placard group and end at Gateway", async () => {
  const [route] = await getBusRoutes(input(tip, BUS_GATEWAY), options());
  assert.match(route.id, /bus-cubao-gateway/);
  assert.equal(ride(route).alightingStop, BUS_GATEWAY.name);
  assert.equal(ride(route).placards.join("|"), "Cubao|EDSA|Gateway");
  assert.equal(ride(route).instruction, "Board a bus marked Cubao / EDSA / Gateway.");
  assert.doesNotMatch(ride(route).instruction, /P\. Tuazon|turn left/);
  assert.equal(route.steps.at(-1).mode, "bus");
});

test("the selected ride path starts at boarding, ends at drop-off, and supplies a fare distance", async () => {
  for (const origin of BUS_BOARDING_STOPS) {
    for (const destination of [BUS_GATEWAY, BUS_TERMINAL]) {
      const [route] = await getBusRoutes(input(origin, destination), options());
      const bus = ride(route);
      assert.equal(bus.polyline[0].latitude, bus.start.latitude);
      assert.ok(distanceMeters(origin.coordinate, bus.start) < 500);
      assert.equal(bus.polyline.at(-1).longitude, destination.coordinate.longitude);
      assert.ok(bus.distanceMeters > 0 && bus.distanceMeters < 5000);
      assert.equal(route.durationSeconds, null);
      assert.equal(bus.schematic, true);
      assert.equal(
        route.distanceMeters,
        route.steps.reduce((n, step) => n + step.distanceMeters, 0),
      );
      for (const [type, amount] of [
        ["regular", 15],
        ["discounted", 12],
      ]) {
        const quote = await quoteFare(route, type);
        assert.equal(quote.selectedTotal, amount);
        assert.equal(quote.complete, true);
        assert.match(quote.items.find((item) => item.stepId === bus.id).sourceUrl, /ptvnews\.ph/);
      }
    }
  }
});

test("both corridors have separately defined return directions and support return trips", async () => {
  assert.equal(BUS_LINES.length, 4);
  for (const [origin, destination, lineId] of [
    [BUS_GATEWAY, tip, "bus-gateway-anonas"],
    [BUS_GATEWAY, anonas, "bus-gateway-anonas"],
    [BUS_TERMINAL, tip, "bus-ali-mall-anonas"],
    [landmark("ali-mall"), anonas, "bus-ali-mall-anonas"],
  ]) {
    const [route] = await getBusRoutes(input(origin, destination), options());
    assert.equal(route.preferredMode, "bus");
    assert.match(route.id, new RegExp(lineId));
    assert.equal(ride(route).direction, "anonas-bound");
    assert.equal(ride(route).instruction, "Board a bus marked Cogeo / Parang / Marikina.");
    assert.equal(ride(route).placards.join("|"), "Cogeo|Parang|Marikina");
    assert.doesNotMatch(ride(route).instruction, /marked Cubao|marked Ali Mall/);
    assert.ok(distanceMeters(ride(route).end, destination.coordinate) <= 350);
  }
});

test("origins outside the bus corridor but inside the service area receive walking directions", async () => {
  for (const coordinate of [
    { latitude: 14.64, longitude: 121.06 },
    { latitude: 14.6294, longitude: 121.069 },
    { latitude: 14.612, longitude: 121.061 },
  ]) {
    const opts = options();
    const [route] = await getBusRoutes(input({ ...anonas, coordinate }, BUS_GATEWAY), opts);
    assert.equal(route.preferredMode, "walk");
    assert.equal(
      route.steps.every((step) => step.mode === "walk"),
      true,
    );
    assert.equal(opts.calls.at(-1).origin.coordinate.latitude, coordinate.latitude);
  }
});

test("identical, missing, invalid, and outside-area endpoints fail clearly", async () => {
  await assert.rejects(getBusRoutes(input(tip, tip), options()), { code: "commute/same-place" });
  for (const coordinate of [
    null,
    { latitude: NaN, longitude: 121.06 },
    { latitude: 15, longitude: 121 },
  ]) {
    await assert.rejects(getBusRoutes(input({ ...tip, coordinate }), options()), {
      code: "commute/invalid-places",
    });
  }
  await assert.rejects(getBusRoutes(null, options()), { code: "commute/invalid-places" });
});

test("missing walking connections never produce a partial journey", async () => {
  for (const getWalkingRoutes of [undefined, async () => [], async () => [{ steps: [] }]]) {
    await assert.rejects(getBusRoutes(input(tip, landmark("ali-mall")), { getWalkingRoutes }), {
      code: "commute/no-route",
    });
  }
  const error = Object.assign(new Error("Offline"), { code: "commute/network" });
  await assert.rejects(
    getBusRoutes(input(tip, landmark("ali-mall")), {
      getWalkingRoutes: async () => {
        throw error;
      },
    }),
    { code: "commute/network" },
  );
});

test("cancellation is respected before and after the walking requests", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(getBusRoutes(input(), { ...options(), signal: controller.signal }), {
    name: "AbortError",
  });
  const late = new AbortController();
  const opts = options();
  const walk = opts.getWalkingRoutes;
  opts.getWalkingRoutes = async (request) => {
    const result = await walk(request);
    late.abort();
    return result;
  };
  await assert.rejects(
    getBusRoutes(input(tip, landmark("ali-mall")), { ...opts, signal: late.signal }),
    { name: "AbortError" },
  );
});

test("ordinary and aircon fares use published discounts without guessing longer rides", async () => {
  for (const [operatorId, regular, discounted] of [
    ["bus-city-ordinary", 15, 12],
    ["bus-city-aircon", 18, 14.5],
  ]) {
    const route = (distanceMeters) => ({
      steps: [{ id: "bus", mode: "bus", operatorId, distanceMeters }],
    });
    assert.equal((await quoteFare(route(5000), "regular")).selectedTotal, regular);
    const quote = await quoteFare(route(5000), "discounted");
    assert.equal(quote.selectedTotal, discounted);
    assert.match(quote.items[0].note, /ID/);
    assert.equal(
      quote.items[0].sourceUrl,
      "https://ptvnews.ph/ltfrb-releases-new-matrices-for-puv-fare-hikes-effective-sept-28/",
    );
    assert.equal((await quoteFare(route(5001), "regular")).selectedTotal, null);
    assert.equal((await quoteFare(route(null), "regular")).selectedTotal, null);
  }
});

function nodes(tree, predicate) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap((item) => nodes(item, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}

test("the same fare-link component used by LRT opens the bus reference", async () => {
  const [route] = await getBusRoutes(input(tip, BUS_GATEWAY), options());
  const quote = await quoteFare(route, "discounted");
  const opened = [];
  const { runtime } = hookHarness();
  const componentLoader = createLoader({
    "react/jsx-runtime": runtime,
    "react-native": {
      Text: "Text",
      View: "View",
      Linking: { openURL: async (url) => opened.push(url) },
    },
    "../../hooks/useFareQuote": { useFareQuote: () => ({ quote, error: "" }) },
    "../../styles/walking-navigation.styles": { styles: {} },
    "../../../styles/walking-navigation.styles": { styles: {} },
  });
  const FareSummary = componentLoader(
    path.join(root, "src/components/directions/FareSummary.jsx"),
  ).default;
  const tree = FareSummary({ route, ticketType: "discounted" });
  assert.ok(nodes(tree, (node) => node.props?.children === "₱12.00").length);
  const links = nodes(tree, (node) => node.props?.accessibilityRole === "link");
  assert.equal(links.length, 1);
  links[0].props.onPress();
  assert.equal(opened[0], quote.items.find((item) => item.sourceUrl).sourceUrl);
});

test("planning does not mutate the request or shared catalog", async () => {
  const request = input(tip, landmark("ali-mall"));
  const before = JSON.stringify({ request, BUS_LINES });
  await getBusRoutes(request, options());
  assert.equal(JSON.stringify({ request, BUS_LINES }), before);
});

test("destinations midway along Aurora and the Ali Mall branch are supported without reaching a terminal", async () => {
  const gatewayLine = BUS_LINES[0],
    aliLine = BUS_LINES[1];
  for (const [line, segment] of [
    [gatewayLine, 1],
    [aliLine, 2],
    [aliLine, 3],
  ]) {
    const a = line.path[segment],
      b = line.path[segment + 1];
    const destination = {
      id: "shop",
      name: "Selected grocery",
      address: "Cubao",
      source: "geoapify",
      coordinate: {
        latitude: (a.latitude + b.latitude) / 2,
        longitude: (a.longitude + b.longitude) / 2,
      },
    };
    const [route] = await getBusRoutes(input(anonas, destination), { ...options(), lines: [line] });
    assert.ok(distanceMeters(ride(route).end, destination.coordinate) < 1);
    assert.match(ride(route).alightingStop, /Selected grocery/);
    assert.ok(distanceMeters(ride(route).end, line.path.at(-1)) > 50);
  }
});

test("a short Anonas to TIP trip recommends walking with no bus fare", async () => {
  const [route] = await getBusRoutes(input(anonas, landmark("tip-qc")), options());
  assert.equal(route.preferredMode, "walk");
  assert.equal(route.requestedMode, "bus");
  assert.match(route.recommendation, /no bus fare/i);
  assert.equal(
    route.steps.every((step) => step.mode === "walk"),
    true,
  );
});

test("nearby arbitrary origins and destinations use the road projection and walking links", async () => {
  const line = BUS_LINES[0];
  const mix = (ratio) => ({
    latitude:
      line.path[0].latitude + ratio * (line.path.at(-1).latitude - line.path[0].latitude) + 0.0003,
    longitude:
      line.path[0].longitude + ratio * (line.path.at(-1).longitude - line.path[0].longitude),
  });
  const origin = { ...anonas, id: "near-road", name: "Side street", coordinate: mix(0.2) };
  const destination = { ...origin, id: "shop", name: "Shop", coordinate: mix(0.7) };
  const [route] = await getBusRoutes(input(origin, destination), options());
  assert.equal(route.steps[0].mode, "walk");
  assert.equal(route.steps.at(-1).mode, "walk");
  assert.ok(
    projectBusPoint(ride(route).end, line.path).along >
      projectBusPoint(ride(route).start, line.path).along,
  );
});

test("a destination outside the bus corridor receives a walking-only explanation", async () => {
  const [route] = await getBusRoutes(
    input(anonas, { ...tip, coordinate: { latitude: 14.637, longitude: 121.057 } }),
    options(),
  );
  assert.equal(route.preferredMode, "walk");
  assert.match(route.recommendation, /No supported bus route.*walking route.*no bus fare/);
});

test("overlong bus walking connections switch to a complete direct walking route", async () => {
  const requests = [];
  const [route] = await getBusRoutes(input(tip, BUS_GATEWAY), {
    getWalkingRoutes: async (request) => {
      requests.push(request);
      return [
        {
          steps: [
            {
              mode: "walk",
              polyline: [request.origin.coordinate, request.destination.coordinate],
              distanceMeters: 900,
            },
          ],
        },
      ];
    },
  });
  assert.equal(route.preferredMode, "walk");
  assert.equal(route.distanceMeters, 900);
  assert.equal(requests.at(-1).origin.id, tip.id);
  assert.equal(requests.at(-1).destination.id, BUS_GATEWAY.id);
});

function liveApiFixture(respond) {
  const requests = [];
  const loader = createLoader(
    {},
    {
      process: { env: { EXPO_PUBLIC_GEOAPIFY_API_KEY: "test-key" } },
      fetch: async (url) => {
        const params = new URL(url).searchParams;
        requests.push(params);
        const data = respond ? respond(params) : null;
        if (data) return { ok: true, status: 200, json: async () => data };
        const coordinates = params
          .get("waypoints")
          .split("|")
          .map((pair) => pair.split(",").map(Number).reverse());
        return {
          ok: true,
          status: 200,
          json: async () => ({
            features: [
              {
                geometry: { type: "LineString", coordinates },
                properties: {
                  distance: 100,
                  time: 100,
                  legs: [
                    {
                      steps: [
                        {
                          from_index: 0,
                          to_index: coordinates.length - 1,
                          distance: 100,
                          time: 100,
                          instruction: { text: "Walk to the road" },
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          }),
        };
      },
    },
  );
  return { ...loader(path.join(root, "src/services/routes.js")), requests };
}

test("public bus API requests bus-accessible road geometry and includes walking to the road", async () => {
  const f = liveApiFixture();
  const [route] = await f.getRoutes(input(tip, BUS_GATEWAY));
  assert.equal(ride(route).schematic, false);
  assert.ok(f.requests.some((p) => p.get("mode") === "bus"));
  assert.ok(f.requests.some((p) => p.get("mode") === "walk"));
  assert.ok(route.sources.includes("geoapify"));
  const busCalls = f.requests.filter((p) => p.get("mode") === "bus").length;
  await f.getRoutes(input(tip, BUS_GATEWAY));
  assert.equal(f.requests.filter((p) => p.get("mode") === "bus").length, busCalls);
});

test("road routing rejects empty geometry, shortcuts, invalid points, and detours outside the corridor", async () => {
  const line = BUS_LINES[1];
  for (const coordinates of [
    [],
    [[121.06, 14.63]],
    [
      [0, 0],
      [121.055, 14.62],
    ],
    [
      [line.path[0].longitude, line.path[0].latitude],
      [line.path.at(-1).longitude, line.path.at(-1).latitude],
    ],
    [
      [null, null],
      [121.06, 14.62],
    ],
  ]) {
    const f = liveApiFixture(() => ({
      features: [{ geometry: { type: "LineString", coordinates } }],
    }));
    await assert.rejects(f.getBusGeometry(line), (error) => error.code.startsWith("commute/"));
  }
});

test("a failed alternative bus corridor does not hide a usable route", async () => {
  const destination = { ...tip, coordinate: { latitude: 14.6257, longitude: 121.0585 } };
  const [route] = await getBusRoutes(input(anonas, destination), {
    ...options(),
    getBusGeometry: async (line) => {
      if (line.id === "bus-ali-mall")
        throw Object.assign(new Error("No road route"), { code: "commute/no-route" });
      return { polyline: line.path };
    },
  });
  assert.match(route.id, /bus-cubao-gateway/);
});

test("short journeys in either direction use actual walking distance and never request bus geometry", async () => {
  for (const [origin, destination] of [
    [anonas, tip],
    [tip, anonas],
  ]) {
    const opts = options();
    opts.getBusGeometry = async () =>
      assert.fail("a short walking journey must not fetch or draw the full bus line");
    const walk = opts.getWalkingRoutes;
    opts.getWalkingRoutes = async (request) => {
      const [route] = await walk(request);
      return [{ ...route, steps: route.steps.map((step) => ({ ...step, distanceMeters: 533 })) }];
    };
    const [route] = await getBusRoutes(input(origin, destination), opts);
    assert.equal(route.preferredMode, "walk");
    assert.equal(route.distanceMeters, 533);
    assert.equal(ride(route), undefined);
    assert.match(route.recommendation, /walking-only.*No bus fare/);
    assert.ok(route.polyline.every((p) => distanceMeters(p, origin.coordinate) < 650));
    const fare = await quoteFare(route, "regular");
    assert.equal(fare.selectedTotal, 0);
  }
});

test("650 metres is inclusive and a 651 metre walking route is not labelled a short walk", async () => {
  for (const [distance, mode] of [
    [650, "walk"],
    [651, "bus"],
  ]) {
    const opts = options(),
      walk = opts.getWalkingRoutes;
    opts.getWalkingRoutes = async (request) => {
      const [route] = await walk(request);
      return [
        { ...route, steps: route.steps.map((step) => ({ ...step, distanceMeters: distance })) },
      ];
    };
    const [route] = await getBusRoutes(input(anonas, tip), opts);
    assert.equal(route.preferredMode, mode);
  }
});

test("Gateway Mall 2 interior pins use a final walk in both directions", async () => {
  const gateway2 = {
    id: "provider-gateway-2",
    name: "Gateway Mall 2",
    source: "geoapify",
    address: "Cubao",
    coordinate: { latitude: 14.6209, longitude: 121.0523 },
  };
  for (const [origin, destination, lineId] of [
    [tip, gateway2, "bus-cubao-gateway"],
    [gateway2, tip, "bus-gateway-anonas"],
  ]) {
    const [route] = await getBusRoutes(input(origin, destination), options());
    assert.equal(route.preferredMode, "bus");
    assert.match(route.id, new RegExp(lineId));
    assert.equal(route.origin, origin);
    assert.equal(route.destination, destination);
    assert.equal(origin === gateway2 ? route.steps[0].mode : route.steps.at(-1).mode, "walk");
  }
});

test("recorded road geometry for all four directions passes validation and clips to the selected trip", async () => {
  const roads = require("./fixtures/bus-road-geometries.json").routes;
  for (const line of BUS_LINES) {
    const f = liveApiFixture((params) =>
      params.get("mode") === "bus"
        ? { features: [{ geometry: { type: "MultiLineString", coordinates: [roads[line.id]] } }] }
        : null,
    );
    const geometry = await f.getBusGeometry(line);
    assert.ok(geometry.polyline.length > line.path.length);
    assert.equal(f.requests[0].get("intermediate_waypoint_mode"), "through_stop");
    // Select a destination before the end; a full-corridor polyline would fail.
    const endPoint = geometry.polyline[Math.floor(geometry.polyline.length * 0.7)];
    const origin = { ...anonas, id: `${line.id}-start`, coordinate: geometry.polyline[0] };
    const destination = {
      ...tip,
      id: "intermediate",
      name: "Intermediate destination",
      coordinate: endPoint,
    };
    const opts = options(),
      walk = opts.getWalkingRoutes;
    opts.getWalkingRoutes = async (args) => {
      const [route] = await walk(args);
      return [
        {
          ...route,
          steps: route.steps.map((step) => ({
            ...step,
            distanceMeters: Math.max(700, step.distanceMeters),
          })),
        },
      ];
    };
    const [route] = await getBusRoutes(input(origin, destination), {
      ...opts,
      lines: [line],
      getBusGeometry: async () => geometry,
    });
    const bus = ride(route);
    assert.ok(bus, line.id);
    assert.ok(distanceMeters(bus.end, destination.coordinate) < 1, line.id);
    assert.ok(distanceMeters(bus.end, geometry.polyline.at(-1)) > 60, line.id);
    assert.ok(bus.polyline.length < geometry.polyline.length, line.id);
    const endAlong = projectBusPoint(bus.end, geometry.polyline).along;
    assert.ok(
      bus.polyline.every((p) => projectBusPoint(p, geometry.polyline).along <= endAlong + 1),
      line.id,
    );
  }
});

test("a provider U-turn inside the corridor is rejected even when total distance looks plausible", async () => {
  const line = BUS_LINES[0];
  const a = line.path[0],
    b = line.path.at(-1);
  const at = (ratio) => [
    a.longitude + ratio * (b.longitude - a.longitude),
    a.latitude + ratio * (b.latitude - a.latitude),
  ];
  const coordinates = [
    at(0),
    ...line.path.slice(1, -1).map((p) => [p.longitude, p.latitude]),
    at(0.65),
    at(0.5),
    at(1),
  ];
  const f = liveApiFixture(() => ({
    features: [{ geometry: { type: "LineString", coordinates } }],
  }));
  await assert.rejects(f.getBusGeometry(line), { code: "commute/no-route" });
});

test("both bus returns share the Gateway/Aurora corridor with no P. Tuazon or 20th Avenue ride", () => {
  const gateway = BUS_LINES.find((line) => line.id === "bus-gateway-anonas");
  const ali = BUS_LINES.find((line) => line.id === "bus-ali-mall-anonas");
  assert.equal(gateway.path, BUS_RETURN_PATH);
  assert.equal(ali.path, BUS_RETURN_PATH);
  assert.equal(ali.stops[0].id, "gateway-eastbound");
  assert.ok(
    BUS_RETURN_PATH.every((p) => p.latitude > 14.6228),
    "the return bus must not go south onto P. Tuazon",
  );
  assert.doesNotMatch(ali.via, /P\. Tuazon|20th/);
});

test("Ali Mall and terminal return trips walk to Gateway before the shared Aurora bus", async () => {
  for (const origin of [
    landmark("ali-mall"),
    BUS_TERMINAL,
    { ...BUS_TERMINAL, id: "geoapify-terminal", source: "geoapify" },
  ]) {
    const opts = options();
    const [route] = await getBusRoutes(input(origin, anonas), opts);
    const bus = ride(route);
    const gatewayReturn = BUS_LINES.find((line) => line.id === "bus-gateway-anonas");
    assert.match(route.id, /bus-ali-mall-anonas/);
    assert.equal(route.steps[0].mode, "walk");
    assert.equal(opts.calls[0].origin.id, origin.id);
    assert.equal(opts.calls[0].destination.id, "gateway-eastbound");
    assert.match(bus.boardingStop, /Gateway area/);
    assert.ok(distanceMeters(bus.start, gatewayReturn.path[0]) < 1);
    assert.ok(
      bus.polyline.every((point) => projectBusPoint(point, gatewayReturn.path).distance < 1),
    );
    assert.ok(route.steps.slice(0, route.steps.indexOf(bus)).every((step) => step.mode === "walk"));
    assert.doesNotMatch(bus.instruction, /Take a bus marked Ali Mall/);
  }
});

test("Ali Mall returns keep intermediate Aurora drop-offs and the short-trip walking decision", async () => {
  const destination = {
    ...tip,
    id: "aurora-shop",
    name: "Selected shop",
    coordinate: { latitude: 14.6258, longitude: 121.0594 },
  };
  const [route] = await getBusRoutes(input(landmark("ali-mall"), destination), options());
  assert.ok(ride(route));
  assert.match(ride(route).boardingStop, /Gateway area/);
  assert.ok(distanceMeters(ride(route).end, anonas.coordinate) > 400);
  const [walk] = await getBusRoutes(input(anonas, tip), options());
  assert.equal(walk.preferredMode, "walk");
});

test("an unavailable walk to Gateway never produces a partial Ali Mall return bus journey", async () => {
  await assert.rejects(
    getBusRoutes(input(landmark("ali-mall"), anonas), {
      getWalkingRoutes: async () => [],
    }),
    { code: "commute/no-route" },
  );
});

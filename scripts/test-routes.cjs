const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const cache = new Map();
let payload;
let calls = 0;
let nativeCalls = 0;
let requestUrl = "";

function load(file) {
  if (cache.has(file)) return cache.get(file).exports;

  let source = fs.readFileSync(file, "utf8");
  const names = [];

  source = source.replace(
    /^export\s+(?:async\s+)?(?:function|const|let)\s+([A-Za-z0-9_$]+)/gm,
    (match, name) => {
      names.push(name);
      return match.replace(/^export\s+/, "");
    },
  );

  source = source.replace(
    /^import\s+\{([^}]*)\}\s+from\s+["']([^"']+)["'];?/gm,
    (_, list, spec) => `const {${list}} = __import("${spec}");`,
  );

  source += `\nmodule.exports = { ${names.join(", ")} };`;

  const module = { exports: {} };
  cache.set(file, module);

  new Function(
    "module",
    "__import",
    "require",
    "fetch",
    "process",
    source,
  )(
    module,
    (spec) => {
      assert.ok(spec.startsWith("."));

      const target = path.resolve(path.dirname(file), spec);

      return load(path.extname(target) ? target : `${target}.js`);
    },
    () => {
      nativeCalls += 1;

      throw new Error("Route previews must not request device location.");
    },
    async (url) => {
      requestUrl = url;
      calls += 1;

      return {
        ok: true,
        status: 200,
        json: async () => payload,
      };
    },
    {
      env: {
        EXPO_PUBLIC_GEOAPIFY_API_KEY: "mock-test-key",
      },
    },
  );

  return module.exports;
}

const root = path.join(__dirname, "..");

const { getRoutes, searchPlaces } = load(
  path.join(root, "src/services/routes.js"),
);

const { LANDMARKS, SERVICE_AREA } = load(
  path.join(root, "src/data/serviceArea.js"),
);

const bounds = SERVICE_AREA.bounds;

function place(item) {
  return {
    ...item,
    source: "verified-local",
    address: "",
  };
}

const origin = place(
  LANDMARKS.find((item) => item.id === "tip-qc"),
);

const destination = place(
  LANDMARKS.find((item) => item.id === "lrt2-anonas"),
);

const request = {
  origin,
  destination,
  preferredMode: "walk",
};

const middle = {
  latitude:
    (origin.coordinate.latitude + destination.coordinate.latitude) / 2,
  longitude:
    (origin.coordinate.longitude + destination.coordinate.longitude) / 2,
};

const pair = (point) => [point.longitude, point.latitude];

function response(
  points = [
    origin.coordinate,
    middle,
    destination.coordinate,
  ],
) {
  return {
    features: [
      {
        geometry: {
          type: "LineString",
          coordinates: points.map(pair),
        },
        properties: {
          distance: 300,
          time: 240,
          legs: [
            {
              steps: [
                {
                  from_index: 0,
                  to_index: points.length - 1,
                  distance: 300,
                  time: 240,
                  instruction: {
                    text: "Walk toward the destination.",
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };
}

const tests = [];

const test = (name, run) => {
  tests.push({ name, run });
};

async function rejected(input, code, expectedCalls) {
  await assert.rejects(getRoutes(input), {
    code: `commute/${code}`,
  });

  assert.equal(calls, expectedCalls);
}

test("place search requests the configured demo rectangle", async () => {
  payload = { features: [] };
  assert.deepEqual(await searchPlaces("Gateway"), []);
  const params = new URL(requestUrl).searchParams;
  assert.equal(params.get("filter"), `rect:${bounds.minLongitude},${bounds.minLatitude},${bounds.maxLongitude},${bounds.maxLatitude}|countrycode:ph`);
  assert.equal(nativeCalls, 0);
});

test("place search excludes outside and invalid results, keeping unique supported places", async () => {
  const feature = (id, coordinate) => ({ properties: { place_id: id, name: id, lat: coordinate.latitude, lon: coordinate.longitude } });
  payload = { features: [
    feature("outside", { latitude: bounds.maxLatitude + 0.01, longitude: bounds.minLongitude }),
    feature("invalid", { latitude: NaN, longitude: 121.06 }),
    feature("supported", origin.coordinate),
    feature("supported", origin.coordinate),
    feature("boundary", { latitude: bounds.minLatitude, longitude: bounds.minLongitude }),
  ] };
  const results = await searchPlaces("Gateway");
  assert.deepEqual(results.map((item) => item.id), ["supported", "boundary"]);
  assert.equal(nativeCalls, 0);
});

test("short place searches avoid a provider request", async () => {
  assert.deepEqual(await searchPlaces(" a "), []);
  assert.equal(calls, 0);
});

test("TIP QC to Anonas preview works without device GPS", async () => {
  const [route] = await getRoutes(request);

  assert.equal(route.polyline.length, 3);
  assert.equal(route.steps.length, 1);
  assert.equal(
    route.steps[0].instruction,
    "Walk toward the destination.",
  );
  assert.equal(route.distanceMeters, 300);
  assert.equal(route.durationSeconds, 240);
  assert.equal(nativeCalls, 0);
});

test("draft boundary stays unverified and is explained", async () => {
  const [route] = await getRoutes(request);

  assert.equal(SERVICE_AREA.verified, false);
  assert.match(route.warnings.join(" "), /draft/i);
});

test("all selected demo landmarks remain valid endpoints", async () => {
  for (const landmark of LANDMARKS) {
    if (landmark.id === origin.id) continue;

    const target = place(landmark);

    payload = response([
      origin.coordinate,
      target.coordinate,
    ]);

    const [route] = await getRoutes({
      ...request,
      destination: target,
    });

    assert.equal(route.destination.id, target.id);
  }
});

const outsidePoints = [
  {
    latitude: bounds.minLatitude - 0.001,
    longitude: middle.longitude,
  },
  {
    latitude: bounds.maxLatitude + 0.001,
    longitude: middle.longitude,
  },
  {
    latitude: middle.latitude,
    longitude: bounds.minLongitude - 0.001,
  },
  {
    latitude: middle.latitude,
    longitude: bounds.maxLongitude + 0.001,
  },
];

test("outside origin is rejected before calling Geoapify", async () => {
  await rejected(
    {
      ...request,
      origin: {
        ...origin,
        coordinate: outsidePoints[0],
      },
    },
    "outside-service-area",
    0,
  );
});

test("outside destination is rejected before calling Geoapify", async () => {
  await rejected(
    {
      ...request,
      destination: {
        ...destination,
        coordinate: outsidePoints[0],
      },
    },
    "outside-service-area",
    0,
  );
});

outsidePoints.forEach((point, index) => {
  test(
    `route leaving rectangle edge ${index + 1} is rejected`,
    async () => {
      payload = response([
        origin.coordinate,
        point,
        destination.coordinate,
      ]);

      await rejected(
        request,
        "route-outside-service-area",
        1,
      );
    },
  );
});

test("provider route starting outside is rejected", async () => {
  payload = response([
    outsidePoints[0],
    middle,
    destination.coordinate,
  ]);

  await rejected(
    request,
    "route-outside-service-area",
    1,
  );
});

test("provider route ending outside is rejected", async () => {
  payload = response([
    origin.coordinate,
    middle,
    outsidePoints[0],
  ]);

  await rejected(
    request,
    "route-outside-service-area",
    1,
  );
});

test("MultiLineString inside the area is accepted", async () => {
  const geometry = payload.features[0].geometry;

  geometry.type = "MultiLineString";
  geometry.coordinates = [geometry.coordinates];

  assert.equal(
    (await getRoutes(request))[0].polyline.length,
    3,
  );
});

test("outside point in an additional geometry line is rejected", async () => {
  const geometry = payload.features[0].geometry;

  geometry.type = "MultiLineString";
  geometry.coordinates = [
    geometry.coordinates,
    [pair(outsidePoints[0])],
  ];

  await rejected(
    request,
    "route-outside-service-area",
    1,
  );
});

test("exact draft boundary edges are accepted", async () => {
  const a = {
    latitude: bounds.maxLatitude,
    longitude: bounds.minLongitude,
  };

  const b = {
    latitude: bounds.maxLatitude,
    longitude: bounds.maxLongitude,
  };

  payload = response([a, b]);

  const [route] = await getRoutes({
    ...request,
    origin: {
      ...origin,
      coordinate: a,
    },
    destination: {
      ...destination,
      coordinate: b,
    },
  });

  assert.equal(route.polyline.length, 2);
});

test("invalid endpoint is rejected before calling Geoapify", async () => {
  await rejected(
    { ...request, origin: null },
    "invalid-places",
    0,
  );
});

test("identical endpoints are rejected before calling Geoapify", async () => {
  await rejected(
    { ...request, destination: origin },
    "same-place",
    0,
  );
});

test("passenger transit is not claimed as implemented", async () => {
  await rejected(
    { ...request, preferredMode: "bus" },
    "unsupported-mode",
    0,
  );
});

test("invalid provider coordinates are rejected", async () => {
  payload.features[0].geometry.coordinates[1] = [
    NaN,
    middle.latitude,
  ];

  await rejected(
    request,
    "invalid-response",
    1,
  );
});

test("empty route response stays unavailable", async () => {
  payload = { features: [] };

  await rejected(
    request,
    "no-route",
    1,
  );
});

test("missing walking instructions are rejected", async () => {
  payload.features[0].properties.legs = [];

  await rejected(
    request,
    "invalid-response",
    1,
  );
});

(async () => {
  let passed = 0;

  for (const { name, run } of tests) {
    payload = response();
    calls = 0;
    nativeCalls = 0;

    try {
      await run();
      passed += 1;
      console.log(`PASS ${name}`);
    } catch (error) {
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  }

  console.log(
    `\n${passed}/${tests.length} route tests passed`,
  );

  process.exitCode =
    passed === tests.length ? 0 : 1;
})();
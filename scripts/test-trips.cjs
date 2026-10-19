const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const cache = new Map();

function load(file) {
  if (cache.has(file)) {
    return cache.get(file).exports;
  }

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
    (match, list, spec) =>
      `const {${list.replace(/\s+as\s+/g, ": ")}} = __import("${spec}");`,
  );

  source += `\nmodule.exports = { ${names.join(", ")} };`;

  const mod = { exports: {} };
  cache.set(file, mod);

  const run = new Function(
    "module",
    "exports",
    "__import",
    "require",
    source,
  );

  run(
    mod,
    mod.exports,
    (spec) => {
      if (!spec.startsWith(".")) {
        throw new Error(`Unexpected import ${spec}`);
      }

      let target = path.resolve(
        path.dirname(file),
        spec,
      );

      if (!path.extname(target)) {
        target += ".js";
      }

      return load(target);
    },
    (spec) => {
      const error = new Error(
        `Cannot find module '${spec}'`,
      );

      error.code = "MODULE_NOT_FOUND";
      throw error;
    },
  );

  return mod.exports;
}

const {
  getTripIssue,
  distanceToRouteMeters,
} = load(
  path.join(root, "src/services/trips.js"),
);

const { LANDMARKS } = load(
  path.join(root, "src/data/serviceArea.js"),
);

const tip = LANDMARKS.find(
  (item) => item.id === "tip-qc",
);

const anonas = LANDMARKS.find(
  (item) => item.id === "lrt2-anonas",
);

const route = {
  preferredMode: "walk",
  origin: tip,
  destination: anonas,
  polyline: [
    tip.coordinate,
    anonas.coordinate,
  ],
};

const now = Date.now();

function snapshot(
  position = tip.coordinate,
  changes = {},
) {
  return {
    status: "ready",
    inServiceArea: true,
    position: {
      ...position,
      accuracyMeters: 10,
      timestamp: new Date(now).toISOString(),
    },
    ...changes,
  };
}

const tests = [];

const test = (name, run) => {
  tests.push({ name, run });
};

const issue = (r, s, options = {}) =>
  getTripIssue(r, s, {
    now,
    ...options,
  })?.code;

test("fresh accurate fix near start is allowed", () => {
  assert.equal(
    issue(route, snapshot()),
    undefined,
  );
});

test("preview without a route cannot start", () => {
  assert.equal(
    issue(null, snapshot()),
    "no-route",
  );
});

test("unsupported mode cannot start", () => {
  assert.equal(
    issue(
      { ...route, preferredMode: "bus" },
      snapshot(),
    ),
    "no-route",
  );
});

test("outside device cannot start an inside route", () => {
  assert.equal(
    issue(
      route,
      snapshot(
        { latitude: 14.55, longitude: 121.02 },
        {
          status: "outside-area",
          inServiceArea: false,
        },
      ),
    ),
    "outside-area",
  );
});

test("coordinates override a misleading inside flag", () => {
  assert.equal(
    issue(
      route,
      snapshot({
        latitude: 14.55,
        longitude: 121.02,
      }),
    ),
    "outside-area",
  );
});

test("permission denial cannot start", () => {
  assert.equal(
    issue(
      route,
      { status: "denied", position: null },
    ),
    "location-unavailable",
  );
});

test("missing GPS cannot start", () => {
  assert.equal(
    issue(
      route,
      { status: "unavailable", position: null },
    ),
    "location-unavailable",
  );
});

test("outside selected endpoint cannot start", () => {
  assert.equal(
    issue(
      {
        ...route,
        destination: {
          coordinate: {
            latitude: 14.55,
            longitude: 121.02,
          },
        },
      },
      snapshot(),
    ),
    "route-area",
  );
});

test("route leaving area cannot start", () => {
  assert.equal(
    issue(
      {
        ...route,
        polyline: [
          tip.coordinate,
          {
            latitude: 14.55,
            longitude: 121.02,
          },
          anonas.coordinate,
        ],
      },
      snapshot(),
    ),
    "route-area",
  );
});

test("weak GPS cannot start", () => {
  const s = snapshot();
  s.position.accuracyMeters = 80;

  assert.equal(
    issue(route, s),
    "weak-signal",
  );
});

test("unknown accuracy cannot start", () => {
  const s = snapshot();
  s.position.accuracyMeters = null;

  assert.equal(
    issue(route, s),
    "weak-signal",
  );
});

test("old GPS cannot start", () => {
  const s = snapshot();

  s.position.timestamp =
    new Date(now - 31000).toISOString();

  assert.equal(
    issue(route, s),
    "old-location",
  );
});

test("invalid timestamp cannot start", () => {
  const s = snapshot();
  s.position.timestamp = "invalid";

  assert.equal(
    issue(route, s),
    "old-location",
  );
});

test("future timestamp cannot start", () => {
  const s = snapshot();

  s.position.timestamp =
    new Date(now + 6000).toISOString();

  assert.equal(
    issue(route, s),
    "old-location",
  );
});

test("starting far from origin is rejected", () => {
  assert.equal(
    issue(
      route,
      snapshot(anonas.coordinate),
    ),
    "far-from-start",
  );
});

test("resuming farther along the route is allowed", () => {
  assert.equal(
    issue(
      route,
      snapshot(anonas.coordinate),
      { requireOrigin: false },
    ),
    undefined,
  );
});

test("resuming away from route is rejected", () => {
  assert.equal(
    issue(
      route,
      snapshot({
        latitude: 14.64,
        longitude: 121.04,
      }),
      { requireOrigin: false },
    ),
    "far-from-route",
  );
});

test("distance checks the middle of segments", () => {
  const midpoint = {
    latitude:
      (
        tip.coordinate.latitude +
        anonas.coordinate.latitude
      ) / 2,
    longitude:
      (
        tip.coordinate.longitude +
        anonas.coordinate.longitude
      ) / 2,
  };

  assert.ok(
    distanceToRouteMeters(
      midpoint,
      route.polyline,
    ) < 0.1,
  );
});

test("duplicate route points are handled", () => {
  assert.equal(
    distanceToRouteMeters(
      tip.coordinate,
      [
        tip.coordinate,
        tip.coordinate,
      ],
    ),
    0,
  );
});

test("empty route has no usable distance", () => {
  assert.equal(
    distanceToRouteMeters(
      tip.coordinate,
      [],
    ),
    Infinity,
  );
});

test("active area check still rejects leaving the area", () => {
  assert.equal(
    issue(
      route,
      snapshot({
        latitude: 14.55,
        longitude: 121.02,
      }),
      {
        requireOrigin: false,
        requireFresh: false,
      },
    ),
    "outside-area",
  );
});

test("stationary active trip does not expire its last known point", () => {
  const s = snapshot();

  s.position.timestamp =
    new Date(now - 31000).toISOString();

  assert.equal(
    issue(route, s, {
      requireOrigin: false,
      requireFresh: false,
    }),
    undefined,
  );
});

let passed = 0;

for (const { name, run } of tests) {
  try {
    run();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

console.log(
  `\n${passed}/${tests.length} trip tests passed`,
);

process.exitCode =
  passed === tests.length ? 0 : 1;
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
    (match, list, spec) => `const {${list.replace(/\s+as\s+/g, ": ")}} = __import("${spec}");`,
  );

  source += `\nmodule.exports = { ${names.join(", ")} };`;

  const mod = { exports: {} };
  cache.set(file, mod);

  new Function("module", "exports", "__import", "require", source)(
    mod,
    mod.exports,
    (spec) => {
      if (!spec.startsWith(".")) {
        throw new Error(`Unexpected import ${spec}`);
      }

      let target = path.resolve(path.dirname(file), spec);

      if (!path.extname(target)) {
        target += ".js";
      }

      return load(target);
    },
    (spec) => {
      const error = new Error(`Cannot find module '${spec}'`);

      error.code = "MODULE_NOT_FOUND";
      throw error;
    },
  );

  return mod.exports;
}

const { currentLocationPlace, readDeviceHeading, headingBeam, createHeadingTracker } = load(
  path.join(root, "src/services/deviceLocation.js"),
);

const { distanceMeters } = load(path.join(root, "src/services/location.js"));

const point = {
  latitude: 14.62584479,
  longitude: 121.06225382,
};

const now = Date.now();

const fresh = () => ({
  status: "ready",
  inServiceArea: true,
  position: {
    ...point,
    accuracyMeters: 10,
    timestamp: new Date(now).toISOString(),
  },
});

const tests = [];

const test = (name, run) => {
  tests.push({ name, run });
};

const tick = () => new Promise((resolve) => setImmediate(resolve));

function deferred() {
  let resolve;

  const promise = new Promise((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

function makeNative(options = {}) {
  const callbacks = [];
  const errors = [];

  const calls = {
    watches: 0,
    removes: 0,
    requests: 0,
  };

  return {
    calls,
    callbacks,
    errors,

    getForegroundPermissionsAsync: async () => ({
      status: options.permission || "granted",
    }),

    requestForegroundPermissionsAsync: async () => {
      calls.requests += 1;
    },

    hasServicesEnabledAsync: async () => options.enabled !== false,

    watchHeadingAsync: async (callback, error) => {
      calls.watches += 1;
      callbacks.push(callback);
      errors.push(error);

      if (options.fail) {
        throw new Error("No compass");
      }

      if (options.gate) {
        await options.gate;
      }

      return {
        remove() {
          calls.removes += 1;
        },
      };
    },
  };
}

test("current location becomes a device place", () => {
  const place = currentLocationPlace(fresh(), now);

  assert.equal(place.name, "Current location");
  assert.equal(place.source, "device");
  assert.deepEqual(place.coordinate, point);
});

test("selected coordinate stays fixed after the reading changes", () => {
  const snapshot = fresh();
  const place = currentLocationPlace(snapshot, now);

  snapshot.position.latitude += 0.001;

  assert.equal(place.coordinate.latitude, point.latitude);
});

test("outside current location is rejected", () => {
  const snapshot = fresh();
  snapshot.position.latitude = 14.55;

  assert.throws(() => currentLocationPlace(snapshot, now), /outside/i);
});

test("outside status cannot select current location", () => {
  const snapshot = fresh();
  snapshot.status = "outside-area";

  assert.throws(() => currentLocationPlace(snapshot, now), /outside/i);
});

test("missing GPS is rejected", () => {
  assert.throws(() => currentLocationPlace(null, now), /not ready/i);
});

test("denied GPS is rejected", () => {
  assert.throws(() => currentLocationPlace({ status: "denied" }, now), /not ready/i);
});

test("stale GPS is rejected", () => {
  const snapshot = fresh();

  snapshot.position.timestamp = new Date(now - 31000).toISOString();

  assert.throws(() => currentLocationPlace(snapshot, now), /fresh/i);
});

test("future GPS is rejected", () => {
  const snapshot = fresh();

  snapshot.position.timestamp = new Date(now + 6000).toISOString();

  assert.throws(() => currentLocationPlace(snapshot, now), /fresh/i);
});

test("true north heading is preferred", () => {
  assert.equal(
    readDeviceHeading({
      accuracy: 3,
      trueHeading: 90,
      magHeading: 80,
    }),
    90,
  );
});

test("zero degrees is valid", () => {
  assert.equal(
    readDeviceHeading({
      accuracy: 3,
      trueHeading: 0,
      magHeading: 90,
    }),
    0,
  );
});

test("magnetic heading is a fallback", () => {
  assert.equal(
    readDeviceHeading({
      accuracy: 2,
      trueHeading: -1,
      magHeading: 180,
    }),
    180,
  );
});

test("uncalibrated compass hides the beam", () => {
  assert.equal(
    readDeviceHeading({
      accuracy: 0,
      trueHeading: 90,
    }),
    null,
  );
});

test("invalid compass hides the beam", () => {
  assert.equal(
    readDeviceHeading({
      accuracy: 2,
      trueHeading: NaN,
      magHeading: NaN,
    }),
    null,
  );
});

test("360 degrees wraps to north", () => {
  assert.equal(
    readDeviceHeading({
      accuracy: 3,
      trueHeading: 360,
    }),
    0,
  );
});

test("north beam points north with a 35 metre radius", () => {
  const beam = headingBeam(point, 0);

  assert.equal(beam.length, 10);
  assert.ok(beam[5].latitude > point.latitude);

  assert.ok(Math.abs(beam[5].longitude - point.longitude) < 1e-8);

  assert.ok(Math.abs(distanceMeters(point, beam[5]) - 35) < 0.01);
});

test("east beam turns east", () => {
  const beam = headingBeam(point, 90);

  assert.ok(beam[5].longitude > point.longitude);

  assert.ok(Math.abs(beam[5].latitude - point.latitude) < 1e-6);
});

test("missing heading does not invent a beam", () => {
  assert.deepEqual(headingBeam(point, null), []);
});

test("missing location does not draw a beam", () => {
  assert.deepEqual(headingBeam(null, 90), []);
});

test("repeated compass starts create one watch", async () => {
  const native = makeNative();

  const tracker = createHeadingTracker(native, () => {});

  await Promise.all([tracker.start(), tracker.start()]);

  await tracker.start();

  assert.equal(native.calls.watches, 1);
  assert.equal(native.calls.requests, 0);

  tracker.stop();
});

test("compass stop removes once and ignores late readings", async () => {
  const native = makeNative();
  const readings = [];

  const tracker = createHeadingTracker(native, (value) => readings.push(value));

  await tracker.start();

  native.callbacks[0]({
    accuracy: 3,
    trueHeading: 90,
  });

  tracker.stop();
  tracker.stop();

  native.callbacks[0]({
    accuracy: 3,
    trueHeading: 180,
  });

  assert.equal(native.calls.removes, 1);
  assert.equal(readings.at(-1), null);
  assert.equal(readings.includes(180), false);
});

test("denied compass access never requests permission", async () => {
  const native = makeNative({
    permission: "denied",
  });

  const tracker = createHeadingTracker(native, () => {});

  await tracker.start();

  assert.equal(native.calls.watches, 0);
  assert.equal(native.calls.requests, 0);

  tracker.stop();
});

test("disabled device Location never starts compass", async () => {
  const native = makeNative({
    enabled: false,
  });

  const tracker = createHeadingTracker(native, () => {});

  await tracker.start();

  assert.equal(native.calls.watches, 0);

  tracker.stop();
});

test("late compass creation is removed after stop", async () => {
  const gate = deferred();

  const native = makeNative({
    gate: gate.promise,
  });

  const tracker = createHeadingTracker(native, () => {});

  const pending = tracker.start();

  while (!native.calls.watches) {
    await tick();
  }

  tracker.stop();
  gate.resolve();

  await pending;

  assert.equal(native.calls.removes, 1);
});

test("stop and restart serialize pending compass creation", async () => {
  const gate = deferred();

  const native = makeNative({
    gate: gate.promise,
  });

  const tracker = createHeadingTracker(native, () => {});

  const first = tracker.start();

  while (!native.calls.watches) {
    await tick();
  }

  tracker.stop();

  const second = tracker.start();

  assert.equal(native.calls.watches, 1);

  gate.resolve();

  await first;
  await second;

  assert.equal(native.calls.watches, 2);
  assert.equal(native.calls.removes, 1);

  tracker.stop();
});

test("compass failure does not retry in a loop", async () => {
  const native = makeNative({
    fail: true,
  });

  const tracker = createHeadingTracker(native, () => {});

  await tracker.start();

  assert.equal(native.calls.watches, 1);

  tracker.stop();
});

test("compass stream error clears heading and removes watch", async () => {
  const native = makeNative();
  const readings = [];

  const tracker = createHeadingTracker(native, (value) => readings.push(value));

  await tracker.start();

  native.errors[0]("Unavailable");

  assert.equal(native.calls.removes, 1);
  assert.equal(readings.at(-1), null);
});

(async () => {
  let passed = 0;

  for (const { name, run } of tests) {
    try {
      await run();
      passed += 1;
      console.log(`PASS ${name}`);
    } catch (error) {
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  }

  console.log(`\n${passed}/${tests.length} device location tests passed`);

  process.exitCode = passed === tests.length ? 0 : 1;
})();

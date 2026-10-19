/* Member 2 tests: permissions, area checks, accuracy, cleanup, late callbacks.
 * Run with: node scripts/test-location.cjs
 *
 * The app source uses ES module syntax without file extensions, which plain
 * Node cannot load, so this file includes a tiny loader that converts the
 * simple import/export forms used by the location files. If the team already
 * has a shared loader for the account tests, it can replace this one.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const cache = new Map();

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
    (match, list, spec) =>
      `const {${list.replace(/\s+as\s+/g, ": ")}} = __import("${spec}");`,
  );
  source += `\nmodule.exports = { ${names.join(", ")} };`;

  const mod = { exports: {} };
  cache.set(file, mod);
  const run = new Function("module", "exports", "__import", "require", source);
  run(
    mod,
    mod.exports,
    (spec) => {
      if (!spec.startsWith(".")) throw new Error(`Unexpected import ${spec}`);
      let target = path.resolve(path.dirname(file), spec);
      if (!path.extname(target)) target += ".js";
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

const { LOCATION_STATUS } = load(path.join(root, "src/constants/commute.js"));
const { LANDMARKS, SERVICE_AREA } = load(
  path.join(root, "src/data/serviceArea.js"),
);
const location = load(path.join(root, "src/services/location.js"));
const {
  LOCATION_LABELS,
  MAX_ACCEPTABLE_ACCURACY_METERS,
  createInitialSnapshot,
  createLabelCache,
  createLocationTracker,
  isWithinServiceArea,
  requestForegroundLocation,
  resolveLocationLabel,
  watchForegroundLocation,
} = location;

// ---------- helpers ----------

const tick = () => new Promise((resolve) => setImmediate(resolve));

async function waitFor(check, label) {
  for (let i = 0; i < 100; i += 1) {
    if (check()) return;
    await tick();
  }
  throw new Error(`Timed out waiting for: ${label}`);
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const TIP = LANDMARKS.find((l) => l.id === "tip-qc").coordinate;
const GATEWAY = LANDMARKS.find((l) => l.id === "gateway-mall").coordinate;
const FAR_OUTSIDE = { latitude: 14.5547, longitude: 121.0244 }; // Makati
const INSIDE_NO_LANDMARK = { latitude: 14.64, longitude: 121.035 };

function fix(coordinate, accuracy = 10, heading = 90) {
  return {
    coords: {
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      accuracy,
      heading,
      speed: 0,
      altitude: 0,
    },
    timestamp: Date.now(),
  };
}

function makeNative(options = {}) {
  const calls = { watch: 0, removes: 0, permission: 0, permissionChecks: 0 };
  const native = {
    Accuracy: { Balanced: 3 },
    calls,
    callbacks: [],
    getForegroundPermissionsAsync: async () => {
      calls.permissionChecks += 1;
      return {
        status: options.permission || "granted",
        canAskAgain: options.canAskAgain !== false,
      };
    },
    requestForegroundPermissionsAsync: async () => {
      calls.permission += 1;
      return { status: options.permission || "granted" };
    },
    hasServicesEnabledAsync: async () => options.servicesEnabled !== false,
    getCurrentPositionAsync: async () => {
      if (options.getCurrent) return options.getCurrent();
      return fix(options.at || TIP);
    },
    watchPositionAsync: async (watchOptions, callback) => {
      calls.watch += 1;
      native.callbacks.push(callback);
      if (options.watchGate) await options.watchGate;
      return {
        remove() {
          calls.removes += 1;
        },
      };
    },
  };
  return native;
}

function useNative(native, extra = {}) {
  location.__configureLocationForTests({ native, ...extra });
}

function newTracker() {
  const snapshots = [];
  const tracker = createLocationTracker((s) => snapshots.push(s));
  return { tracker, snapshots, last: () => snapshots[snapshots.length - 1] };
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// ---------- service area ----------

test("landmarks and draft boundary are consistent", () => {
  for (const item of LANDMARKS) {
    assert.equal(isWithinServiceArea(item.coordinate), true, item.id);
  }
  assert.equal(SERVICE_AREA.verified, false);
});

test("outside, invalid and boundary points", () => {
  assert.equal(isWithinServiceArea(FAR_OUTSIDE), false);
  const bad = [
    null,
    undefined,
    {},
    { latitude: NaN, longitude: 121.05 },
    { latitude: "14.6", longitude: "121.05" },
    { latitude: 14.62, longitude: Infinity },
    { latitude: 91, longitude: 121.05 },
  ];
  for (const value of bad) assert.equal(isWithinServiceArea(value), false);
  const b = SERVICE_AREA.bounds;
  assert.equal(
    isWithinServiceArea({
      latitude: b.minLatitude,
      longitude: b.minLongitude,
    }),
    true,
  );
  assert.equal(
    isWithinServiceArea({
      latitude: b.maxLatitude + 0.0001,
      longitude: b.minLongitude,
    }),
    false,
  );
});

test("labels: landmark, area, outside, invalid", async () => {
  for (const item of LANDMARKS) {
    assert.equal(
      await resolveLocationLabel(item.coordinate),
      `Near ${item.name}`,
    );
  }
  assert.equal(
    await resolveLocationLabel(INSIDE_NO_LANDMARK),
    LOCATION_LABELS.insideArea,
  );
  assert.equal(
    await resolveLocationLabel(FAR_OUTSIDE),
    LOCATION_LABELS.outsideArea,
  );
  assert.equal(await resolveLocationLabel(null), LOCATION_LABELS.unavailable);
});

test("label cache avoids repeated lookups for small moves", async () => {
  let lookups = 0;
  const labelFor = createLabelCache(async () => {
    lookups += 1;
    return "x";
  });
  await labelFor(TIP);
  await labelFor({
    latitude: TIP.latitude + 0.00005,
    longitude: TIP.longitude,
  });
  await labelFor({
    latitude: TIP.latitude,
    longitude: TIP.longitude + 0.00005,
  });
  assert.equal(lookups, 1);
  await labelFor(INSIDE_NO_LANDMARK);
  assert.equal(lookups, 2);
  await labelFor(FAR_OUTSIDE); // crossing the boundary always re-resolves
  assert.equal(lookups, 3);
});

// ---------- one-time fix ----------

test("granted + inside area gives ready snapshot", async () => {
  useNative(makeNative({ at: TIP }));
  const s = await requestForegroundLocation();
  assert.equal(s.status, LOCATION_STATUS.READY);
  assert.equal(s.inServiceArea, true);
  assert.equal(s.label, "Near TIP QC");
  assert.equal(s.position.latitude, TIP.latitude);
  assert.equal(s.position.accuracyMeters, 10);
  assert.equal(s.position.headingDegrees, 90);
  assert.ok(!Number.isNaN(Date.parse(s.position.timestamp)));
});

test("granted + outside area", async () => {
  useNative(makeNative({ at: FAR_OUTSIDE }));
  const s = await requestForegroundLocation();
  assert.equal(s.status, LOCATION_STATUS.OUTSIDE_AREA);
  assert.equal(s.inServiceArea, false);
  assert.equal(s.label, LOCATION_LABELS.outsideArea);
  assert.ok(s.position);
});

test("denied permission", async () => {
  const native = makeNative({ permission: "denied" });
  useNative(native);
  const s = await requestForegroundLocation();
  assert.equal(s.status, LOCATION_STATUS.DENIED);
  assert.equal(s.position, null);
  assert.equal(s.label, LOCATION_LABELS.denied);
});

test("device location services off", async () => {
  useNative(makeNative({ servicesEnabled: false }));
  const s = await requestForegroundLocation();
  assert.equal(s.status, LOCATION_STATUS.UNAVAILABLE);
  assert.equal(s.label, LOCATION_LABELS.unavailable);
});

test("native module missing does not crash", async () => {
  useNative(null);
  const s = await requestForegroundLocation();
  assert.equal(s.status, LOCATION_STATUS.UNAVAILABLE);
  await assert.rejects(() =>
    watchForegroundLocation(
      () => {},
      () => {},
    ),
  );
});

test("poor accuracy is not trusted", async () => {
  useNative(
    makeNative({
      getCurrent: async () => fix(TIP, MAX_ACCEPTABLE_ACCURACY_METERS + 1),
    }),
  );
  const s = await requestForegroundLocation();
  assert.equal(s.status, LOCATION_STATUS.UNAVAILABLE);
  assert.equal(s.label, LOCATION_LABELS.weakSignal);
  assert.equal(s.position, null);
});

test("fix errors and timeouts become unavailable", async () => {
  useNative(
    makeNative({
      getCurrent: async () => {
        throw new Error("no gps");
      },
    }),
  );
  assert.equal(
    (await requestForegroundLocation()).status,
    LOCATION_STATUS.UNAVAILABLE,
  );

  useNative(makeNative({ getCurrent: () => new Promise(() => {}) }), {
    fixTimeoutMs: 20,
  });
  assert.equal(
    (await requestForegroundLocation()).status,
    LOCATION_STATUS.UNAVAILABLE,
  );
});

test("invalid heading and missing accuracy become null", async () => {
  useNative(
    makeNative({
      getCurrent: async () => {
        const f = fix(TIP, null, -1);
        f.coords.accuracy = null;
        return f;
      },
    }),
  );
  const s = await requestForegroundLocation();
  assert.equal(s.status, LOCATION_STATUS.READY);
  assert.equal(s.position.headingDegrees, null);
  assert.equal(s.position.accuracyMeters, null);
});

// ---------- raw watch ----------

test("watch delivers updates, ignores poor fixes, stops after remove", async () => {
  const native = makeNative();
  useNative(native);
  const received = [];
  const errors = [];
  const handle = await watchForegroundLocation(
    (s) => received.push(s),
    (e) => errors.push(e),
  );
  const callback = native.callbacks[0];

  callback(fix(TIP));
  await tick();
  assert.equal(received.length, 1);
  assert.equal(received[0].label, "Near TIP QC");

  callback(fix(GATEWAY, 500)); // poor accuracy
  await tick();
  assert.equal(received.length, 1);

  handle.remove();
  handle.remove(); // safe to repeat
  assert.equal(native.calls.removes, 1);

  callback(fix(GATEWAY)); // late callback after removal
  await tick();
  assert.equal(received.length, 1);
  assert.equal(errors.length, 0);
});

// ---------- tracker ----------

test("tracker: repeated start creates one subscription", async () => {
  const native = makeNative();
  useNative(native);
  const { tracker, last } = newTracker();
  await Promise.all([tracker.start(), tracker.start()]);
  await tracker.start();
  assert.equal(native.calls.watch, 1);
  assert.equal(tracker.isTracking(), true);
  assert.equal(last().status, LOCATION_STATUS.READY);
  tracker.dispose();
});

test("tracker: repeated stop is safe", async () => {
  const native = makeNative();
  useNative(native);
  const { tracker } = newTracker();
  await tracker.start();
  tracker.stop();
  tracker.stop();
  assert.equal(native.calls.removes, 1);
  assert.equal(tracker.isTracking(), false);
  tracker.dispose();
});

test("tracker: stop while the first fix is pending starts nothing", async () => {
  const gate = deferred();
  const native = makeNative({
    getCurrent: async () => {
      await gate.promise;
      return fix(TIP);
    },
  });
  useNative(native);
  const { tracker } = newTracker();
  const starting = tracker.start();
  tracker.stop();
  gate.resolve();
  await starting;
  await tick();
  assert.equal(native.calls.watch, 0);
  assert.equal(tracker.isTracking(), false);
  tracker.dispose();
});

test("tracker: stop while subscription is being created removes it", async () => {
  const gate = deferred();
  const native = makeNative({ watchGate: gate.promise });
  useNative(native);
  const { tracker } = newTracker();
  const starting = tracker.start();
  await waitFor(() => native.calls.watch === 1, "watch requested");
  tracker.stop();
  gate.resolve();
  await starting;
  assert.equal(native.calls.removes, 1);
  assert.equal(tracker.isTracking(), false);
  tracker.dispose();
});

test("tracker: outside area at start does not track", async () => {
  const native = makeNative({ at: FAR_OUTSIDE });
  useNative(native);
  const { tracker, last } = newTracker();
  await tracker.start();
  assert.equal(native.calls.watch, 0);
  assert.equal(last().status, LOCATION_STATUS.OUTSIDE_AREA);
  tracker.dispose();
});

test("tracker: denied permission does not track", async () => {
  const native = makeNative({ permission: "denied" });
  useNative(native);
  const { tracker, last } = newTracker();
  await tracker.start();
  assert.equal(native.calls.watch, 0);
  assert.equal(last().status, LOCATION_STATUS.DENIED);
  tracker.dispose();
});

test("tracker: leaving the area stops updates", async () => {
  const native = makeNative();
  useNative(native);
  const { tracker, snapshots, last } = newTracker();
  await tracker.start();
  const callback = native.callbacks[0];

  callback(fix(GATEWAY));
  await tick();
  assert.equal(last().label, "Near Gateway Mall");

  callback(fix(FAR_OUTSIDE));
  await tick();
  assert.equal(last().status, LOCATION_STATUS.OUTSIDE_AREA);
  assert.equal(native.calls.removes, 1);
  assert.equal(tracker.isTracking(), false);

  const count = snapshots.length;
  callback(fix(TIP)); // late callback from the stopped subscription
  await tick();
  assert.equal(snapshots.length, count);
  tracker.dispose();
});

test("tracker: poor accuracy updates keep the last good position", async () => {
  const native = makeNative();
  useNative(native);
  const { tracker, snapshots, last } = newTracker();
  await tracker.start();
  const count = snapshots.length;
  native.callbacks[0](fix(FAR_OUTSIDE, 900));
  await tick();
  assert.equal(snapshots.length, count);
  assert.equal(last().status, LOCATION_STATUS.READY);
  tracker.dispose();
});

test("tracker: dispose ignores late callbacks", async () => {
  const native = makeNative();
  useNative(native);
  const { tracker, snapshots } = newTracker();
  await tracker.start();
  const count = snapshots.length;
  tracker.dispose();
  tracker.dispose();
  native.callbacks[0](fix(TIP));
  await tick();
  assert.equal(snapshots.length, count);
  assert.equal(native.calls.removes, 1);
  await tracker.start(); // disposed trackers do nothing
  assert.equal(native.calls.watch, 1);
});

test("tracker: suspend in background, resume when active", async () => {
  const native = makeNative();
  useNative(native);
  const { tracker } = newTracker();
  await tracker.start();
  tracker.suspend();
  assert.equal(native.calls.removes, 1);
  assert.equal(tracker.isTracking(), false);
  await tracker.resume();
  assert.equal(native.calls.watch, 2);
  assert.equal(tracker.isTracking(), true);
  tracker.dispose();
});

test("tracker: resume without tracking only refreshes", async () => {
  const native = makeNative();
  useNative(native);
  const { tracker, last } = newTracker();
  await tracker.refresh();
  tracker.suspend();
  await tracker.resume();
  assert.equal(native.calls.watch, 0);
  assert.equal(last().status, LOCATION_STATUS.READY);
  tracker.dispose();
});

test("tracker: reset (logout) stops tracking and clears state", async () => {
  const native = makeNative();
  useNative(native);
  const { tracker, last } = newTracker();
  await tracker.start();
  tracker.reset();
  assert.equal(native.calls.removes, 1);
  assert.equal(last().status, LOCATION_STATUS.IDLE);
  assert.equal(last().position, null);
  await tracker.resume(); // must not restart tracking after logout
  assert.equal(native.calls.watch, 1);
  tracker.dispose();
});

test("tracker: newest refresh wins over a slow older one", async () => {
  const slow = deferred();
  let calls = 0;
  const native = makeNative({
    getCurrent: () => {
      calls += 1;
      if (calls === 1) return slow.promise;
      return fix(FAR_OUTSIDE);
    },
  });
  useNative(native);
  const { tracker, last } = newTracker();
  const first = tracker.refresh();
  await tick();
  await tracker.refresh();
  slow.resolve(fix(TIP));
  await first;
  await tick();
  assert.equal(last().status, LOCATION_STATUS.OUTSIDE_AREA);
  tracker.dispose();
});

test("granted permission is checked without opening another permission request", async () => {
  const native = makeNative();
  useNative(native);
  const result = await requestForegroundLocation();
  assert.equal(result.status, LOCATION_STATUS.READY);
  assert.equal(native.calls.permissionChecks, 1);
  assert.equal(native.calls.permission, 0);
});

test("permission that cannot be requested again stays denied", async () => {
  const native = makeNative({ permission: "denied", canAskAgain: false });
  useNative(native);
  const result = await requestForegroundLocation();
  assert.equal(result.status, LOCATION_STATUS.DENIED);
  assert.equal(native.calls.permission, 0);
});

test("permission activity returning to the app cannot create a request loop", async () => {
  const options = { permission: "undetermined" };
  const native = makeNative(options);
  useNative(native);
  const { tracker, last } = newTracker();
  let returning;
  native.requestForegroundPermissionsAsync = async () => {
    native.calls.permission += 1;
    assert.equal(native.calls.permission, 1);
    tracker.suspend();
    options.permission = "granted";
    returning = tracker.resume();
    return { status: "granted", canAskAgain: true };
  };
  await tracker.refresh();
  await returning;
  assert.equal(last().status, LOCATION_STATUS.READY);
  for (let i = 0; i < 5; i += 1) {
    tracker.suspend();
    await tracker.resume();
  }
  assert.equal(native.calls.permission, 1);
  assert.equal(last().status, LOCATION_STATUS.READY);
  tracker.dispose();
});

test("returning after denying permission does not ask again", async () => {
  const options = { permission: "undetermined" };
  const native = makeNative(options);
  useNative(native);
  const { tracker, last } = newTracker();
  let returning;
  native.requestForegroundPermissionsAsync = async () => {
    native.calls.permission += 1;
    assert.equal(native.calls.permission, 1);
    tracker.suspend();
    options.permission = "denied";
    returning = tracker.resume();
    return { status: "denied", canAskAgain: true };
  };
  await tracker.refresh();
  await returning;
  assert.equal(last().status, LOCATION_STATUS.DENIED);
  tracker.suspend();
  await tracker.resume();
  assert.equal(native.calls.permission, 1);
  tracker.dispose();
});

test("resuming a trip after permission is revoked does not prompt or restart its watch", async () => {
  const options = { permission: "granted" };
  const native = makeNative(options);
  useNative(native);
  const { tracker, last } = newTracker();
  await tracker.start();
  tracker.suspend();
  options.permission = "denied";
  await tracker.resume();
  assert.equal(last().status, LOCATION_STATUS.DENIED);
  assert.equal(native.calls.watch, 1);
  assert.equal(native.calls.permission, 0);
  assert.equal(tracker.isTracking(), false);
  tracker.dispose();
});

test("initial snapshot is idle with a finding label", () => {
  const s = createInitialSnapshot();
  assert.equal(s.status, LOCATION_STATUS.IDLE);
  assert.equal(s.label, LOCATION_LABELS.finding);
  assert.equal(s.position, null);
});

// ---------- run ----------

(async () => {
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      location.__configureLocationForTests({});
      await fn();
      console.log(`  ok   ${name}`);
    } catch (error) {
      failed += 1;
      console.log(`  FAIL ${name}`);
      console.log(`       ${error && error.stack ? error.stack : error}`);
    }
  }
  location.__configureLocationForTests({});
  console.log(
    `\n${tests.length - failed}/${tests.length} location tests passed`,
  );
  process.exit(failed ? 1 : 0);
})();


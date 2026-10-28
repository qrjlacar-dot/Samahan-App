const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");
const root = path.resolve(__dirname, "..");

function fixture({
  os = "android",
  granted = true,
  answer = "granted",
  missing = false,
  fail = false,
  wait,
} = {}) {
  const state = {
    calls: [],
    links: [],
    alerts: [],
    requests: [],
    checks: [],
    appState: { currentState: "active" },
    now: 10000,
  };
  const load = createLoader(
    {
      "react-native": {
        Platform: { OS: os },
        AppState: state.appState,
        Alert: { alert: (...args) => state.alerts.push(args) },
        Linking: {
          openURL: async (url) => state.links.push(url),
          openSettings: async () => {},
        },
        PermissionsAndroid: {
          PERMISSIONS: { CALL_PHONE: "android.permission.CALL_PHONE" },
          RESULTS: { GRANTED: "granted" },
          check: async (permission) => {
            state.checks.push(permission);
            return granted;
          },
          request: async (...args) => {
            state.requests.push(args);
            if (wait) await wait;
            return answer;
          },
        },
      },
      "../../modules/samahan-phone-call/index": {
        getPhoneCallModule: () =>
          missing
            ? null
            : {
                call: async (number) => {
                  if (fail) throw new Error("No SIM");
                  state.calls.push(number);
                },
              },
      },
    },
    { Date: { now: () => state.now } },
  );
  return { ...load(path.join(root, "src/services/phoneCalls.js")), state };
}

test("Android personal Call starts the native call with the normalized number", async () => {
  const f = fixture();
  assert.equal(await f.callPhoneNumber("(+63) 917-123-4567"), true);
  assert.deepEqual(f.state.calls, ["+639171234567"]);
  assert.deepEqual(f.state.links, []);
  assert.deepEqual(f.state.checks, ["android.permission.CALL_PHONE"]);
  assert.equal(f.state.requests.length, 0);
});

test("personal calling requests permission on the actual Call tap and proceeds after approval", async () => {
  const f = fixture({ granted: false });
  assert.equal(f.state.requests.length, 0);
  assert.equal(await f.callPhoneNumber("09171234567"), true);
  assert.equal(f.state.requests.length, 1);
  assert.deepEqual(f.state.calls, ["09171234567"]);
});

for (const answer of ["denied", "never_ask_again"]) {
  test(`denied phone permission (${answer}) never starts a call`, async () => {
    const f = fixture({ granted: false, answer });
    assert.equal(await f.callPhoneNumber("09171234567"), false);
    assert.equal(f.state.calls.length, 0);
    assert.equal(f.state.links.length, 0);
    assert.match(f.state.alerts[0][0], /blocked/);
  });
}

test("an old APK or Expo Go explains the required rebuild without a crash or a phone prompt", async () => {
  const f = fixture({ missing: true });
  assert.equal(await f.callPhoneNumber("09171234567"), false);
  assert.equal(f.state.checks.length, 0);
  assert.match(f.state.alerts[0][0], /build required/);
});

test("iPhone and emergency hotlines keep system calling behavior without Android permission", async () => {
  for (const [options, number, emergency] of [
    [{ os: "ios" }, "09171234567", false],
    [{}, "911", false],
    [{}, "122", true],
    [{}, "09171234567", true],
  ]) {
    const f = fixture(options);
    assert.equal(await f.callPhoneNumber(number, { emergency }), true);
    assert.deepEqual(f.state.links, [`tel:${number}`]);
    assert.equal(f.state.calls.length, 0);
    assert.equal(f.state.checks.length, 0);
  }
});

test("invalid, injected and USSD numbers cannot start calls", async () => {
  const f = fixture();
  for (const number of [
    null,
    "",
    "123",
    "0917123456",
    "091712345678",
    "tel:09171234567",
    "*123#",
    "09171234567;911",
  ]) {
    assert.equal(await f.callPhoneNumber(number), false);
  }
  assert.equal(f.state.calls.length, 0);
  assert.equal(f.state.checks.length, 0);
});

test("duplicate taps while permission is open or just after a call do not dial twice", async () => {
  let resolve;
  const wait = new Promise((done) => {
    resolve = done;
  });
  const f = fixture({ granted: false, wait });
  const first = f.callPhoneNumber("09171234567");
  assert.equal(await f.callPhoneNumber("09171234567"), false);
  resolve();
  assert.equal(await first, true);
  assert.equal(await f.callPhoneNumber("09171234567"), false);
  assert.equal(f.state.calls.length, 1);
  f.state.now += 2001;
  assert.equal(await f.callPhoneNumber("09171234567"), true);
});

test("backgrounding during the permission question cannot begin a call", async () => {
  let resolve;
  const wait = new Promise((done) => {
    resolve = done;
  });
  const f = fixture({ granted: false, wait });
  const call = f.callPhoneNumber("09171234567");
  f.state.appState.currentState = "background";
  resolve();
  assert.equal(await call, false);
  assert.equal(f.state.calls.length, 0);
});

test("a native call failure is visible and permits a deliberate retry", async () => {
  const f = fixture({ fail: true });
  assert.equal(await f.callPhoneNumber("09171234567"), false);
  assert.equal(await f.callPhoneNumber("09171234567"), false);
  assert.equal(f.state.alerts.length, 2);
});

test("the native wrapper can load safely when the custom module is absent", () => {
  const load = createLoader({
    "expo-modules-core": {
      requireNativeModule: () => {
        throw new Error("Unavailable");
      },
    },
  });
  assert.equal(
    load(
      path.join(root, "modules/samahan-phone-call/index.js"),
    ).getPhoneCallModule(),
    null,
  );
});

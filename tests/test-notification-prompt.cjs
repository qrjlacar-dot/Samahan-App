const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");
const hookHarness = require("./helpers/hook-harness.cjs");

const root = path.resolve(__dirname, "..");
// The app code runs in a separate vm context, so compare plain copies.
const same = (actual, expected) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);
const settle = () => new Promise((resolve) => setImmediate(resolve));

const constants = createLoader()(path.join(root, "src/constants/commute.js"));
const { LOCATION_STATUS } = constants;
const SERVICES_OFF = "Location is off";

function fixture({
  status,
  label = "",
  shouldAsk = true,
  permission = "unavailable",
  appState = "active",
}) {
  const { react, render } = hookHarness();
  const alerts = [];
  const timers = [];
  const saved = [];
  const asked = [];
  const load = createLoader(
    {
      react,
      "react-native": {
        Alert: {
          alert: (title, message, buttons, options) =>
            alerts.push({ title, message, buttons, options }),
        },
        AppState: { currentState: appState },
      },
      "../context/AuthContext": { useAuth: () => ({ user: { uid: "account-a" } }) },
      "../context/LocationContext": { useLocation: () => ({ snapshot: { status, label } }) },
      "../services/location": { LOCATION_LABELS: { servicesOff: SERVICES_OFF } },
      "../services/notifications": {
        shouldAskNotificationPermission: async () => shouldAsk,
        markNotificationPermissionAsked: async (uid) => {
          asked.push(uid);
        },
        setNotificationPreferences: async (uid, value) => {
          saved.push([uid, value]);
          return value;
        },
      },
      "../services/phoneNotifications": { requestPhonePermission: async () => permission },
    },
    {
      setTimeout(fn) {
        timers.push(fn);
        return timers.length;
      },
      clearTimeout() {},
    },
  );
  const { useNotificationPrompt } = load(path.join(root, "src/hooks/useNotificationPrompt.js"));
  const h = render(useNotificationPrompt);
  const run = async () => {
    for (const fn of timers.splice(0)) await fn();
    await settle();
  };
  return { h, alerts, timers, saved, asked, run };
}

test("nothing is asked while Location is still being checked", async () => {
  const f = fixture({ status: LOCATION_STATUS.LOCATING });
  assert.equal(f.timers.length, 0);
  await f.run();
  assert.equal(f.alerts.length, 0);
  f.h.dispose();
});

test("nothing is asked while the 'turn on Location' pop-up applies", async () => {
  const f = fixture({ status: LOCATION_STATUS.UNAVAILABLE, label: SERVICES_OFF });
  assert.equal(f.timers.length, 0);
  f.h.dispose();
});

test("after Location is finished the question appears once, with Allow and Don't allow", async () => {
  for (const status of [
    LOCATION_STATUS.READY,
    LOCATION_STATUS.OUTSIDE_AREA,
    LOCATION_STATUS.DENIED,
  ]) {
    const f = fixture({ status });
    await f.run();
    assert.equal(f.alerts.length, 1, status);
    assert.equal(f.alerts[0].title, "Allow notifications?");
    same(
      f.alerts[0].buttons.map((button) => button.text),
      ["Don't allow", "Allow"],
    );
    assert.equal(f.alerts[0].options.cancelable, false);
    same(f.asked, ["account-a"]);
    f.h.dispose();
  }
});

test("Location failing without its own pop-up also lets the question appear", async () => {
  const f = fixture({ status: LOCATION_STATUS.UNAVAILABLE, label: "Weak signal" });
  await f.run();
  assert.equal(f.alerts.length, 1);
  f.h.dispose();
});

test("an account that was already asked, or already chose, is not asked again", async () => {
  const f = fixture({ status: LOCATION_STATUS.READY, shouldAsk: false });
  await f.run();
  assert.equal(f.alerts.length, 0);
  assert.equal(f.asked.length, 0);
  f.h.dispose();
});

test("the question is skipped while the app is not in the foreground", async () => {
  const f = fixture({ status: LOCATION_STATUS.READY, appState: "background" });
  await f.run();
  assert.equal(f.alerts.length, 0);
  f.h.dispose();
});

test("Don't allow saves phone notifications as off", async () => {
  const f = fixture({ status: LOCATION_STATUS.READY });
  await f.run();
  f.alerts[0].buttons[0].onPress();
  await settle();
  same(f.saved, [["account-a", { enabled: false }]]);
  f.h.dispose();
});

test("Allow saves on when this build cannot show phone notifications", async () => {
  const f = fixture({ status: LOCATION_STATUS.READY, permission: "unavailable" });
  await f.run();
  f.alerts[0].buttons[1].onPress();
  await settle();
  same(f.saved, [["account-a", { enabled: true }]]);
  f.h.dispose();
});

test("Allow saves on when the phone also allows it, and off when the phone refuses", async () => {
  const granted = fixture({ status: LOCATION_STATUS.READY, permission: "granted" });
  await granted.run();
  granted.alerts[0].buttons[1].onPress();
  await settle();
  same(granted.saved, [["account-a", { enabled: true }]]);
  granted.h.dispose();

  const denied = fixture({ status: LOCATION_STATUS.READY, permission: "denied" });
  await denied.run();
  denied.alerts[0].buttons[1].onPress();
  await settle();
  same(denied.saved, [["account-a", { enabled: false }]]);
  denied.h.dispose();
});

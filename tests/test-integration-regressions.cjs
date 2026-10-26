const expandPresentation = require("./helpers/expand-presentation.cjs");
const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");
const hookHarness = require("./helpers/hook-harness.cjs");
const root = (file) => path.resolve(__dirname, "../src", file);
const load = createLoader();
const { TRAIN_PLACE_BY_ID } = load(root("data/trainNetwork.js"));
const { getTrainGuide, getMultimodalTrainGuide } = load(root("services/routing/trainPlanner.js"));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

function trainSession({ routing, refresh } = {}) {
  const { react, render } = hookHarness();
  const changed = [];
  let calls = 0;
  const route = getTrainGuide({
    origin: TRAIN_PLACE_BY_ID["lrt2-anonas"],
    destination: TRAIN_PLACE_BY_ID["lrt2-cubao"],
  });
  const fix = {
    status: "ready",
    inServiceArea: true,
    position: {
      ...route.origin.coordinate,
      accuracyMeters: 15,
      timestamp: new Date().toISOString(),
    },
  };
  const { useTrainTrip } = createLoader({
    react,
    "react-native": { Alert: { alert() {} } },
    "../services/notifications": {
      notifyTripCompleted: async () => ({}),
      notifyTripCancelled: async () => ({}),
    },
    "../services/routes": {
      getRoutes: (...args) => {
        calls++;
        return routing(...args);
      },
    },
  })(root("hooks/useTrainTrip.js"));
  const h = render(useTrainTrip, {
    route,
    snapshot: fix,
    refreshLocation: refresh || (async () => fix),
    startTracking: async () => {},
    stopTracking() {},
    onRouteChange: (next) => changed.push(next),
  });
  return { h, route, fix, changed, calls: () => calls };
}

test("ending a train trip prevents a delayed reroute from replacing the next transport route", async () => {
  const waiting = deferred();
  let signal;
  const s = trainSession({
    routing: (_request, options) => {
      signal = options?.signal;
      return waiting.promise;
    },
  });
  await s.h.result.start();
  s.h.flush();
  const pending = s.h.result.reroute();
  s.h.result.end();
  s.h.flush();
  waiting.resolve([{ ...s.route, id: "late-train-route" }]);
  assert.equal(await pending, false);
  s.h.flush();
  assert.equal(s.changed.length, 0);
  assert.equal(s.h.result.state, "idle");
  assert.equal(signal?.aborted, true);
  s.h.dispose();
});

test("switching away from Train ignores a delayed reroute error", async () => {
  const waiting = deferred();
  const s = trainSession({ routing: () => waiting.promise });
  await s.h.result.start();
  s.h.flush();
  const pending = s.h.result.reroute();
  s.h.props = { ...s.h.props, route: null };
  s.h.flush();
  waiting.reject(new Error("An old request failed"));
  assert.equal(await pending, false);
  s.h.flush();
  assert.equal(s.h.result.message, "");
  assert.equal(s.h.result.state, "idle");
  assert.equal(s.changed.length, 0);
  s.h.dispose();
});

test("repeated train recalculation taps start only one pending request", async () => {
  const waiting = deferred();
  const s = trainSession({ routing: () => waiting.promise });
  await s.h.result.start();
  s.h.flush();
  const first = s.h.result.reroute();
  const second = s.h.result.reroute();
  waiting.resolve([{ ...s.route, id: "new-train-route" }]);
  await first;
  await second;
  s.h.flush();
  assert.equal(s.calls(), 1);
  assert.equal(s.changed.length, 1);
  s.h.dispose();
});

test("unmounting Directions cancels a train start waiting for GPS", async () => {
  const waiting = deferred();
  const s = trainSession({ refresh: () => waiting.promise });
  const pending = s.h.result.start();
  s.h.dispose();
  waiting.resolve(s.fix);
  assert.equal(await pending, false);
});

test("a 10 to 25 metre trip near the same station still has walking instructions", async () => {
  const origin = TRAIN_PLACE_BY_ID["lrt2-cubao"];
  const destination = {
    ...origin,
    id: "nearby-door",
    coordinate: {
      ...origin.coordinate,
      latitude: origin.coordinate.latitude + 0.00015,
    },
  };
  const route = await getMultimodalTrainGuide({ origin, destination });
  assert.equal(route.trainStopCount, 0);
  assert.ok(route.steps.length > 0);
  assert.ok(route.polyline.length >= 2);
  assert.ok(route.distanceMeters >= 10 && route.distanceMeters < 25);
});

test("an account switch while saving the prompt flag cannot show the old account's notification alert", async () => {
  const { react, render } = hookHarness();
  const waiting = deferred();
  const timers = [],
    alerts = [];
  const markStarted = deferred();
  let uid = "account-a";
  const { useNotificationPrompt } = createLoader(
    {
      react,
      "react-native": {
        Alert: { alert: (...args) => alerts.push(args) },
        AppState: { currentState: "active" },
      },
      "../services/phoneNotifications": { requestPhonePermission: async () => "granted" },
      "../context/AuthContext": { useAuth: () => ({ user: { uid } }) },
      "../context/LocationContext": { useLocation: () => ({ snapshot: { status: "ready" } }) },
      "../services/notifications": {
        shouldAskNotificationPermission: async () => true,
        markNotificationPermissionAsked: () => {
          markStarted.resolve();
          return waiting.promise;
        },
        setNotificationPreferences: async () => {},
      },
    },
    {
      setTimeout: (fn) => {
        timers.push(fn);
        return timers.length;
      },
      clearTimeout() {},
    },
  )(root("hooks/useNotificationPrompt.js"));
  const h = render(useNotificationPrompt);
  const pending = timers[0]();
  await markStarted.promise;
  uid = "account-b";
  h.flush();
  waiting.resolve();
  await pending;
  assert.equal(alerts.length, 0);
  h.dispose();
});

test("Directions starts the selected train, bus, jeep or walking navigator after integration", async () => {
  const nodes = (tree, type) =>
    Array.isArray(tree)
      ? tree.flatMap((item) => nodes(item, type))
      : tree && typeof tree === "object"
        ? [...(tree.type === type ? [tree] : []), ...nodes(tree.props?.children, type)]
        : [];
  for (const mode of ["train", "bus", "jeep", "walk"]) {
    const { react, runtime, render } = hookHarness();
    const noop = () => {};
    const route = {
      ...getTrainGuide({
        origin: TRAIN_PLACE_BY_ID["lrt2-anonas"],
        destination: TRAIN_PLACE_BY_ID["lrt2-cubao"],
      }),
      preferredMode: mode,
    };
    const received = {},
      started = [];
    const tripFor = (name, args) => {
      received[name] = args.route;
      return {
        state: "idle",
        open: false,
        busy: false,
        progress: null,
        end: noop,
        recenterRequest: 0,
        stopFollowing: noop,
        start: async () => {
          started.push(name);
          return true;
        },
      };
    };
    class Value {
      addListener() {
        return 1;
      }
      removeListener() {}
      stopAnimation() {}
    }
    const { default: Screen } = createLoader({
      react,
      "react/jsx-runtime": runtime,
      "expo-router": {
        useRouter: () => ({ back: noop }),
        useLocalSearchParams: () => ({
          journey: JSON.stringify({
            origin: route.origin,
            destination: route.destination,
            preferredMode: mode,
            ticketType: "regular",
          }),
        }),
        useFocusEffect: (fn) => react.useEffect(fn, [fn]),
      },
      "react-native": {
        View: "View",
        Text: "Text",
        TouchableOpacity: "Button",
        ScrollView: "ScrollView",
        ActivityIndicator: "Spinner",
        Dimensions: { get: () => ({ height: 900 }) },
        Animated: { Value, View: "Animated", spring: () => ({ start: noop }) },
        Keyboard: { dismiss: noop, addListener: () => ({ remove: noop }) },
        PanResponder: { create: () => ({ panHandlers: {} }) },
        BackHandler: { addEventListener: () => ({ remove: noop }) },
        Alert: { alert: noop },
      },
      "react-native-safe-area-context": { SafeAreaView: "SafeArea" },
      "../context/AuthContext": { useAuth: () => ({ user: { uid: "account" } }) },
      "../hooks/useMapLocation": {
        useMapLocation: () => ({
          snapshot: {},
          refreshLocation: noop,
          startTracking: noop,
          stopTracking: noop,
        }),
      },
      "../hooks/useWalkingTrip": { useWalkingTrip: (args) => tripFor("walk", args) },
      "../hooks/useBusTrip": { useBusTrip: (args) => tripFor("bus", args) },
      "../services/phoneNotifications": { holdTripNotifications: () => () => {} },
      "../hooks/useTrainTrip": { useTrainTrip: (args) => tripFor("train", args) },
      "../hooks/useJeepTrip": { useJeepTrip: (args) => tripFor("jeep", args) },
      "../hooks/useJourneyFavorites": { useJourneyFavorites: () => ({}) },
      "../services/routes": { getRoutes: async () => [route] },
      "../../styles/directions.styles": { styles: {} },
      "../../../styles/directions.styles": { styles: {} },
      "../../styles/walking-navigation.styles": { styles: {} },
      "../../../styles/walking-navigation.styles": { styles: {} },
      "../styles/directions.styles": { styles: {} },
      "../styles/walking-navigation.styles": { styles: {} },
      "../components/BackButton": { BackButton: "Back" },
      "../components/maps/CommuteMap": { CommuteMap: "Map" },
      ...Object.fromEntries(
        [
          "JeepTypeToggle",
          "GuidedTripControls",
          "LocationInputCard",
          "MapControls",
          "ModeSelector",
          "TicketToggle",
          "TripDetailsCard",
          "WalkingNavigationBanner",
        ].map((name) => [
          "../components/directions/" +
            ([
              "GuidedTripControls",
              "JeepTypeToggle",
              "MapControls",
              "ModeSelector",
              "TicketToggle",
            ].includes(name)
              ? "controls/"
              : "") +
            name,
          { __esModule: true, default: name },
        ]),
      ),
    })(root("app/directions.jsx"));
    const h = render(Screen);
    await new Promise((resolve) => setImmediate(resolve));
    h.flush();
    const rendered = expandPresentation(h.result);
    for (const name of ["walk", "bus", "train", "jeep"])
      assert.equal(received[name], name === mode ? route : null);
    if (["train", "jeep"].includes(mode)) {
      const controls = nodes(rendered, "GuidedTripControls");
      assert.equal(controls.length, 1);
      await controls[0].props.onStart();
    } else {
      const start = nodes(rendered, "Text").find((item) => item.props.children === "Start trip");
      assert.ok(start);
      const button = nodes(rendered, "Button").find((item) =>
        nodes(item.props.children, "Text").includes(start),
      );
      await button.props.onPress();
    }
    assert.deepEqual(started, [mode]);
    h.dispose();
  }
});

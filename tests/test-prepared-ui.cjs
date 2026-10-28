const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");
const hookHarness = require("./helpers/hook-harness.cjs");

const root = path.resolve(__dirname, "..");
const noop = () => {};
const settle = () => new Promise((resolve) => setImmediate(resolve));
const delay = () => new Promise((resolve) => setTimeout(resolve, 150));

function nodes(tree, predicate) {
  if (!tree || typeof tree !== "object") return [];

  if (Array.isArray(tree)) {
    return tree.flatMap((item) => nodes(item, predicate));
  }

  return [
    ...(predicate(tree) ? [tree] : []),
    ...nodes(tree.props?.children, predicate),
  ];
}

function nativeMocks() {
  class Value {
    constructor(value) {
      this.value = value;
    }

    addListener() {
      return 1;
    }

    removeListener() {}

    stopAnimation() {}

    setValue(value) {
      this.value = value;
    }
  }

  return {
    Text: "Text",
    View: "View",
    Image: "Image",
    TouchableOpacity: "TouchableOpacity",
    ScrollView: "ScrollView",
    ActivityIndicator: "ActivityIndicator",
    Alert: { alert: noop },
    Animated: {
      Value,
      View: "Animated.View",
      spring: () => ({ start: noop }),
    },
    BackHandler: {
      addEventListener: () => ({ remove: noop }),
    },
    Dimensions: {
      get: () => ({ height: 900 }),
    },
    Keyboard: {
      dismiss: noop,
      addListener: () => ({ remove: noop }),
    },
    PanResponder: {
      create: () => ({ panHandlers: {} }),
    },
    StyleSheet: {
      create: (value) => value,
      absoluteFillObject: {},
    },
    Platform: { OS: "android" },
    Linking: { openURL: async () => {} },
  };
}

const a = {
  latitude: 14.625,
  longitude: 121.06,
};

const b = {
  latitude: 14.626,
  longitude: 121.06,
};

const place = (id, coordinate) => ({
  id,
  name: id,
  address: "Cubao",
  coordinate,
  source: "geoapify",
});

const journey = {
  origin: place("A", a),
  destination: place("B", b),
  preferredMode: "walk",
  ticketType: "regular",
};

const route = {
  ...journey,
  id: "sample",
  calculatedAt: "one",
  actualModes: ["walk"],
  source: "geoapify",
  warnings: [],
  distanceMeters: 111,
  durationSeconds: 90,
  polyline: [a, b],
  steps: [
    {
      id: "step",
      mode: "walk",
      instruction: "Go north",
      polyline: [a, b],
      distanceMeters: 111,
      durationSeconds: 90,
    },
  ],
};

const snapshot = {
  status: "ready",
  inServiceArea: true,
  position: {
    ...a,
    accuracyMeters: 10,
    timestamp: new Date().toISOString(),
  },
};

test("Home keeps following live location outside Cubao without enabling heading rotation", () => {
  const { react, runtime, render } = hookHarness();
  let current = {
    status: "outside-area",
    inServiceArea: false,
    position: { latitude: 14.59, longitude: 121.17 },
    label: "Outside the Cubao area",
  };
  const load = createLoader({
    react,
    "react/jsx-runtime": runtime,
    "react-native": nativeMocks(),
    "expo-router": {
      useRouter: () => ({ push: noop }),
      useFocusEffect: (fn) => react.useEffect(fn, [fn]),
    },
    "@expo/vector-icons": { Ionicons: "Ionicons" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "../../constants/images": { IMAGES: {} },
    "../../styles/home.styles": { styles: {} },
    "../../components/maps/CommuteMap": { CommuteMap: "CommuteMap" },
    "../../hooks/useMapLocation": {
      useMapLocation: () => ({ snapshot: current }),
    },
  });
  const Home = load(path.join(root, "src/app/(tabs)/home.jsx")).default;
  const h = render(Home);
  const map = () => nodes(h.result, (node) => node.type === "CommuteMap")[0];
  assert.equal(map().props.followUser, true);
  assert.notEqual(map().props.followHeading, true);
  current = { ...current, position: { latitude: 14.591, longitude: 121.17 } };
  h.flush();
  assert.equal(map().props.userPosition.latitude, 14.591);
  assert.equal(map().props.followUser, true);
  h.dispose();
});

test("map focus starts a watch outside Cubao and retains it when crossing the boundary", () => {
  const { react, render } = hookHarness();
  let starts = 0,
    stops = 0;
  const location = {
    snapshot: {
      status: "outside-area",
      inServiceArea: false,
      position: { ...a },
    },
    startTracking: (options) => {
      assert.equal(options.requestPermission, false);
      starts += 1;
    },
    stopTracking: () => {
      stops += 1;
    },
  };
  const load = createLoader({
    react,
    "expo-router": { useFocusEffect: (fn) => react.useEffect(fn, [fn]) },
    "../context/LocationContext": { useLocation: () => location },
  });
  const useMapLocation = load(
    path.join(root, "src/hooks/useMapLocation.js"),
  ).useMapLocation;
  const h = render(useMapLocation);
  assert.equal(starts, 1);
  location.snapshot = {
    status: "ready",
    inServiceArea: true,
    position: { ...a },
  };
  h.flush();
  assert.equal(starts, 1);
  assert.equal(stops, 0);
  h.dispose();
  assert.equal(stops, 1);
});

test("Directions reopens a saved journey, calculates a fresh route, and saves a real favorite without a notification", async () => {
  const { react, runtime, render } = hookHarness();
  const data = new Map();
  const requests = [];

  const storage = {
    __esModule: true,
    default: {
      getItem: async (key) => data.get(key) ?? null,
      setItem: async (key, value) => {
        data.set(key, value);
      },
    },
  };

  const load = createLoader({
    react,
    "react/jsx-runtime": runtime,
    "react-native": nativeMocks(),
    "@expo/vector-icons": {
      Ionicons: "Ionicons",
      FontAwesome5: "FontAwesome5",
    },
    "../../constants/images": { IMAGES: {} },
    "react-native-safe-area-context": {
      SafeAreaView: "SafeAreaView",
    },
    "expo-router": {
      Stack: { Screen: "StackScreen" },
      useRouter: () => ({ back: noop }),
      useLocalSearchParams: () => ({
        journey: JSON.stringify(journey),
      }),
      useFocusEffect: (fn) => react.useEffect(fn, [fn]),
    },
    "../context/AuthContext": {
      useAuth: () => ({
        user: { uid: "account-a" },
      }),
    },
    "../hooks/useMapLocation": {
      useMapLocation: () => ({
        snapshot,
        refreshLocation: async () => snapshot,
      }),
    },
    "../services/routes": {
      getRoutes: async (choices) => {
        requests.push(choices);
        return [route];
      },
    },
    "../../services/routes": {
      searchPlaces: async () => [],
    },
    "../../context/LocationContext": {
      useLocation: () => ({
        refreshLocation: async () => snapshot,
      }),
    },
    "../components/maps/CommuteMap": {
      CommuteMap: "CommuteMap",
    },
    "../components/BackButton": {
      BackButton: "BackButton",
    },
    "../services/phoneNotifications": { holdTripNotifications: () => () => {} },
    "./expoNotificationsModule": { __esModule: true, default: null },
    "@react-native-async-storage/async-storage": storage,
  });

  const Screen = load(path.join(root, "src/app/directions.jsx")).default;

  const Details = load(
    path.join(root, "src/components/directions/TripDetailsCard.jsx"),
  ).default;

  const Controls = load(
    path.join(root, "src/components/directions/controls/MapControls.jsx"),
  ).default;

  const h = render(Screen);

  await settle();
  h.flush();
  await settle();
  h.flush();

  assert.equal(requests.length, 1, "saved journey calculates exactly once");

  assert.equal(requests[0].origin.id, "A");

  const map = () => nodes(h.result, (node) => node.type === "CommuteMap")[0];

  assert.equal(map().props.origin.id, "A");
  assert.equal(map().props.destination.id, "B");

  let details = nodes(h.result, (node) => node.type === Details)[0];

  assert.equal(details.props.favoriteBusy, false);

  await details.props.onToggleFavorite();
  h.flush();

  details = nodes(h.result, (node) => node.type === Details)[0];

  assert.equal(details.props.isFavorite, true);

  assert.equal(
    JSON.parse(data.get("samahan:favorites:v1:account-a")).length,
    1,
  );

  // Saving a favorite shows an in-app popup; it no longer creates a notification.
  assert.equal(data.get("samahan:notifications:v1:account-a"), undefined);

  let controls = nodes(h.result, (node) => node.type === Controls)[0];

  controls.props.onToggle();
  h.flush();

  controls = nodes(h.result, (node) => node.type === Controls)[0];

  assert.equal(controls.props.expanded, true);

  map().props.onMapPress();
  h.flush();

  controls = nodes(h.result, (node) => node.type === Controls)[0];

  assert.equal(controls.props.expanded, false);
  h.dispose();
});

test("native camera follows GPS and phone heading, then Recenter restores the live view", async () => {
  const { react, runtime, render } = hookHarness();
  let heading = 350;
  const calls = [];

  const load = createLoader({
    react,
    "react/jsx-runtime": runtime,
    "react-native": nativeMocks(),
    "expo-router": {
      useFocusEffect: (fn) => react.useEffect(fn, [fn]),
    },
    "react-native-maps": {
      __esModule: true,
      default: "MapView",
      Marker: "Marker",
      Polygon: "Polygon",
      Polyline: "Polyline",
      PROVIDER_GOOGLE: "google",
    },
    "../../hooks/useDeviceHeading": {
      useDeviceHeading: () => heading,
    },
  });

  const Wrapper = load(
    path.join(root, "src/components/maps/CommuteMap.native.jsx"),
  ).CommuteMap;

  const wrapper = render(Wrapper, {
    userPosition: snapshot.position,
    followUser: true,
    followHeading: true,
    followZoom: 18,
  });

  const h = render(wrapper.result.type, wrapper.result.props);

  const map = () => nodes(h.result, (node) => node.type === "MapView")[0];

  const positionMarker = () =>
    nodes(
      h.result,
      (node) => node.type === "Marker" && node.key === "user-position",
    )[0];

  map().props.ref.current = {
    setCamera: (camera) => calls.push(camera),
    animateCamera: () =>
      assert.fail("Android following must use direct camera updates"),
    fitToCoordinates: noop,
    animateToRegion: noop,
  };

  map().props.onMapReady();

  map().props.onLayout({
    nativeEvent: {
      layout: { width: 400, height: 850 },
    },
  });

  h.flush();

  assert.equal(calls.at(-1).heading, 350);
  assert.equal(calls.at(-1).center.latitude, a.latitude);

  heading = 10;
  h.flush();
  await delay();

  assert.equal(calls.at(-1).heading, 10);

  h.props = {
    ...h.props,
    userPosition: {
      ...snapshot.position,
      ...b,
    },
  };

  h.flush();
  await delay();

  assert.equal(calls.at(-1).center.latitude, b.latitude);

  h.props = {
    ...h.props,
    followUser: false,
  };

  h.flush();

  const stopped = calls.length;

  heading = 90;
  h.flush();
  await delay();

  assert.equal(calls.length, stopped);

  h.props = {
    ...h.props,
    followUser: true,
    recenterRequest: 1,
  };

  h.flush();

  assert.equal(calls.at(-1).heading, 90);
  assert.equal(calls.at(-1).center.latitude, b.latitude);

  heading = null;
  h.flush();
  await delay();

  assert.equal(calls.at(-1).heading, 90);

  assert.equal(
    nodes(h.result, (node) => node.type === "Polygon")[0].props.fillColor,
    "transparent",
  );

  assert.equal(positionMarker().key, "user-position");

  h.dispose();
  wrapper.dispose();
});

test("map focus changes retain the same content and stop hidden camera updates", async () => {
  const { react, runtime, render } = hookHarness();
  let focused;
  let heading = 25;
  const calls = [];

  const load = createLoader({
    react,
    "react/jsx-runtime": runtime,
    "react-native": nativeMocks(),
    "expo-router": {
      useFocusEffect: (fn) =>
        react.useEffect(() => {
          focused = fn;
          return fn();
        }, [fn]),
    },
    "react-native-maps": {
      __esModule: true,
      default: "MapView",
      Marker: "Marker",
      Polygon: "Polygon",
      Polyline: "Polyline",
      PROVIDER_GOOGLE: "google",
    },
    "../../hooks/useDeviceHeading": {
      useDeviceHeading: () => heading,
    },
  });

  const Wrapper = load(
    path.join(root, "src/components/maps/CommuteMap.native.jsx"),
  ).CommuteMap;

  const wrapper = render(Wrapper, {
    userPosition: snapshot.position,
    followUser: true,
    followHeading: true,
  });

  const content = wrapper.result.type;
  const h = render(content, wrapper.result.props);

  const map = () => nodes(h.result, (node) => node.type === "MapView")[0];

  const positionMarker = () =>
    nodes(
      h.result,
      (node) => node.type === "Marker" && node.key === "user-position",
    )[0];

  map().props.ref.current = {
    setCamera: (value) => calls.push(value),
    animateCamera: () =>
      assert.fail("Android following must use direct camera updates"),
    animateToRegion: noop,
    fitToCoordinates: noop,
  };

  map().props.onMapReady();

  map().props.onLayout({
    nativeEvent: {
      layout: { width: 400, height: 850 },
    },
  });

  h.flush();

  assert.ok(positionMarker(), "position circle is present");

  const blur = focused();
  blur();
  wrapper.flush();

  assert.equal(wrapper.result.type, content);
  assert.equal(wrapper.result.props.active, false);

  h.props = wrapper.result.props;
  h.flush();

  const hiddenCalls = calls.length;

  heading = 100;
  h.flush();
  await delay();

  assert.equal(calls.length, hiddenCalls, "hidden map never moves its camera");

  focused();
  wrapper.flush();
  h.props = wrapper.result.props;
  h.flush();

  assert.equal(
    wrapper.result.type,
    content,
    "focus does not change the component identity",
  );

  assert.equal(
    wrapper.result.key,
    null,
    "focus does not force a keyed remount",
  );

  assert.ok(positionMarker(), "position circle remains after returning");

  assert.equal(calls.at(-1).heading, 100);

  for (let visit = 0; visit < 3; visit += 1) {
    const onBlur = focused();
    onBlur();
    wrapper.flush();

    h.props = wrapper.result.props;
    h.flush();

    focused();
    wrapper.flush();
    h.props = wrapper.result.props;
    h.flush();

    assert.equal(wrapper.result.type, content);

    assert.equal(positionMarker().key, "user-position");
  }

  h.props = {
    ...h.props,
    route,
    origin: route.origin,
    destination: route.destination,
  };

  h.flush();

  h.props = {
    ...h.props,
    route: null,
    origin: null,
    destination: null,
  };

  h.flush();

  assert.equal(positionMarker().key, "user-position");

  h.dispose();
  wrapper.dispose();
});

test("switching from a long bus route to a short walk removes bus lines and stop markers", () => {
  const { react, runtime, render } = hookHarness();
  const load = createLoader({
    react,
    "react/jsx-runtime": runtime,
    "react-native": nativeMocks(),
    "expo-router": { useFocusEffect: (fn) => react.useEffect(fn, [fn]) },
    "react-native-maps": {
      __esModule: true,
      default: "MapView",
      Marker: "Marker",
      Polygon: "Polygon",
      Polyline: "Polyline",
      PROVIDER_GOOGLE: "google",
    },
    "../../hooks/useDeviceHeading": { useDeviceHeading: () => null },
  });
  const Wrapper = load(
    path.join(root, "src/components/maps/CommuteMap.native.jsx"),
  ).CommuteMap;
  const origin = {
    id: "a",
    name: "A",
    coordinate: { latitude: 14.6279, longitude: 121.064 },
  };
  const gateway = {
    id: "g",
    name: "Gateway",
    coordinate: { latitude: 14.62299, longitude: 121.05308 },
  };
  const tip = {
    id: "t",
    name: "TIP",
    coordinate: { latitude: 14.6268, longitude: 121.0621 },
  };
  const bus = {
    id: "bus",
    calculatedAt: "first",
    preferredMode: "bus",
    origin,
    destination: gateway,
    polyline: [origin.coordinate, gateway.coordinate],
    steps: [
      {
        id: "ride",
        mode: "bus",
        start: origin.coordinate,
        end: gateway.coordinate,
        polyline: [origin.coordinate, gateway.coordinate],
      },
    ],
  };
  const walk = {
    id: "walk",
    calculatedAt: "second",
    preferredMode: "walk",
    requestedMode: "bus",
    origin,
    destination: tip,
    polyline: [origin.coordinate, tip.coordinate],
    steps: [
      {
        id: "walk-step",
        mode: "walk",
        polyline: [origin.coordinate, tip.coordinate],
      },
    ],
  };
  const wrapper = render(Wrapper, { origin, destination: gateway, route: bus });
  const h = render(wrapper.result.type, wrapper.result.props);
  const polylines = () => nodes(h.result, (n) => n.type === "Polyline");
  const markers = () => nodes(h.result, (n) => n.type === "Marker");
  assert.equal(polylines().length, 1);
  assert.equal(markers().length, 4);
  const busKey = polylines()[0].key;
  h.props = { ...h.props, destination: tip };
  h.flush();
  assert.equal(
    polylines().length,
    0,
    "old journey is hidden as soon as the input selection changes",
  );
  assert.equal(markers().length, 2);
  h.props = { ...h.props, route: walk };
  h.flush();
  assert.equal(polylines().length, 1);
  assert.equal(markers().length, 2);
  assert.equal(polylines()[0].props.coordinates, walk.polyline);
  assert.notEqual(polylines()[0].key, busKey);
  const walkKey = polylines()[0].key;
  h.props = { ...h.props, route: { ...walk, calculatedAt: "third" } };
  h.flush();
  assert.notEqual(
    polylines()[0].key,
    walkKey,
    "recalculation gets a new native overlay identity",
  );
  h.props = { ...h.props, route: null };
  h.flush();
  assert.equal(polylines().length, 0);
  h.dispose();
  wrapper.dispose();
});

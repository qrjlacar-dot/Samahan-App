const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");
const hookHarness = require("./helpers/hook-harness.cjs");
const root = path.resolve(__dirname, "..");
const settle = () => new Promise((resolve) => setImmediate(resolve));

for (const mode of ["walk", "bus", "train", "jeep"]) {
  for (const kind of ["Completed", "Cancelled"]) {
    test(`${mode}: real ${kind} service saves once, waits for route exit, then schedules one alert`, async () => {
      const storage = new Map();
      const scheduled = [];
      const expo = {
        AndroidImportance: { HIGH: 4 },
        AndroidNotificationPriority: { HIGH: "high" },
        SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
        setNotificationHandler() {},
        async setNotificationChannelAsync() {},
        async getPermissionsAsync() {
          return { granted: true };
        },
        async scheduleNotificationAsync(request) {
          scheduled.push(request);
        },
      };
      const load = createLoader({
        "@react-native-async-storage/async-storage": {
          __esModule: true,
          default: {
            async getItem(key) {
              return storage.get(key) ?? null;
            },
            async setItem(key, value) {
              storage.set(key, value);
            },
          },
        },
        "react-native": {
          Platform: { OS: "android" },
          AppState: { currentState: "active" },
        },
        "./expoNotificationsModule": { __esModule: true, default: expo },
      });
      const phone = load(path.join(root, "src/services/phoneNotifications.js"));
      const api = load(path.join(root, "src/services/notifications.js"));
      const point = (id) => ({
        id,
        name: id,
        address: "Cubao",
        source: "geoapify",
        coordinate: { latitude: 14.625, longitude: 121.06 },
      });
      const trip = {
        tripId: "real-trip",
        journey: {
          origin: point("A"),
          destination: point("B"),
          preferredMode: mode,
          ticketType: "regular",
        },
      };
      const release = phone.holdTripNotifications("user");
      await api["notifyTrip" + kind]("user", trip);
      await api["notifyTrip" + kind]("user", trip);
      assert.equal((await api.loadNotifications("user")).length, 1);
      assert.equal(scheduled.length, 0);
      release();
      await settle();
      assert.equal(scheduled.length, 1);
      assert.equal(scheduled[0].trigger.seconds, 3);
      assert.equal(scheduled[0].trigger.channelId, "trip-updates");
      assert.equal(scheduled[0].content.sound, true);
      assert.equal(scheduled[0].content.priority, "high");
      assert.equal(scheduled[0].content.title, "Trip " + kind.toLowerCase());
    });
  }
}

function profileFixture(permission) {
  const { react, runtime, render } = hookHarness();
  const writes = [],
    alerts = [];
  const load = createLoader({
    react,
    "react/jsx-runtime": runtime,
    "@expo/vector-icons": { Ionicons: "Icon" },
    "expo-router": {
      useRouter: () => ({}),
      useFocusEffect: (fn) => react.useEffect(fn, [fn]),
    },
    "react-native": {
      ActivityIndicator: "Spinner",
      Alert: { alert: (...args) => alerts.push(args) },
      AppState: { addEventListener: () => ({ remove() {} }) },
      Linking: { openSettings() {} },
      ScrollView: "Scroll",
      Switch: "Switch",
      Text: "Text",
      TouchableOpacity: "Button",
      View: "View",
    },
    "react-native-safe-area-context": { SafeAreaView: "SafeArea" },
    "../../components/ProfileAvatar": { ProfileAvatar: "Avatar" },
    "../../components/LegalLinks": { LegalLinks: "LegalLinks" },
    "../../context/AuthContext": {
      useAuth: () => ({
        user: { uid: "user" },
        identity: { name: "Test" },
        isGoogle: false,
      }),
    },
    "../../constants/theme": { COLORS: { pink: "pink" } },
    "../../services/auth/account": {
      signOutAccount() {},
      accountErrorMessage() {},
    },
    "../../services/notifications": {
      getNotificationPreferences: async () => ({ enabled: false }),
      setNotificationPreferences: async (...args) => writes.push(args),
    },
    "../../services/phoneNotifications": {
      getPhonePermission: async () => "granted",
      requestPhonePermission: async () => permission,
    },
    "../../styles/profile.styles": { styles: {} },
  });
  const h = render(load(path.join(root, "src/app/(tabs)/profile.jsx")).default);
  function nodes(tree) {
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    if (!tree || typeof tree !== "object") return [];
    return [tree, ...nodes(tree.props?.children)];
  }
  return {
    h,
    writes,
    alerts,
    getSwitch: () => nodes(h.result).find((node) => node.type === "Switch"),
    nodes,
  };
}

for (const permission of ["unavailable", "denied", "granted"]) {
  test(`Profile handles ${permission} without saving a misleading preference`, async () => {
    const f = profileFixture(permission);
    await settle();
    f.h.flush();
    assert.equal(f.getSwitch().props.value, false);
    await f.getSwitch().props.onValueChange(true);
    f.h.flush();
    assert.equal(f.getSwitch().props.value, permission === "granted");
    assert.equal(f.writes.length, permission === "granted" ? 1 : 0);
    assert.equal(f.alerts.length, permission === "granted" ? 0 : 1);
    assert.ok(!JSON.stringify(f.h.result).includes("Test phone notification"));
    f.h.dispose();
  });
}

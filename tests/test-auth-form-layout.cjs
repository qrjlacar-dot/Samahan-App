const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");
const harness = require("./helpers/hook-harness.cjs");
const source = (f) => path.resolve(__dirname, "../src", f);
function nodes(tree, type) {
  if (Array.isArray(tree)) return tree.flatMap((x) => nodes(x, type));
  if (!tree || typeof tree !== "object") return [];
  return [...(tree.type === type ? [tree] : []), ...nodes(tree.props?.children, type)];
}

test("auth card height stays fixed while typing and scrolling locks again after keyboard dismissal", () => {
  const { react, runtime, render } = harness();
  const events = new Map();
  const scrolled = [];
  let focus;
  const load = createLoader({
    react,
    "react/jsx-runtime": runtime,
    "react-native": {
      Keyboard: {
        addListener: (event, fn) => {
          events.set(event, fn);
          return { remove: () => events.delete(event) };
        },
      },
      Platform: { OS: "android" },
      View: "View",
      ScrollView: "ScrollView",
      KeyboardAvoidingView: "KeyboardAvoidingView",
    },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "../constants/scale": { scale: (n) => n },
    "../styles/auth-form.styles": { styles: {} },
  });
  const Layout = load(source("components/AuthFormLayout.jsx")).AuthFormLayout;
  const h = render(Layout, {
    footer: "legal-links",
    children: ({ onInputFocus }) => {
      focus = onInputFocus;
      return "form";
    },
  });
  nodes(h.result, "KeyboardAvoidingView")[0].props.onLayout({
    nativeEvent: { layout: { height: 800 } },
  });
  h.flush();
  const scroll = () => nodes(h.result, "ScrollView")[0];
  const pageHeight = () =>
    nodes(h.result, "View").find(
      (n) => Array.isArray(n.props.style) && n.props.style.some((s) => s?.minHeight === 800),
    );
  assert.equal(scroll().props.scrollEnabled, false);
  assert.ok(pageHeight());
  scroll().props.ref.current = { scrollTo: (args) => scrolled.push(args) };
  focus();
  h.flush();
  assert.equal(scroll().props.scrollEnabled, true);
  nodes(h.result, "KeyboardAvoidingView")[0].props.onLayout({
    nativeEvent: { layout: { height: 480 } },
  });
  events.get("keyboardDidShow")();
  h.flush();
  assert.ok(pageHeight(), "keyboard resize does not shrink the card viewport");
  events.get("keyboardDidHide")();
  h.flush();
  assert.equal(scroll().props.scrollEnabled, false);
  assert.deepEqual(JSON.parse(JSON.stringify(scrolled)), [{ y: 0, animated: false }]);
  assert.equal(
    nodes(h.result, "KeyboardAvoidingView")[0].props.behavior,
    undefined,
    "Android uses its existing resize configuration",
  );
  h.dispose();
  assert.equal(events.size, 0);
});

for (const outcome of ["success", "cancel", "failure"])
  test(`login starts Google directly, guards repeated taps and handles ${outcome}`, async () => {
    const { react, runtime, render } = harness();
    const navigated = [],
      alerts = [];
    let complete,
      calls = 0;
    const pending = new Promise((resolve, reject) => {
      complete =
        outcome === "failure"
          ? () => reject(Error("offline"))
          : () => resolve(outcome === "success" ? { uid: "user" } : null);
    });
    const load = createLoader({
      react,
      "react/jsx-runtime": runtime,
      "expo-router": {
        useRouter: () => ({
          push: (path) => navigated.push(["push", path]),
          replace: (path) => navigated.push(["replace", path]),
        }),
      },
      "react-native": {
        View: "View",
        Image: "Image",
        Text: "Text",
        TouchableOpacity: "Button",
        Keyboard: { dismiss: () => {} },
        Alert: { alert: (...args) => alerts.push(args) },
      },
      "../../components/AuthFormLayout": { AuthFormLayout: "AuthFormLayout" },
      "../../components/LegalLinks": { LegalLinks: "LegalLinks" },
      "../../components/common": { FloatingInput: "Input", PrimaryButton: "PrimaryButton" },
      "../../constants/images": { IMAGES: {} },
      "../../styles/login.styles": { styles: {} },
      "../../services/auth/account": {
        accountErrorMessage: (error) => error.message,
        loginWithEmail: async () => {},
      },
      "../../services/auth/google-auth": {
        signInWithGoogle: () => {
          calls++;
          return pending;
        },
      },
    });
    const Login = load(source("app/(auth)/login.jsx")).default;
    const h = render(Login);
    const form = () => h.result.props.children({ onInputFocus: () => {}, compact: false });
    const google = () =>
      nodes(form(), "Button").find((n) =>
        nodes(n, "Text").some((t) => t.props.children === "Google"),
      );
    const first = google().props.onPress();
    const second = google().props.onPress();
    h.flush();
    assert.equal(calls, 1);
    assert.equal(google().props.disabled, true);
    assert.equal(navigated.length, 0);
    complete();
    await Promise.all([first, second]);
    h.flush();
    assert.equal(google().props.disabled, false);
    assert.deepEqual(navigated, outcome === "success" ? [["replace", "/(tabs)/home"]] : []);
    assert.equal(alerts.length, outcome === "failure" ? 1 : 0);
    h.dispose();
  });

const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");
const hookHarness = require("./helpers/hook-harness.cjs");
const root = path.resolve(__dirname, "..");
const { getHomeGreeting } = createLoader()(
  path.join(root, "src/services/homeGreeting.js"),
);

test("home greeting uses all local-time boundaries, including midnight and noon", () => {
  for (const [hour, minute, expected] of [
    [0, 0, "Gabi"],
    [4, 59, "Gabi"],
    [5, 0, "Umaga"],
    [11, 59, "Umaga"],
    [12, 0, "Tanghali"],
    [12, 59, "Tanghali"],
    [13, 0, "Hapon"],
    [17, 59, "Hapon"],
    [18, 0, "Gabi"],
    [23, 59, "Gabi"],
  ]) {
    const date = new Date(2026, 9, 27, hour, minute);
    assert.equal(getHomeGreeting(date), `Magandang ${expected}!`);
  }
});

test("greeting refreshes while Home is open, on return to foreground and on focus; cleans up", () => {
  const { react, render } = hookHarness();
  let hour = 11,
    tick,
    resume,
    focus,
    removed = 0,
    cleared = 0;
  class LocalDate extends Date {
    constructor() {
      super(2026, 9, 27, hour, 0);
    }
  }
  const load = createLoader(
    {
      react,
      "react-native": {
        AppState: {
          addEventListener: (_, fn) => {
            resume = fn;
            return { remove: () => removed++ };
          },
        },
      },
      "expo-router": {
        useFocusEffect: (fn) => {
          focus = fn;
          react.useEffect(fn, [fn]);
        },
      },
    },
    {
      Date: LocalDate,
      setInterval: (fn) => {
        tick = fn;
        return 1;
      },
      clearInterval: () => cleared++,
    },
  );
  const hook = load(
    path.join(root, "src/hooks/useHomeGreeting.js"),
  ).useHomeGreeting;
  const h = render(hook);
  assert.equal(h.result, "Magandang Umaga!");
  hour = 12;
  tick();
  h.flush();
  assert.equal(h.result, "Magandang Tanghali!");
  hour = 15;
  resume("active");
  h.flush();
  assert.equal(h.result, "Magandang Hapon!");
  hour = 20;
  const cleanup = focus();
  h.flush();
  assert.equal(h.result, "Magandang Gabi!");
  cleanup();
  h.dispose();
  assert.equal(removed, 2);
  assert.equal(cleared, 2);
});

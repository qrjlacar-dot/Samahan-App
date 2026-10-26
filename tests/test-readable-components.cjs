const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");
const hookHarness = require("./helpers/hook-harness.cjs");
const expandPresentation = require("./helpers/expand-presentation.cjs");

const source = (file) => path.resolve(__dirname, "../src", file);
const noop = () => {};

function sheetFixture(initiallyCollapsed = false) {
  const { react, render } = hookHarness();
  const events = new Map();
  let interactionCount = 0;
  class Value {
    constructor(value) {
      this.value = value;
      this.listeners = new Map();
    }
    addListener(callback) {
      this.listeners.set(1, callback);
      return 1;
    }
    removeListener(id) {
      this.listeners.delete(id);
    }
    stopAnimation() {}
    setValue(value) {
      this.value = value;
      for (const callback of this.listeners.values()) callback({ value });
    }
  }
  const load = createLoader({
    react,
    "react-native": {
      Dimensions: { get: () => ({ height: 900 }) },
      Animated: {
        Value,
        spring: (value, options) => ({ start: () => value.setValue(options.toValue) }),
      },
      Keyboard: {
        addListener: (event, callback) => {
          events.set(event, callback);
          return { remove: () => events.delete(event) };
        },
      },
      PanResponder: { create: (handlers) => ({ panHandlers: handlers }) },
    },
  });
  const { useDirectionsSheet } = load(source("hooks/useDirectionsSheet.js"));
  const h = render(useDirectionsSheet, {
    initiallyCollapsed,
    onInteract: () => {
      interactionCount++;
    },
  });
  return { h, events, interactions: () => interactionCount };
}

test("the extracted sheet retains its initial position, keyboard clearance and cleanup", () => {
  const f = sheetFixture(true);
  assert.equal(f.h.result.translateY.value, 720);
  assert.equal(f.h.result.isExpanded, false);
  f.events.get("keyboardDidShow")({ endCoordinates: { height: 300 } });
  f.h.flush();
  assert.equal(f.h.result.sheetHeight, 510);
  f.events.get("keyboardDidHide")();
  f.h.flush();
  assert.equal(f.h.result.sheetHeight, 810);
  f.h.dispose();
  assert.equal(f.events.size, 0);
  assert.equal(f.h.result.translateY.listeners.size, 0);
});

test("sheet dragging keeps its bounds and the existing upward/downward snap behavior", () => {
  const f = sheetFixture();
  let handlers = f.h.result.panHandlers;
  handlers.onPanResponderGrant();
  handlers.onPanResponderMove(null, { dy: 2000 });
  assert.equal(f.h.result.translateY.value, 720);
  handlers.onPanResponderRelease(null, { dy: 2000, vy: 0 });
  f.h.flush();
  assert.equal(f.h.result.isExpanded, false);
  handlers = f.h.result.panHandlers;
  handlers.onPanResponderGrant();
  handlers.onPanResponderMove(null, { dy: -2000 });
  assert.equal(f.h.result.translateY.value, 0);
  handlers.onPanResponderRelease(null, { dy: -2000, vy: 0 });
  f.h.flush();
  assert.equal(f.h.result.isExpanded, true);
  assert.ok(f.interactions() >= 4);
  f.h.dispose();
});

test("sheet state changes retain the stable snap callback used by saved-journey loading", () => {
  const f = sheetFixture();
  const before = f.h.result.snapTo;
  f.h.result.snapTo(720);
  f.h.flush();
  f.events.get("keyboardDidShow")({ endCoordinates: { height: 200 } });
  f.h.flush();
  assert.equal(f.h.result.snapTo, before);
  f.h.dispose();
});

function presentationFixture() {
  const { runtime } = hookHarness();
  return createLoader({
    "react/jsx-runtime": runtime,
    "react-native": {
      Text: "Text",
      View: "View",
      TouchableOpacity: "Button",
      ActivityIndicator: "Spinner",
    },
    "../../styles/directions.styles": { styles: {} },
    "../../../styles/directions.styles": { styles: {} },
    "../../styles/walking-navigation.styles": { styles: {} },
    "../../../styles/walking-navigation.styles": { styles: {} },
  });
}

function nodes(tree, type) {
  if (Array.isArray(tree)) return tree.flatMap((item) => nodes(item, type));
  if (!tree || typeof tree !== "object") return [];
  return [...(tree.type === type ? [tree] : []), ...nodes(tree.props?.children, type)];
}
const button = (tree, title) =>
  nodes(tree, "Button").find((node) =>
    nodes(node, "Text").some((text) => text.props.children === title),
  );

test("walking controls retain resume, reroute and end actions when the trip is paused", () => {
  const load = presentationFixture();
  const { default: Controls } = load(
    source("components/directions/controls/WalkingBusTripControls.jsx"),
  );
  const calls = [];
  const tree = expandPresentation(
    Controls({
      mode: "walk",
      trip: { state: "paused", open: true, reroute: () => calls.push("reroute") },
      onStart: () => calls.push("resume"),
      onEnd: () => calls.push("end"),
    }),
  );
  button(tree, "Resume trip").props.onPress();
  button(tree, "Update route from my location").props.onPress();
  button(tree, "End trip").props.onPress();
  assert.deepEqual(calls, ["resume", "reroute", "end"]);
  assert.equal(button(tree, "Plan another trip"), undefined);
});

test("bus controls retain explicit boarding and completion actions without a walking reroute", () => {
  const load = presentationFixture();
  const { default: Controls } = load(
    source("components/directions/controls/WalkingBusTripControls.jsx"),
  );
  let boarded = 0,
    planned = 0;
  const tree = expandPresentation(
    Controls({
      mode: "bus",
      trip: {
        state: "active",
        open: true,
        actionLabel: "I've boarded",
        confirmStage: () => {
          boarded++;
        },
      },
      onEnd: noop,
    }),
  );
  button(tree, "I've boarded").props.onPress();
  assert.equal(boarded, 1);
  assert.equal(button(tree, "Update route from my location"), undefined);
  const arrived = expandPresentation(
    Controls({
      mode: "bus",
      trip: { state: "arrived" },
      onPlanAnother: () => {
        planned++;
      },
    }),
  );
  button(arrived, "Plan another trip").props.onPress();
  assert.equal(planned, 1);
  assert.equal(button(arrived, "I've boarded"), undefined);
});

test("shared option markup retains the public ticket and jeepney selection values", () => {
  const load = presentationFixture();
  const selected = [];
  const Ticket = load(source("components/directions/controls/TicketToggle.jsx")).default;
  const Jeep = load(source("components/directions/controls/JeepTypeToggle.jsx")).default;
  const ticket = Ticket({ ticketType: "regular", onSelectTicketType: (id) => selected.push(id) });
  const jeep = Jeep({ value: "jeep-traditional", onChange: (id) => selected.push(id) });
  const ticketTree = expandPresentation(ticket.type(ticket.props));
  const jeepTree = expandPresentation(jeep.type(jeep.props));
  button(ticketTree, "Discounted").props.onPress();
  button(jeepTree, "Modern").props.onPress();
  assert.deepEqual(selected, ["discounted", "jeep-modern"]);
});

const path = require("node:path");
const createLoader = require("./source-loader.cjs");
const hookHarness = require("./hook-harness.cjs");
module.exports = function guidedFixture(mode, route, options = {}) {
  const { react, render } = hookHarness();
  let clock = Date.now(),
    tracking = 0,
    stopped = 0,
    h;
  class TestDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [clock]));
    }
    static now() {
      return clock;
    }
  }
  const timers = new Map();
  let id = 0;
  const completed = [],
    cancelled = [],
    alerts = [],
    changes = [];
  const load = createLoader(
    {
      react,
      "react-native": { Alert: { alert: (...args) => alerts.push(args) } },
      "../services/routes": {
        getRoutes: options.routes || (async () => [route]),
      },
      "../services/notifications": {
        notifyTripCompleted: async (...a) => completed.push(a),
        notifyTripCancelled: async (...a) => cancelled.push(a),
      },
    },
    {
      Date: TestDate,
      setInterval: (fn) => {
        timers.set(++id, fn);
        return id;
      },
      clearInterval: (n) => timers.delete(n),
    },
  );
  const { useGuidedTrip } = load(
    path.resolve(__dirname, "../../src/hooks/useGuidedTrip.js"),
  );
  const fix = (coordinate, accuracyMeters = 10) => ({
    status: "ready",
    inServiceArea: true,
    position: {
      ...coordinate,
      accuracyMeters,
      timestamp: new TestDate().toISOString(),
    },
  });
  h = render(useGuidedTrip, {
    mode,
    route,
    uid: "account-a",
    journey: {
      origin: route.origin,
      destination: route.destination,
      preferredMode: mode,
      ticketType: "regular",
    },
    snapshot: fix(route.origin.coordinate),
    refreshLocation: options.refresh || (async () => h.props.snapshot),
    startTracking: async () => {
      tracking++;
      return options.trackingResult ?? true;
    },
    stopTracking: () => {
      stopped++;
    },
    onRouteChange: (next) => {
      changes.push(next);
      h.props.route = next;
      h.dirty = true;
    },
  });
  const move = (ms, coordinate, accuracy = 10) => {
    clock += ms;
    if (coordinate) h.props.snapshot = fix(coordinate, accuracy);
    for (const fn of timers.values()) fn();
    h.flush();
  };
  return {
    h,
    fix,
    move,
    completed,
    cancelled,
    alerts,
    changes,
    tracking: () => tracking,
    stopped: () => stopped,
  };
};

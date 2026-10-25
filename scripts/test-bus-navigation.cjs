const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const createLoader = require('./helpers/source-loader.cjs');
const hookHarness = require('./helpers/hook-harness.cjs');
const root = path.resolve(__dirname, '..');
const a = { latitude: 14.6279, longitude: 121.064 };
const b = { latitude: 14.6277, longitude: 121.064 };
const c = { latitude: 14.624, longitude: 121.056 };
const d = { latitude: 14.6233, longitude: 121.056 };
const place = (id, coordinate) => ({ id, name: id, address: 'Cubao', coordinate, source: 'geoapify' });
const step = (mode, start, end) => ({ id: mode + start.latitude, mode, start, end, polyline: [start, end], distanceMeters: mode === 'bus' ? 980 : 70, durationSeconds: null, lineName: 'Gateway', placards: ['Cubao', 'Gateway'], boardingStop: 'Aurora', alightingStop: 'Yale' });
const route = { id: 'bus', calculatedAt: 'one', preferredMode: 'bus', origin: place('start', a), destination: place('destination', d), steps: [step('walk', a, b), step('bus', b, c), step('walk', c, d)], polyline: [a, b, c, d], distanceMeters: 1120, durationSeconds: null };
function fixture({ noWalk = false, refresh, selectedRoute } = {}) {
  let clock = Date.now();
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
  const { react, render } = hookHarness();
  const timers = new Map(), notifications = []; let timer = 0, h;
  const load = createLoader({ react, '../services/notifications': { notifyArrival: async (...args) => notifications.push(args) } }, {
    Date: Clock, setInterval: fn => { timers.set(++timer, fn); return timer; }, clearInterval: id => timers.delete(id),
  });
  const { useBusTrip } = load(path.join(root, 'src/hooks/useBusTrip.js'));
  const fix = (coordinate, accuracyMeters = 10) => ({ status: 'ready', inServiceArea: true, position: { ...coordinate, accuracyMeters, timestamp: new Clock().toISOString() } });
  const selected = selectedRoute ?? (noWalk ? { ...route, origin: place('start', b), destination: place('end', c), steps: [step('bus', b, c)], polyline: [b, c] } : route);
  h = render(useBusTrip, { uid: 'account', route: selected, journey: { ...selected, ticketType: 'regular' }, snapshot: fix(selected.origin.coordinate), refreshLocation: () => refresh ? refresh() : Promise.resolve(h.props.snapshot) });
  const advance = (ms, coordinate, accuracy = 10) => { clock += ms; if (coordinate) h.props = { ...h.props, snapshot: fix(coordinate, accuracy) }; for (const fn of [...timers.values()]) fn(); h.flush(); };
  const action = async name => { const result = await h.result[name](); h.flush(); return result; };
  return { h, fix, advance, action, notifications, timers };
}

test('bus trip walks to boarding, waits for confirmation, tracks ride, alights, then finishes once', async () => {
  const f = fixture();
  assert.equal(await f.action('start'), true);
  assert.equal(f.h.result.state, 'active');
  f.advance(1000, b);
  assert.equal(f.h.result.phase, 'boarding');
  assert.equal(f.h.result.actionLabel, "I've boarded");
  assert.equal(await f.action('confirmStage'), true);
  assert.equal(f.h.result.phase, 'riding');
  f.advance(5000, { latitude: (b.latitude+c.latitude)/2, longitude: (b.longitude+c.longitude)/2 });
  assert.equal(f.h.result.progress.stepIndex, 1);
  assert.ok(f.h.result.progress.fraction > 0.3 && f.h.result.progress.fraction < 0.7);
  f.advance(5000, c);
  assert.match(f.h.result.instruction, /approaching/);
  assert.equal(f.h.result.state, 'active');
  assert.equal(f.notifications.length, 0);
  assert.equal(await f.action('confirmStage'), true);
  assert.equal(f.h.result.phase, 'egress');
  f.advance(6000, d);
  assert.equal(f.h.result.state, 'active');
  f.advance(6000, d);
  assert.equal(f.h.result.state, 'arrived');
  assert.equal(f.notifications.length, 1);
  assert.equal(f.notifications[0][1].journey.preferredMode, 'bus');
  f.advance(6000, d); assert.equal(f.notifications.length, 1);
  f.h.dispose(); assert.equal(f.timers.size, 0);
});

test('GPS alone never boards, alights, or completes a bus journey', async () => {
  const f = fixture({ noWalk: true }); await f.action('start');
  f.advance(6000, c); f.advance(6000, c);
  assert.equal(f.h.result.phase, 'boarding'); assert.equal(f.h.result.progress.fraction, 0);
  assert.equal(f.h.result.state, 'active'); assert.equal(f.notifications.length, 0);
  assert.equal(await f.action('confirmStage'), false);
  assert.match(f.h.result.message, /boarding area/); f.h.dispose();
});

test('getting off far from the planned stop is rejected without losing the active trip', async () => {
  const f = fixture({ noWalk: true }); await f.action('start'); await f.action('confirmStage');
  assert.equal(await f.action('confirmStage'), false);
  assert.equal(f.h.result.phase, 'riding'); assert.match(f.h.result.message, /not near/); f.h.dispose();
});

test('a bus-only journey completes after alighting and distinct arrival fixes', async () => {
  const f = fixture({ noWalk: true }); await f.action('start'); await f.action('confirmStage');
  f.advance(10000, c); await f.action('confirmStage');
  assert.equal(f.h.result.phase, 'finishing');
  f.advance(6000, c); assert.equal(f.h.result.state, 'arrived');
  assert.equal(f.notifications.length, 1); f.h.dispose();
});

test('stale GPS pauses bus guidance and a fresh fix resumes the same phase', async () => {
  const f = fixture({ noWalk: true }); await f.action('start'); await f.action('confirmStage');
  f.advance(31000); assert.equal(f.h.result.state, 'paused'); assert.equal(f.h.result.following, false);
  f.advance(1000, b); assert.equal(f.h.result.state, 'active'); assert.equal(f.h.result.phase, 'riding'); f.h.dispose();
});

test('weak GPS cannot confirm boarding or advance the trip', async () => {
  const f = fixture({ noWalk: true }); await f.action('start');
  f.advance(1000, b, 100); assert.equal(f.h.result.state, 'paused');
  assert.equal(await f.action('confirmStage'), false); assert.equal(f.h.result.phase, 'boarding');
  f.advance(1000, b); assert.equal(f.h.result.state, 'active'); f.h.dispose();
});

test('off-route bus guidance pauses with advice and never requests an invented replacement service', async () => {
  const f = fixture({ noWalk: true }); await f.action('start'); await f.action('confirmStage');
  f.advance(1000, { latitude: 14.633, longitude: 121.075 });
  assert.equal(f.h.result.state, 'paused'); assert.match(f.h.result.message, /conductor/);
  f.advance(1000, b); assert.equal(f.h.result.state, 'active'); f.h.dispose();
});

test('ending or changing account prevents late GPS from reviving the bus trip', async () => {
  const f = fixture(); await f.action('start'); f.h.result.end(); f.h.flush();
  f.advance(1000, c); assert.equal(f.h.result.state, 'idle');
  f.advance(1000, a); await f.action('start');
  f.h.props = { ...f.h.props, uid: 'other-account' }; f.h.flush();
  assert.equal(f.h.result.state, 'idle'); assert.equal(f.notifications.length, 0); f.h.dispose();
});

test('ending while Start awaits GPS ignores the late result', async () => {
  let resolve; const f = fixture({ refresh: () => new Promise(done => { resolve = done; }) });
  const pending = f.h.result.start(); f.h.flush(); f.h.result.end(); f.h.flush();
  resolve(f.fix(a)); assert.equal(await pending, false); f.h.flush();
  assert.equal(f.h.result.state, 'idle'); f.h.dispose();
});

test('bus map follow can be stopped and recentered', async () => {
  const f = fixture(); await f.action('start'); f.h.result.stopFollowing(); f.h.flush();
  assert.equal(f.h.result.following, false); f.h.result.recenter(); f.h.flush();
  assert.equal(f.h.result.following, true); f.h.dispose();
});

test('Directions opens a saved bus journey with Start trip, and changing modes does not reopen the old bus journey', async () => {
  const { react, runtime, render } = hookHarness();
  const noop = () => {};
  class Value { addListener() { return 1; } removeListener() {} stopAnimation() {} }
  const requests = [];
  const displayedRoute = { ...route, steps: route.steps.map(step => ({ ...step, direction: step.mode === 'bus' ? 'anonas-bound' : undefined })) };
  const idle = { state: 'idle', open: false, busy: false, progress: null, end: noop, recenterRequest: 0, start: noop, stopFollowing: noop };
  const load = createLoader({
    react, 'react/jsx-runtime': runtime,
    'expo-router': { useRouter: () => ({ back: noop }), useLocalSearchParams: () => ({ journey: JSON.stringify({ origin: route.origin, destination: route.destination, preferredMode: 'bus', ticketType: 'regular' }) }), useFocusEffect: fn => react.useEffect(fn, [fn]) },
    'react-native': { View: 'View', Text: 'Text', TouchableOpacity: 'Button', ScrollView: 'ScrollView', ActivityIndicator: 'Spinner', Dimensions: { get: () => ({ height: 900 }) }, Animated: { Value, View: 'Animated', spring: () => ({ start: noop }) }, Keyboard: { dismiss: noop, addListener: () => ({ remove: noop }) }, PanResponder: { create: () => ({ panHandlers: {} }) }, BackHandler: { addEventListener: () => ({ remove: noop }) }, Alert: { alert: noop } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeArea' },
    '../context/AuthContext': { useAuth: () => ({ user: { uid: 'account' } }) },
    '../hooks/useMapLocation': { useMapLocation: () => ({ snapshot: {}, refreshLocation: noop }) },
    '../hooks/useWalkingTrip': { useWalkingTrip: () => idle },
    '../hooks/useTrainTrip': { useTrainTrip: () => idle },
    '../hooks/useBusTrip': { useBusTrip: () => idle },
    '../hooks/useJourneyFavorites': { useJourneyFavorites: () => ({}) },
    '../services/routes': { getRoutes: async input => { requests.push(input); return [displayedRoute]; } },
    '../styles/directions.styles': { styles: {} }, '../styles/walking-navigation.styles': { styles: {} },
    '../components/BackButton': { BackButton: 'Back' }, '../components/CommuteMap': { CommuteMap: 'Map' },
    ...Object.fromEntries(['TrainNavigationControls', 'LocationInputCard', 'MapControls', 'ModeSelector', 'TicketToggle', 'TripDetailsCard', 'WalkingNavigationBanner'].map(name => [`../components/directions/${name}`, { __esModule: true, default: name }])),
  });
  const nodes = (tree, type) => Array.isArray(tree) ? tree.flatMap(t => nodes(t, type)) : tree && typeof tree === 'object' ? [...(tree.type === type ? [tree] : []), ...nodes(tree.props?.children, type)] : [];
  const Screen = load(path.join(root, 'src/app/directions.jsx')).default;
  const h = render(Screen);
  await new Promise(resolve => setImmediate(resolve)); h.flush();
  assert.equal(requests.length, 1);
  assert.equal(nodes(h.result, 'Map')[0].props.route.preferredMode, 'bus');
  assert.ok(nodes(h.result, 'Text').some(n => n.props.children === 'Start trip'));
  assert.ok(nodes(h.result, 'Text').some(n => n.props.children === 'Start near the selected starting point. Keep SAMAHAN open during your trip.'));
  assert.ok(nodes(h.result, 'Text').some(n => n.props.children === 'Ready for your bus trip?'));
  assert.ok(nodes(h.result, 'Text').some(n => typeof n.props.children === 'string' && n.props.children.includes('Return route not verified')));
  nodes(h.result, 'ModeSelector')[0].props.onSelectMode('walk'); h.flush();
  await new Promise(resolve => setImmediate(resolve)); h.flush();
  assert.equal(nodes(h.result, 'ModeSelector')[0].props.selectedMode, 'walk');
  assert.equal(nodes(h.result, 'Map')[0].props.route, null);
  assert.equal(requests.length, 1);
  h.dispose();
});


test('Anonas-bound GPS guidance waits for boarding and alighting before completing once', async () => {
  const load = createLoader();
  const { getBusRoutes } = load(path.join(root, 'src/services/busRoutes.js'));
  const { BUS_LINES } = load(path.join(root, 'src/data/busCatalog.js'));
  const line = BUS_LINES.find(item => item.id === 'bus-gateway-anonas');
  const [returnRoute] = await getBusRoutes({ origin: line.stops[0], destination: line.stops.at(-1), preferredMode: 'bus' });
  assert.equal(returnRoute.steps.length, 1);
  const f = fixture({ selectedRoute: returnRoute });
  const bus = returnRoute.steps[0];
  assert.equal(await f.action('start'), true);
  assert.match(f.h.result.instruction, /Return route not verified/);
  assert.ok(f.h.result.instruction.includes(returnRoute.destination.name));
  assert.match(f.h.result.instruction, /conductor before boarding/);
  assert.doesNotMatch(f.h.result.instruction, /Cubao.*signboard/);
  await f.action('confirmStage');
  assert.equal(f.h.result.phase, 'riding');
  for (const coordinate of bus.polyline.slice(1)) f.advance(15000, coordinate);
  assert.equal(f.h.result.state, 'active'); assert.equal(f.notifications.length, 0);
  assert.equal(await f.action('confirmStage'), true);
  f.advance(6000, bus.end);
  assert.equal(f.h.result.state, 'arrived'); assert.equal(f.notifications.length, 1);
  f.advance(6000, bus.end); assert.equal(f.notifications.length, 1);
  f.h.dispose();
});

const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const createLoader = require('./helpers/source-loader.cjs');
const hookHarness = require('./helpers/hook-harness.cjs');
const root = path.resolve(__dirname, '..');
const load = createLoader();
const { getBusRoutes } = load(path.join(root, 'src/services/busRoutes.js'));
const { prepareBusWalkSteps, busLegs, busTimelineSteps, busReturnNotice, simplifyWalkingInstruction } = load(path.join(root, 'src/services/busPresentation.js'));
const { BUS_BOARDING_STOPS, BUS_TERMINAL, BUS_GATEWAY } = load(path.join(root, 'src/data/busCatalog.js'));
const { LANDMARKS } = load(path.join(root, 'src/data/serviceArea.js'));
const { distanceMeters } = load(path.join(root, 'src/services/location.js'));
const [anonas, tip] = BUS_BOARDING_STOPS;
const mall = { ...LANDMARKS.find(p => p.id === 'ali-mall'), name: 'Ali Mall', address: 'Cubao', source: 'geoapify' };
const request = (origin, destination) => ({ origin, destination, preferredMode: 'bus' });
const arrival = 'You have arrived at your destination.';
function walking({ origin, destination }) {
  return Promise.resolve([{ id: 'walk', steps: [
    { id: 'turn', mode: 'walk', instruction: 'Turn left onto the walkway.', polyline: [origin.coordinate, destination.coordinate], start: origin.coordinate, end: destination.coordinate, distanceMeters: Math.ceil(distanceMeters(origin.coordinate, destination.coordinate)*1.2), durationSeconds: 60 },
    { id: 'arrived', mode: 'walk', instruction: arrival, polyline: [destination.coordinate], start: destination.coordinate, end: destination.coordinate, distanceMeters: 0, durationSeconds: 0 },
  ] }]);
}

test('provider arrival sentences become leg-specific instructions while their geometry is preserved', () => {
  for (const instruction of [arrival, 'Arrive at the destination.', 'Your destination is on the left.', 'You have reached your destination.']) {
    const step = { instruction, polyline: [tip.coordinate], distanceMeters: 0 };
    const [access] = prepareBusWalkSteps([step], 'boarding', 'access');
    const [egress] = prepareBusWalkSteps([step], 'Ali Mall', 'egress');
    assert.equal(access.instruction, 'Continue to the boarding area.');
    assert.equal(egress.instruction, 'Continue to Ali Mall.');
    assert.equal(access.polyline, step.polyline);
    assert.equal(step.instruction, instruction);
  }
});

test('the composed itinerary never claims arrival before boarding or during the final walk', async () => {
  const [route] = await getBusRoutes(request(anonas, mall), { getWalkingRoutes: walking });
  assert.equal(route.steps.some(step => /arrived|your destination is/i.test(step.instruction)), false);
  const ride = route.steps.find(step => step.mode === 'bus');
  assert.equal(ride.alightingStop, 'Cubao Terminal Complex');
  assert.ok(ride.instruction.length < 150);
  assert.deepEqual(Array.from(busLegs(route), part => part.id), ['ride', 'egress']);
  const [fromCampus] = await getBusRoutes(request(tip, mall), { getWalkingRoutes: walking });
  assert.deepEqual(Array.from(busLegs(fromCampus), part => part.id), ['access', 'ride', 'egress']);
});

test('close places produce a walking-only recommendation with no bus step or premature arrival sentence', async () => {
  const [route] = await getBusRoutes(request(anonas, tip), { getWalkingRoutes: walking });
  assert.equal(route.requestedMode, 'bus'); assert.equal(route.preferredMode, 'walk');
  assert.equal(route.actualModes.join(), 'walk');
  assert.match(route.recommendation, /no bus fare/i);
  assert.ok(route.polyline.length);
  assert.equal(route.steps.some(step => /arrived/i.test(step.instruction)), false);
});

test('a short straight-line distance never overrides a long actual walking route', async () => {
  const [route] = await getBusRoutes(request(anonas, tip), { getWalkingRoutes: async args => {
    const [value] = await walking(args);
    // A crossing or inaccessible entrance can make the direct walk long.
    return [{ ...value, steps: value.steps.map((step, i) => ({ ...step, distanceMeters: i ? 0 : 700 })) }];
  } });
  assert.equal(route.preferredMode, 'bus');
});

test('a return bus journey uses Anonas-bound instructions', async () => {
  const [route] = await getBusRoutes(request(BUS_GATEWAY, anonas), { getWalkingRoutes: walking });
  assert.equal(route.preferredMode, 'bus');
  assert.match(route.steps.find(step => step.mode === 'bus').instruction, /toward Anonas/);
});

function nodes(tree, type) {
  if (Array.isArray(tree)) return tree.flatMap(item => nodes(item, type));
  return tree && typeof tree === 'object' ? [...(tree.type === type ? [tree] : []), ...nodes(tree.props?.children, type)] : [];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join(' ');
  if (tree == null || typeof tree === 'boolean') return '';
  return typeof tree === 'object' ? text(tree.props?.children) : String(tree);
}

test('bus and walking fallback show the full timeline with one final arrival row, highlighted only after completion', async () => {
  const { react, runtime, render } = hookHarness();
  const loader = createLoader({ react, 'react/jsx-runtime': runtime,
    'react-native': { View: 'View', Text: 'Text', TouchableOpacity: 'Button' },
    '@expo/vector-icons': { Ionicons: 'Icon' }, '../../styles/directions.styles': { styles: { solidDot: 'solid', hollowCircle: 'hollow' } },
    './TripSummaryBadge': { __esModule: true, default: 'Badge', formatDistance: d => `${d} m`, formatDuration: d => `${d} s` },
    './FareSummary': { __esModule: true, default: 'Fare' }, './ProviderAttribution': { __esModule: true, default: 'Attribution' },
  });
  const Component = loader(path.join(root, 'src/components/directions/TripDetailsCard.jsx')).default;
  for (const [origin, destination] of [[tip, mall], [anonas, BUS_GATEWAY], [anonas, tip], [BUS_GATEWAY, anonas]]) {
    const [route] = await getBusRoutes(request(origin, destination), { getWalkingRoutes: walking });
    const before = JSON.stringify(route);
    const h = render(Component, { route, tripState: 'idle', ticketType: 'discounted' });
    const instructions = nodes(h.result, 'Text').map(text);
    assert.doesNotMatch(text(h.result), /Return route not verified/, 'the full return notice belongs in the Start Trip card');
    for (const step of busTimelineSteps(route)) assert.ok(instructions.includes(step.instruction), step.instruction);
    assert.doesNotMatch(text(h.result), /Time unavailable|demo|draft|preview|Show walking directions/i);
    assert.equal(instructions.filter(value => value === arrival).length, 1);
    assert.equal(nodes(h.result, 'Fare')[0].props.compact, undefined);
    const dots = () => nodes(h.result, 'View').filter(node => ['solid', 'hollow'].includes(node.props.style));
    h.props = { ...h.props, tripState: 'active', progress: { stepIndex: route.steps.length - 1, stepCount: route.steps.length } }; h.flush();
    assert.equal(dots().at(-1).props.style, 'hollow');
    h.props = { ...h.props, tripState: 'arrived' }; h.flush();
    assert.equal(dots().at(-1).props.style, 'solid');
    assert.equal(nodes(h.result, 'Text').filter(node => text(node) === arrival).length, 1);
    assert.equal(JSON.stringify(route), before, 'display must not change GPS navigation data');
    h.dispose();
  }
});

test('bus fare includes its description, ticket type, source link and conductor reminder', async () => {
  const { runtime } = hookHarness(); const opened = [];
  const loader = createLoader({ 'react/jsx-runtime': runtime,
    'react-native': { Text: 'Text', View: 'View', Linking: { openURL: async url => opened.push(url) } },
    '../../hooks/useFareQuote': { useFareQuote: (route, type) => ({ quote: { complete: true, selectedTotal: type === 'discounted' ? 12 : 15, items: [{ stepId: 'ride', sourceUrl: 'https://example.test/fare', note: 'Ordinary city bus, first 5 km.' }] } }) },
    '../../styles/walking-navigation.styles': { styles: {} },
  });
  const Fare = loader(path.join(root, 'src/components/directions/FareSummary.jsx')).default;
  for (const [ticketType, label, amount] of [['regular', 'Regular', '15.00'], ['discounted', 'Discounted', '12.00']]) {
    const tree = Fare({ route: { preferredMode: 'bus', steps: [{ id: 'ride', mode: 'bus' }] }, ticketType });
    assert.match(text(tree), new RegExp(`Estimated bus fare · ${label}`));
    assert.ok(text(tree).includes(`₱${amount}`)); assert.match(text(tree), /first 5 km/);
    assert.match(text(tree), /conductor before boarding/);
    nodes(tree, 'Text').find(node => node.props.accessibilityRole === 'link').props.onPress();
  }
  assert.equal(opened.length, 2);
  assert.equal(Fare({ route: { preferredMode: 'walk' } }), null);
});

test('a walking-only recommendation in the Bus tab starts the walking navigator', async () => {
  const [walkRoute] = await getBusRoutes(request(anonas, tip), { getWalkingRoutes: walking });
  const { react, runtime, render } = hookHarness(); const noop = () => {};
  let walkingRoute, busRoute, walkingStarts = 0, busStarts = 0;
  const idle = { state: 'idle', open: false, busy: false, progress: null, end: noop, recenterRequest: 0, stopFollowing: noop };
  const walkingTrip = { ...idle, start: async () => { walkingStarts++; return true; } };
  const busTrip = { ...idle, start: async () => { busStarts++; return true; } };
  class Value { addListener() { return 1; } removeListener() {} stopAnimation() {} }
  const loader = createLoader({ react, 'react/jsx-runtime': runtime,
    'expo-router': { useRouter: () => ({ back: noop }), useLocalSearchParams: () => ({ journey: JSON.stringify({ origin: anonas, destination: tip, preferredMode: 'bus', ticketType: 'regular' }) }), useFocusEffect: fn => react.useEffect(fn, [fn]) },
    'react-native': { View: 'View', Text: 'Text', TouchableOpacity: 'Button', ScrollView: 'ScrollView', ActivityIndicator: 'Spinner', Dimensions: { get: () => ({ height: 900 }) }, Animated: { Value, View: 'Animated', spring: () => ({ start: noop }) }, Keyboard: { dismiss: noop, addListener: () => ({ remove: noop }) }, PanResponder: { create: () => ({ panHandlers: {} }) }, BackHandler: { addEventListener: () => ({ remove: noop }) }, Alert: { alert: noop } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeArea' }, '../context/AuthContext': { useAuth: () => ({ user: { uid: 'account' } }) },
    '../hooks/useMapLocation': { useMapLocation: () => ({ snapshot: {}, refreshLocation: noop }) },
    '../hooks/useWalkingTrip': { useWalkingTrip: ({ route }) => { walkingRoute = route; return walkingTrip; } },
    '../hooks/useBusTrip': { useBusTrip: ({ route }) => { busRoute = route; return busTrip; } },
    '../hooks/useJourneyFavorites': { useJourneyFavorites: () => ({}) }, '../services/routes': { getRoutes: async () => [walkRoute] },
    '../styles/directions.styles': { styles: {} }, '../styles/walking-navigation.styles': { styles: {} },
    '../components/BackButton': { BackButton: 'Back' }, '../components/CommuteMap': { CommuteMap: 'Map' },
    ...Object.fromEntries(['LocationInputCard', 'MapControls', 'ModeSelector', 'TicketToggle', 'TripDetailsCard', 'WalkingNavigationBanner'].map(name => [`../components/directions/${name}`, { __esModule: true, default: name }])),
  });
  const Screen = loader(path.join(root, 'src/app/directions.jsx')).default;
  const h = render(Screen); await new Promise(resolve => setImmediate(resolve)); h.flush();
  assert.equal(walkingRoute, walkRoute); assert.equal(busRoute, null);
  assert.equal(nodes(h.result, 'TicketToggle').length, 0);
  const start = nodes(h.result, 'Button').find(button => text(button) === 'Start trip');
  assert.ok(start); await start.props.onPress(); h.flush();
  assert.equal(walkingStarts, 1); assert.equal(busStarts, 0); h.dispose();
});

test('an unsupported bus journey with no available walking path shows an honest route error', async () => {
  await assert.rejects(getBusRoutes(request(BUS_GATEWAY, anonas), { getWalkingRoutes: async () => [] }), error => error.code === 'commute/no-route' && /walking route/.test(error.message));
});

test('walking fallback rejects geometry outside the service area', async () => {
  await assert.rejects(getBusRoutes(request(BUS_GATEWAY, anonas), { getWalkingRoutes: async () => [{ steps: [{ mode: 'walk', polyline: [BUS_GATEWAY.coordinate, { latitude: 15, longitude: 122 }, anonas.coordinate] }] }] }), { code: 'commute/no-route' });
});

test('bus geometry unavailable for a supported corridor falls back to real walking directions', async () => {
  const calls = [];
  const [route] = await getBusRoutes(request(tip, mall), { getBusGeometry: async () => { throw Object.assign(new Error('No road geometry'), { code: 'commute/no-route' }); }, getWalkingRoutes: args => { calls.push(args); return walking(args); } });
  assert.equal(route.preferredMode, 'walk');
  assert.equal(calls.at(-1).origin.id, tip.id); assert.equal(calls.at(-1).destination.id, mall.id);
});

test('cancelling during a walking fallback never returns a late journey', async () => {
  const controller = new AbortController();
  await assert.rejects(getBusRoutes(request(BUS_GATEWAY, anonas), { signal: controller.signal, getWalkingRoutes: async args => { const value = await walking(args); controller.abort(); return value; } }), { name: 'AbortError' });
});


test('both return branches show a destination-specific conductor notice; forward and walking trips do not', async () => {
  const { busInstruction } = load(path.join(root, 'src/services/busNavigation.js'));
  for (const [origin, destination] of [[BUS_GATEWAY, anonas], [mall, anonas], [BUS_GATEWAY, tip]]) {
    const [route] = await getBusRoutes(request(origin, destination), { getWalkingRoutes: walking });
    const before = JSON.stringify(route);
    const notice = busReturnNotice(route);
    assert.match(notice, /Return route not verified/);
    assert.ok(notice.includes(destination.name));
    assert.match(notice, /where to board and get off/);
    assert.match(notice, /conductor before boarding/);
    assert.equal(busInstruction(route, 'boarding'), notice);
    assert.equal(JSON.stringify(route), before, 'warning must not change route geometry or navigation data');
  }
  for (const [origin, destination] of [[anonas, BUS_GATEWAY], [anonas, mall], [anonas, tip], [tip, anonas]]) {
    const [route] = await getBusRoutes(request(origin, destination), { getWalkingRoutes: walking });
    assert.equal(busReturnNotice(route), '');
  }
});

test('the collapsed active-trip banner keeps the return warning visible and hides it after arrival', async () => {
  const [route] = await getBusRoutes(request(BUS_GATEWAY, anonas), { getWalkingRoutes: walking });
  const { runtime } = hookHarness();
  const loader = createLoader({ 'react/jsx-runtime': runtime,
    'react-native': { Text: 'Text', View: 'View', TouchableOpacity: 'Button' },
    '../../styles/walking-navigation.styles': { styles: {} },
    './TripSummaryBadge': { formatDistance: value => `${value} m` },
  });
  const Banner = loader(path.join(root, 'src/components/directions/WalkingNavigationBanner.jsx')).default;
  const props = { route, progress: { stepIndex: 0, stepRemainingDistanceMeters: 100 }, tripState: 'active' };
  assert.match(text(Banner(props)), /Return route not verified.*conductor/);
  const arrived = text(Banner({ ...props, tripState: 'arrived' }));
  assert.doesNotMatch(arrived, /Return route not verified/);
  assert.match(arrived, /You have arrived at your destination/);
});


test('walking wording preserves slight turns, left/right choices, road names, and other instructions', () => {
  for (const [original, expected] of [
    ['Bear left.', 'Turn slightly left.'],
    ['Bear right onto Aurora Boulevard/59.', 'Turn slightly right onto Aurora Boulevard/59.'],
    ['Turn slight left onto the walkway.', 'Turn slightly left onto the walkway.'],
    ['Slight right at the fork.', 'Turn slightly right at the fork.'],
    ['Keep left to stay on General Aguinaldo Avenue.', 'Keep to the left to stay on General Aguinaldo Avenue.'],
    ['Head northeast on Times Square Avenue.', 'Walk northeast on Times Square Avenue.'],
    ['Turn right onto Bear Left Road.', 'Turn right onto Bear Left Road.'],
    ['Make a sharp left turn.', 'Make a sharp left turn.'],
    ['Take the stairs.', 'Take the stairs.'],
    ['You have arrived at your destination.', 'You have arrived at your destination.'],
  ]) assert.equal(simplifyWalkingInstruction(original), expected);
});

test('provider walking instructions use the same plain wording without changing route measurements or geometry', async () => {
  const points = [tip.coordinate, anonas.coordinate];
  const loader = createLoader({}, {
    process: { env: { EXPO_PUBLIC_GEOAPIFY_API_KEY: 'test-key' } },
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ features: [{
      geometry: { type: 'LineString', coordinates: points.map(p => [p.longitude, p.latitude]) },
      properties: { distance: 533, time: 420, legs: [{ steps: [{ from_index: 0, to_index: 1, distance: 533, time: 420,
        instruction: { text: 'Bear left onto the walkway.' } }] }] },
    }] }) }),
  });
  const { getWalkingRoutes } = loader(path.join(root, 'src/services/routes.js'));
  const [route] = await getWalkingRoutes({ origin: tip, destination: anonas, preferredMode: 'walk' });
  assert.equal(route.steps[0].instruction, 'Turn slightly left onto the walkway.');
  assert.equal(route.distanceMeters, 533); assert.equal(route.durationSeconds, 420);
  assert.equal(route.steps[0].distanceMeters, 533); assert.equal(route.steps[0].durationSeconds, 420);
  assert.equal(JSON.stringify(route.polyline), JSON.stringify(points));
});

test('the current and next live walking instructions match the itinerary wording', () => {
  const { runtime } = hookHarness();
  const loader = createLoader({ 'react/jsx-runtime': runtime,
    'react-native': { Text: 'Text', View: 'View', TouchableOpacity: 'Button' },
    '../../styles/walking-navigation.styles': { styles: {} },
    './TripSummaryBadge': { formatDistance: value => `${value} m` },
  });
  const Banner = loader(path.join(root, 'src/components/directions/WalkingNavigationBanner.jsx')).default;
  const route = { preferredMode: 'walk', steps: [
    { mode: 'walk', instruction: 'Bear left.' }, { mode: 'walk', instruction: 'Bear right onto Aurora Boulevard.' },
  ] };
  const output = text(Banner({ route, progress: { stepIndex: 0, stepRemainingDistanceMeters: 18 }, tripState: 'active' }));
  assert.match(output, /Turn slightly left/); assert.match(output, /Turn slightly right onto Aurora Boulevard/);
  assert.doesNotMatch(output, /Bear left|Bear right/);
  const { busInstruction } = load(path.join(root, 'src/services/busNavigation.js'));
  assert.equal(busInstruction({ preferredMode: 'bus', steps: [route.steps[0], { mode: 'bus' }] }, 'access', { stepIndex: 0 }), 'Turn slightly left.');
});

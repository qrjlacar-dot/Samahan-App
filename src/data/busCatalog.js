import { LANDMARKS } from "./serviceArea";

function stop(
  id,
  name,
  coordinate,
  canBoard,
  canAlight,
  address = "Aurora Boulevard, Quezon City",
) {
  return Object.freeze({
    id,
    name,
    address,
    coordinate: Object.freeze({ ...coordinate }),
    source: "verified-local",
    canBoard,
    canAlight,
  });
}

function landmarkStop(id, name, canBoard, canAlight) {
  const landmark = LANDMARKS.find((item) => item.id === id);
  return stop(id, name, landmark.coordinate, canBoard, canAlight);
}

// Boarding points and placard groups follow the team's final 24 October plan.
// "verified-local" is the app's local-data category, not operator certification.
export const BUS_BOARDING_STOPS = Object.freeze([
  stop(
    "lrt2-anonas",
    "Aurora Boulevard at Anonas",
    { latitude: 14.627936, longitude: 121.063993 },
    true,
    false,
  ),
  landmarkStop("tip-qc", "TIP QC, Aurora Boulevard", true, false),
  stop(
    "aurora-20th-ave",
    "Aurora Boulevard at 20th Avenue",
    {
      latitude: 14.626544,
      longitude: 121.060395,
    },
    true,
    false,
  ),
]);

// Center of 7Q63J3C4+47M, recovered from J3C4+47M in the team's
// Cubao Terminal Complex screenshot. This is distinct from the Ali Mall pin.
// Listing: https://www.waze.com/live-map/directions/ph/ncr/quezon-city/cubao-terminal-complex?to=place.ChIJ_Wm9sMG3lzMRIgEtyY7dJ9E
export const BUS_TERMINAL = stop(
  "cubao-terminal-complex",
  "Cubao Terminal Complex",
  {
    latitude: 14.6203375,
    longitude: 121.055671875,
  },
  false,
  true,
  "Times Square Avenue, Cubao, Quezon City",
);

export const BUS_GATEWAY = stop(
  "gateway-aurora",
  "Gateway Mall, Aurora Boulevard",
  {
    latitude: 14.622987,
    longitude: 121.053084,
  },
  false,
  true,
);

// Keep the road corridor on Aurora; the TIP campus pin is a destination,
// not a waypoint for a bus to drive through.
const boardingPath = [BUS_BOARDING_STOPS[0].coordinate, BUS_BOARDING_STOPS[2].coordinate];

// Road-junction anchors checked against OpenStreetMap via OSRM, 24 Oct 2026.
// Runtime Geoapify bus routing supplies the detailed bus-accessible geometry.
// OSM contributors, ODbL: https://www.openstreetmap.org/copyright
// These anchors describe the team's corridor, not an operator timetable.
const aliMallWaypoints = [
  { latitude: 14.62119, longitude: 121.062971 }, // 20th / P. Tuazon
  { latitude: 14.619415, longitude: 121.057792 }, // P. Tuazon / General Romulo
  { latitude: 14.620885, longitude: 121.05678 }, // General Romulo / General MacArthur
];

// Separate eastbound road anchors. Runtime routing checks the drivable path;
// these team corridor definitions are not a timetable or confirmed stop list.
const returnAnonas = stop(
  "anonas-eastbound",
  "Anonas, eastbound Aurora Boulevard",
  { latitude: 14.62785, longitude: 121.064 },
  false,
  true,
);
const returnGateway = stop(
  "gateway-eastbound",
  "Gateway area, eastbound Aurora Boulevard",
  { latitude: 14.622858, longitude: 121.05308 },
  true,
  false,
);
const returnAurora = { latitude: 14.626923, longitude: 121.061367 };

// Shared bus return corridor, based on the user's firsthand ride report.
// Ali Mall passengers walk to the Gateway-area boarding point. The bus
// itinerary does not invent the terminal-to-Gateway circulation streets.
// Exact permitted stops and operator service still need conductor confirmation.
export const BUS_RETURN_PATH = Object.freeze([
  returnGateway.coordinate,
  returnAurora,
  returnAnonas.coordinate,
]);

export const BUS_LINES = Object.freeze([
  Object.freeze({
    id: "bus-cubao-gateway",
    direction: "cubao-bound",
    terminalWalkMeters: 600,
    name: "Cubao / EDSA / Gateway",
    mode: "bus",
    operatorId: "bus-city-ordinary",
    placards: Object.freeze(["Cubao", "EDSA", "Gateway"]),
    headsign: "Cubao / EDSA / Gateway",
    bidirectional: false,
    geometryVerified: false,
    dataBasis: "team-defined",
    checkedAt: "2026-10-24",
    stops: Object.freeze([...BUS_BOARDING_STOPS, BUS_GATEWAY]),
    path: Object.freeze([...boardingPath, BUS_GATEWAY.coordinate]),
    via: "Continue along Aurora Boulevard toward Cubao",
    maxAccessMeters: 500,
    maxEgressMeters: 250,
  }),
  Object.freeze({
    id: "bus-ali-mall",
    direction: "cubao-bound",
    name: "Ali Mall",
    mode: "bus",
    operatorId: "bus-city-ordinary",
    placards: Object.freeze(["Ali Mall"]),
    headsign: "Ali Mall",
    bidirectional: false,
    geometryVerified: false,
    dataBasis: "team-defined",
    checkedAt: "2026-10-24",
    stops: Object.freeze([...BUS_BOARDING_STOPS, BUS_TERMINAL]),
    path: Object.freeze([...boardingPath, ...aliMallWaypoints, BUS_TERMINAL.coordinate]),
    via: "Follow Aurora Boulevard toward Cubao, turn left onto 20th Avenue, then follow P. Tuazon Boulevard toward the terminal",
    maxAccessMeters: 500,
    maxEgressMeters: 250,
  }),
  Object.freeze({
    id: "bus-gateway-anonas",
    direction: "anonas-bound",
    name: "Gateway → Anonas",
    mode: "bus",
    operatorId: "bus-city-ordinary",
    placards: Object.freeze(["Cogeo", "Parang", "Marikina"]),
    headsign: "Cogeo / Parang / Marikina",
    bidirectional: false,
    geometryVerified: false,
    dataBasis: "team-defined",
    checkedAt: "2026-10-25",
    stops: Object.freeze([returnGateway, returnAnonas]),
    path: BUS_RETURN_PATH,
    via: "Follow eastbound Aurora Boulevard toward Anonas",
    maxAccessMeters: 500,
    maxEgressMeters: 350,
    terminalWalkMeters: 600,
  }),
  Object.freeze({
    id: "bus-ali-mall-anonas",
    direction: "anonas-bound",
    name: "Ali Mall return via Gateway → Anonas",
    mode: "bus",
    operatorId: "bus-city-ordinary",
    placards: Object.freeze(["Cogeo", "Parang", "Marikina"]),
    headsign: "Cogeo / Parang / Marikina",
    bidirectional: false,
    geometryVerified: false,
    dataBasis: "team-defined",
    checkedAt: "2026-10-25",
    stops: Object.freeze([returnGateway, returnAnonas]),
    path: BUS_RETURN_PATH,
    via: "Board in the Gateway area, then follow eastbound Aurora Boulevard toward Anonas",
    maxAccessMeters: 500,
    maxEgressMeters: 350,
    terminalWalkMeters: 600,
  }),
]);

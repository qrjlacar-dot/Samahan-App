import { LANDMARKS } from "./serviceArea";

const stop = (id) => {
  const landmark = LANDMARKS.find((item) => item.id === id);

  if (!landmark) {
    throw new Error(`Unknown landmark: ${id}`);
  }

  return {
    id: landmark.id,
    name: landmark.name,
    address: "Aurora Boulevard, Quezon City",
    coordinate: { ...landmark.coordinate },
    source: "verified-local",
  };
};

const jeepLine = ({ id, operatorId, name, from, to, headsign, reverseHeadsign }) => ({
  id,
  mode: "jeep",
  operatorId,
  name,
  headsign,
  reverseHeadsign,
  bidirectional: true,
  withinMinimumFare: true,
  stops: [stop(from), stop(to)],
  sourceUrl: "local-route-data",
  checkedAt: "2026-10-25",
  geometryVerified: false,
});

export const TRANSIT_LINES = Object.freeze([
  {
    id: "lrt2-anonas-cubao",
    mode: "train",
    operatorId: "train-lrt2",
    name: "LRT-2",
    headsign: "Recto",
    reverseHeadsign: "Antipolo",
    bidirectional: true,
    stops: [stop("lrt2-anonas"), stop("lrt2-cubao")],
    sourceUrl: "https://www.lrta.gov.ph/railway-operations/",
    checkedAt: "2026-10-22",
    geometryVerified: false,
  },

  jeepLine({
    id: "jeep-tip-gateway-traditional",
    operatorId: "jeep-traditional",
    name: "Traditional Jeepney",
    from: "tip-qc",
    to: "gateway-mall",
    headsign: "Gateway Mall",
    reverseHeadsign: "Cogeo / Parang / Marikina",
  }),

  jeepLine({
    id: "jeep-tip-gateway-modern",
    operatorId: "jeep-modern",
    name: "Modern Jeepney",
    from: "tip-qc",
    to: "gateway-mall",
    headsign: "Gateway Mall",
    reverseHeadsign: "Cogeo / Parang / Marikina",
  }),

  jeepLine({
    id: "jeep-tip-ali-traditional",
    operatorId: "jeep-traditional",
    name: "Traditional Jeepney",
    from: "tip-qc",
    to: "ali-mall",
    headsign: "Ali Mall",
    reverseHeadsign: "Cogeo / Parang / Marikina",
  }),

  jeepLine({
    id: "jeep-tip-ali-modern",
    operatorId: "jeep-modern",
    name: "Modern Jeepney",
    from: "tip-qc",
    to: "ali-mall",
    headsign: "Ali Mall",
    reverseHeadsign: "Cogeo / Parang / Marikina",
  }),
]);

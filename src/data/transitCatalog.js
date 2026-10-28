import { LANDMARKS } from "./serviceArea";
import {
  BUS_LINES,
  BUS_GATEWAY,
  BUS_TERMINAL,
  BUS_RETURN_PATH,
} from "./busCatalog";
import { projectBusPoint } from "../services/routing/busRoutes";

const stop = (id) => {
  const landmark = LANDMARKS.find((item) => item.id === id);

  if (!landmark) {
    throw new Error(`Unknown landmark: ${id}`);
  }

  return {
    id: landmark.id,
    name: landmark.name,
    address: "Aurora Boulevard, Quezon City",
    coordinate:
      id === "tip-qc"
        ? projectBusPoint(landmark.coordinate, BUS_LINES[0].path).coordinate
        : id === "gateway-mall"
          ? { ...BUS_GATEWAY.coordinate }
          : id === "ali-mall"
            ? { ...BUS_TERMINAL.coordinate }
            : { ...landmark.coordinate },
    source: "verified-local",
  };
};

const jeepLine = ({
  id,
  operatorId,
  name,
  from,
  to,
  headsign,
  reverseHeadsign,
}) => ({
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
  path: [
    stop(from).coordinate,
    ...BUS_LINES.find(
      (line) =>
        line.id === (to === "ali-mall" ? "bus-ali-mall" : "bus-cubao-gateway"),
    ).path.slice(1),
  ],
  reversePath: [
    stop(to).coordinate,
    ...BUS_RETURN_PATH.slice(to === "gateway-mall" ? 1 : 0, -1),
    stop(from).coordinate,
  ],
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

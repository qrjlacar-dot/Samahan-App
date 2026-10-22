import { LANDMARKS } from "./serviceArea";

const stop = (id) => {
  const landmark = LANDMARKS.find((item) => item.id === id);
  return {
    id: landmark.id,
    name: landmark.name,
    address: "Aurora Boulevard, Quezon City",
    coordinate: { ...landmark.coordinate },
    source: "verified-local",
  };
};

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
]);

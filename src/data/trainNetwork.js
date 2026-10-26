import { LANDMARKS } from "./serviceArea";

// Only the three railway stations between Anonas and Gateway are included.
// Gateway is a destination, not a fourth railway station.
// Keep these rail map points separate from the wider app's landmark pins.
const at = (id) => LANDMARKS.find((place) => place.id === id).coordinate;

export const TRAIN_PLACES = Object.freeze([
  {
    id: "lrt2-anonas",
    name: "Anonas (LRT-2)",
    line: "LRT-2",
    address: "Aurora Boulevard, Quezon City",
    // Station footprint center (OSM railway-station polygon), not a doorway.
    // The general-purpose landmark pin sits west of the actual platforms.
    coordinate: { latitude: 14.62799, longitude: 121.06472 },
    source: "verified-local",
    serviceStatus: "unverified", // set to "closed" on a confirmed maintenance notice
    accessibility: "Ask station personnel about operating elevators and accessible entrances.",
  },
  {
    id: "lrt2-cubao",
    name: "Araneta Center-Cubao (LRT-2)",
    line: "LRT-2",
    address: "Aurora Boulevard, Gateway Mall",
    // Mapped LRT-2 station building/footprint, not the mall-side landmark.
    coordinate: { latitude: 14.62286, longitude: 121.05313 },
    source: "verified-local",
    serviceStatus: "unverified",
    accessibility:
      "Elevator and ramp access is subject to current availability; confirm with staff.",
  },
  {
    id: "mrt3-cubao",
    name: "Araneta-Cubao (MRT-3)",
    line: "MRT-3",
    address: "EDSA, Farmers Plaza",
    // Approximate station center (not a verified accessible entrance).
    // Mapped MRT-3 station building/footprint along EDSA.
    coordinate: { latitude: 14.61947, longitude: 121.05107 },
    source: "local-reference",
    serviceStatus: "unverified",
    accessibility:
      "Ask MRT-3 station staff for an accessible transfer; mall lifts may be unavailable.",
  },
  {
    id: "gateway-mall",
    name: "Gateway Mall",
    line: null,
    address: "Araneta City, Cubao",
    coordinate: at("gateway-mall"),
    source: "verified-local",
    accessibility: "Mall and bridgeway lift availability is not verified live.",
  },
]);

export const TRAIN_STATIONS = Object.freeze(TRAIN_PLACES.filter((place) => place.line));

export const TRAIN_PLACE_BY_ID = Object.freeze(
  Object.fromEntries(TRAIN_PLACES.map((place) => [place.id, place])),
);

export const TRAIN_SOURCES = Object.freeze({
  stations: "https://www.lrta.gov.ph/distance-between-stations/",
  mrtStations: "https://www.dotrmrt3.gov.ph/about-us",
  walkway: "https://aranetacity.com/transport",
  accessibility:
    "https://www.lrta.gov.ph/lrta-conducts-accessibility-inspection-across-lrt-2-stations/",
  checkedAt: "2026-10-24",
});

export function searchTrainPlaces(query = "") {
  const needle = String(query).trim().toLowerCase();
  return Promise.resolve(
    TRAIN_PLACES.filter(
      (place) =>
        !needle ||
        `${place.name} ${place.address} ${place.line || ""}`.toLowerCase().includes(needle),
    ),
  );
}

import { BUS_LINES } from "../../data/busCatalog";
import { getRoadTransitRoutes, projectCorridorPoint } from "./roadTransitRoutes";

// Preserve the bus API while sharing corridor selection, clipping and walking legs.
export function projectBusPoint(point, path) {
  return projectCorridorPoint(point, path);
}
export function getBusRoutes(request, options = {}) {
  return getRoadTransitRoutes(request, {
    ...options,
    lines: options.lines ?? BUS_LINES,
    mode: "bus",
  });
}

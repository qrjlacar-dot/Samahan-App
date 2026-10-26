import { useGuidedTrip } from "./useGuidedTrip";

// Use the same GPS, arrival and cancellation handling with jeepney instructions.
export function useJeepTrip(options) {
  return useGuidedTrip({ ...options, mode: "jeep" });
}

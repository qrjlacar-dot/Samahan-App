import { useGuidedTrip } from "./useGuidedTrip";

// Keep the train-facing API while sharing the GPS trip lifecycle with jeepneys.
export function useTrainTrip(options) {
  return useGuidedTrip(options);
}

import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { LOCATION_STATUS } from "../constants/commute";
import { useLocation } from "../context/LocationContext";

export function useMapLocation() {
  const location = useLocation();
  const { snapshot, startTracking, stopTracking } = location;
  const canTrack =
    snapshot.status === LOCATION_STATUS.READY &&
    snapshot.inServiceArea === true &&
    snapshot.position != null;

  useFocusEffect(
    useCallback(() => {
      if (!canTrack) return;
      // Initial permission belongs to the provider. Screen focus never prompts.
      startTracking({ requestPermission: false });
      return () => stopTracking();
    }, [canTrack, startTracking, stopTracking]),
  );

  return location;
}

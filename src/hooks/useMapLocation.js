import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { LOCATION_STATUS } from "../constants/commute";
import { useLocation } from "../context/LocationContext";

const trackingOwners = new WeakMap();

export function useMapLocation({ trackWhenFocused = true } = {}) {
  const location = useLocation();

  const { snapshot, startTracking, stopTracking } = location;

  const canTrack =
    [LOCATION_STATUS.READY, LOCATION_STATUS.OUTSIDE_AREA].includes(snapshot.status) &&
    snapshot.position != null;

  useFocusEffect(
    useCallback(() => {
      if (!canTrack || !trackWhenFocused) return;

      let owners = trackingOwners.get(stopTracking);

      if (!owners) {
        owners = new Set();
        trackingOwners.set(stopTracking, owners);
      }

      const owner = {};
      owners.add(owner);

      startTracking({ requestPermission: false });

      return () => {
        if (owners.delete(owner) && owners.size === 0) {
          stopTracking();
        }
      };
    }, [canTrack, trackWhenFocused, startTracking, stopTracking]),
  );

  return location;
}

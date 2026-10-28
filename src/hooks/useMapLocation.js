import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { LOCATION_STATUS } from "../constants/commute";
import { useLocation } from "../context/LocationContext";

export function useMapLocation({ trackWhenFocused = true } = {}) {
  const location = useLocation();
  const { snapshot, startTracking, stopTracking } = location;
  const owner = useRef({});
  const focused = useRef(false);
  const requested = useRef(false);
  const canTrack =
    [LOCATION_STATUS.READY, LOCATION_STATUS.OUTSIDE_AREA].includes(
      snapshot.status,
    ) && snapshot.position != null;
  const eligible = useRef(false);
  eligible.current = canTrack && trackWhenFocused;
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (eligible.current) {
        requested.current = true;
        void startTracking({ requestPermission: false, owner: owner.current });
      }
      return () => {
        focused.current = false;
        requested.current = false;
        stopTracking(owner.current);
      };
    }, [startTracking, stopTracking]),
  );
  useEffect(() => {
    if (focused.current && canTrack && trackWhenFocused && !requested.current) {
      requested.current = true;
      void startTracking({ requestPermission: false, owner: owner.current });
    }
  }, [canTrack, trackWhenFocused, startTracking, snapshot.position?.timestamp]);
  return location;
}

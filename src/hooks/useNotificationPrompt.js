import { useEffect, useRef } from "react";
import { Alert, AppState } from "react-native";
import { LOCATION_STATUS } from "../constants/commute";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "../context/LocationContext";
import { LOCATION_LABELS } from "../services/location";
import {
  markNotificationPermissionAsked,
  setNotificationPreferences,
  shouldAskNotificationPermission,
} from "../services/notifications";

const SHOW_DELAY_MS = 1500;

// The Location step is finished when the app has a position, knows the user is
// outside the service area, was denied, or failed for a reason that shows no
// Location pop-up. While the "Turn on device Location" pop-up applies
// (Location is switched off) we keep waiting, so the two never overlap.
function isLocationStepFinished(snapshot) {
  switch (snapshot.status) {
    case LOCATION_STATUS.READY:
    case LOCATION_STATUS.OUTSIDE_AREA:
    case LOCATION_STATUS.DENIED:
      return true;
    case LOCATION_STATUS.UNAVAILABLE:
      return snapshot.label !== LOCATION_LABELS.servicesOff;
    default:
      return false; // idle or still locating (the permission pop-up may be open)
  }
}

/**
 * Asks "Allow notifications?" once per account, after the Location step.
 * Allow = notifications on. Don't allow = notifications off.
 * The answer uses the same saved setting as the Profile switch.
 */
export function useNotificationPrompt() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { snapshot } = useLocation();
  const locationFinished = isLocationStepFinished(snapshot);
  const handledUid = useRef(null);

  useEffect(() => {
    if (!uid || handledUid.current === uid || !locationFinished) {
      return undefined;
    }

    let active = true;

    const timer = setTimeout(async () => {
      try {
        if (AppState.currentState !== "active") return;

        const shouldAsk = await shouldAskNotificationPermission(uid);
        if (!active) return;

        handledUid.current = uid;
        if (!shouldAsk) return;

        await markNotificationPermissionAsked(uid);

        const save = (enabled) => {
          setNotificationPreferences(uid, { enabled }).catch(() => {
            Alert.alert(
              "Could not save",
              "You can change this anytime in Profile.",
            );
          });
        };

        Alert.alert(
          "Allow notifications?",
          "SAMAHAN can notify you when you save a favorite or arrive at your destination. You can change this anytime in Profile.",
          [
            {
              text: "Don't allow",
              style: "cancel",
              onPress: () => save(false),
            },
            {
              text: "Allow",
              onPress: () => save(true),
            },
          ],
          { cancelable: false },
        );
      } catch {
        // If storage fails the question is simply skipped this time.
      }
    }, SHOW_DELAY_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [uid, locationFinished]);
}

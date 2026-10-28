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
import { requestPhonePermission } from "../services/phoneNotifications";

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
 * Allow turns phone notifications on; Don't allow turns them off. The answer
 * uses the same saved setting as the Profile switch. Trip updates are saved in
 * the Notifications page either way.
 *
 * When this app build can show phone notifications, Allow also shows the
 * phone's own permission question. If the phone says no, the setting is saved
 * as off. In a build without that module nothing extra happens.
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
        if (!active || AppState.currentState !== "active") return;

        // A different account (or a closed screen) must never be changed by
        // an answer to the previous account's question.
        const save = (enabled) => {
          if (!active) return;
          setNotificationPreferences(uid, { enabled }).catch(() => {
            Alert.alert(
              "Could not save",
              "You can change this anytime in Profile.",
            );
          });
        };

        const allow = async () => {
          if (!active) return;
          const permission = await requestPhonePermission();
          if (permission === "unavailable") {
            Alert.alert(
              "Could not enable notifications",
              "Phone notifications are unavailable right now. Check that you are using the updated app build, then try again.",
            );
            return;
          }
          save(permission === "granted");
        };

        Alert.alert(
          "Allow notifications?",
          "SAMAHAN can notify you when a trip is completed or cancelled. You can change this anytime in Profile.",
          [
            {
              text: "Don't allow",
              style: "cancel",
              onPress: () => save(false),
            },
            {
              text: "Allow",
              onPress: () => {
                void allow();
              },
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

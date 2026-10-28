import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import ExpoNotifications from "../services/expoNotificationsModule";
import {
  clearNotificationAccount,
  setNotificationAccount,
} from "../services/phoneNotifications";

// Phone alerts open the saved trip-update list, where existing cards reopen
// their journeys. An old account's alert never opens another account's data.
export function useTripNotificationRouting(uid) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const handled = useRef(new Set());
  useEffect(() => {
    setNotificationAccount(uid);
    let active = true;
    const open = (response) => {
      const request = response?.notification?.request;
      const data = request?.content?.data;
      if (
        !active ||
        !uid ||
        !request?.identifier ||
        data?.uid !== uid ||
        data.samahanTrip !== true ||
        !data.notificationId
      )
        return;
      const action = response.actionIdentifier;
      const defaultAction = ExpoNotifications?.DEFAULT_ACTION_IDENTIFIER;
      if (action && defaultAction && action !== defaultAction) return;
      const key = `${uid}:${request.identifier}`;
      if (handled.current.has(key)) return;
      handled.current.add(key);
      routerRef.current.navigate("/(tabs)/notifications");
      Promise.resolve(
        ExpoNotifications?.clearLastNotificationResponseAsync?.(),
      ).catch(() => {});
    };
    const subscription =
      ExpoNotifications?.addNotificationResponseReceivedListener?.(open);
    Promise.resolve(ExpoNotifications?.getLastNotificationResponseAsync?.())
      .then(open)
      .catch(() => {});
    return () => {
      active = false;
      subscription?.remove();
      clearNotificationAccount(uid);
    };
  }, [uid]);
}

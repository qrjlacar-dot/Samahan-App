import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { AppState, Platform } from "react-native";
import { subscribeDeviceHeading } from "../services/deviceLocation";

export function useDeviceHeading(enabled) {
  const [heading, setHeading] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        setHeading(null);
        return;
      }

      let unsubscribe = null;
      let closed = false;

      const start = () => {
        if (closed || unsubscribe || AppState.currentState !== "active") {
          return;
        }

        unsubscribe = subscribeDeviceHeading(setHeading);
      };

      const stop = () => {
        unsubscribe?.();
        unsubscribe = null;
        setHeading(null);
      };

      const state = AppState.addEventListener("change", (value) => {
        if (value === "active") {
          start();
        } else {
          stop();
        }
      });

      const blur = Platform.OS === "android" ? AppState.addEventListener("blur", stop) : null;

      const focus = Platform.OS === "android" ? AppState.addEventListener("focus", start) : null;

      start();

      return () => {
        closed = true;
        state.remove();
        blur?.remove();
        focus?.remove();
        stop();
      };
    }, [enabled]),
  );

  return enabled ? heading : null;
}

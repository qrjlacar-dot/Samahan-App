import { useCallback, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { getHomeGreeting } from "../services/homeGreeting";

export function useHomeGreeting() {
  const [greeting, setGreeting] = useState(getHomeGreeting);
  useFocusEffect(
    useCallback(() => {
      const refresh = () => setGreeting(getHomeGreeting());
      refresh();
      const timer = setInterval(refresh, 30000);
      const listener = AppState?.addEventListener?.("change", (state) => {
        if (state === "active") refresh();
      });
      return () => {
        clearInterval(timer);
        listener?.remove();
      };
    }, []),
  );
  return greeting;
}

import { useEffect, useState } from "react";
import { getWalkingProgress } from "../services/walkingProgress";

export function useWalkingProgress(route, snapshot, tripState) {
  const [storedProgress, setStoredProgress] = useState(null);

  useEffect(() => {
    if (!route || tripState === "idle") {
      setStoredProgress(null);
      return;
    }

    if (tripState !== "active") return;

    setStoredProgress((previous) => {
      const saved = previous?.route === route ? previous.value : null;

      const value = getWalkingProgress(route, snapshot, saved);

      return previous?.route === route && value === saved ? previous : { route, value };
    });
  }, [route, snapshot, tripState]);

  return tripState !== "idle" && storedProgress?.route === route ? storedProgress.value : null;
}

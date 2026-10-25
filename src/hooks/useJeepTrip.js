import { useCallback, useEffect, useRef, useState } from "react";
import { LOCATION_STATUS } from "../constants/commute";
import { distanceMeters } from "../services/location";

const FIX_MAX_AGE_MS = 30000;
const FIX_MAX_ACCURACY_METERS = 70;
const START_MAX_DISTANCE_METERS = 450;
const WALK_ARRIVAL_METERS = 65;
const RIDE_ARRIVAL_METERS = 115;

function validPosition(snapshot) {
  const p = snapshot?.position;
  const age = Date.now() - Date.parse(p?.timestamp);
  return (
    snapshot?.status === LOCATION_STATUS.READY &&
    snapshot.inServiceArea === true &&
    p &&
    Number.isFinite(p.accuracyMeters) &&
    p.accuracyMeters >= 0 &&
    p.accuracyMeters <= FIX_MAX_ACCURACY_METERS &&
    Number.isFinite(age) &&
    age >= -5000 &&
    age <= FIX_MAX_AGE_MS
  );
}

// Jeep ride steps are schematic and have no measured distance, so use the
// straight line between their two ends.
function stepLength(step) {
  if (Number.isFinite(step?.distanceMeters)) return step.distanceMeters;
  if (step?.start && step?.end) return distanceMeters(step.start, step.end) || 0;
  return 0;
}

export function useJeepTrip({
  route,
  snapshot,
  refreshLocation,
  startTracking,
  stopTracking,
}) {
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recenterRequest, setRecenterRequest] = useState(0);

  const lastFix = useRef(null);
  const arrivalHits = useRef(0);
  const watchOwned = useRef(false);
  const startPending = useRef(false);
  const generation = useRef(0);

  const end = useCallback(() => {
    generation.current += 1;
    startPending.current = false;
    if (watchOwned.current) {
      watchOwned.current = false;
      stopTracking();
    }
    setState("idle");
    setMessage("");
    setStepIndex(0);
    setFollowing(false);
    setBusy(false);
    lastFix.current = null;
    arrivalHits.current = 0;
  }, [stopTracking]);

  useEffect(() => {
    end();
  }, [route?.id, end]);

  useEffect(
    () => () => {
      if (watchOwned.current) {
        watchOwned.current = false;
        stopTracking();
      }
    },
    [stopTracking],
  );

  useEffect(() => {
    if (state === "arrived" && watchOwned.current) {
      watchOwned.current = false;
      stopTracking();
    }
  }, [state, stopTracking]);

  const start = useCallback(async () => {
    if (!route || route.preferredMode !== "jeep" || startPending.current) {
      return false;
    }
    startPending.current = true;
    const token = ++generation.current;
    setBusy(true);
    try {
      const fresh = await refreshLocation();
      if (token !== generation.current) return false;
      if (!validPosition(fresh)) {
        setMessage(
          "Live guidance needs location permission and a fresh GPS fix accurate to about 70 m.",
        );
        return false;
      }
      if (
        distanceMeters(fresh.position, route.origin.coordinate) >
        START_MAX_DISTANCE_METERS
      ) {
        setMessage(
          "Start closer to your selected origin (within 450 m).",
        );
        return false;
      }
      if (!watchOwned.current) {
        watchOwned.current = true;
        await startTracking({ requestPermission: false });
      }
      if (token !== generation.current) return false;
      arrivalHits.current = 0;
      lastFix.current = null;
      setStepIndex(0);
      setState("active");
      setFollowing(true);
     setMessage("");
      setRecenterRequest((value) => value + 1);
      return true;
    } catch {
      if (token === generation.current) {
        setMessage("Could not start GPS tracking. Check Location permissions.");
        if (watchOwned.current) {
          watchOwned.current = false;
          stopTracking();
        }
      }
      return false;
    } finally {
      if (token === generation.current) {
        startPending.current = false;
        setBusy(false);
      }
    }
  }, [route, refreshLocation, startTracking, stopTracking]);

  const advance = useCallback(() => {
    const steps = route?.steps ?? [];
    if (!steps.length) return;
    arrivalHits.current = 0;
    if (stepIndex >= steps.length - 1) {
      setState("arrived");
      setFollowing(false);
      setMessage("You have arrived. End trip when ready.");
      return;
    }
    setStepIndex(stepIndex + 1);
  }, [route, stepIndex]);

  useEffect(() => {
    if (state !== "active" || !route?.steps?.[stepIndex]) return;
    const p = snapshot?.position;
    if (!p || lastFix.current === p.timestamp) return;
    lastFix.current = p.timestamp;

    if (!validPosition(snapshot)) {
      setMessage("GPS signal is weak or outdated. Continue manually if needed.");
      return;
    }
    const step = route.steps[stepIndex];
    const threshold = step.mode === "jeep" ? RIDE_ARRIVAL_METERS : WALK_ARRIVAL_METERS;
    const remaining = distanceMeters(p, step.end);
    arrivalHits.current = remaining <= threshold ? arrivalHits.current + 1 : 0;
    if (arrivalHits.current >= 2) advance();
  }, [snapshot, state, stepIndex, route, advance]);

  const steps = route?.steps ?? [];
  const step = steps[stepIndex];
  const goodFix = validPosition(snapshot) && state === "active";
  const position = goodFix ? snapshot.position : null;
  const stepRemaining =
    step?.end && position
      ? Math.round(distanceMeters(position, step.end))
      : Math.round(stepLength(step));
  const futureMeters = steps
    .slice(stepIndex + 1)
    .reduce((sum, item) => sum + stepLength(item), 0);
  const totalRemaining =
    state === "arrived" ? 0 : Math.round(futureMeters + stepRemaining);

  return {
    state,
    message,
    busy,
    start,
    end,
    advance,
    open: state === "active",
    following: state === "active" && following,
    recenterRequest,
    recenter: () => {
      setFollowing(true);
      setRecenterRequest((v) => v + 1);
    },
    stopFollowing: () => setFollowing(false),
    progress:
      route?.preferredMode === "jeep" && steps.length
        ? {
            stepIndex,
            stepCount: steps.length,
            stepRemainingDistanceMeters: stepRemaining,
            remainingDistanceMeters: totalRemaining,
            remainingDurationSeconds: null,
          }
        : null,
  };
}
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { LOCATION_STATUS } from "../constants/commute";
import { distanceMeters } from "../services/location";
import { getRoutes } from "../services/routes";
import { distanceToRouteMeters } from "../services/trips";

const FIX_MAX_AGE_MS = 30000;
const FIX_MAX_ACCURACY_METERS = 70;
const WALK_ARRIVAL_METERS = 65;
const TRAIN_ARRIVAL_METERS = 115;
const OFF_ROUTE_METERS = 160;

function validPosition(snapshot) {
  const p = snapshot?.position;
  const age = Date.now() - Date.parse(p?.timestamp);
  return snapshot?.status === LOCATION_STATUS.READY &&
    snapshot.inServiceArea === true && p &&
    Number.isFinite(p.accuracyMeters) &&
    p.accuracyMeters >= 0 && p.accuracyMeters <= FIX_MAX_ACCURACY_METERS &&
    Number.isFinite(age) && age >= -5000 && age <= FIX_MAX_AGE_MS;
}

// A cached route always supplies distance, even before GPS is available.
// When navigation is active, adjust the current leg from the latest good fix.
function remainingDistance(route, stepIndex, position) {
  const steps = route?.steps ?? [];
  const current = steps[stepIndex];
  if (!current) return 0;
  const futureMeters = steps.slice(stepIndex + 1)
    .reduce((sum, item) => sum + (item.distanceMeters || 0), 0);
  const legMeters = Math.max(0, current.distanceMeters || 0);
  if (!position) return Math.round(futureMeters + legMeters);
  const directMeters = distanceMeters(position, current.end);
  if (!Number.isFinite(directMeters)) return Math.round(futureMeters + legMeters);
  // Entering a station can include a real walk from the nearby GPS position.
  const currentMeters = current.kind === "platform"
    ? Math.min(directMeters, 450)
    : Math.min(directMeters, legMeters);
  return Math.round(futureMeters + currentMeters);
}

export function useTrainTrip({ route, snapshot, refreshLocation, startTracking, stopTracking, onRouteChange }) {
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recenterRequest, setRecenterRequest] = useState(0);
  const lastFix = useRef(null);
  const arrivalHits = useRef(0);
  const offRouteHits = useRef(0);
  const alertedFor = useRef(null);
  const watchOwned = useRef(false);
  const internalReroute = useRef(false);
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
    offRouteHits.current = 0;
    alertedFor.current = null;
  }, [stopTracking]);

  useEffect(() => {
    if (internalReroute.current) {
      internalReroute.current = false;
      setStepIndex(0);
      arrivalHits.current = 0;
      offRouteHits.current = 0;
      return;
    }
    end();
  }, [route?.id, end]);

  useEffect(() => () => {
    if (watchOwned.current) {
      watchOwned.current = false;
      stopTracking();
    }
  }, [stopTracking]);

  useEffect(() => {
    if (state === "arrived" && watchOwned.current) {
      watchOwned.current = false;
      stopTracking();
    }
  }, [state, stopTracking]);

  const start = useCallback(async () => {
    if (!route || route.preferredMode !== "train" || startPending.current) return false;
    startPending.current = true;
    const token = ++generation.current;
    setBusy(true);
    try {
      const fresh = await refreshLocation(); // existing permission request
      if (token !== generation.current) return false;
      if (!validPosition(fresh)) {
        setMessage("Live guidance needs foreground location permission and a fresh GPS fix accurate to about 70 m. You can still read the offline route.");
        return false;
      }
      if (distanceMeters(fresh.position, route.origin.coordinate) > 450) {
        setMessage("Start closer to your selected origin (within 450 m), or choose the nearest station instead.");
        return false;
      }
      if (!watchOwned.current) {
        watchOwned.current = true;
        await startTracking({ requestPermission: false });
      }
      if (token !== generation.current) return false;
      arrivalHits.current = 0;
      offRouteHits.current = 0;
      lastFix.current = null;
      alertedFor.current = null;
      setStepIndex(0);
      setState("active");
      setFollowing(true);
      setMessage("Navigation uses foreground GPS. Train/platform and indoor mall position can be inaccurate; use Next step when needed.");
      setRecenterRequest((value) => value + 1);
      return true;
    } catch {
      if (token === generation.current) {
        setMessage("Could not start GPS tracking. Check Location permissions and try again.");
        if (watchOwned.current) { watchOwned.current = false; stopTracking(); }
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
    if (!route?.steps?.length) return;
    const current = route.steps[stepIndex];
    const next = route.steps[stepIndex + 1];
    if (current?.kind === "ride" && next?.mode === "walk" &&
        next.instruction.includes("Farmers Plaza")) {
      Alert.alert("Transfer to MRT-3", "Exit LRT-2 Cubao, then follow signs through Gateway Mall and Farmers Plaza to MRT-3 Cubao.");
    }
    arrivalHits.current = 0;
    alertedFor.current = null;
    if (state === "off-route") {
      setState("active");
      setMessage("Manually advanced. Continue checking station signs.");
    }
    setStepIndex((i) => {
      if (i >= route.steps.length - 1) {
        setState("arrived");
        setFollowing(false);
        setMessage("You have arrived. End trip when ready.");
        return i;
      }
      return i + 1;
    });
  }, [route, state, stepIndex]);

  const reroute = useCallback(async () => {
    if (!validPosition(snapshot)) {
      setMessage("Wait for a more accurate location fix before recalculating.");
      return false;
    }
    if (distanceMeters(snapshot.position, route.destination.coordinate) < 65) {
      setState("arrived");
      setMessage("You have reached your destination.");
      return true;
    }
    try {
      setBusy(true);
      const liveOrigin = {
        id: `device:${snapshot.position.latitude},${snapshot.position.longitude}`,
        name: "Current location", coordinate: snapshot.position, source: "device",
      };
      const [next] = await getRoutes({ origin: liveOrigin, destination: route.destination, preferredMode: "train" });
      internalReroute.current = next.id !== route.id;
      onRouteChange(next);
      setStepIndex(0);
      setState("active");
      setFollowing(true);
      setMessage("Route recalculated from your current location.");
      setRecenterRequest((value) => value + 1);
      return true;
    } catch (error) {
      internalReroute.current = false;
      setMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }, [snapshot, route, onRouteChange]);

  useEffect(() => {
    if (state !== "active" || !route?.steps?.[stepIndex]) return;
    const p = snapshot?.position;
    if (!p || lastFix.current === p.timestamp) return;
    lastFix.current = p.timestamp;

    if (!validPosition(snapshot)) {
      setMessage("GPS signal is weak, denied or outdated. Check your surroundings and continue manually if necessary.");
      return;
    }
    const step = route.steps[stepIndex];

    // GPS along a railway can deviate from the schematic straight line;
    // only off-route-check outdoor walking sections, never indoor transfers.
    if (step.kind === "walk" && !step.instruction.includes("via Gateway Mall")) {
      const deviation = distanceToRouteMeters(p, step.polyline);
      offRouteHits.current = deviation > OFF_ROUTE_METERS ? offRouteHits.current + 1 : 0;
      if (offRouteHits.current >= 3) {
        setState("off-route");
        setFollowing(false);
        setMessage("You may be off the walking route. Check the map and tap Recalculate to guide from the nearest station.");
        return;
      }
    } else {
      offRouteHits.current = 0;
    }

    const remaining = distanceMeters(p, step.end);
    if (step.kind === "ride" && remaining < 250 && alertedFor.current !== step.id) {
      alertedFor.current = step.id;
      Alert.alert("Prepare to alight", `Your stop is ${step.alightingStop}. Check the train's station signs.`);
    }
    const threshold = step.kind === "ride" ? TRAIN_ARRIVAL_METERS : WALK_ARRIVAL_METERS;
    arrivalHits.current = remaining <= threshold ? arrivalHits.current + 1 : 0;
    if (arrivalHits.current >= 2) {
      advance();
    }
  }, [snapshot, state, stepIndex, route, advance]);

  const step = route?.steps?.[stepIndex];
  const goodFix = validPosition(snapshot) && (state === "active" || state === "off-route");
  const position = goodFix ? snapshot.position : null;
  const remaining = step?.end && position
    ? Math.round(distanceMeters(position, step.end)) : step?.distanceMeters ?? 0;
  const totalRemaining = state === "arrived"
    ? 0 : remainingDistance(route, stepIndex, position);

  return {
    state, message, busy, start, end, advance, reroute,
    open: state === "active" || state === "off-route",
    following: state === "active" && following,
    recenterRequest,
    recenter: () => { setFollowing(true); setRecenterRequest((v) => v + 1); },
    stopFollowing: () => setFollowing(false),
    progress: route?.preferredMode === "train" && route.steps.length ? {
      stepIndex, stepCount: route.steps.length,
      stepRemainingDistanceMeters: remaining,
      remainingDistanceMeters: totalRemaining,
      remainingDurationSeconds: null,
    } : null,
  };
}

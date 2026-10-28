import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { distanceMeters } from "../services/location";
import {
  notifyTripCancelled,
  notifyTripCompleted,
} from "../services/notifications";
import { getRoutes } from "../services/routes";
import { distanceToRouteMeters, getTripIssue } from "../services/trips";
import { updateArrival, updateOffRoute } from "../services/tripArrival";
import { getGuidedProgress } from "../services/guidedProgress";

const RUNNING = ["active", "paused", "off-route", "rerouting"];

export function useGuidedTrip({
  uid,
  journey,
  route,
  snapshot,
  refreshLocation,
  startTracking,
  stopTracking,
  onRouteChange,
  mode = "train",
}) {
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recenterRequest, setRecenterRequest] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [rideStage, setRideStage] = useState("boarding");
  const [progress, setProgress] = useState(null);
  const generation = useRef(0);
  const pending = useRef(false);
  const request = useRef(null);
  const session = useRef(null);
  const owner = useRef({});
  const watchOwned = useRef(false);
  const internalReroute = useRef(null);
  const arrival = useRef(null);
  const stepArrival = useRef(null);
  const offRoute = useRef(null);
  const lastFix = useRef(null);
  const alertedFor = useRef(null);
  const savedFollowing = useRef(true);
  const live = useRef(null);
  live.current = { state, snapshot, route, stepIndex, rideStage };

  const releaseWatch = useCallback(() => {
    if (watchOwned.current) {
      watchOwned.current = false;
      stopTracking(owner.current);
    }
  }, [stopTracking]);
  const end = useCallback(() => {
    generation.current += 1;
    request.current?.abort();
    request.current = null;
    pending.current = false;
    session.current = null;
    internalReroute.current = null;
    arrival.current = null;
    stepArrival.current = null;
    offRoute.current = null;
    lastFix.current = null;
    alertedFor.current = null;
    releaseWatch();
    setState("idle");
    setMessage("");
    setStepIndex(0);
    setFollowing(false);
    setBusy(false);
    setRideStage("boarding");
    setProgress(null);
  }, [releaseWatch]);
  useEffect(() => {
    if (
      internalReroute.current &&
      internalReroute.current === route &&
      session.current?.uid === uid
    ) {
      internalReroute.current = null;
      return;
    }
    end();
  }, [uid, route, end]);
  useEffect(
    () => () => {
      generation.current += 1;
      request.current?.abort();
      session.current = null;
      releaseWatch();
    },
    [releaseWatch],
  );
  useEffect(() => {
    if (!RUNNING.includes(state)) return;
    const timer = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(timer);
  }, [state]);
  useEffect(() => {
    if (state === "arrived") releaseWatch();
  }, [state, releaseWatch]);

  const start = useCallback(async () => {
    if (
      !route?.steps?.length ||
      route.preferredMode !== mode ||
      pending.current
    )
      return false;
    pending.current = true;
    const token = ++generation.current;
    setBusy(true);
    setMessage("");
    try {
      const fresh = await refreshLocation();
      if (token !== generation.current) return false;
      const issue = getTripIssue(route, fresh, {
        requireOrigin: !session.current,
      });
      if (issue) {
        setMessage(issue.message);
        return false;
      }
      if (!watchOwned.current) {
        watchOwned.current = true;
        const started = await startTracking({
          requestPermission: false,
          owner: owner.current,
        });
        if (started === false) throw new Error("GPS tracking unavailable");
      }
      if (token !== generation.current) return false;
      if (!session.current) {
        session.current = {
          tripId: `trip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          uid,
          journey,
          finished: false,
          startedPosition: { ...fresh.position },
        };
        setStepIndex(0);
        setRideStage("boarding");
      }
      arrival.current = null;
      stepArrival.current = null;
      offRoute.current = null;
      lastFix.current = null;
      setNow(Date.now());
      setState("active");
      setFollowing(true);
      savedFollowing.current = true;
      setRecenterRequest((v) => v + 1);
      return true;
    } catch {
      if (token === generation.current) {
        setMessage(
          "Could not start GPS tracking. Check Location permissions and try again.",
        );
        releaseWatch();
      }
      return false;
    } finally {
      if (token === generation.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }, [route, mode, refreshLocation, startTracking, releaseWatch, uid, journey]);

  const nextStep = useCallback(() => {
    if (!session.current || !route?.steps?.[stepIndex + 1]) return false;
    stepArrival.current = null;
    arrival.current = null;
    offRoute.current = null;
    alertedFor.current = null;
    setRideStage("boarding");
    setStepIndex((i) => i + 1);
    return true;
  }, [route, stepIndex]);

  // Boarding/alighting is the same explicit action used by Bus. GPS alone
  // cannot tell whether someone entered a vehicle or passed a station.
  const confirmStage = useCallback(async () => {
    if (pending.current || !session.current || !RUNNING.includes(state))
      return false;
    const step = route?.steps?.[stepIndex];
    const ride = step?.kind === "platform" ? route.steps[stepIndex + 1] : step;
    if (ride?.kind !== "ride") return false;
    pending.current = true;
    const token = generation.current;
    setBusy(true);
    try {
      const fresh = await refreshLocation();
      if (token !== generation.current) return false;
      const issue = getTripIssue(route, fresh, { requireOrigin: false });
      if (issue) {
        setState("paused");
        setFollowing(false);
        setMessage(issue.message);
        return false;
      }
      const boarding = step.kind === "platform" || rideStage === "boarding";
      if (
        distanceMeters(fresh.position, boarding ? ride.start : ride.end) >
        (boarding ? 100 : 150)
      ) {
        setMessage(
          boarding
            ? "Move to the marked boarding area before confirming that you are aboard."
            : "You are not near the planned drop-off yet. If you got off elsewhere, end this trip and plan a walking route from your current location.",
        );
        return false;
      }
      arrival.current = null;
      stepArrival.current = null;
      if (boarding) {
        if (step.kind === "platform") setStepIndex((i) => i + 1);
        setRideStage("riding");
      } else if (stepIndex < route.steps.length - 1) {
        nextStep();
      } else {
        setRideStage("finishing");
      }
      setState("active");
      setMessage("");
      setNow(Date.now());
      return true;
    } catch {
      if (token === generation.current)
        setMessage("Could not check your location. Please try again.");
      return false;
    } finally {
      if (token === generation.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }, [state, route, stepIndex, rideStage, refreshLocation, nextStep]);

  // Manual progression is only a fallback for an intermediate instruction.
  // It never confirms final arrival, boarding, or alighting.
  const advance = useCallback(() => {
    const current = live.current;
    if (!session.current || pending.current || !RUNNING.includes(current.state))
      return false;
    const step = current.route?.steps?.[current.stepIndex];
    if (!step) return false;
    if (step.kind === "ride" || step.kind === "platform") return confirmStage();
    if (current.stepIndex >= current.route.steps.length - 1) {
      setMessage(
        "Walk safely to your destination. Waiting for GPS to confirm arrival.",
      );
      return false;
    }
    const issue = getTripIssue(current.route, current.snapshot, {
      requireOrigin: false,
    });
    if (
      !issue ||
      !["weak-signal", "old-location", "location-unavailable"].includes(
        issue.code,
      )
    )
      return false;
    const token = generation.current;
    const index = current.stepIndex;
    Alert.alert(
      "Confirm current step",
      "Only continue if you have reached the place described in this step. GPS will still be required to confirm arrival.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Next step (manual)",
          onPress: () => {
            if (
              token === generation.current &&
              live.current.stepIndex === index
            )
              nextStep();
          },
        },
      ],
    );
    return true;
  }, [confirmStage, nextStep]);

  const reroute = useCallback(async () => {
    if (
      !session.current ||
      pending.current ||
      !route ||
      !RUNNING.includes(state)
    )
      return false;
    if (route.steps[stepIndex]?.kind === "ride" && rideStage !== "boarding")
      return false;
    pending.current = true;
    const token = ++generation.current;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setState("rerouting");
    setFollowing(false);
    try {
      const fresh = await refreshLocation();
      if (token !== generation.current) return false;
      const issue = getTripIssue(route, fresh, { requireOrigin: false });
      if (issue) throw new Error(issue.message);
      const liveOrigin = {
        id: `device:${fresh.position.latitude},${fresh.position.longitude}`,
        name: "Current location",
        address: "Cubao",
        coordinate: {
          latitude: fresh.position.latitude,
          longitude: fresh.position.longitude,
        },
        source: "device",
      };
      const [next] = await getRoutes(
        {
          origin: liveOrigin,
          destination: route.destination,
          preferredMode: mode,
          operatorId: route.operatorId,
        },
        { signal: controller.signal },
      );
      if (token !== generation.current || controller.signal.aborted)
        return false;
      if (!next?.steps?.length)
        throw new Error("No train or walking route was found. Try again.");
      internalReroute.current = next;
      onRouteChange(next);
      setStepIndex(0);
      setRideStage("boarding");
      arrival.current = null;
      stepArrival.current = null;
      offRoute.current = null;
      lastFix.current = null;
      setState("active");
      setFollowing(true);
      setMessage("Route recalculated from your current location.");
      setRecenterRequest((v) => v + 1);
      return true;
    } catch (error) {
      if (token === generation.current) {
        setState("paused");
        setMessage(error.message);
      }
      return false;
    } finally {
      if (token === generation.current) {
        pending.current = false;
        request.current = null;
        setBusy(false);
      }
    }
  }, [
    route,
    mode,
    state,
    stepIndex,
    rideStage,
    refreshLocation,
    onRouteChange,
  ]);

  useEffect(() => {
    if (
      !["active", "paused", "off-route"].includes(state) ||
      !session.current ||
      !route?.steps?.[stepIndex] ||
      pending.current
    )
      return;
    const issue = getTripIssue(route, snapshot, { requireOrigin: false, now });
    if (issue) {
      arrival.current = null;
      stepArrival.current = null;
      if (state === "active") savedFollowing.current = following;
      setState("paused");
      setFollowing(false);
      setMessage(issue.message);
      return;
    }
    if (state === "paused") {
      setState("active");
      setFollowing(savedFollowing.current);
      setMessage("");
      if (savedFollowing.current) setRecenterRequest((v) => v + 1);
    }
    const p = snapshot.position;
    const step = route.steps[stepIndex];
    if (lastFix.current === `${step.id}:${p.timestamp}`) return;
    lastFix.current = `${step.id}:${p.timestamp}`;
    const realWalk = step.kind === "walk" && !step.schematic;
    const deviation = realWalk ? distanceToRouteMeters(p, step.polyline) : 0;
    if (realWalk && deviation > 75) {
      arrival.current = null;
      stepArrival.current = null;
      offRoute.current = updateOffRoute(offRoute.current, p);
      if (offRoute.current?.reroute) {
        setState("off-route");
        setFollowing(false);
        setMessage(
          "You may be off the walking route. Check the map and tap Recalculate to update the route.",
        );
      }
      return;
    }
    offRoute.current = null;
    if (state === "off-route") {
      setState("active");
      setFollowing(savedFollowing.current);
    }
    setMessage((value) => (value.startsWith("You may be off") ? "" : value));
    const nextProgress = getGuidedProgress(
      route,
      stepIndex,
      snapshot,
      progress,
      now,
    );
    setProgress(nextProgress);
    if (
      step.kind === "ride" &&
      rideStage === "riding" &&
      distanceMeters(p, step.end) < 250 &&
      alertedFor.current !== step.id
    ) {
      alertedFor.current = step.id;
      Alert.alert(
        "Prepare to alight",
        `Your stop is ${step.alightingStop}. ${mode === "jeep" ? "Confirm a permitted drop-off with the driver." : "Check the train's station signs."}`,
      );
    }
    if (
      step.kind === "platform" ||
      (step.kind === "ride" && rideStage !== "finishing")
    )
      return;
    if (stepIndex === route.steps.length - 1) {
      arrival.current = updateArrival(
        route,
        snapshot,
        nextProgress,
        arrival.current,
        session.current.startedPosition,
        now,
      );
      if (arrival.current?.arrived) {
        setState("arrived");
        setFollowing(false);
        setMessage("You have arrived at your destination.");
      }
      return;
    }
    if (
      step.kind !== "walk" ||
      p.accuracyMeters > 25 ||
      distanceMeters(p, step.end) > 25
    ) {
      stepArrival.current = null;
      return;
    }
    const timestamp = Date.parse(p.timestamp);
    if (!stepArrival.current)
      stepArrival.current = { first: timestamp, last: timestamp };
    else if (timestamp > stepArrival.current.last) {
      stepArrival.current.last = timestamp;
      if (timestamp - stepArrival.current.first >= 2000) nextStep();
    }
  }, [
    state,
    snapshot,
    route,
    stepIndex,
    rideStage,
    now,
    nextStep,
    following,
    mode,
    progress,
  ]);

  useEffect(() => {
    const current = session.current;
    if (state !== "arrived" || !current || current.finished) return;
    current.finished = true;
    if (current.uid)
      void notifyTripCompleted(current.uid, {
        tripId: current.tripId,
        journey: current.journey,
      });
  }, [state]);
  const cancel = useCallback(() => {
    const current = session.current;
    if (current && !current.finished) {
      current.finished = true;
      if (current.uid)
        void notifyTripCancelled(current.uid, {
          tripId: current.tripId,
          journey: current.journey,
        });
    }
    end();
  }, [end]);
  const currentStep = route?.steps?.[stepIndex];
  const isBoarding =
    currentStep?.kind === "platform" ||
    (currentStep?.kind === "ride" && rideStage === "boarding");
  const actionLabel =
    state === "active"
      ? isBoarding
        ? "I've boarded"
        : currentStep?.kind === "ride" && rideStage === "riding"
          ? "I've got off"
          : null
      : null;
  const locationIssue = getTripIssue(route, snapshot, {
    requireOrigin: false,
    now,
  });
  return {
    state,
    message,
    busy,
    start,
    end,
    cancel,
    advance,
    reroute,
    actionLabel,
    confirmStage,
    canReroute: currentStep?.kind !== "ride" || rideStage === "boarding",
    manualAvailable:
      state === "paused" &&
      ["weak-signal", "old-location", "location-unavailable"].includes(
        locationIssue?.code,
      ) &&
      currentStep?.kind === "walk" &&
      stepIndex < (route?.steps?.length ?? 0) - 1,
    open: RUNNING.includes(state),
    following: state === "active" && following,
    recenterRequest,
    recenter: () => {
      savedFollowing.current = true;
      setFollowing(state === "active");
      setRecenterRequest((v) => v + 1);
    },
    stopFollowing: () => {
      savedFollowing.current = false;
      setFollowing(false);
    },
    progress:
      RUNNING.includes(state) || state === "arrived"
        ? state === "arrived" && progress
          ? {
              ...progress,
              remainingDistanceMeters: 0,
              stepRemainingDistanceMeters: 0,
            }
          : (progress ?? getGuidedProgress(route, stepIndex, null))
        : null,
  };
}

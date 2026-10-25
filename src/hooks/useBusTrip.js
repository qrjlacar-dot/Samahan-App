import { useCallback, useEffect, useRef, useState } from "react";
import { distanceMeters } from "../services/location";
import { getTripIssue } from "../services/trips";
import { updateArrival } from "../services/tripArrival";
import { notifyTripCancelled, notifyTripCompleted } from "../services/notifications";
import { busStepIndex, getBusProgress, busInstruction } from "../services/busNavigation";

export function useBusTrip({ uid, journey, route, snapshot, refreshLocation }) {
  const [state, setState] = useState("idle");
  const [phase, setPhase] = useState("access");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(null);
  const [following, setFollowing] = useState(false);
  const [recenterRequest, setRecenterRequest] = useState(0);
  const [now, setNow] = useState(Date.now);
  const generation = useRef(0);
  const pending = useRef(false);
  const session = useRef(null);
  const arrival = useRef(null);
  const savedProgress = useRef(null);
  const autoPaused = useRef(false);
  const phaseRef = useRef("access");
  const rideIndex = busStepIndex(route);
  const ride = route?.steps?.[rideIndex];

  const changePhase = useCallback(value => {
    phaseRef.current = value;
    savedProgress.current = null;
    arrival.current = null;
    setPhase(value);
  }, []);
  const end = useCallback(() => {
    generation.current += 1;
    pending.current = false;
    session.current = null;
    arrival.current = null;
    savedProgress.current = null;
    autoPaused.current = false;
    setState("idle"); setBusy(false); setMessage(""); setProgress(null); setFollowing(false);
    changePhase("access");
  }, [changePhase]);
  useEffect(() => {
    end();
    return () => { generation.current += 1; session.current = null; };
  }, [uid, route, end]);
  useEffect(() => {
    if (!["active", "paused"].includes(state)) return;
    const timer = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(timer);
  }, [state]);

  const start = useCallback(async () => {
    if (pending.current || !uid || route?.preferredMode !== "bus" || rideIndex < 0) return false;
    pending.current = true;
    const token = ++generation.current;
    setBusy(true); setMessage("");
    try {
      const fresh = await refreshLocation();
      if (token !== generation.current) return false;
      const issue = getTripIssue(route, fresh, { requireOrigin: !session.current });
      if (issue) { setMessage(issue.message); return false; }
      if (!session.current) {
        session.current = {
          uid, journey, tripId: `bus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          startedPosition: { ...fresh.position }, notified: false,
        };
        changePhase(rideIndex > 0 ? "access" : "boarding");
      }
      autoPaused.current = false;
      arrival.current = null;
      setNow(Date.now()); setState("active"); setFollowing(true);
      setRecenterRequest(n => n + 1);
      return true;
    } catch {
      if (token === generation.current) setMessage("Could not check your location. Please try again.");
      return false;
    } finally {
      if (token === generation.current) { pending.current = false; setBusy(false); }
    }
  }, [uid, journey, route, rideIndex, refreshLocation, changePhase]);

  const confirmStage = useCallback(async () => {
    if (pending.current || state !== "active" || !session.current || !["boarding", "riding"].includes(phaseRef.current)) return false;
    pending.current = true;
    const token = generation.current;
    const oldPhase = phaseRef.current;
    setBusy(true);
    try {
      const fresh = await refreshLocation();
      if (token !== generation.current || oldPhase !== phaseRef.current) return false;
      const issue = getTripIssue(route, fresh, { requireOrigin: false });
      if (issue) { setMessage(issue.message); return false; }
      const boarding = oldPhase === "boarding";
      if (distanceMeters(fresh.position, boarding ? ride.start : ride.end) > (boarding ? 100 : 150)) {
        setMessage(boarding ? "Move to the marked boarding area before confirming that you are aboard."
          : "You are not near the planned drop-off yet. If you got off elsewhere, end this trip and plan a walking route from your current location.");
        return false;
      }
      changePhase(boarding ? "riding" : rideIndex < route.steps.length - 1 ? "egress" : "finishing");
      setMessage(""); setNow(Date.now());
      return true;
    } catch {
      if (token === generation.current) setMessage("Could not check your location. Please try again.");
      return false;
    } finally {
      if (token === generation.current) { pending.current = false; setBusy(false); }
    }
  }, [state, route, ride, rideIndex, refreshLocation, changePhase]);

  useEffect(() => {
    if (!["active", "paused"].includes(state) || !session.current || session.current.uid !== uid || !ride) return;
    const issue = getTripIssue(route, snapshot, { requireOrigin: false, now });
    if (issue) {
      arrival.current = null;
      autoPaused.current = issue.code !== "outside-area";
      setState("paused");
      setMessage(issue.code === "far-from-route"
        ? "You appear to be away from this bus route. Check the signboard and conductor. Guidance resumes when you return to the route; otherwise end this trip and choose a new route."
        : issue.message);
      return;
    }
    if (state === "paused") {
      if (!autoPaused.current) return;
      autoPaused.current = false;
      setState("active"); setMessage("");
    }
    let currentPhase = phaseRef.current;
    if (currentPhase === "access" && distanceMeters(snapshot.position, ride.start) <= 35 && snapshot.position.accuracyMeters <= 25) {
      currentPhase = "boarding";
      changePhase(currentPhase);
    }
    const next = getBusProgress(route, snapshot, currentPhase, savedProgress.current, now);
    savedProgress.current = next;
    setProgress(next);
    // GPS never silently marks boarding/alighting or completes a trip on the bus.
    if (!["egress", "finishing"].includes(currentPhase)) return;
    arrival.current = updateArrival(route, snapshot, next, arrival.current, session.current.startedPosition, now);
    if (arrival.current?.arrived && !session.current.notified) {
      const finished = session.current;
      finished.notified = true;
      setState("arrived"); setFollowing(false); setMessage("You have arrived at your destination.");
      void notifyTripCompleted(finished.uid, { tripId: finished.tripId, journey: finished.journey });
    }
  }, [uid, state, route, ride, snapshot, phase, now, changePhase]);

  // Only after the user confirmed they want to stop. A trip that already
  // finished (notified) is never recorded as cancelled.
  const cancel = useCallback(() => {
    const current = session.current;
    if (current && !current.notified) {
      current.notified = true;
      void notifyTripCancelled(current.uid, { tripId: current.tripId, journey: current.journey });
    }
    end();
  }, [end]);

  const recenter = useCallback(() => { setFollowing(true); setRecenterRequest(n => n + 1); }, []);
  const stopFollowing = useCallback(() => setFollowing(false), []);
  return {
    state, phase, busy, message, progress,
    instruction: busInstruction(route, phase, progress),
    actionLabel: state === "active" ? phase === "boarding" ? "I've boarded" : phase === "riding" ? "I've got off" : null : null,
    confirmStage, open: ["active", "paused"].includes(state), following: state === "active" && following,
    recenterRequest, start, end, cancel, recenter, stopFollowing,
  };
}

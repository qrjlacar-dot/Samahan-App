import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { currentLocationPlace } from "../services/deviceLocation";
import { getRoutes } from "../services/routes";
import { getTripIssue } from "../services/trips";
import {
  notifyTripCancelled,
  notifyTripCompleted,
} from "../services/notifications";
import {
  updateArrival,
  updateOffRoute,
} from "../services/tripArrival";
import { useWalkingProgress } from "./useWalkingProgress";

export function useWalkingTrip({
  uid,
  journey,
  route,
  snapshot,
  refreshLocation,
  onRouteChange,
}) {
  const [state, setState] = useState("idle");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [following, setFollowing] = useState(false);
  const [recenterRequest, setRecenterRequest] = useState(0);
  const [now, setNow] = useState(Date.now);

  const generation = useRef(0);
  const request = useRef(null);
  const pending = useRef(false);
  const session = useRef(null);
  const arrival = useRef(null);
  const offRoute = useRef(null);
  const automaticPause = useRef(null);

  const progress = useWalkingProgress(
    route,
    snapshot,
    state,
  );

  const end = useCallback(() => {
    generation.current += 1;
    request.current?.abort();
    request.current = null;
    pending.current = false;
    session.current = null;
    automaticPause.current = null;
    arrival.current = null;
    offRoute.current = null;

    setState("idle");
    setBusy(false);
    setFollowing(false);
    setMessage("");
  }, []);

  useEffect(() => {
    end();

    return () => {
      generation.current += 1;
      request.current?.abort();
      session.current = null;
    };
  }, [uid, end]);

  useEffect(() => {
    if (state !== "active") return;

    setNow(Date.now());

    const timer = setInterval(
      () => setNow(Date.now()),
      2000,
    );

    return () => clearInterval(timer);
  }, [state]);

  const start = useCallback(async () => {
    if (
      pending.current ||
      !route ||
      route.preferredMode !== "walk" ||
      !uid
    ) {
      return false;
    }

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

      if (!session.current) {
        session.current = {
          tripId:
            `trip_${Date.now()}_` +
            Math.random().toString(36).slice(2, 8),
          journey,
          uid,
          startedPosition: { ...fresh.position },
          notified: false,
        };
      }

      arrival.current = null;
      offRoute.current = null;
      automaticPause.current = null;

      setNow(Date.now());
      setState("active");
      setFollowing(true);
      setRecenterRequest((value) => value + 1);

      return true;
    } catch {
      if (token === generation.current) {
        setMessage(
          "Could not check your location. Please try again.",
        );
      }

      return false;
    } finally {
      if (token === generation.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }, [uid, journey, route, refreshLocation]);

  const reroute = useCallback(
    async (knownSnapshot = null) => {
      if (
        pending.current ||
        !session.current ||
        !route ||
        route.preferredMode !== "walk"
      ) {
        return false;
      }

      pending.current = true;

      const token = ++generation.current;
      const controller = new AbortController();

      request.current?.abort();
      request.current = controller;

      setBusy(true);
      setState("rerouting");

      automaticPause.current = null;

      setFollowing(false);
      setMessage("Updating your walking route…");

      try {
        const fresh =
          knownSnapshot ?? (await refreshLocation());

        if (token !== generation.current) return false;

        const origin = currentLocationPlace(fresh);

        if (
          !Number.isFinite(fresh.position.accuracyMeters) ||
          fresh.position.accuracyMeters < 0 ||
          fresh.position.accuracyMeters > 50
        ) {
          throw new Error(
            "Wait for a more accurate location reading, then update your route.",
          );
        }

        const routes = await getRoutes(
          {
            origin,
            destination: route.destination,
            preferredMode: "walk",
          },
          { signal: controller.signal },
        );

        if (
          token !== generation.current ||
          controller.signal.aborted
        ) {
          return false;
        }

        if (!routes[0]) {
          throw new Error(
            "No updated walking route was found.",
          );
        }

        arrival.current = null;
        offRoute.current = null;

        onRouteChange(routes[0]);

        setNow(Date.now());
        setState("active");
        setFollowing(true);
        setRecenterRequest((value) => value + 1);
        setMessage("Your walking route was updated.");

        return true;
      } catch (error) {
        if (token === generation.current) {
          setState("paused");
          setMessage(
            error.message ||
              "Could not update your route. Please try again.",
          );
        }

        return false;
      } finally {
        if (token === generation.current) {
          request.current = null;
          pending.current = false;
          setBusy(false);
        }
      }
    },
    [route, refreshLocation, onRouteChange],
  );

  useEffect(() => {
    const paused = automaticPause.current;

    if (
      state !== "paused" ||
      !paused ||
      !session.current ||
      session.current.uid !== uid
    ) {
      return;
    }

    if (
      paused.tripId !== session.current.tripId ||
      snapshot?.position?.timestamp === paused.timestamp
    ) {
      return;
    }

    if (
      getTripIssue(route, snapshot, {
        requireOrigin: false,
        now: Date.now(),
      })
    ) {
      return;
    }

    automaticPause.current = null;

    setNow(Date.now());
    setMessage("");
    setFollowing(paused.following);

    if (paused.following) {
      setRecenterRequest((value) => value + 1);
    }

    setState("active");
  }, [uid, state, route, snapshot]);

  useEffect(() => {
    if (
      state !== "active" ||
      !session.current ||
      session.current.uid !== uid
    ) {
      return;
    }

    const issue = getTripIssue(route, snapshot, {
      requireOrigin: false,
      now,
    });

    if (issue?.code === "far-from-route") {
      arrival.current = null;

      offRoute.current = updateOffRoute(
        offRoute.current,
        snapshot.position,
      );

      if (offRoute.current?.reroute) {
        void reroute(snapshot);
      } else {
        setMessage(
          "Checking whether you have left the walking route…",
        );
      }

      return;
    }

    offRoute.current = null;

    if (issue) {
      arrival.current = null;

      automaticPause.current = [
        "old-location",
        "weak-signal",
        "location-unavailable",
      ].includes(issue.code)
        ? {
            tripId: session.current.tripId,
            timestamp: snapshot?.position?.timestamp,
            following,
          }
        : null;

      setState("paused");
      setFollowing(false);
      setMessage(issue.message);

      return;
    }

    setMessage((value) =>
      value ===
      "Checking whether you have left the walking route…"
        ? ""
        : value,
    );

    arrival.current = updateArrival(
      route,
      snapshot,
      progress,
      arrival.current,
      session.current.startedPosition,
      now,
    );

    if (
      arrival.current?.arrived &&
      !session.current.notified
    ) {
      session.current.notified = true;
      const finished = session.current;

      setState("arrived");
      setFollowing(false);
      setMessage("You have arrived at your destination.");

      void notifyTripCompleted(finished.uid, {
        tripId: finished.tripId,
        journey: finished.journey,
      });
    }
  }, [
    uid,
    state,
    route,
    snapshot,
    progress,
    now,
    reroute,
    following,
  ]);

  // Only after the user confirmed they want to stop. A trip that already
  // finished (notified) is never recorded as cancelled.
  const cancel = useCallback(() => {
    const current = session.current;

    if (current && !current.notified) {
      current.notified = true;

      void notifyTripCancelled(current.uid, {
        tripId: current.tripId,
        journey: current.journey,
      });
    }

    end();
  }, [end]);

  const recenter = useCallback(() => {
    if (automaticPause.current) {
      automaticPause.current.following = true;
    }

    setFollowing(state === "active");
    setRecenterRequest((value) => value + 1);
  }, [state]);

  const stopFollowing = useCallback(() => {
    if (automaticPause.current) {
      automaticPause.current.following = false;
    }

    setFollowing(false);
  }, []);

  return {
    state,
    busy,
    message,
    progress,
    open: ["active", "paused", "rerouting"].includes(state),
    following: state === "active" && following,
    recenterRequest,
    start,
    end,
    cancel,
    reroute,
    recenter,
    stopFollowing,
  };
}
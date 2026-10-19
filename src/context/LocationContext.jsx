import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { AppState } from "react-native";
import { LOCATION_STATUS } from "../constants/commute";
import {
    LOCATION_LABELS,
    createInitialSnapshot,
    createLocationTracker,
} from "../services/location";
import { useAuth } from "./AuthContext";

const LocationContext = createContext(null);

// Used when a screen renders before LocationProvider is mounted, so Home
// keeps working instead of crashing during integration.
const FALLBACK_VALUE = Object.freeze({
  snapshot: Object.freeze({
    status: LOCATION_STATUS.UNAVAILABLE,
    position: null,
    label: LOCATION_LABELS.unavailable,
    inServiceArea: null,
  }),
  refreshLocation: async () => null,
  startTracking: async () => {},
  stopTracking: () => {},
});

let warnedAboutMissingProvider = false;

/**
 * One shared location state for Home and Directions.
 *
 * `signedIn` must be true only while a user is signed in. Mount this inside
 * AuthProvider and pass it from the auth state, for example:
 *   <LocationProvider signedIn={Boolean(user)}>...</LocationProvider>
 * When it becomes false, tracking stops and the state is cleared.
 */
export function LocationProvider({ children, signedIn = true }) {
  const trackerRef = useRef(null);
  const signedInRef = useRef(signedIn);
  const wasInBackgroundRef = useRef(false);
  const [snapshot, setSnapshot] = useState(createInitialSnapshot);

  // Keep the latest sign-in value readable from callbacks.
  useEffect(() => {
    signedInRef.current = signedIn;
  }, [signedIn]);

  // One tracker per mounted provider. Cleanup removes the subscription.
  useEffect(() => {
    const tracker = createLocationTracker(setSnapshot);
    trackerRef.current = tracker;
    return () => {
      tracker.dispose();
      if (trackerRef.current === tracker) trackerRef.current = null;
    };
  }, []);

  // First fix after sign-in; clear everything on sign-out.
  useEffect(() => {
    const tracker = trackerRef.current;
    if (!tracker) return;
    if (signedIn) {
      tracker.refresh();
    } else {
      tracker.reset();
    }
  }, [signedIn]);

  // Stop in the background; re-check (and resume tracking) when back.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      const tracker = trackerRef.current;
      if (!tracker) return;
      if (state === "background") {
        wasInBackgroundRef.current = true;
        tracker.suspend();
      } else if (state === "active" && wasInBackgroundRef.current) {
        wasInBackgroundRef.current = false;
        if (signedInRef.current) tracker.resume();
      }
    });
    return () => subscription.remove();
  }, []);

  const refreshLocation = useCallback(() => {
    const tracker = trackerRef.current;
    return tracker ? tracker.refresh() : Promise.resolve(null);
  }, []);

  const startTracking = useCallback(async (options) => {
    const tracker = trackerRef.current;
    if (tracker && signedInRef.current) await tracker.start(options);
  }, []);

  const stopTracking = useCallback(() => {
    const tracker = trackerRef.current;
    if (tracker) tracker.stop();
  }, []);

  const value = useMemo(
    () => ({ snapshot, refreshLocation, startTracking, stopTracking }),
    [snapshot, refreshLocation, startTracking, stopTracking],
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

/**
 * Convenience wrapper for src/app/_layout.jsx. Reads the signed-in user from
 * AuthProvider, so it must be rendered INSIDE AuthProvider.
 */
export function AuthenticatedLocationProvider({ children }) {
  const auth = useAuth();
  return (
    <LocationProvider signedIn={Boolean(auth && auth.user)}>
      {children}
    </LocationProvider>
  );
}

/**
 * @returns {{
 *   snapshot: import('../types/commute').LocationSnapshot,
 *   refreshLocation: () => Promise<import('../types/commute').LocationSnapshot | null>,
 *   startTracking: (options?: { requestPermission?: boolean }) => Promise<void>,
 *   stopTracking: () => void,
 * }}
 */
export function useLocation() {
  const value = useContext(LocationContext);
  if (!value) {
    if (__DEV__ && !warnedAboutMissingProvider) {
      warnedAboutMissingProvider = true;
      console.warn(
        "useLocation() was used outside LocationProvider. Mount it inside AuthProvider in src/app/_layout.jsx.",
      );
    }
    return FALLBACK_VALUE;
  }
  return value;
}

import { usePathname } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, AppState, Linking, Platform } from "react-native";
import { LOCATION_STATUS } from "../constants/commute";
import {
  LOCATION_LABELS,
  createInitialSnapshot,
  createLocationTracker,
} from "../services/location";
import { useAuth } from "./AuthContext";

const LocationContext = createContext(null);

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
  requestEnableLocation: () => {},
});

let warnedAboutMissingProvider = false;

async function readLocationServicesEnabled() {
  try {
    const native = require("expo-location");

    if (typeof native.hasServicesEnabledAsync !== "function") {
      return null;
    }

    return await native.hasServicesEnabledAsync();
  } catch {
    return null;
  }
}

export function LocationProvider({ children, signedIn = true }) {
  const pathname = usePathname();

  const screen = pathname?.replace(/\/\([^/]+\)/g, "") || "/";

  const isIntroScreen = [
    "/",
    "/onboarding",
    "/onboarding2",
    "/onboarding3",
  ].includes(screen);

  const isLoginScreen = screen === "/login";

  const canReadPosition = signedIn && !isIntroScreen && !isLoginScreen;

  // Share one tracker and retain permission decisions across visible screens.
  const trackerRef = useRef(null);
  const signedInRef = useRef(signedIn);
  const isLoginRef = useRef(isLoginScreen);
  const canReadPositionRef = useRef(canReadPosition);
  const wasInBackgroundRef = useRef(false);
  const servicesPromptedRef = useRef(false);
  const promptVisibleRef = useRef(false);
  const loginCheckTokenRef = useRef(0);

  const [snapshot, setSnapshot] = useState(createInitialSnapshot);

  signedInRef.current = signedIn;
  isLoginRef.current = isLoginScreen;
  canReadPositionRef.current = canReadPosition;

  useEffect(() => {
    const tracker = createLocationTracker(setSnapshot);
    trackerRef.current = tracker;

    return () => {
      loginCheckTokenRef.current += 1;
      tracker.dispose();

      if (trackerRef.current === tracker) {
        trackerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!signedIn) {
      servicesPromptedRef.current = false;
    }
  }, [signedIn]);

  // Prompts: avoid overlapping system dialogs and repeated accuracy questions.
  const requestEnableLocation = useCallback(() => {
    if (
      (!isLoginRef.current && !canReadPositionRef.current) ||
      promptVisibleRef.current ||
      AppState.currentState !== "active"
    ) {
      return;
    }

    servicesPromptedRef.current = true;
    promptVisibleRef.current = true;

    const dismiss = () => {
      promptVisibleRef.current = false;
    };

    const openLocationSettings = async () => {
      dismiss();

      try {
        if (Platform.OS === "android") {
          await Linking.sendIntent("android.settings.LOCATION_SOURCE_SETTINGS");
        } else {
          await Linking.openSettings();
        }
      } catch {
        Alert.alert(
          "Open Location settings",
          "Open your device Settings, turn on Location, then return to SAMAHAN.",
        );
      }
    };

    Alert.alert(
      "Turn on device Location",
      "SAMAHAN needs your device's Location to show your position and guide your trip. Turn it on in Location settings, then return to SAMAHAN.",
      [
        {
          text: "Not now",
          style: "cancel",
          onPress: dismiss,
        },
        {
          text: "Open Location settings",
          onPress: openLocationSettings,
        },
      ],
      {
        cancelable: true,
        onDismiss: dismiss,
      },
    );
  }, []);

  const checkLoginLocation = useCallback(async () => {
    const token = ++loginCheckTokenRef.current;

    const enabled = await readLocationServicesEnabled();

    if (
      token !== loginCheckTokenRef.current ||
      !isLoginRef.current ||
      AppState.currentState !== "active"
    ) {
      return;
    }

    if (enabled === true) {
      servicesPromptedRef.current = false;
    } else if (enabled === false && !servicesPromptedRef.current) {
      requestEnableLocation();
    }
  }, [requestEnableLocation]);

  useEffect(() => {
    const tracker = trackerRef.current;

    if (!tracker) return;

    loginCheckTokenRef.current += 1;

    if (!signedIn) {
      tracker.reset();
    }

    if (isIntroScreen || isLoginScreen) {
      tracker.suspend();

      if (isLoginScreen && AppState.currentState === "active") {
        checkLoginLocation();
      }
    } else if (canReadPosition && AppState.currentState === "active") {
      tracker.refresh();
    }
  }, [
    signedIn,
    isIntroScreen,
    isLoginScreen,
    canReadPosition,
    checkLoginLocation,
  ]);

  useEffect(() => {
    const suspend = () => {
      loginCheckTokenRef.current += 1;

      const tracker = trackerRef.current;

      if (!tracker || wasInBackgroundRef.current) {
        return;
      }

      wasInBackgroundRef.current = true;
      tracker.suspend();
    };

    const resume = () => {
      const tracker = trackerRef.current;

      if (
        !tracker ||
        !wasInBackgroundRef.current ||
        AppState.currentState !== "active"
      ) {
        return;
      }

      wasInBackgroundRef.current = false;

      if (isLoginRef.current) {
        checkLoginLocation();
      } else if (signedInRef.current && canReadPositionRef.current) {
        tracker.resume();
      }
    };

    const stateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        suspend();
      } else if (state === "active") {
        resume();
      }
    });

    const blurSubscription =
      Platform.OS === "android"
        ? AppState.addEventListener("blur", suspend)
        : null;

    const focusSubscription =
      Platform.OS === "android"
        ? AppState.addEventListener("focus", resume)
        : null;

    return () => {
      stateSubscription.remove();
      blurSubscription?.remove();
      focusSubscription?.remove();
    };
  }, [checkLoginLocation]);

  useEffect(() => {
    if (!canReadPosition) return;

    if (
      snapshot.status === LOCATION_STATUS.READY ||
      snapshot.status === LOCATION_STATUS.OUTSIDE_AREA
    ) {
      servicesPromptedRef.current = false;
    }

    if (
      snapshot.status === LOCATION_STATUS.UNAVAILABLE &&
      snapshot.label === LOCATION_LABELS.servicesOff &&
      !servicesPromptedRef.current
    ) {
      requestEnableLocation();
    }
  }, [canReadPosition, snapshot.status, snapshot.label, requestEnableLocation]);

  // Public actions: expose location reads and tracking through the context.
  const refreshLocation = useCallback(() => {
    const tracker = trackerRef.current;

    if (!canReadPositionRef.current) {
      return Promise.resolve(null);
    }

    return tracker ? tracker.refresh() : Promise.resolve(null);
  }, []);

  const startTracking = useCallback(async (options) => {
    const tracker = trackerRef.current;

    if (tracker && canReadPositionRef.current) {
      return tracker.start(options);
    }
    return false;
  }, []);

  const stopTracking = useCallback((owner) => {
    trackerRef.current?.stop(owner);
  }, []);

  // Retry a transient provider failure while a visible map/trip still owns GPS.
  useEffect(() => {
    const tracker = trackerRef.current;
    if (
      !canReadPosition ||
      snapshot.status !== LOCATION_STATUS.UNAVAILABLE ||
      snapshot.label === LOCATION_LABELS.servicesOff ||
      !tracker?.hasOwners() ||
      tracker.isTracking() ||
      AppState.currentState !== "active"
    )
      return;
    const timer = setTimeout(() => {
      if (
        AppState.currentState === "active" &&
        canReadPositionRef.current &&
        tracker.hasOwners()
      ) {
        void tracker.resume();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [canReadPosition, snapshot]);

  const value = useMemo(
    () => ({
      snapshot,
      refreshLocation,
      startTracking,
      stopTracking,
      requestEnableLocation,
    }),
    [
      snapshot,
      refreshLocation,
      startTracking,
      stopTracking,
      requestEnableLocation,
    ],
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function AuthenticatedLocationProvider({ children }) {
  const auth = useAuth();

  return (
    <LocationProvider signedIn={Boolean(auth && auth.user)}>
      {children}
    </LocationProvider>
  );
}

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

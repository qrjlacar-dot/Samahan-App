import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Keyboard,
  PanResponder,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "../components/BackButton";
import { CommuteMap } from "../components/CommuteMap";
import LocationInputCard from "../components/directions/LocationInputCard";
import ModeSelector from "../components/directions/ModeSelector";
import TicketToggle from "../components/directions/TicketToggle";
import TripDetailsCard from "../components/directions/TripDetailsCard";
import { useMapLocation } from "../hooks/useMapLocation";
import { getRoutes } from "../services/routes";
import { getTripIssue } from "../services/trips";
import { styles } from "../styles/directions.styles";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const MAX_TRANSLATE = Math.max(0, SCREEN_HEIGHT - 90 - 90);

export default function Directions() {
  const router = useRouter();
  const { snapshot, refreshLocation } = useMapLocation();
  const { collapsed } = useLocalSearchParams();

  const initialY =
    collapsed === "true" ? MAX_TRANSLATE : 0;

  const translateY = useRef(
    new Animated.Value(initialY),
  ).current;

  const lastY = useRef(initialY);
  const dragStart = useRef(initialY);

  const [isExpanded, setIsExpanded] = useState(
    collapsed !== "true",
  );

  const [selectedMode, setSelectedMode] = useState("walk");
  const [ticketType, setTicketType] = useState("discounted");
  const [isFavorite, setIsFavorite] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fitRequest, setFitRequest] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const routeRequest = useRef(null);
  const startRequest = useRef(0);

  const [tripState, setTripState] = useState("idle");
  const [startingTrip, setStartingTrip] = useState(false);
  const [tripMessage, setTripMessage] = useState("");
  const [following, setFollowing] = useState(false);
  const [recenterRequest, setRecenterRequest] = useState(0);

  const tripOpen = tripState !== "idle";

  const liveIssue = tripOpen
    ? getTripIssue(route, snapshot, {
        requireOrigin: false,
        requireFresh: false,
      })
    : null;

  useEffect(() => {
    if (tripState === "active" && liveIssue) {
      setTripState("paused");
      setFollowing(false);
      setTripMessage(liveIssue.message);
    }
  }, [tripState, liveIssue?.code, liveIssue?.message]);

  const endTrip = useCallback(() => {
    startRequest.current += 1;
    setTripState("idle");
    setStartingTrip(false);
    setFollowing(false);
    setTripMessage("");
  }, []);

  const confirmEndTrip = useCallback(
    (leaveScreen = false) => {
      Alert.alert(
        "End walking trip?",
        "Your walking trip will end. You can start another trip from its starting point.",
        [
          {
            text: "Keep trip",
            style: "cancel",
          },
          {
            text: "End trip",
            style: "destructive",
            onPress: () => {
              endTrip();

              if (leaveScreen) router.back();
            },
          },
        ],
      );
    },
    [endTrip, router],
  );

  useFocusEffect(
    useCallback(() => {
      if (!tripOpen) return;

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          confirmEndTrip(true);
          return true;
        },
      );

      return () => subscription.remove();
    }, [tripOpen, confirmEndTrip]),
  );

  const startTrip = async () => {
    if (!route || startingTrip) return;

    const token = ++startRequest.current;
    const requireOrigin = tripState === "idle";

    setStartingTrip(true);
    setTripMessage("");

    try {
      const fresh = await refreshLocation();

      if (token !== startRequest.current) return;

      const issue = getTripIssue(route, fresh, {
        requireOrigin,
      });

      if (issue) {
        setTripMessage(issue.message);
        return;
      }

      setTripState("active");
      setFollowing(true);
      setRecenterRequest((value) => value + 1);
      snapTo(MAX_TRANSLATE);
    } catch {
      if (token === startRequest.current) {
        setTripMessage(
          "Could not check your location. Please try again.",
        );
      }
    } finally {
      if (token === startRequest.current) {
        setStartingTrip(false);
      }
    }
  };

  useEffect(() => {
    const shown = Keyboard.addListener(
      "keyboardDidShow",
      (event) => setKeyboardHeight(
        event.endCoordinates.height,
      ),
    );

    const hidden = Keyboard.addListener(
      "keyboardDidHide",
      () => setKeyboardHeight(0),
    );

    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  useEffect(() => {
    const listener = translateY.addListener(({ value }) => {
      lastY.current = value;
    });

    return () => {
      translateY.removeListener(listener);
      routeRequest.current?.abort();
      routeRequest.current = null;
      startRequest.current += 1;
    };
  }, [translateY]);

  const snapTo = (toValue) => {
    setIsExpanded(toValue === 0);

    Animated.spring(translateY, {
      toValue,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,

      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > 3,

      onPanResponderGrant: () => {
        translateY.stopAnimation();
        dragStart.current = lastY.current;
      },

      onPanResponderMove: (_, gesture) => {
        translateY.setValue(
          Math.max(
            0,
            Math.min(
              MAX_TRANSLATE,
              dragStart.current + gesture.dy,
            ),
          ),
        );
      },

      onPanResponderRelease: (_, gesture) => {
        const position = Math.max(
          0,
          Math.min(
            MAX_TRANSLATE,
            dragStart.current + gesture.dy,
          ),
        );

        if (gesture.dy > 50 || gesture.vy > 0.3) {
          snapTo(MAX_TRANSLATE);
        } else if (gesture.dy < -50 || gesture.vy < -0.3) {
          snapTo(0);
        } else {
          snapTo(
            position > MAX_TRANSLATE / 2
              ? MAX_TRANSLATE
              : 0,
          );
        }
      },

      onPanResponderTerminate: () => snapTo(0),
    }),
  ).current;

  const invalidateRoute = () => {
    endTrip();
    routeRequest.current?.abort();
    routeRequest.current = null;
    setRoute(null);
    setLoading(false);
    setError("");
    setIsFavorite(false);
  };

  const editOrigin = (value) => {
    if (tripOpen || startingTrip) return;

    invalidateRoute();
    setLocationText(value);
    setOrigin(null);
  };

  const editDestination = (value) => {
    if (tripOpen || startingTrip) return;

    invalidateRoute();
    setDestinationText(value);
    setDestination(null);
  };

  const selectPlace = (field, place) => {
    if (tripOpen || startingTrip) return;

    invalidateRoute();

    if (field === "origin") {
      setOrigin(place);
      setLocationText(place.name);
    } else {
      setDestination(place);
      setDestinationText(place.name);
    }
  };

  const swapLocations = () => {
    if (tripOpen || startingTrip) return;

    invalidateRoute();
    setOrigin(destination);
    setDestination(origin);
    setLocationText(destinationText);
    setDestinationText(locationText);
  };

  const findRoute = async () => {
    if (tripOpen || startingTrip) return;

    Keyboard.dismiss();
    routeRequest.current?.abort();

    const controller = new AbortController();
    routeRequest.current = controller;

    setLoading(true);
    setRoute(null);
    setError("");
    setIsFavorite(false);

    try {
      const routes = await getRoutes(
        {
          origin,
          destination,
          preferredMode: selectedMode,
        },
        { signal: controller.signal },
      );

      if (
        routeRequest.current !== controller ||
        controller.signal.aborted
      ) {
        return;
      }

      setRoute(routes[0]);
      setFitRequest((value) => value + 1);
      snapTo(MAX_TRANSLATE);
    } catch (e) {
      if (
        routeRequest.current === controller &&
        e.name !== "AbortError"
      ) {
        setError(e.message);
      }
    } finally {
      if (routeRequest.current === controller) {
        setLoading(false);
        routeRequest.current = null;
      }
    }
  };

  const canSearch =
    !!origin &&
    !!destination &&
    selectedMode === "walk" &&
    !loading &&
    !tripOpen &&
    !startingTrip;

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <CommuteMap
          style={styles.map}
          userPosition={snapshot.position}
          origin={origin}
          destination={destination}
          route={route}
          fitRequest={fitRequest}
          contentBottomInset={110}
          followUser={
            tripState === "active" &&
            following &&
            !liveIssue
          }
          recenterRequest={recenterRequest}
          onUserPan={() => setFollowing(false)}
        />
      </View>

      <BackButton
        style={styles.backButton}
        onPress={() =>
          tripOpen
            ? confirmEndTrip(true)
            : router.back()
        }
        activeOpacity={0.8}
        iconSize={22}
        iconColor="#333333"
        useDefaultStyle={false}
        hitSlop={null}
      />

      {route && !isExpanded && (
        <TouchableOpacity
          style={styles.fitRouteButton}
          accessibilityLabel="Show entire route"
          onPress={() => {
            setFollowing(false);
            setFitRequest((value) => value + 1);
          }}
        >
          <Text style={styles.findRouteText}>
            Fit route
          </Text>
        </TouchableOpacity>
      )}

      {!isExpanded && snapshot.position && (
        <TouchableOpacity
          style={[
            styles.fitRouteButton,
            { top: route ? 164 : 106 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Recenter on your location"
          onPress={() => {
            setFollowing(
              tripState === "active" && !liveIssue,
            );
            setRecenterRequest((value) => value + 1);
          }}
        >
          <Text style={styles.findRouteText}>
            Recenter
          </Text>
        </TouchableOpacity>
      )}

      <Animated.View
        style={[
          styles.bottomSheet,
          {
            height: Math.max(
              200,
              SCREEN_HEIGHT - 90 - keyboardHeight,
            ),
            transform: [{ translateY }],
          },
        ]}
      >
        <View {...panResponder.panHandlers}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              Keyboard.dismiss();
              snapTo(isExpanded ? MAX_TRANSLATE : 0);
            }}
            style={styles.dragHeader}
          >
            <View style={styles.dragHandle} />

            <Text style={styles.sheetTitle}>
              {tripState === "active"
                ? "Trip active"
                : tripState === "paused"
                  ? "Trip paused"
                  : "Directions"}
            </Text>
          </TouchableOpacity>
        </View>

        <SafeAreaView
          edges={["bottom"]}
          style={styles.sheetContent}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={
              styles.scrollContainerStyle
            }
          >
            <View
              pointerEvents={
                tripOpen || startingTrip
                  ? "none"
                  : "auto"
              }
              style={{
                opacity:
                  tripOpen || startingTrip
                    ? 0.6
                    : 1,
              }}
            >
              <ModeSelector
                selectedMode={selectedMode}
                onSelectMode={(mode) => {
                  if (tripOpen || startingTrip) return;

                  invalidateRoute();
                  setSelectedMode(mode);
                }}
              />

              <LocationInputCard
                locationText={locationText}
                setLocationText={editOrigin}
                destinationText={destinationText}
                setDestinationText={editDestination}
                onSwapLocations={swapLocations}
                onSelectPlace={selectPlace}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.findRouteButton,
                !canSearch && styles.disabledButton,
              ]}
              disabled={!canSearch}
              accessibilityRole="button"
              accessibilityLabel="Find walking route"
              onPress={findRoute}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.findRouteText}>
                  Find walking route
                </Text>
              )}
            </TouchableOpacity>

            {!!error && (
              <Text
                style={styles.routeError}
                accessibilityLiveRegion="polite"
              >
                {error}
              </Text>
            )}

            {route && (
              <View
                style={[
                  styles.tripCard,
                  { marginBottom: 16 },
                ]}
              >
                <Text style={styles.tripTitle}>
                  {tripState === "active"
                    ? "Walking trip active"
                    : tripState === "paused"
                      ? "Walking trip paused"
                      : "Ready to walk?"}
                </Text>

                <Text
                  style={[
                    styles.searchHint,
                    { marginVertical: 12 },
                  ]}
                >
                  {tripState === "active"
                    ? following
                      ? "The map is following your location. End the trip before changing your route."
                      : "Map following is paused. Tap Recenter to follow your location again."
                    : tripState === "paused"
                      ? "Check your location, then tap Resume trip when you are ready."
                      : "Start when you are near the selected starting point. Keep SAMAHAN open during your walking trip."}
                </Text>

                {!!tripMessage && (
                  <Text
                    style={styles.routeError}
                    accessibilityLiveRegion="polite"
                  >
                    {tripMessage}
                  </Text>
                )}

                {tripState !== "active" && (
                  <TouchableOpacity
                    style={[
                      styles.findRouteButton,
                      startingTrip &&
                        styles.disabledButton,
                    ]}
                    disabled={startingTrip}
                    accessibilityRole="button"
                    onPress={startTrip}
                  >
                    {startingTrip ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.findRouteText}>
                        {tripState === "paused"
                          ? "Resume trip"
                          : "Start trip"}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {tripOpen && (
                  <TouchableOpacity
                    style={[
                      styles.findRouteButton,
                      {
                        backgroundColor: "#654255",
                        marginBottom: 0,
                      },
                    ]}
                    accessibilityRole="button"
                    onPress={() => confirmEndTrip()}
                  >
                    <Text style={styles.findRouteText}>
                      End trip
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {selectedMode !== "walk" && (
              <TicketToggle
                ticketType={ticketType}
                onSelectTicketType={setTicketType}
              />
            )}

            <TripDetailsCard
              route={route}
              selectedMode={selectedMode}
              ticketType={ticketType}
              isFavorite={isFavorite}
              onToggleFavorite={() =>
                setIsFavorite((value) => !value)
              }
            />
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}
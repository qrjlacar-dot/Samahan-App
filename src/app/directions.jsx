import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
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
import JeepTypeToggle from "../components/directions/JeepTypeToggle";
import LocationInputCard from "../components/directions/LocationInputCard";
import MapControls from "../components/directions/MapControls";
import ModeSelector from "../components/directions/ModeSelector";
import TicketToggle from "../components/directions/TicketToggle";
import TrainNavigationControls from "../components/directions/TrainNavigationControls";
import TripDetailsCard from "../components/directions/TripDetailsCard";
import WalkingNavigationBanner from "../components/directions/WalkingNavigationBanner";
import { useAuth } from "../context/AuthContext";
import { useJeepTrip } from "../hooks/useJeepTrip";
import { useJourneyFavorites } from "../hooks/useJourneyFavorites";
import { useMapLocation } from "../hooks/useMapLocation";
import { useTrainTrip } from "../hooks/useTrainTrip";
import { useWalkingTrip } from "../hooks/useWalkingTrip";
import { currentLocationPlace } from "../services/deviceLocation";
import { parseJourneyParam } from "../services/journeys";
import { getRoutes, searchTrainAndWalkingPlaces } from "../services/routes";
import { styles } from "../styles/directions.styles";
import { styles as navigationStyles } from "../styles/walking-navigation.styles";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const MAX_TRANSLATE = Math.max(0, SCREEN_HEIGHT - 180);

export default function Directions() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const journeyParam = Array.isArray(params.journey)
    ? params.journey[0]
    : params.journey;

  const incoming = useMemo(
    () => parseJourneyParam(journeyParam),
    [journeyParam],
  );

  const initialY =
    params.collapsed === "true" ? MAX_TRANSLATE : 0;

  const translateY = useRef(
    new Animated.Value(initialY),
  ).current;

  const lastY = useRef(initialY);
  const dragStart = useRef(initialY);

  const [isExpanded, setIsExpanded] = useState(
    params.collapsed !== "true",
  );

  const [selectedMode, setSelectedMode] = useState(
    incoming?.preferredMode || "walk",
  );

  const {
    snapshot,
    refreshLocation,
    startTracking,
    stopTracking,
  } = useMapLocation({
    trackWhenFocused: selectedMode !== "train" && selectedMode !== "jeep",
  });

  const [ticketType, setTicketType] = useState(
    incoming?.ticketType || "discounted",
  );

  const [jeepType, setJeepType] = useState("jeep-traditional");
  const jeepTypeRef = useRef(jeepType);
  jeepTypeRef.current = jeepType;

  const [origin, setOrigin] = useState(
    incoming?.origin || null,
  );

  const [destination, setDestination] = useState(
    incoming?.destination || null,
  );

  const [locationText, setLocationText] = useState(
    incoming?.origin.name || "",
  );

  const [destinationText, setDestinationText] = useState(
    incoming?.destination.name || "",
  );

  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fitRequest, setFitRequest] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [mapControlsOpen, setMapControlsOpen] =
    useState(false);

  const [browseFollowing, setBrowseFollowing] =
    useState(!incoming);

  const [
    browseRecenterRequest,
    setBrowseRecenterRequest,
  ] = useState(0);

  const request = useRef(null);

  const journey = useMemo(
    () =>
      origin && destination
        ? {
            origin,
            destination,
            preferredMode: selectedMode,
            ticketType,
          }
        : null,
    [origin, destination, selectedMode, ticketType],
  );

  const trip = useWalkingTrip({
    uid: user?.uid,
    journey,
    route,
    snapshot,
    refreshLocation,
    onRouteChange: setRoute,
  });

  const trainTrip = useTrainTrip({
    route,
    snapshot,
    refreshLocation,
    startTracking,
    stopTracking,
    onRouteChange: setRoute,
  });

  const jeepTrip = useJeepTrip({
    route,
    snapshot,
    refreshLocation,
    startTracking,
    stopTracking,
  });

  const activeTrip =
    selectedMode === "train"
      ? trainTrip
      : selectedMode === "jeep"
        ? jeepTrip
        : trip;

  useEffect(() => {
    if (selectedMode !== "train" || origin || locationText.trim()) return;
    if (!Number.isFinite(snapshot.position?.accuracyMeters) ||
        snapshot.position.accuracyMeters > 70) return;
    try {
      const here = currentLocationPlace(snapshot);
      setOrigin(here);
      setLocationText(here.name);
    } catch { /* GPS is optional; the user may search for a starting point. */ }
  }, [selectedMode, snapshot, origin, locationText]);

  const favorite = useJourneyFavorites(
    user?.uid,
    route ? journey : null,
  );

  const locked =
    trip.open ||
    trip.busy ||
    trainTrip.open ||
    jeepTrip.open ||
    jeepTrip.busy;

  const showNavigation = Boolean(
    activeTrip.progress &&
      (activeTrip.open || activeTrip.state === "arrived"),
  );

  const snapTo = useCallback(
    (toValue) => {
      setMapControlsOpen(false);
      setIsExpanded(toValue === 0);

      Animated.spring(translateY, {
        toValue,
        useNativeDriver: true,
        bounciness: 0,
        speed: 14,
      }).start();
    },
    [translateY],
  );

  const confirmEndTrip = useCallback(
    (leaveScreen = false) => {
      Alert.alert(
        selectedMode === "train"
          ? "End train trip?"
          : selectedMode === "jeep"
            ? "End jeep trip?"
            : "End walking trip?",
        "Your navigation session will end. You can start another trip from its starting point.",
        [
          {
            text: "Keep trip",
            style: "cancel",
          },
          {
            text: "End trip",
            style: "destructive",
            onPress: () => {
              trip.end();
              trainTrip.end();
              jeepTrip.end();
              setMapControlsOpen(false);

              if (leaveScreen) router.back();
            },
          },
        ],
      );
    },
    [trip.end, trainTrip.end, jeepTrip.end, router, selectedMode],
  );

  useFocusEffect(
    useCallback(() => {
      if (!activeTrip.open && !mapControlsOpen) return;

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (mapControlsOpen) {
            setMapControlsOpen(false);
          } else {
            confirmEndTrip(true);
          }

          return true;
        },
      );

      return () => subscription.remove();
    }, [
      activeTrip.open,
      mapControlsOpen,
      confirmEndTrip,
    ]),
  );

  useEffect(() => {
    const shown = Keyboard.addListener(
      "keyboardDidShow",
      (event) =>
        setKeyboardHeight(event.endCoordinates.height),
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
    const listener = translateY.addListener(
      ({ value }) => {
        lastY.current = value;
      },
    );

    return () => {
      translateY.removeListener(listener);
      request.current?.abort();
      request.current = null;
    };
  }, [translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,

      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > 3,

      onPanResponderGrant: () => {
        setMapControlsOpen(false);
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
        } else if (
          gesture.dy < -50 ||
          gesture.vy < -0.3
        ) {
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

  const invalidateRoute = useCallback(() => {
    setBrowseFollowing(false);
    trip.end();
    trainTrip.end();
    jeepTrip.end();

    request.current?.abort();
    request.current = null;

    setRoute(null);
    setLoading(false);
    setError("");
    setMapControlsOpen(false);
  }, [trip.end, trainTrip.end, jeepTrip.end]);

  const calculateRoute = useCallback(
    async (choices) => {
      if (!choices) return;

      setBrowseFollowing(false);
      Keyboard.dismiss();
      trip.end();
      trainTrip.end();
      jeepTrip.end();

      request.current?.abort();

      const controller = new AbortController();
      request.current = controller;

      setLoading(true);
      setRoute(null);
      setError("");
      setMapControlsOpen(false);

      try {
        const routes = await getRoutes(
          choices.preferredMode === "jeep"
            ? { ...choices, operatorId: jeepTypeRef.current }
            : choices,
          { signal: controller.signal },
        );

        if (
          request.current !== controller ||
          controller.signal.aborted
        ) {
          return;
        }

        if (!routes[0]) {
          throw new Error(
            "No route was found for these places.",
          );
        }

        setRoute(routes[0]);
        setFitRequest((value) => value + 1);
        snapTo(MAX_TRANSLATE);
      } catch (failure) {
        if (
          request.current === controller &&
          failure.name !== "AbortError"
        ) {
          setError(failure.message);
        }
      } finally {
        if (request.current === controller) {
          setLoading(false);
          request.current = null;
        }
      }
    },
    [trip.end, trainTrip.end, jeepTrip.end, snapTo],
  );

  useEffect(() => {
    if (!journeyParam) return;

    if (!incoming) {
      setError(
        "This saved journey could not be opened. Select your places again.",
      );
      return;
    }

    setOrigin(incoming.origin);
    setDestination(incoming.destination);
    setLocationText(incoming.origin.name);
    setDestinationText(incoming.destination.name);
    setSelectedMode(incoming.preferredMode);
    setTicketType(incoming.ticketType);

    void calculateRoute(incoming);
  }, [
    journeyParam,
    incoming,
    calculateRoute,
  ]);

  const editOrigin = (value) => {
    if (locked) return;

    invalidateRoute();
    setLocationText(value);
    setOrigin(null);
  };

  const editDestination = (value) => {
    if (locked) return;

    invalidateRoute();
    setDestinationText(value);
    setDestination(null);
  };

  const selectPlace = (field, place) => {
    if (locked) return;

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
    if (locked) return;

    invalidateRoute();

    setOrigin(destination);
    setDestination(origin);
    setLocationText(destinationText);
    setDestinationText(locationText);
  };

  const startTrip = async () => {
    if (await trip.start()) {
      setBrowseFollowing(false);
      snapTo(MAX_TRANSLATE);
    }
  };

  const startTrainTrip = async () => {
    if (await trainTrip.start()) {
      setBrowseFollowing(false);
      snapTo(MAX_TRANSLATE);
    }
  };

  const startJeepTrip = async () => {
    if (await jeepTrip.start()) {
      setBrowseFollowing(false);
      snapTo(MAX_TRANSLATE);
    }
  };

  const canSearch = Boolean(
    journey && !loading && !locked,
  );

  const sheetTitle =
    activeTrip.state === "active"
      ? "Trip active"
      : activeTrip.state === "paused" || activeTrip.state === "off-route"
        ? "Trip paused"
        : activeTrip.state === "rerouting"
          ? "Updating route"
          : activeTrip.state === "arrived"
            ? "You have arrived"
            : "Directions";

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <CommuteMap
          style={styles.map}
          userPosition={snapshot.position}
          origin={route?.origin ?? origin}
          destination={destination}
          route={route}
          fitRequest={fitRequest}
          contentBottomInset={110}
          followUser={
            activeTrip.open || trip.busy
              ? activeTrip.following
              : browseFollowing
          }
          followHeading={activeTrip.state === "active"}
          followZoom={18}
          recenterRequest={
            activeTrip.recenterRequest + browseRecenterRequest
          }
          onMapPress={() =>
            setMapControlsOpen(false)
          }
          onUserPan={() => {
            setBrowseFollowing(false);
            activeTrip.stopFollowing();
            setMapControlsOpen(false);
          }}
        />
      </View>

      <BackButton
        style={styles.backButton}
        onPress={() =>
          activeTrip.open
            ? confirmEndTrip(true)
            : router.back()
        }
        activeOpacity={0.8}
        iconSize={22}
        iconColor="#333333"
        useDefaultStyle={false}
        hitSlop={null}
      />

      {!isExpanded && showNavigation && (
        <View
          pointerEvents="box-none"
          style={navigationStyles.overlay}
        >
          <WalkingNavigationBanner
            route={route}
            progress={activeTrip.progress}
            tripState={activeTrip.state}
          />
        </View>
      )}

      {!isExpanded && (
        <MapControls
          expanded={mapControlsOpen}
          onToggle={() =>
            setMapControlsOpen((value) => !value)
          }
          hasRoute={Boolean(route)}
          hasPosition={Boolean(snapshot.position)}
          onFit={() => {
            setMapControlsOpen(false);
            setBrowseFollowing(false);
            activeTrip.stopFollowing();
            setFitRequest((value) => value + 1);
          }}
          onRecenter={() => {
            setMapControlsOpen(false);

            if (activeTrip.open || trip.busy) {
              activeTrip.recenter();
            } else {
              setBrowseFollowing(true);
              setBrowseRecenterRequest(
                (value) => value + 1,
              );
            }
          }}
        />
      )}

      <Animated.View
        collapsable={false}
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

              snapTo(
                isExpanded ? MAX_TRANSLATE : 0,
              );
            }}
            style={styles.dragHeader}
          >
            <View style={styles.dragHandle} />
            <Text style={styles.sheetTitle}>
              {sheetTitle}
            </Text>
          </TouchableOpacity>
        </View>

        <SafeAreaView
          edges={["bottom"]}
          style={styles.sheetContent}
        >
          <ScrollView
            removeClippedSubviews={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={
              styles.scrollContainerStyle
            }
          >
            <View
              collapsable={false}
              pointerEvents={locked ? "none" : "auto"}
              style={{ opacity: locked ? 0.6 : 1 }}
            >
              <ModeSelector
                selectedMode={selectedMode}
                onSelectMode={(mode) => {
                  if (!locked && mode !== selectedMode) {
                    invalidateRoute();
                    setSelectedMode(mode);
                    if (mode === "train" || selectedMode === "train") {
                      setOrigin(null);
                      setDestination(null);
                      setLocationText("");
                      setDestinationText("");
                    }
                  }
                }}
              />

              <LocationInputCard
                locationText={locationText}
                setLocationText={editOrigin}
                destinationText={destinationText}
                setDestinationText={editDestination}
                onSwapLocations={swapLocations}
                onSelectPlace={selectPlace}
                searchPlacesFn={selectedMode === "train" ? searchTrainAndWalkingPlaces : undefined}
                minQueryLength={selectedMode === "train" ? 0 : 2}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.findRouteButton,
                !canSearch && styles.disabledButton,
              ]}
              disabled={!canSearch}
              accessibilityRole="button"
              accessibilityLabel={
                selectedMode === "walk"
                  ? "Find walking route"
                  : "Find transport route"
              }
              onPress={() => calculateRoute(journey)}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.findRouteText}>
                  {selectedMode === "walk"
                    ? "Find walking route"
                    : "Find transport route"}
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

            {route?.preferredMode === "walk" && (
              <View
                style={[
                  styles.tripCard,
                  navigationStyles.tripControlsCard,
                ]}
              >
                <Text
                  style={[
                    styles.tripTitle,
                    navigationStyles.tripControlsTitle,
                  ]}
                >
                  {trip.state === "arrived"
                    ? "You have arrived"
                    : trip.state === "active"
                      ? "Walking trip active"
                      : trip.state === "paused"
                        ? "Walking trip paused"
                        : trip.state === "rerouting"
                          ? "Updating walking route"
                          : "Ready to walk?"}
                </Text>

                <Text
                  style={[
                    styles.searchHint,
                    navigationStyles.tripControlsDescription,
                  ]}
                >
                  {trip.state === "arrived"
                    ? "Your walking trip is complete."
                    : trip.state === "active"
                      ? trip.following
                        ? "The map is following your location and phone direction."
                        : "Open Map controls, then tap Recenter to follow your location again."
                      : trip.state === "paused"
                        ? "Check your location, then resume or update the route."
                        : trip.state === "rerouting"
                          ? "Finding a new walking route from your current location."
                          : "Start near the selected starting point. Keep SAMAHAN open during your trip."}
                </Text>

                {!!trip.message && (
                  <Text
                    style={[
                      styles.searchHint,
                      { marginBottom: 12 },
                    ]}
                    accessibilityLiveRegion="polite"
                  >
                    {trip.message}
                  </Text>
                )}

                {trip.state === "rerouting" && (
                  <ActivityIndicator color="#C76C9B" />
                )}

                {["idle", "paused"].includes(
                  trip.state,
                ) && (
                  <TouchableOpacity
                    style={[
                      styles.findRouteButton,
                      navigationStyles.tripControlButton,
                      trip.busy && styles.disabledButton,
                    ]}
                    disabled={trip.busy}
                    accessibilityRole="button"
                    onPress={startTrip}
                  >
                    {trip.busy ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.findRouteText}>
                        {trip.state === "paused"
                          ? "Resume trip"
                          : "Start trip"}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {trip.state === "paused" && (
                  <TouchableOpacity
                    style={[
                      styles.findRouteButton,
                      navigationStyles.tripControlButton,
                      navigationStyles.tripControlButtonSpacing,
                    ]}
                    disabled={trip.busy}
                    accessibilityRole="button"
                    onPress={() => trip.reroute()}
                  >
                    <Text style={styles.findRouteText}>
                      Update route from my location
                    </Text>
                  </TouchableOpacity>
                )}

                {trip.open && (
                  <TouchableOpacity
                    style={[
                      styles.findRouteButton,
                      navigationStyles.tripControlButton,
                      navigationStyles.endTripButton,
                      trip.state === "paused" &&
                        navigationStyles.tripControlButtonSpacing,
                    ]}
                    accessibilityRole="button"
                    onPress={() => confirmEndTrip()}
                  >
                    <Text
                      style={[
                        styles.findRouteText,
                        navigationStyles.endTripText,
                      ]}
                    >
                      End trip
                    </Text>
                  </TouchableOpacity>
                )}

                {trip.state === "arrived" && (
                  <TouchableOpacity
                    style={[
                      styles.findRouteButton,
                      navigationStyles.tripControlButton,
                    ]}
                    accessibilityRole="button"
                    onPress={() => {
                      invalidateRoute();
                      snapTo(0);
                    }}
                  >
                    <Text style={styles.findRouteText}>
                      Plan another trip
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {route?.preferredMode === "train" && (
              <TrainNavigationControls
                trip={trainTrip}
                onStart={startTrainTrip}
                onEnd={() => confirmEndTrip()}
              />
            )}

            {route?.preferredMode === "jeep" && (
              <View
                style={[styles.tripCard, navigationStyles.tripControlsCard]}
              >
                <Text
                  style={[styles.tripTitle, navigationStyles.tripControlsTitle]}
                >
                  {jeepTrip.state === "arrived"
                    ? "You have arrived"
                    : jeepTrip.state === "active"
                      ? "Jeep trip active"
                      : "Ready to travel?"}
                </Text>

                <Text
                  style={[
                    styles.searchHint,
                    navigationStyles.tripControlsDescription,
                  ]}
                >
                  {jeepTrip.state === "active"
                    ? "Follow the map. Your trip updates automatically as you move."
                    : "Start near your selected origin. Keep SAMAHAN open during your trip."}
                </Text>

                {!!jeepTrip.message && (
                  <Text
                    style={[styles.searchHint, { marginBottom: 12 }]}
                    accessibilityLiveRegion="polite"
                  >
                    {jeepTrip.message}
                  </Text>
                )}

                {jeepTrip.state === "idle" && (
                  <TouchableOpacity
                    style={[
                      styles.findRouteButton,
                      navigationStyles.tripControlButton,
                      jeepTrip.busy && styles.disabledButton,
                    ]}
                    disabled={jeepTrip.busy}
                    accessibilityRole="button"
                    onPress={startJeepTrip}
                  >
                    {jeepTrip.busy ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.findRouteText}>Start trip</Text>
                    )}
                  </TouchableOpacity>
                )}

               

                {(jeepTrip.open || jeepTrip.state === "arrived") && (
                  <TouchableOpacity
                    style={[
                      styles.findRouteButton,
                      navigationStyles.tripControlButton,
                      navigationStyles.endTripButton,
                      navigationStyles.tripControlButtonSpacing,
                    ]}
                    accessibilityRole="button"
                    onPress={() =>
                      jeepTrip.state === "arrived"
                        ? jeepTrip.end()
                        : confirmEndTrip()
                    }
                  >
                    <Text
                      style={[
                        styles.findRouteText,
                        navigationStyles.endTripText,
                      ]}
                    >
                      End trip
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {selectedMode === "jeep" && (
              <JeepTypeToggle
                value={jeepType}
                onChange={(next) => {
                  if (next !== jeepType) {
                    invalidateRoute();
                    jeepTypeRef.current = next;
                    setJeepType(next);
                  }
                }}
              />
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
              tripState={activeTrip.state}
              progress={activeTrip.progress}
              isFavorite={favorite.isFavorite}
              favoriteBusy={favorite.busy}
              favoriteError={favorite.error}
              onToggleFavorite={
                user?.uid ? favorite.toggle : null
              }
            />
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}
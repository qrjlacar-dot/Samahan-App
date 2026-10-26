import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  BackHandler,
  Keyboard,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "../components/BackButton";
import { CommuteMap } from "../components/maps/CommuteMap";
import GuidedTripControls from "../components/directions/controls/GuidedTripControls";
import JeepTypeToggle from "../components/directions/controls/JeepTypeToggle";
import LocationInputCard from "../components/directions/LocationInputCard";
import MapControls from "../components/directions/controls/MapControls";
import ModeSelector from "../components/directions/controls/ModeSelector";
import TicketToggle from "../components/directions/controls/TicketToggle";
import TripActionButton from "../components/directions/controls/TripActionButton";
import TripDetailsCard from "../components/directions/TripDetailsCard";
import WalkingBusTripControls from "../components/directions/controls/WalkingBusTripControls";
import WalkingNavigationBanner from "../components/directions/WalkingNavigationBanner";
import { useAuth } from "../context/AuthContext";
import { useBusTrip } from "../hooks/useBusTrip";
import { useDirectionsSheet } from "../hooks/useDirectionsSheet";
import { useJeepTrip } from "../hooks/useJeepTrip";
import { useJourneyFavorites } from "../hooks/useJourneyFavorites";
import { useMapLocation } from "../hooks/useMapLocation";
import { useTrainTrip } from "../hooks/useTrainTrip";
import { useWalkingTrip } from "../hooks/useWalkingTrip";
import { busReturnNotice } from "../services/routing/busPresentation";
import { currentLocationPlace } from "../services/deviceLocation";
import { parseJourneyParam } from "../services/journeys";
import { holdTripNotifications } from "../services/phoneNotifications";
import { getRoutes, searchTrainAndWalkingPlaces } from "../services/routes";
import { styles } from "../styles/directions.styles";
import { styles as navigationStyles } from "../styles/walking-navigation.styles";

export default function Directions() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  // Saved selections and screen state.
  const journeyParam = Array.isArray(params.journey) ? params.journey[0] : params.journey;

  const incoming = useMemo(() => parseJourneyParam(journeyParam), [journeyParam]);

  const [selectedMode, setSelectedMode] = useState(incoming?.preferredMode || "walk");

  const { snapshot, refreshLocation, startTracking, stopTracking } = useMapLocation({
    trackWhenFocused: selectedMode !== "train",
  });

  const [jeepType, setJeepType] = useState(incoming?.operatorId || "jeep-traditional");
  const jeepTypeRef = useRef(jeepType);
  jeepTypeRef.current = jeepType;
  const [ticketType, setTicketType] = useState(incoming?.ticketType || "discounted");
  const [origin, setOrigin] = useState(incoming?.origin || null);
  const [destination, setDestination] = useState(incoming?.destination || null);
  const [locationText, setLocationText] = useState(incoming?.origin.name || "");
  const [destinationText, setDestinationText] = useState(incoming?.destination.name || "");

  const [route, setRoute] = useState(null);
  useFocusEffect(
    useCallback(() => {
      if (!route) return undefined;
      return holdTripNotifications(user?.uid);
    }, [user?.uid, route?.id]),
  );
  const returnNotice = busReturnNotice(route);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fitRequest, setFitRequest] = useState(0);
  const [mapControlsOpen, setMapControlsOpen] = useState(false);
  const [browseFollowing, setBrowseFollowing] = useState(!incoming);
  const [browseRecenterRequest, setBrowseRecenterRequest] = useState(0);

  const request = useRef(null);
  const hideMapControls = useCallback(() => setMapControlsOpen(false), []);
  const { translateY, isExpanded, snapTo, panHandlers, collapsedOffset, sheetHeight } =
    useDirectionsSheet({
      initiallyCollapsed: params.collapsed === "true",
      onInteract: hideMapControls,
    });

  const journey = useMemo(
    () =>
      origin && destination
        ? {
            origin,
            destination,
            preferredMode: selectedMode,
            ticketType,
            ...(selectedMode === "jeep" ? { operatorId: jeepType } : {}),
          }
        : null,
    [origin, destination, selectedMode, ticketType, jeepType],
  );

  // Each mode keeps its own trip controller; only the selected route is active.
  const walkingTrip = useWalkingTrip({
    uid: user?.uid,
    journey,
    route: route?.preferredMode === "walk" ? route : null,
    snapshot,
    refreshLocation,
    onRouteChange: setRoute,
  });

  const busTrip = useBusTrip({
    uid: user?.uid,
    journey,
    route: route?.preferredMode === "bus" ? route : null,
    snapshot,
    refreshLocation,
  });
  const trainTrip = useTrainTrip({
    uid: user?.uid,
    journey,
    route: route?.preferredMode === "train" ? route : null,
    snapshot,
    refreshLocation,
    startTracking,
    stopTracking,
    onRouteChange: setRoute,
  });
  const jeepTrip = useJeepTrip({
    uid: user?.uid,
    journey,
    route: route?.preferredMode === "jeep" ? route : null,
    snapshot,
    refreshLocation,
    startTracking,
    stopTracking,
    onRouteChange: setRoute,
  });
  const tripsByMode = { walk: walkingTrip, bus: busTrip, train: trainTrip, jeep: jeepTrip };
  const trip = tripsByMode[route?.preferredMode] || walkingTrip;
  const endTrips = useCallback(() => {
    walkingTrip.end();
    busTrip.end();
    trainTrip.end();
    jeepTrip.end();
  }, [walkingTrip.end, busTrip.end, trainTrip.end, jeepTrip.end]);
  // Only used after the user confirmed they want to stop an open trip.
  const cancelTrips = useCallback(() => {
    walkingTrip.cancel();
    busTrip.cancel();
    trainTrip.cancel();
    jeepTrip.cancel();
  }, [walkingTrip.cancel, busTrip.cancel, trainTrip.cancel, jeepTrip.cancel]);

  useEffect(() => {
    if (selectedMode !== "train" || origin || locationText.trim()) return;
    if (
      !Number.isFinite(snapshot.position?.accuracyMeters) ||
      snapshot.position.accuracyMeters > 70
    )
      return;
    try {
      const here = currentLocationPlace(snapshot);
      setOrigin(here);
      setLocationText(here.name);
    } catch {
      /* GPS is optional; a starting point can be searched. */
    }
  }, [selectedMode, snapshot, origin, locationText]);

  const favorite = useJourneyFavorites(user?.uid, route ? journey : null);

  const locked =
    walkingTrip.open ||
    walkingTrip.busy ||
    busTrip.open ||
    busTrip.busy ||
    trainTrip.open ||
    trainTrip.busy ||
    jeepTrip.open ||
    jeepTrip.busy;

  const showNavigation = Boolean(trip.progress && (trip.open || trip.state === "arrived"));

  // Confirm explicit cancellation before stopping navigation or leaving.
  const confirmEndTrip = useCallback(
    (leaveScreen = false) => {
      Alert.alert(
        "End trip?",
        trip.state === "arrived"
          ? "Your trip will end. You can start another trip from its starting point."
          : "Your trip will end and be marked as cancelled. You can start another trip from its starting point.",
        [
          {
            text: "Keep trip",
            style: "cancel",
          },
          {
            text: "End trip",
            style: "destructive",
            onPress: () => {
              cancelTrips();
              setMapControlsOpen(false);

              if (leaveScreen) router.back();
            },
          },
        ],
      );
    },
    [cancelTrips, router, trip.state],
  );

  useFocusEffect(
    useCallback(() => {
      if (!trip.open && !mapControlsOpen) return;

      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        if (mapControlsOpen) {
          setMapControlsOpen(false);
        } else {
          confirmEndTrip(true);
        }

        return true;
      });

      return () => subscription.remove();
    }, [trip.open, mapControlsOpen, confirmEndTrip]),
  );

  // Cancel an unfinished route request when this screen closes.
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );

  // Input changes invalidate old routes and cancel any outstanding request.
  const invalidateRoute = useCallback(() => {
    setBrowseFollowing(false);
    endTrips();

    request.current?.abort();
    request.current = null;

    setRoute(null);
    setLoading(false);
    setError("");
    setMapControlsOpen(false);
  }, [endTrips]);

  // Only the latest search may update the map and itinerary.
  const calculateRoute = useCallback(
    async (choices) => {
      if (!choices) return;

      setBrowseFollowing(false);
      Keyboard.dismiss();
      endTrips();

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
          {
            signal: controller.signal,
          },
        );

        if (request.current !== controller || controller.signal.aborted) {
          return;
        }

        if (!routes[0]) {
          throw new Error("No route was found for these places.");
        }

        setRoute(routes[0]);
        setFitRequest((value) => value + 1);
        snapTo(collapsedOffset);
      } catch (failure) {
        if (request.current === controller && failure.name !== "AbortError") {
          setError(failure.message);
        }
      } finally {
        if (request.current === controller) {
          setLoading(false);
          request.current = null;
        }
      }
    },
    [endTrips, snapTo],
  );

  useEffect(() => {
    if (!journeyParam) return;

    if (!incoming) {
      setError("This saved journey could not be opened. Select your places again.");
      return;
    }

    setOrigin(incoming.origin);
    setDestination(incoming.destination);
    setLocationText(incoming.origin.name);
    setDestinationText(incoming.destination.name);
    setSelectedMode(incoming.preferredMode);
    setTicketType(incoming.ticketType);
    const incomingJeepType = incoming.operatorId || "jeep-traditional";
    jeepTypeRef.current = incomingJeepType;
    setJeepType(incomingJeepType);

    void calculateRoute(incoming);
  }, [journeyParam, incoming, calculateRoute]);

  // Editing and selection handlers preserve the active-trip input lock.
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
      snapTo(collapsedOffset);
    }
  };

  const canSearch = Boolean(journey && !loading && !locked);

  const sheetTitle =
    trip.state === "active"
      ? "Trip active"
      : trip.state === "paused" || trip.state === "off-route"
        ? "Trip paused"
        : trip.state === "rerouting"
          ? "Updating route"
          : trip.state === "arrived"
            ? "You have arrived"
            : "Directions";

  // Compose the map, draggable sheet, reusable controls and trip details.
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
          followUser={trip.open || trip.busy ? trip.following : browseFollowing}
          followHeading={trip.state === "active"}
          followZoom={18}
          recenterRequest={trip.recenterRequest + browseRecenterRequest}
          onMapPress={() => setMapControlsOpen(false)}
          onUserPan={() => {
            setBrowseFollowing(false);
            trip.stopFollowing();
            setMapControlsOpen(false);
          }}
        />
      </View>

      <BackButton
        style={styles.backButton}
        onPress={() => (trip.open ? confirmEndTrip(true) : router.back())}
        activeOpacity={0.8}
        iconSize={22}
        iconColor="#333333"
        useDefaultStyle={false}
        hitSlop={null}
      />

      {!isExpanded && showNavigation && (
        <View pointerEvents="box-none" style={navigationStyles.overlay}>
          <WalkingNavigationBanner
            route={route}
            progress={trip.progress}
            tripState={trip.state}
            instruction={trip.instruction}
            actionLabel={trip.actionLabel}
            onAction={trip.confirmStage}
            actionDisabled={trip.busy}
            message={trip.message}
          />
        </View>
      )}

      {!isExpanded && (
        <MapControls
          expanded={mapControlsOpen}
          onToggle={() => setMapControlsOpen((value) => !value)}
          hasRoute={Boolean(route)}
          hasPosition={Boolean(snapshot.position)}
          onFit={() => {
            setMapControlsOpen(false);
            setBrowseFollowing(false);
            trip.stopFollowing();
            setFitRequest((value) => value + 1);
          }}
          onRecenter={() => {
            setMapControlsOpen(false);

            if (trip.open || trip.busy) {
              trip.recenter();
            } else {
              setBrowseFollowing(true);
              setBrowseRecenterRequest((value) => value + 1);
            }
          }}
        />
      )}

      <Animated.View
        collapsable={false}
        style={[
          styles.bottomSheet,
          {
            height: sheetHeight,
            transform: [{ translateY }],
          },
        ]}
      >
        <View {...panHandlers}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              Keyboard.dismiss();

              snapTo(isExpanded ? collapsedOffset : 0);
            }}
            style={styles.dragHeader}
          >
            <View style={styles.dragHandle} />
            <Text style={styles.sheetTitle}>{sheetTitle}</Text>
          </TouchableOpacity>
        </View>

        <SafeAreaView edges={["bottom"]} style={styles.sheetContent}>
          <ScrollView
            removeClippedSubviews={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.scrollContainerStyle}
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

            <TripActionButton
              title={selectedMode === "walk" ? "Find walking route" : "Find transport route"}
              style={!canSearch && styles.disabledButton}
              disabled={!canSearch}
              loading={loading}
              accessibilityLabel={
                selectedMode === "walk" ? "Find walking route" : "Find transport route"
              }
              onPress={() => calculateRoute(journey)}
            />

            {!!error && (
              <Text style={styles.routeError} accessibilityLiveRegion="polite">
                {error}
              </Text>
            )}

            {["walk", "bus"].includes(route?.preferredMode) && (
              <WalkingBusTripControls
                mode={route.preferredMode}
                trip={trip}
                returnNotice={returnNotice}
                onStart={startTrip}
                onEnd={() => confirmEndTrip()}
                onPlanAnother={() => {
                  invalidateRoute();
                  snapTo(0);
                }}
              />
            )}

            {route?.preferredMode === "train" && (
              <GuidedTripControls
                trip={trainTrip}
                onStart={startTrip}
                onEnd={() => confirmEndTrip()}
              />
            )}

            {route?.preferredMode === "jeep" && (
              <GuidedTripControls
                mode="jeep"
                trip={jeepTrip}
                onStart={startTrip}
                onEnd={() => confirmEndTrip()}
              />
            )}

            {selectedMode === "jeep" && (
              <JeepTypeToggle
                value={jeepType}
                onChange={(next) => {
                  if (!locked && next !== jeepType) {
                    invalidateRoute();
                    jeepTypeRef.current = next;
                    setJeepType(next);
                  }
                }}
              />
            )}

            {route && route.preferredMode !== "walk" && (
              <TicketToggle ticketType={ticketType} onSelectTicketType={setTicketType} />
            )}

            <TripDetailsCard
              route={route}
              routeError={error}
              selectedMode={selectedMode}
              ticketType={ticketType}
              tripState={trip.state}
              progress={trip.progress}
              isFavorite={favorite.isFavorite}
              favoriteBusy={favorite.busy}
              favoriteError={favorite.error}
              onToggleFavorite={user?.uid ? favorite.toggle : null}
            />
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

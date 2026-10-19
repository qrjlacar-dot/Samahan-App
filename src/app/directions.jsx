import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
import { styles } from "../styles/directions.styles";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const MAX_TRANSLATE = Math.max(0, SCREEN_HEIGHT - 90 - 90);

export default function Directions() {
  const router = useRouter();
  const { snapshot } = useMapLocation();
  const { collapsed } = useLocalSearchParams();
  const initialY = collapsed === "true" ? MAX_TRANSLATE : 0;
  const translateY = useRef(new Animated.Value(initialY)).current;
  const lastY = useRef(initialY);
  const dragStart = useRef(initialY);
  const [isExpanded, setIsExpanded] = useState(collapsed !== "true");
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

  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", (event) =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const hidden = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardHeight(0),
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
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 3,
      onPanResponderGrant: () => {
        translateY.stopAnimation();
        dragStart.current = lastY.current;
      },
      onPanResponderMove: (_, gesture) => {
        translateY.setValue(
          Math.max(0, Math.min(MAX_TRANSLATE, dragStart.current + gesture.dy)),
        );
      },
      onPanResponderRelease: (_, gesture) => {
        const position = Math.max(
          0,
          Math.min(MAX_TRANSLATE, dragStart.current + gesture.dy),
        );
        if (gesture.dy > 50 || gesture.vy > 0.3) snapTo(MAX_TRANSLATE);
        else if (gesture.dy < -50 || gesture.vy < -0.3) snapTo(0);
        else snapTo(position > MAX_TRANSLATE / 2 ? MAX_TRANSLATE : 0);
      },
      onPanResponderTerminate: () => snapTo(0),
    }),
  ).current;

  const invalidateRoute = () => {
    routeRequest.current?.abort();
    routeRequest.current = null;
    setRoute(null);
    setLoading(false);
    setError("");
    setIsFavorite(false);
  };
  const editOrigin = (value) => {
    invalidateRoute();
    setLocationText(value);
    setOrigin(null);
  };
  const editDestination = (value) => {
    invalidateRoute();
    setDestinationText(value);
    setDestination(null);
  };
  const selectPlace = (field, place) => {
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
    invalidateRoute();
    setOrigin(destination);
    setDestination(origin);
    setLocationText(destinationText);
    setDestinationText(locationText);
  };
  const findRoute = async () => {
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
        { origin, destination, preferredMode: selectedMode },
        { signal: controller.signal },
      );
      if (routeRequest.current !== controller || controller.signal.aborted)
        return;
      setRoute(routes[0]);
      setFitRequest((value) => value + 1);
      snapTo(MAX_TRANSLATE);
    } catch (e) {
      if (routeRequest.current === controller && e.name !== "AbortError")
        setError(e.message);
    } finally {
      if (routeRequest.current === controller) {
        setLoading(false);
        routeRequest.current = null;
      }
    }
  };

  const canSearch =
    !!origin && !!destination && selectedMode === "walk" && !loading;

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
        />
      </View>
      <BackButton
        style={styles.backButton}
        onPress={() => router.back()}
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
          onPress={() => setFitRequest((value) => value + 1)}
        >
          <Text style={styles.findRouteText}>Fit route</Text>
        </TouchableOpacity>
      )}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            height: Math.max(200, SCREEN_HEIGHT - 90 - keyboardHeight),
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
            <Text style={styles.sheetTitle}>Directions</Text>
          </TouchableOpacity>
        </View>
        <SafeAreaView edges={["bottom"]} style={styles.sheetContent}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.scrollContainerStyle}
          >
            <ModeSelector
              selectedMode={selectedMode}
              onSelectMode={(mode) => {
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
                <Text style={styles.findRouteText}>Find walking route</Text>
              )}
            </TouchableOpacity>
            {!!error && (
              <Text style={styles.routeError} accessibilityLiveRegion="polite">
                {error}
              </Text>
            )}
            {selectedMode === "walk" ? (
              <Text style={styles.walkingNote}>
                Walking has no transport fare.
              </Text>
            ) : (
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
              onToggleFavorite={() => setIsFavorite((value) => !value)}
            />
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

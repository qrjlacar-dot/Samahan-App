import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    PanResponder,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../styles/directions.styles";

// Modular Imports pointing to src/directions/
import LocationInputCard from "../directions/LocationInputCard";
import ModeSelector from "../directions/ModeSelector";
import TicketToggle from "../directions/TicketToggle";
import TripDetailsCard from "../directions/TripDetailsCard";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const EXPANDED_TOP = 90;
const COLLAPSED_HEADER_HEIGHT = 70;
const MAX_TRANSLATE = SCREEN_HEIGHT - EXPANDED_TOP - COLLAPSED_HEADER_HEIGHT;

export default function Directions() {
  const router = useRouter();
  const { collapsed } = useLocalSearchParams();

  const shouldStartCollapsed = collapsed === "true";
  const initialY = shouldStartCollapsed ? MAX_TRANSLATE : 0;

  const [selectedMode, setSelectedMode] = useState("bus");
  const [ticketType, setTicketType] = useState("discounted");
  const [isFavorite, setIsFavorite] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [destinationText, setDestinationText] = useState("");

  const handleSwapLocations = () => {
    setLocationText(destinationText);
    setDestinationText(locationText);
  };

  const initialRegion = {
    latitude: 14.6255,
    longitude: 121.0603,
    latitudeDelta: 0.0322,
    longitudeDelta: 0.0321,
  };

  // Animated Drag Controller
  const translateY = useRef(new Animated.Value(initialY)).current;
  const lastAnimatedValue = useRef(initialY);
  const [isExpanded, setIsExpanded] = useState(!shouldStartCollapsed);

  React.useEffect(() => {
    const id = translateY.addListener(({ value }) => {
      lastAnimatedValue.current = value;
    });
    return () => translateY.removeListener(id);
  }, [translateY]);

  const snapTo = (toValue) => {
    Animated.spring(translateY, {
      toValue,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14,
    }).start(() => {
      setIsExpanded(toValue === 0);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 3,
      onPanResponderGrant: () => {
        translateY.setOffset(lastAnimatedValue.current);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const rawY = lastAnimatedValue.current + gestureState.dy;
        const clampedY = Math.max(0, Math.min(MAX_TRANSLATE, rawY));
        translateY.setValue(clampedY - lastAnimatedValue.current);
      },
      onPanResponderRelease: (_, gestureState) => {
        translateY.flattenOffset();
        const currentPos = lastAnimatedValue.current;

        if (gestureState.dy > 50 || gestureState.vy > 0.3) {
          snapTo(MAX_TRANSLATE);
        } else if (gestureState.dy < -50 || gestureState.vy < -0.3) {
          snapTo(0);
        } else {
          if (currentPos > MAX_TRANSLATE / 2) {
            snapTo(MAX_TRANSLATE);
          } else {
            snapTo(0);
          }
        }
      },
    }),
  ).current;

  const toggleSheet = () => {
    if (isExpanded) {
      snapTo(MAX_TRANSLATE);
    } else {
      snapTo(0);
    }
  };

  return (
    <View style={styles.container}>
      {/* Full Screen Live Map */}
      <View style={styles.mapContainer}>
        <MapView
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={initialRegion}
        />
      </View>

      {/* Back Button Overlay */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={22} color="#333333" />
      </TouchableOpacity>

      {/* Swipeable Bottom Sheet Panel */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Drag Header Area */}
        <View {...panResponder.panHandlers}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={toggleSheet}
            style={styles.dragHeader}
          >
            <View style={styles.dragHandle} />
            <Text style={styles.sheetTitle}>Directions</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Sheet Content */}
        <SafeAreaView edges={["bottom"]} style={styles.sheetContent}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainerStyle}
          >
            <ModeSelector
              selectedMode={selectedMode}
              onSelectMode={setSelectedMode}
            />

            <LocationInputCard
              locationText={locationText}
              setLocationText={setLocationText}
              destinationText={destinationText}
              setDestinationText={setDestinationText}
              onSwapLocations={handleSwapLocations}
            />

            <TicketToggle
              ticketType={ticketType}
              onSelectTicketType={setTicketType}
            />

            <TripDetailsCard
              selectedMode={selectedMode}
              ticketType={ticketType}
              isFavorite={isFavorite}
              onToggleFavorite={() => setIsFavorite(!isFavorite)}
            />
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

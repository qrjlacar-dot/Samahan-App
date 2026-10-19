import { Ionicons } from "@expo/vector-icons";
import {
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "../../styles/directions.styles";
import TripSummaryBadge, {
  formatDistance,
  formatDuration,
} from "./TripSummaryBadge";
import ProviderAttribution from "./ProviderAttribution";

export default function TripDetailsCard({
  route,
  selectedMode,
  isFavorite,
  onToggleFavorite,
}) {
  return (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <Text style={styles.tripTitle}>
          Trip Details
        </Text>

        {route && onToggleFavorite && (
          <TouchableOpacity
            onPress={onToggleFavorite}
            accessibilityLabel="Toggle favorite"
          >
            <Ionicons
              name={
                isFavorite
                  ? "heart"
                  : "heart-outline"
              }
              size={22}
              color="#C76C9B"
            />
          </TouchableOpacity>
        )}
      </View>

      {!route ? (
        <Text style={styles.searchHint}>
          {selectedMode === "walk"
            ? "Select your starting point and destination, then tap Find walking route."
            : "Bus, jeepney, and train routes are not connected yet. Choose Walk to test a real route."}
        </Text>
      ) : (
        <>
          <TripSummaryBadge route={route} />

          <Text style={styles.routeEndpoints}>
            {route.origin.name} → {route.destination.name}
          </Text>

          <View style={styles.timelineContainer}>
            {route.steps.map((step, index) => (
              <View
                key={step.id}
                style={styles.timelineItem}
              >
                {index < route.steps.length - 1 && (
                  <View
                    style={styles.verticalDottedConnector}
                  />
                )}

                <View style={styles.timelineIconColumn}>
                  <View
                    style={
                      index === 0
                        ? styles.solidDot
                        : styles.hollowCircle
                    }
                  />
                </View>

                <View style={styles.timelineContent}>
                  <Text style={styles.stopTitle}>
                    {step.instruction}
                  </Text>

                  <Text style={styles.stopSubtitle}>
                    {formatDistance(step.distanceMeters)}
                    {" · "}
                    {formatDuration(step.durationSeconds)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.searchHint}>
            Walking times are estimates. Keep Location
            turned on during your trip.
          </Text>

          {route.warnings.map((warning, index) => (
            <Text
              key={index}
              style={styles.searchHint}
            >
              {warning}
            </Text>
          ))}

          <ProviderAttribution />
        </>
      )}
    </View>
  );
}
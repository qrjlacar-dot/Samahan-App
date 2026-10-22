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
  tripState = "idle",
  progress = null,
}) {
  const summaryRoute = progress
    ? {
        ...route,
        distanceMeters:
          progress.remainingDistanceMeters,
        durationSeconds:
          progress.remainingDurationSeconds,
      }
    : route;

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
          <TripSummaryBadge route={summaryRoute} />

          {progress && (
            <Text
              style={[
                styles.searchHint,
                { marginBottom: 12 },
              ]}
            >
              {tripState === "paused"
                ? "Paused · Last estimate"
                : "Remaining"}
              {" · "}
              Step {progress.stepIndex + 1} of{" "}
              {progress.stepCount}
            </Text>
          )}

          <Text style={styles.routeEndpoints}>
            {route.origin.name} →{" "}
            {route.destination.name}
          </Text>

          <View style={styles.timelineContainer}>
            {route.steps.map((step, index) => (
              <View
                key={step.id}
                style={styles.timelineItem}
              >
                {index < route.steps.length - 1 && (
                  <View
                    style={
                      styles.verticalDottedConnector
                    }
                  />
                )}

                <View
                  style={styles.timelineIconColumn}
                >
                  <View
                    style={
                      index ===
                      (progress?.stepIndex ?? 0)
                        ? styles.solidDot
                        : styles.hollowCircle
                    }
                  />
                </View>

                <View
                  style={[
                    styles.timelineContent,
                    progress &&
                      index < progress.stepIndex && {
                        opacity: 0.45,
                      },
                  ]}
                >
                  <Text
                    style={[
                      styles.stopTitle,
                      progress &&
                        index ===
                          progress.stepIndex && {
                          color: "#C76C9B",
                          fontWeight: "700",
                        },
                    ]}
                  >
                    {step.instruction}
                  </Text>

                  <Text style={styles.stopSubtitle}>
                    {formatDistance(
                      step.distanceMeters,
                    )}
                    {" · "}
                    {formatDuration(
                      step.durationSeconds,
                    )}
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
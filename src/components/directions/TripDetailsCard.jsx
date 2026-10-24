import { Linking } from "react-native";
import FareSummary from "./FareSummary";
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
import { TRAIN_RIDE_FARES, farePairKey } from "../../data/trainFares";

export default function TripDetailsCard({
  route,
  selectedMode,
  isFavorite,
  onToggleFavorite,
  tripState = "idle",
  progress = null,
  favoriteBusy = false,
  favoriteError = "",
  ticketType = "regular",
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
  const isTrain = route?.preferredMode === "train";
  const selectedTrainFare = isTrain
    ? route.steps.filter((step) => step.mode === "train").reduce((total, step) => {
        const fare = TRAIN_RIDE_FARES[farePairKey(...(step.stationIds ?? []))];
        return total + (fare?.[ticketType] ?? 0);
      }, 0)
    : null;

  return (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <Text style={styles.tripTitle}>
          Trip Details
        </Text>

        {route && onToggleFavorite && (
          <TouchableOpacity
            onPress={onToggleFavorite}
            disabled={favoriteBusy}
            accessibilityState={{ disabled: favoriteBusy }}
            style={{ opacity: favoriteBusy ? 0.5 : 1 }}
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
            : "Select both places to preview an included transport route. Bus and jeepney routes need confirmed data before they become available."}
        </Text>
      ) : (
        <>
          <TripSummaryBadge route={summaryRoute} />
          {!!favoriteError && <Text style={styles.routeError}>{favoriteError}</Text>}
          <FareSummary route={route} ticketType={ticketType} />

          {isTrain && route.trainStopCount > 0 && (
            <Text style={styles.searchHint}>
              {route.nextTrainDirection} · {route.trainStopCount} stop(s)
            </Text>
          )}

          {isTrain && route.trainStopCount === 0 && (
            <Text style={styles.searchHint}>
              Both places are closest to the same train station, so this trip is walking-only. No train fare.
            </Text>
          )}

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

                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={styles.stopSubtitle}>
                      {formatDistance(step.distanceMeters)}
                      {!isTrain && ` · ${formatDuration(step.durationSeconds)}`}
                    </Text>
                    {isTrain && step.mode === "train" && Number.isFinite(selectedTrainFare) && (
                      <View style={styles.farePill}>
                        <Text style={styles.fareText}>₱{selectedTrainFare.toFixed(2)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.searchHint}>
            {isTrain
              ? "Approximate route. Check platform signs and current service before travelling."
              : route.preferredMode === "walk"
                ? "Walking times are estimates. Keep Location turned on during your trip."
                : "Transport preview only. Check service availability and the correct platform before travelling."}
          </Text>

          {!isTrain && (route.warnings ?? []).map((warning, index) => (
            <Text
              key={index}
              style={styles.searchHint}
            >
              {warning}
            </Text>
          ))}

          {!isTrain && [...new Set(route.steps.map((step) => step.sourceUrl).filter(Boolean))].map((url) => (
            <Text key={url} style={styles.searchHint} accessibilityRole="link" onPress={() => Linking.openURL(url).catch(() => {})}>Transport route source</Text>
          ))}
          <ProviderAttribution />
        </>
      )}
    </View>
  );
}

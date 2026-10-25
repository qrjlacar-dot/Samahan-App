import { busTimelineSteps, simplifyWalkingInstruction } from "../../services/busPresentation";
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

export default function TripDetailsCard({
  route,
  routeError = "",
  selectedMode,
  isFavorite,
  onToggleFavorite,
  tripState = "idle",
  progress = null,
  favoriteBusy = false,
  favoriteError = "",
  ticketType = "regular",
}) {
  if (!route && routeError) return null;
  const busJourney = route?.preferredMode === "bus" || route?.requestedMode === "bus";
  const timelineSteps = busJourney ? busTimelineSteps(route) : route?.steps ?? [];
  const currentStep = busJourney && tripState === "arrived"
    ? timelineSteps.length - 1 : progress?.stepIndex ?? 0;

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
            : selectedMode === "bus"
              ? "Choose your places to find a bus route between Anonas and Cubao."
              : "Select both places, then tap Find transport route to see the available journey."}
        </Text>
      ) : (
        <>
          <TripSummaryBadge route={summaryRoute} />
          {!!route.recommendation && <Text style={[styles.searchHint, { marginBottom: 12 }]}>{route.recommendation}</Text>}
          {!!favoriteError && <Text style={styles.routeError}>{favoriteError}</Text>}
          <FareSummary route={route} ticketType={ticketType} />

          {progress && (
            <Text
              style={[
                styles.searchHint,
                { marginBottom: 12 },
              ]}
            >
              {busJourney && tripState === "arrived" ? "Trip complete" : <>
              {tripState === "paused"
                ? "Paused · Last estimate"
                : "Remaining"}
              {" · "}
              Step {progress.stepIndex + 1} of{" "}
              {progress.stepCount}
              </>}
            </Text>
          )}

          <Text style={styles.routeEndpoints}>
            {route.origin.name} →{" "}
            {route.destination.name}
          </Text>

          <View style={styles.timelineContainer}>
            {timelineSteps.map((step, index) => (
              <View
                key={step.id}
                style={styles.timelineItem}
              >
                {index < timelineSteps.length - 1 && (
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
                      index === currentStep && (!step.displayArrival || tripState === "arrived")
                        ? styles.solidDot
                        : styles.hollowCircle
                    }
                  />
                </View>

                <View
                  style={[
                    styles.timelineContent,
                    progress &&
                      index < currentStep && {
                        opacity: 0.45,
                      },
                  ]}
                >
                  <Text
                    style={[
                      styles.stopTitle,
                      progress &&
                        index === currentStep && (!step.displayArrival || tripState === "arrived") && {
                          color: "#C76C9B",
                          fontWeight: "700",
                        },
                    ]}
                  >
                    {step.mode === "walk" ? simplifyWalkingInstruction(step.instruction) : step.instruction}
                  </Text>

                  <Text style={styles.stopSubtitle}>
                    {formatDistance(
                      step.distanceMeters,
                    )}
                    {Number.isFinite(step.durationSeconds) && !step.displayArrival && <>
                      {" · "}{formatDuration(step.durationSeconds)}
                    </>}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.searchHint}>
            {route.preferredMode === "walk"
              ? "Walking times are estimates. Keep Location turned on during your trip."
              : route.preferredMode === "bus"
                ? "Follow the boarding and drop-off instructions. Check the signboard and tell the conductor your stopping point before boarding."
                : "Check service availability and the correct platform before travelling."}
          </Text>

          {(route.warnings ?? []).map((warning, index) => (
            <Text
              key={index}
              style={styles.searchHint}
            >
              {warning}
            </Text>
          ))}

          {[...new Set(route.steps.map((step) => step.sourceUrl).filter(Boolean))].map((url) => (
            <Text key={url} style={styles.searchHint} accessibilityRole="link" onPress={() => Linking.openURL(url).catch(() => {})}>Transport route source</Text>
          ))}
          <ProviderAttribution />
        </>
      )}
    </View>
  );
}

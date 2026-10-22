import { Text, View } from "react-native";
import { styles } from "../../styles/walking-navigation.styles";
import { formatDistance } from "./TripSummaryBadge";

export default function WalkingNavigationBanner({
  route,
  progress,
  tripState,
}) {
  if (
    !route ||
    !progress ||
    !["active", "paused"].includes(tripState)
  ) {
    return null;
  }

  const current =
    route.steps[progress.stepIndex];

  const next =
    route.steps[progress.stepIndex + 1];

  if (!current) return null;

  return (
    <View
      pointerEvents="none"
      style={styles.banner}
    >
      <Text style={styles.label}>
        {tripState === "paused"
          ? "Paused · Last estimate"
          : "Current step"}
        {" · "}
        {formatDistance(
          progress.stepRemainingDistanceMeters,
        )}{" "}
        left
      </Text>

      <Text
        style={styles.instruction}
        numberOfLines={2}
      >
        {current.instruction}
      </Text>

      {next && (
        <View style={styles.nextRow}>
          <Text style={styles.label}>
            Up next
          </Text>

          <Text
            style={styles.nextInstruction}
            numberOfLines={2}
          >
            {next.instruction}
          </Text>
        </View>
      )}
    </View>
  );
}
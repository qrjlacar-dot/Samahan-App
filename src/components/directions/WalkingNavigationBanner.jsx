import { Text, View } from "react-native";
import { styles } from "../../styles/walking-navigation.styles";
import { formatDistance } from "./TripSummaryBadge";

export default function WalkingNavigationBanner({ route, progress, tripState }) {
  if (!route || !progress || !["active", "paused", "off-route", "rerouting", "arrived"].includes(tripState)) return null;
  const current = route.steps[progress.stepIndex];
  const next = route.steps[progress.stepIndex + 1];
  if (!current) return null;
  const arrived = tripState === "arrived";
  const label = arrived ? "Arrived" : tripState === "off-route" ? "Off route · Check your position" : tripState === "paused" ? "Paused · Last estimate" : tripState === "rerouting" ? "Updating route · Last estimate" : "Current step";
  return (
    <View pointerEvents="none" style={styles.banner}>
      <Text style={styles.label}>
        {label}{!arrived && ` · ${formatDistance(progress.stepRemainingDistanceMeters)} left`}
      </Text>
      <Text style={styles.instruction} numberOfLines={2}>
        {arrived ? "You have arrived at your destination." : current.instruction}
      </Text>
      {next && !arrived && (
        <View style={styles.nextRow}>
          <Text style={styles.label}>Up next</Text>
          <Text style={styles.nextInstruction} numberOfLines={2}>{next.instruction}</Text>
        </View>
      )}
    </View>
  );
}

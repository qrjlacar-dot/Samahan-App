import { Text, View, TouchableOpacity } from "react-native";
import { styles } from "../../styles/walking-navigation.styles";
import { formatDistance } from "./TripSummaryBadge";
import { busReturnNotice, simplifyWalkingInstruction } from "../../services/busPresentation";

export default function WalkingNavigationBanner({ route, progress, tripState, instruction, actionLabel, onAction, actionDisabled, message }) {
  if (!route || !progress || !["active", "paused", "rerouting", "arrived"].includes(tripState)) return null;
  const current = route.steps[progress.stepIndex];
  const next = route.steps[progress.stepIndex + 1];
  if (!current) return null;
  const arrived = tripState === "arrived";
  const returnNotice = busReturnNotice(route);
  const currentInstruction = instruction || current.instruction;
  const displayInstruction = current.mode === "walk"
    ? simplifyWalkingInstruction(currentInstruction) : currentInstruction;
  const label = arrived ? "Arrived" : tripState === "paused" ? "Paused · Last estimate" : tripState === "rerouting" ? "Updating route · Last estimate" : "Current step";
  return (
    <View pointerEvents={actionLabel ? "auto" : "none"} style={styles.banner}>
      <Text style={styles.label}>
        {label}{!arrived && ` · ${formatDistance(progress.stepRemainingDistanceMeters)} left`}
      </Text>
      {!!returnNotice && !arrived && <Text style={styles.nextInstruction}>
        Return route not verified · Confirm destination and boarding/drop-off with the conductor.
      </Text>}
      <Text style={styles.instruction} numberOfLines={2}>
        {arrived ? "You have arrived at your destination." : displayInstruction}
      </Text>
      {!!message && !arrived && <Text style={styles.nextInstruction} numberOfLines={3}>{message}</Text>}
      {actionLabel && !arrived && (
        <TouchableOpacity accessibilityRole="button" disabled={actionDisabled} onPress={onAction}
          style={{ backgroundColor: "#C76C9B", borderRadius: 12, padding: 12, marginTop: 10, opacity: actionDisabled ? 0.6 : 1 }}>
          <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>{actionDisabled ? "Checking location…" : actionLabel}</Text>
        </TouchableOpacity>
      )}
      {next && !arrived && !actionLabel && (
        <View style={styles.nextRow}>
          <Text style={styles.label}>Up next</Text>
          <Text style={styles.nextInstruction} numberOfLines={2}>{next.mode === "walk" ? simplifyWalkingInstruction(next.instruction) : next.instruction}</Text>
        </View>
      )}
    </View>
  );
}


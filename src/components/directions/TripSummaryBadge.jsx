import { Text, View } from "react-native";
import { styles } from "../../styles/directions.styles";
import TransportIcon from "./TransportIcon";

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "Distance unavailable";
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "Time unavailable";
  if (seconds === 0) return "0 min";
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} hr${minutes % 60 ? ` ${minutes % 60} min` : ""}`
    : `${minutes} min`;
}

export default function TripSummaryBadge({ route }) {
  if (!route) return null;
  const modes = route.actualModes?.length ? route.actualModes : [route.preferredMode || "walk"];
  const labels = { walk: "Walk", train: "Train", jeep: "Jeep", bus: "Bus" };
  return (
    <View style={[styles.summaryBadgePill, { flexWrap: "wrap" }]}>
      <TransportIcon mode={route.preferredMode} size={14} color="#C76C9B" imageStyle={{ width: 16, height: 16, resizeMode: "contain", tintColor: "#C76C9B" }} />
      <Text style={styles.badgeText}>{modes.map((mode) => labels[mode] || mode).join(" + ")}</Text>
      <Text style={styles.badgeDivider}>|</Text>
      <Text style={styles.badgeDetailText}>
        {formatDistance(route.distanceMeters)}
      </Text>
      {route.preferredMode !== "train" && (
        <>
          <Text style={styles.badgeDivider}>|</Text>
          <Text style={styles.badgeDetailText}>
            {formatDuration(route.durationSeconds)}
          </Text>
        </>
      )}
    </View>
  );
}

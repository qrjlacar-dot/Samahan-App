import { Text, View } from "react-native";
import { styles } from "../../styles/directions.styles";
import TransportIcon from "./TransportIcon";

const SUMMARIES = {
  bus: { label: "Bus", distance: "1.2 km", duration: "10 mins" },
  jeep: { label: "Jeep", distance: "1.2 km", duration: "12 mins" },
  train: { label: "Train", distance: "1.2 km", duration: "1 min" },
  walk: { label: "Walk", distance: "1.1 km", duration: "15 mins" },
};

export default function TripSummaryBadge({ selectedMode }) {
  const mode = SUMMARIES[selectedMode] ? selectedMode : "bus";
  const summary = SUMMARIES[mode];

  return (
    <View style={styles.summaryBadgePill}>
      <TransportIcon
        mode={mode}
        size={14}
        color="#C76C9B"
        imageStyle={{
          width: 16,
          height: 16,
          tintColor: "#C76C9B",
          resizeMode: "contain",
        }}
      />
      <Text style={styles.badgeText}>{summary.label}</Text>
      <Text style={styles.badgeDivider}>|</Text>
      <Text style={styles.badgeDetailText}>{summary.distance}</Text>
      <Text style={styles.badgeDivider}>|</Text>
      <Text style={styles.badgeDetailText}>{summary.duration}</Text>
    </View>
  );
}

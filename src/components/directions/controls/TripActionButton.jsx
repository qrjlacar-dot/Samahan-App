import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { styles } from "../../../styles/directions.styles";

// Share direction-button markup while callers keep their existing layout styles.
export default function TripActionButton({
  title,
  onPress,
  style,
  textStyle,
  disabled = false,
  loading = false,
  accessibilityLabel,
}) {
  return (
    <TouchableOpacity
      style={[styles.findRouteButton, style]}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={[styles.findRouteText, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../../../constants/theme";
import { styles } from "../../../styles/walking-navigation.styles";

export default function MapControls({
  expanded,
  onToggle,
  hasRoute,
  hasPosition,
  onFit,
  onRecenter,
}) {
  if (!hasRoute && !hasPosition) return null;
  return (
    <View pointerEvents="box-none" style={styles.controlsOverlay}>
      <View pointerEvents="box-none" style={styles.mapControls}>
        <TouchableOpacity
          style={[styles.mapControlsToggle, expanded && styles.mapControlsToggleOpen]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Map controls"
          accessibilityHint="Show or hide Fit route and Recenter"
          accessibilityState={{ expanded }}
          onPress={onToggle}
        >
          <Ionicons
            name={expanded ? "close" : "options-outline"}
            size={23}
            color={expanded ? COLORS.cardBg : COLORS.pink}
          />
        </TouchableOpacity>
        {expanded && (
          <View style={styles.mapControlsMenu}>
            {hasRoute && (
              <TouchableOpacity
                style={styles.mapControlAction}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Show entire route"
                onPress={onFit}
              >
                <Ionicons name="expand-outline" size={20} color={COLORS.pink} />
                <Text style={styles.mapControlText}>Fit route</Text>
              </TouchableOpacity>
            )}
            {hasRoute && hasPosition && <View style={styles.mapControlDivider} />}
            {hasPosition && (
              <TouchableOpacity
                style={styles.mapControlAction}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Recenter on your location"
                onPress={onRecenter}
              >
                <Ionicons name="locate-outline" size={20} color={COLORS.pink} />
                <Text style={styles.mapControlText}>Recenter</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

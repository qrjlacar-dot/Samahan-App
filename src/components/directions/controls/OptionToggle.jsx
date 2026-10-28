import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../../../styles/directions.styles";

// Reuse the same two-option layout for ticket types and jeepney classes.
export default function OptionToggle({
  options,
  value,
  onChange,
  accessibilityRole = "button",
  disabled = false,
}) {
  return (
    <View style={styles.toggleContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.toggleButton,
            value === option.id && styles.activeToggleButton,
          ]}
          accessibilityRole={accessibilityRole}
          accessibilityState={{ selected: value === option.id, disabled }}
          disabled={disabled}
          onPress={() => onChange(option.id)}
        >
          <Text
            style={[
              styles.toggleText,
              value === option.id && styles.activeToggleText,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

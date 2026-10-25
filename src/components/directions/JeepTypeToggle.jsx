import { Text, TouchableOpacity, View } from "react-native";

import { styles } from "../../styles/directions.styles";

const OPTIONS = [
  {
    id: "jeep-traditional",
    label: "Traditional",
  },
  {
    id: "jeep-modern",
    label: "Modern",
  },
];

export default function JeepTypeToggle({ value, onChange }) {
  return (
    <View style={styles.toggleContainer}>
      {OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.toggleButton,
            value === option.id && styles.activeToggleButton,
          ]}
          accessibilityRole="button"
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
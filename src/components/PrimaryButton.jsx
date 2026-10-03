import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity } from "react-native";
import { scale } from "../constants/scale";
import { COLORS } from "../constants/theme";
import { styles } from "../styles/common.styles";

export function PrimaryButton({
  title,
  onPress,
  style,
  textStyle,
  iconName,
  iconSize = scale(20),
  disabled = false,
  activeOpacity = 0.8
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, style, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      accessibilityRole="button"
      accessibilityState={{
        disabled
      }}
    >
      {iconName && <Ionicons
        name={iconName}
        size={iconSize}
        color={COLORS.cardBg}
        style={styles.primaryButtonIcon}
      />}
      <Text style={[styles.primaryButtonText, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

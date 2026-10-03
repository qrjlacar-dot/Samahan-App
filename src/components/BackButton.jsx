import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { scale } from "../constants/scale";
import { COLORS } from "../constants/theme";
import { styles } from "../styles/common.styles";

export function BackButton({
  onPress,
  style,
  iconColor = COLORS.textDark,
  accessibilityLabel = "Go back"
}) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[styles.backButton, style]}
      onPress={onPress ?? (() => router.back())}
      hitSlop={4}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons
        name="arrow-back"
        size={scale(22)}
        color={iconColor}
      />
    </TouchableOpacity>
  );
}

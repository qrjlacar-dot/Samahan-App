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
  iconSize = scale(22),
  activeOpacity = 0.7,
  hitSlop = 4,
  useDefaultStyle = true,
  accessibilityLabel = "Go back"
}) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[useDefaultStyle && styles.backButton, style]}
      onPress={onPress ?? (() => router.back())}
      hitSlop={hitSlop}
      activeOpacity={activeOpacity}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons
        name="arrow-back"
        size={iconSize}
        color={iconColor}
      />
    </TouchableOpacity>
  );
}

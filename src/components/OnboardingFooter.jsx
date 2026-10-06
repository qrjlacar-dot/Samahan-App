import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { styles } from "../styles/onboarding.styles";

export function OnboardingFooter({ onSkip, onNext, isLastPage = false }) {
  return (
    <View style={styles.footer}>
      <Pressable
        style={styles.skipButton}
        onPress={onSkip}
        accessibilityRole="button"
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <Pressable
        style={styles.nextButton}
        onPress={onNext}
        accessibilityRole="button"
      >
        <Text style={styles.nextText}>{isLastPage ? "Tara na!" : "Next"}</Text>
        <Ionicons name="arrow-forward" size={21} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

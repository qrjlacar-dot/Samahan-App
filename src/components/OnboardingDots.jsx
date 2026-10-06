import { View } from "react-native";
import { styles } from "../styles/onboarding.styles";

export function OnboardingDots({ activePage }) {
  return (
    <View
      style={styles.dots}
      accessible
      accessibilityLabel={`Page ${activePage} of 3`}
    >
      {[1, 2, 3].map((page) => (
        <View
          key={page}
          style={[styles.dot, page === activePage && styles.activeDot]}
        />
      ))}
    </View>
  );
}

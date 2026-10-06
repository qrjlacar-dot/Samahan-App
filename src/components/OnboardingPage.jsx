import { Image, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../styles/onboarding.styles";
import { BackButton } from "./BackButton";
import { OnboardingDots } from "./OnboardingDots";
import { OnboardingFooter } from "./OnboardingFooter";

export function OnboardingPage({
  activePage,
  image,
  title,
  subtitle,
  onBack,
  onSkip,
  onNext,
}) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9FC" />

      <View style={styles.page}>
        <View style={styles.header}>
          {onBack && (
            <BackButton
              onPress={onBack}
              style={styles.backButton}
              useDefaultStyle={false}
              iconColor="#D9478C"
              iconSize={22}
              activeOpacity={0.7}
              accessibilityLabel={`Go back to page ${activePage - 1}`}
            />
          )}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Image source={image} style={styles.image} resizeMode="contain" />

          <View style={styles.textSection}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </ScrollView>

        <OnboardingDots activePage={activePage} />
        <OnboardingFooter
          onSkip={onSkip}
          onNext={onNext}
          isLastPage={activePage === 3}
        />
      </View>
    </SafeAreaView>
  );
}

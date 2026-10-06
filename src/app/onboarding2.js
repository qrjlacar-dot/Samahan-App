import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Onboarding2Screen() {
  const handleBack = () => {
    router.back();
  };

  const handleSkip = () => {
    router.replace("/(auth)/login");
  };

  const handleNext = () => {
    router.push("/onboarding3");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFF9FC"
      />

      {/* BACK BUTTON */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#D9478C"
          />
        </Pressable>
      </View>

      {/* CENTER IMAGE */}
      <View style={styles.illustration}>
        <Image
          source={require("../../assets/images/onboarding2-illustration.jpg")}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      {/* TEXT */}
      <View style={styles.textSection}>
        <Text style={styles.title}>
          Bawas ligaw, tara galaw!
        </Text>

        <Text style={styles.subtitle}>
          Bus, jeep, train, o lakad?{"\n"}
          Planuhin ang biyahe mula A hanggang B.
        </Text>
      </View>

      {/* DOTS */}
      <View style={styles.dots}>
        <View style={styles.dot} />
        <View style={[styles.dot, styles.activeDot]} />
        <View style={styles.dot} />
      </View>

      {/* BOTTOM BUTTONS */}
      <View style={styles.footer}>
        <Pressable
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>
            Skip
          </Text>
        </Pressable>

        <Pressable
          style={styles.nextButton}
          onPress={handleNext}
        >
          <Text style={styles.nextText}>
            Next
          </Text>

          <Ionicons
            name="arrow-forward"
            size={21}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9FC",
    paddingHorizontal: 24,
  },

  /* =========================
     BACK BUTTON
  ========================= */

  header: {
    height: 65,
    justifyContent: "center",
    alignItems: "flex-start",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 24,
    backgroundColor: "#FCE6F0",
    alignItems: "center",
    justifyContent: "center",
  },

  /* =========================
     IMAGE
  ========================= */

  illustration: {
    flex: 1,
    minHeight: 280,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: 320,
  },

  /* =========================
     TEXT
  ========================= */

  textSection: {
    alignItems: "center",
    marginBottom: 24,
  },

  title: {
    color: "#182334",
    fontSize: 29,
    fontWeight: "800",
    textAlign: "center",
  },

  subtitle: {
    color: "#64606B",
    fontSize: 17,
    marginTop: 10,
    textAlign: "center",
    lineHeight: 24,
  },

  /* =========================
     DOTS
  ========================= */

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 30,
  },

  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#D9D2D8",
  },

  activeDot: {
    backgroundColor: "#D9478C",
  },

  /* =========================
     FOOTER
  ========================= */

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 18,
  },

  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 10,
  },

  skipText: {
    color: "#D9478C",
    fontSize: 17,
    fontWeight: "700",
  },

  nextButton: {
    minWidth: 150,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    backgroundColor: "#D9478C",
  },

  nextText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingScreen() {
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)/login");
    }
  };

  const handleSkip = () => {
    router.replace("/(auth)/login");
  };

  const handleNext = () => {
    router.push("/onboarding2");
};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9FC" />

      

     <View style={styles.illustration}>
  <Image
    source={require("../../assets/images/onboarding-illustration.jpg")}
    style={{ width: "100%", height: 320 }}
    resizeMode="contain"
  />
</View>

      <View style={styles.textSection}>
        <Text style={styles.title}>Tara, samahan kita!</Text>
        <Text style={styles.subtitle}>Bagong ruta? May kasama ka.</Text>
      </View>

      <View style={styles.dots}>
        <View style={[styles.dot, styles.activeDot]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>

        <Pressable style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextText}>Next</Text>
          <Ionicons name="arrow-forward" size={21} color="#FFFFFF" />
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
  backButton: {
    width: 48,
    height: 48,
    marginTop: 10,
    borderRadius: 24,
    backgroundColor: "#FCE6F0",
    alignItems: "center",
    justifyContent: "center",
  },
  illustration: {
    flex: 1,
    minHeight: 280,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mapCircle: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#FCEBF2",
  },
  routeLine: {
    position: "absolute",
    width: 210,
    height: 100,
    borderBottomWidth: 4,
    borderStyle: "dashed",
    borderColor: "#D9478C",
    borderRadius: 60,
    transform: [{ rotate: "-18deg" }],
  },
  pinOne: {
    position: "absolute",
    left: 28,
    bottom: 70,
  },
  pinTwo: {
    position: "absolute",
    right: 25,
    top: 65,
  },
  person: {
    fontSize: 180,
    zIndex: 1,
  },
  phone: {
    position: "absolute",
    right: 26,
    top: 55,
    width: 76,
    height: 130,
    borderWidth: 4,
    borderColor: "#432B39",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "8deg" }],
    zIndex: 2,
  },
  phoneNotch: {
    position: "absolute",
    top: 5,
    width: 25,
    height: 5,
    borderRadius: 4,
    backgroundColor: "#432B39",
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: "#C76DA5",
    alignItems: "center",
    justifyContent: "center",
  },
  logoEyes: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
  },
  smile: {
    width: 22,
    height: 9,
    marginTop: 1,
    borderBottomWidth: 2,
    borderColor: "#FFFFFF",
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
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
  },
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
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import {
    Image,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Onboarding3Screen() {
  const { height } = useWindowDimensions();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/onboarding2");
    }
  };

  const handleFinish = () => {
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9FC" />

      <View style={styles.page}>
        {/* BACK BUTTON */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back to page 2"
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#D9478C"
            />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ILLUSTRATION */}
          <Image
            source={require("../../assets/images/onboarding3-illustration.jpg")}
            style={[
              styles.image,
              { height: Math.min(height * 0.48, 420) },
            ]}
            resizeMode="contain"
          />

          {/* TEXT */}
          <View style={styles.textSection}>
            <Text style={styles.title}>
              Biyahe with peace of mind.
            </Text>

            <Text style={styles.subtitle}>
              I-save ang emergency contacts para madaling mahanap kapag
              kailangan.
            </Text>
          </View>
        </ScrollView>

        {/* PAGE INDICATOR */}
        <View
          style={styles.dots}
          accessible
          accessibilityLabel="Page 3 of 3"
        >
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.activeDot]} />
        </View>

        {/* BOTTOM BUTTONS */}
        <View style={styles.footer}>
          <Pressable
            style={styles.skipButton}
            onPress={handleFinish}
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>

          <Pressable
            style={styles.startButton}
            onPress={handleFinish}
            accessibilityRole="button"
          >
            <Text style={styles.startText}>Tara na!</Text>

            <Ionicons
              name="arrow-forward"
              size={21}
              color="#FFFFFF"
            />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9FC",
  },

  page: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 24,
  },

  header: {
    height: 65,
    justifyContent: "center",
    alignItems: "flex-start",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FCE6F0",
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 24,
  },

  image: {
    width: "100%",
  },

  textSection: {
    alignItems: "center",
    marginTop: 24,
  },

  title: {
    color: "#182334",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },

  subtitle: {
    color: "#64606B",
    fontSize: 17,
    lineHeight: 25,
    marginTop: 10,
    textAlign: "center",
    maxWidth: 340,
  },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingTop: 12,
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
    gap: 16,
    paddingBottom: 18,
  },

  skipButton: {
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 10,
    justifyContent: "center",
  },

  skipText: {
    color: "#D9478C",
    fontSize: 17,
    fontWeight: "700",
  },

  startButton: {
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

  startText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
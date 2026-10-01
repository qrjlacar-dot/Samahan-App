import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scale } from "../../constants/scale";
import { COLORS } from "../../constants/theme";
import { styles } from "../../styles/reset-password.styles";

export default function GoogleConsentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.page}>
      <View style={[styles.navbar, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={scale(22)}
            color={COLORS.textDark}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={localStyles.content}>
        <Image
          source={require("../../../assets/images/logo.png")}
          style={localStyles.logo}
          resizeMode="contain"
        />

        <Text style={localStyles.title}>Continue with Google</Text>

        <Text style={localStyles.subtitle}>
          Take a moment to learn about SAMAHAN before continuing.
        </Text>

        <View style={localStyles.links}>
          <TouchableOpacity
            style={localStyles.linkCard}
            onPress={() => router.push("/(auth)/privacy-policy")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={scale(23)}
              color={COLORS.pink}
            />

            <View style={localStyles.linkText}>
              <Text style={localStyles.linkTitle}>Privacy Policy</Text>
              <Text style={localStyles.linkDescription}>
                See how your information is handled
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={scale(20)}
              color={COLORS.textLight}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={localStyles.linkCard}
            onPress={() => router.push("/(auth)/terms-of-service")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="document-text-outline"
              size={scale(23)}
              color={COLORS.pink}
            />

            <View style={localStyles.linkText}>
              <Text style={localStyles.linkTitle}>Terms of Service</Text>
              <Text style={localStyles.linkDescription}>
                Read the current app guidelines
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={scale(20)}
              color={COLORS.textLight}
            />
          </TouchableOpacity>
        </View>

        <Text style={localStyles.draftNote}>
          These documents are drafts while SAMAHAN is being developed.
        </Text>

        <TouchableOpacity
          style={localStyles.continueButton}
          onPress={() => router.replace("/(tabs)/home")}
          activeOpacity={0.8}
        >
          <Text style={localStyles.continueButtonText}>
            Continue with Google
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: scale(24),
    paddingTop: scale(48),
    paddingBottom: scale(32),
  },
  logo: {
    width: scale(76),
    height: scale(76),
    alignSelf: "center",
  },
  title: {
    marginTop: scale(24),
    fontSize: scale(25),
    fontWeight: "bold",
    color: COLORS.textDark,
    textAlign: "center",
  },
  subtitle: {
    marginTop: scale(10),
    fontSize: scale(15),
    lineHeight: scale(23),
    color: COLORS.textLight,
    textAlign: "center",
  },
  links: {
    marginTop: scale(36),
    gap: scale(14),
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(17),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: "#F0D7E3",
    backgroundColor: "#FFF8FB",
  },
  linkText: {
    flex: 1,
    marginLeft: scale(14),
  },
  linkTitle: {
    fontSize: scale(16),
    fontWeight: "bold",
    color: COLORS.textDark,
  },
  linkDescription: {
    marginTop: scale(3),
    fontSize: scale(12),
    color: COLORS.textLight,
  },
  draftNote: {
    marginTop: scale(25),
    fontSize: scale(12),
    color: COLORS.textLight,
    textAlign: "center",
  },
  continueButton: {
    marginTop: scale(28),
    minHeight: scale(54),
    borderRadius: scale(12),
    backgroundColor: COLORS.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: scale(16),
    fontWeight: "bold",
  },
}); 
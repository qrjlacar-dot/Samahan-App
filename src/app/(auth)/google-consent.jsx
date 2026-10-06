import { IMAGES } from "../../constants/images";
import { styles as localStyles } from "../../styles/google-consent.styles";
import { PrimaryButton, PageLayout } from "../../components/common";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { scale } from "../../constants/scale";
import { COLORS } from "../../constants/theme";

export default function GoogleConsentScreen() {
  const router = useRouter();
  return (
    <PageLayout contentStyle={localStyles.content}>
      <Image
        source={IMAGES.logo}
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
            <Text style={localStyles.linkTitle}>
              Privacy Policy
            </Text>
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
            <Text style={localStyles.linkTitle}>
              Terms of Service
            </Text>
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
      <PrimaryButton
        title="Continue with Google"
        style={localStyles.continueButton}
        textStyle={localStyles.continueButtonText}
        onPress={() => router.replace("/(tabs)/home")}
        activeOpacity={0.8}
      />
    </PageLayout>
  );
}

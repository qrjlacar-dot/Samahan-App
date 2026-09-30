import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scale } from "../../constants/scale";
import { COLORS } from "../../constants/theme";
import { styles as loginStyles } from "../../styles/login.styles";
import { styles } from "../../styles/reset-password.styles";

export default function TermsOfServiceScreen() {
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

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: scale(24),
          paddingTop: scale(48),
          paddingBottom: scale(24),
        }}
      >
        <View
          style={[
            loginStyles.logoRow,
            {
              position: "relative",
              top: undefined,
              right: undefined,
              bottom: undefined,
              left: undefined,
              transform: undefined,
              alignSelf: "center",
              marginBottom: scale(28),
            },
          ]}
        >
          <Image
            source={require("../../../assets/images/logo.png")}
            style={[
              loginStyles.logoIcon,
              { width: scale(56), height: scale(56) },
            ]}
            resizeMode="contain"
          />
          <Image
            source={require("../../../assets/images/wordmark.png")}
            style={[
              loginStyles.wordmark,
              { width: scale(145), height: scale(56) },
            ]}
            resizeMode="contain"
          />
        </View>

        <Text
          style={{
            fontSize: scale(24),
            fontWeight: "bold",
            color: COLORS.textDark,
          }}
        >
          Terms of Service
        </Text>

        <Text
          style={{
            alignSelf: "flex-start",
            marginTop: scale(12),
            paddingHorizontal: scale(10),
            paddingVertical: scale(5),
            borderRadius: scale(8),
            backgroundColor: "#FCE8F2",
            color: COLORS.pink,
            fontWeight: "bold",
          }}
        >
          DRAFT
        </Text>

        <Text
          style={{
            marginTop: scale(20),
            fontSize: scale(15),
            lineHeight: scale(24),
            color: COLORS.textDark,
            textAlign: "justify",
          }}
        >
          SAMAHAN is currently a prototype intended to help users navigate
          around Cubao.
          {"\n\n"}
          Maps, location access, emergency contacts, favorite routes, and trip
          notifications are still being developed. They should not be relied on
          until they are available and tested.
          {"\n\n"}
          We will update these terms to explain how those features work before
          they are made available.
        </Text>
      </ScrollView>
    </View>
  );
}
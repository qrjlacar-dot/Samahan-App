import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../constants/theme";

// One visible policy entry point reused before sign-in and inside Profile.
export function LegalLinks({ disabled = false }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      {[
        ["Privacy Policy", "/(auth)/privacy-policy"],
        ["Terms of Service", "/(auth)/terms-of-service"],
      ].map(([label, pathname]) => (
        <TouchableOpacity
          key={pathname}
          accessibilityRole="link"
          accessibilityLabel={label}
          disabled={disabled}
          onPress={() => router.push(pathname)}
          style={styles.link}
        >
          <Text style={styles.text}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: COLORS.pageBg,
  },
  link: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  text: {
    color: COLORS.textDark,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});

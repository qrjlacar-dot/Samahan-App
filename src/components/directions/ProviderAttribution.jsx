import { Linking, StyleSheet, Text, View } from "react-native";

export default function ProviderAttribution({ style }) {
  const openLink = (url) => {
    Linking.openURL(url).catch(() => {});
  };
  return (
    <View style={[styles.container, style]}>
      <Text
        style={styles.link}
        accessibilityRole="link"
        onPress={() => openLink("https://www.geoapify.com/")}
      >
        Powered by Geoapify
      </Text>
      <Text
        style={styles.link}
        accessibilityRole="link"
        onPress={() => openLink("https://www.openstreetmap.org/copyright")}
      >
        © OpenStreetMap contributors
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "flex-end", paddingVertical: 6 },
  link: {
    fontSize: 10,
    lineHeight: 16,
    color: "#654255",
    textDecorationLine: "underline",
  },
});

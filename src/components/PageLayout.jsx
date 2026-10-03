import { ScrollView, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { scale } from "../constants/scale";
import { styles } from "../styles/page.styles";
import { BackButton } from "./BackButton";

// Owns only navigation and outer spacing. Each page keeps its own design.
export function PageLayout({
  children,
  onBack,
  contentStyle,
  keyboardShouldPersistTaps = "handled",
}) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={styles.page}
      edges={["left", "right", "bottom"]}
    >
      <View style={[styles.header, { paddingTop: insets.top + scale(8) }]}>
        <BackButton onPress={onBack} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      >
        <View style={[styles.body, contentStyle]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

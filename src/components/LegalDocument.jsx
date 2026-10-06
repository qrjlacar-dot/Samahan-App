import { Image, Text, View } from "react-native";
import { IMAGES } from "../constants/images";
import { styles } from "../styles/legal-document.styles";
import { PageLayout } from "./PageLayout";

export function LegalDocument({ title, children }) {
  return (
    <PageLayout contentStyle={styles.content}>
      <View style={styles.logoRow}>
        <Image source={IMAGES.logo} style={styles.logoIcon} resizeMode="contain" />
        <Image source={IMAGES.wordmark} style={styles.wordmark} resizeMode="contain" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.draftBadge}>DRAFT</Text>
      <Text style={styles.body}>{children}</Text>
    </PageLayout>
  );
}

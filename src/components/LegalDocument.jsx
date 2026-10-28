import { Image, Text, View } from "react-native";
import { IMAGES } from "../constants/images";
import { styles } from "../styles/legal-document.styles";
import { LegalContactList } from "./LegalContactList";
import { PageLayout } from "./PageLayout";

export function LegalDocument({ title, updatedAt, sections = [], children }) {
  return (
    <PageLayout contentStyle={styles.content}>
      <View style={styles.documentHeader}>
        <View style={styles.logoRow}>
          <Image
            source={IMAGES.logo}
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <Image
            source={IMAGES.wordmark}
            style={styles.wordmark}
            resizeMode="contain"
          />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {!!updatedAt && (
          <Text style={styles.updatedAt}>Last updated: {updatedAt}</Text>
        )}
      </View>
      {sections.map((section, index) => (
        <View key={section.title} style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {index + 1}. {section.title}
          </Text>
          {section.paragraphs.map((paragraph, paragraphIndex) => (
            <Text key={paragraphIndex} style={styles.body}>
              {paragraph}
            </Text>
          ))}
          {section.showContacts && <LegalContactList />}
        </View>
      ))}
      {!!children && <Text style={styles.body}>{children}</Text>}
    </PageLayout>
  );
}

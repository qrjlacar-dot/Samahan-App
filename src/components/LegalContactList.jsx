import { Alert, Linking, Text, TouchableOpacity, View } from "react-native";
import { LEGAL_CONTACT_EMAILS } from "../data/legalDocuments";
import { styles } from "../styles/legal-document.styles";

export function LegalContactList() {
  const openEmail = async (email) => {
    try {
      await Linking.openURL(`mailto:${email}`);
    } catch {
      Alert.alert(
        "Unable to open email",
        `You can contact ${email} using your email app.`,
      );
    }
  };
  return (
    <View style={styles.contacts}>
      {LEGAL_CONTACT_EMAILS.map((email) => (
        <TouchableOpacity
          key={email}
          accessibilityRole="link"
          accessibilityLabel={email}
          accessibilityHint="Open your email app"
          style={styles.contactLink}
          onPress={() => openEmail(email)}
        >
          <Text selectable style={styles.contactText}>
            {email}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

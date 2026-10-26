import { Linking, Text, View } from "react-native";
import { useFareQuote } from "../../hooks/useFareQuote";
import { styles } from "../../styles/walking-navigation.styles";

export default function FareSummary({ route, ticketType }) {
  const result = useFareQuote(route, ticketType);
  // Train fares are displayed beside the selected train ride in Trip Details.
  // The complete fare matrix stays in src/data/trainFares.js for offline use.
  if (!route || route.preferredMode === "walk" || route.preferredMode === "train") return null;
  const quote = result?.quote;
  return (
    <View style={styles.fareSummary}>
      <Text style={styles.fareTitle}>
        {ticketType === "discounted" ? "Discounted fare estimate" : "Regular fare estimate"}
      </Text>
      <Text style={styles.instruction}>
        {!result
          ? "Checking fare…"
          : result.error ||
            (quote.complete ? `₱${quote.selectedTotal.toFixed(2)}` : "Fare not fully verified")}
      </Text>
      {quote?.items
        .filter((item) => route.steps.find((step) => step.id === item.stepId)?.mode !== "walk")
        .map((item) => (
          <View key={item.stepId} style={styles.fareItem}>
            {item.sourceUrl && (
              <Text
                accessibilityRole="link"
                style={styles.fareSource}
                onPress={() => Linking.openURL(item.sourceUrl).catch(() => {})}
              >
                Fare source
              </Text>
            )}
          </View>
        ))}
      <Text style={styles.label}>
        Confirm the fare with the operator before paying.
      </Text>
    </View>
  );
}

import { Linking, Text, View } from "react-native";
import { useFareQuote } from "../../hooks/useFareQuote";
import { styles } from "../../styles/walking-navigation.styles";

export default function FareSummary({ route, ticketType }) {
  const result = useFareQuote(route, ticketType);
  if (!route || route.preferredMode === "walk") return null;
  const quote = result?.quote;
  return (
    <View style={styles.fareSummary}>
      <Text style={styles.fareTitle}>{route.preferredMode === "bus" ? `Estimated bus fare · ${ticketType === "discounted" ? "Discounted" : "Regular"}` : ticketType === "discounted" ? "Discounted fare estimate" : "Regular fare estimate"}</Text>
      <Text style={styles.instruction}>
        {!result ? "Checking fare…" : result.error || (quote.complete ? `₱${quote.selectedTotal.toFixed(2)}` : "Fare not fully verified")}
      </Text>
      {quote && !quote.complete && <Text style={styles.nextInstruction}>A total will appear when every ride has a verified fare for this ticket type.</Text>}
      {quote?.items.filter((item) => route.steps.find((step) => step.id === item.stepId)?.mode !== "walk").map((item) => (
        <View key={item.stepId} style={styles.fareItem}>
          <Text style={styles.nextInstruction}>{item.note}</Text>
          {item.sourceUrl && <Text accessibilityRole="link" style={styles.fareSource} onPress={() => Linking.openURL(item.sourceUrl).catch(() => {})}>Fare source</Text>}
        </View>
      ))}
      <Text style={styles.label}>{route.preferredMode === "bus" ? "Confirm the current fare and bus type with the conductor before boarding." : "Confirm the current fare with the operator before travelling."}</Text>
    </View>
  );
}


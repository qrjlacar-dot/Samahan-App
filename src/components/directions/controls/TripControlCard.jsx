import { Text, View } from "react-native";
import { styles } from "../../../styles/directions.styles";
import { styles as navigationStyles } from "../../../styles/walking-navigation.styles";

// Keep every transport control card's title, description and spacing consistent.
export default function TripControlCard({
  title,
  description,
  announceDescription = false,
  children,
}) {
  return (
    <View style={[styles.tripCard, navigationStyles.tripControlsCard]}>
      <Text style={[styles.tripTitle, navigationStyles.tripControlsTitle]}>{title}</Text>
      <Text
        style={[styles.searchHint, navigationStyles.tripControlsDescription]}
        accessibilityLiveRegion={announceDescription ? "polite" : undefined}
      >
        {description}
      </Text>
      {children}
    </View>
  );
}

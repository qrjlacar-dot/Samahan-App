import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../../styles/directions.styles";
import { styles as navigationStyles } from "../../styles/walking-navigation.styles";

export default function TrainNavigationControls({ trip, onStart, onEnd }) {
  const button = (title, action, extraStyle) => (
    <TouchableOpacity
      key={title}
      style={[styles.findRouteButton, navigationStyles.tripControlButton, extraStyle]}
      accessibilityRole="button"
      onPress={action}
    >
      <Text style={styles.findRouteText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.tripCard, navigationStyles.tripControlsCard]}>
      <Text style={[styles.tripTitle, navigationStyles.tripControlsTitle]}>
        {trip.state === "active" ? "Train trip active" :
          trip.state === "off-route" ? "Check your route" :
          trip.state === "arrived" ? "You have arrived" : "Ready to travel?"}
      </Text>
      <Text style={[styles.searchHint, navigationStyles.tripControlsDescription]} accessibilityLiveRegion="polite">
        {trip.message || "The station guide works offline. Start navigation only when near your origin."}
      </Text>
      {trip.state === "idle" && (trip.busy
        ? <ActivityIndicator color="#C76C9B" />
        : button("Start trip", onStart))}
      {trip.state === "active" && (
        <>
          {button("Next step (GPS unavailable)", trip.advance)}
          {button("End trip", onEnd, navigationStyles.endTripButton)}
        </>
      )}
      {trip.state === "off-route" && (
        <>
          {button("Recalculate from current location", trip.reroute)}
          {button("Next step (manual)", trip.advance)}
          {button("End trip", onEnd, navigationStyles.endTripButton)}
        </>
      )}
      {trip.state === "arrived" && button("End trip", onEnd)}
    </View>
  );
}

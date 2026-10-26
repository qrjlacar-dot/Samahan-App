import { ActivityIndicator, Text } from "react-native";
import { styles } from "../../../styles/directions.styles";
import { styles as navigationStyles } from "../../../styles/walking-navigation.styles";
import TripActionButton from "./TripActionButton";
import TripControlCard from "./TripControlCard";

// Walking and bus trips share controls, with bus-specific boarding instructions.
function controlTitle(trip, mode) {
  switch (trip.state) {
    case "arrived":
      return "You have arrived";
    case "active":
      return "Trip active";
    case "paused":
      return "Trip paused";
    case "rerouting":
      return "Updating walking route";
    default:
      return mode === "bus" ? "Ready for your bus trip?" : "Ready to walk?";
  }
}

function controlDescription(trip, mode) {
  switch (trip.state) {
    case "arrived":
      return "Your trip is complete.";
    case "active":
      return trip.following
        ? "The map is following your location and phone direction."
        : "Open Map controls, then tap Recenter to follow your location again.";
    case "paused":
      return mode === "bus"
        ? "Check your location and bus route, then resume. End this trip to choose a different route."
        : "Check your location, then resume or update the route.";
    case "rerouting":
      return "Finding a new walking route from your current location.";
    default:
      return "Start near the selected starting point. Keep SAMAHAN open during your trip.";
  }
}

export default function WalkingBusTripControls({
  mode,
  trip,
  returnNotice,
  onStart,
  onEnd,
  onPlanAnother,
}) {
  return (
    <TripControlCard title={controlTitle(trip, mode)} description={controlDescription(trip, mode)}>
      {!!returnNotice && trip.state !== "arrived" && (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.searchHint, navigationStyles.returnNotice]}
        >
          {returnNotice}
        </Text>
      )}

      {mode === "bus" && trip.open && (
        <Text style={[styles.searchHint, navigationStyles.tripMessage]}>{trip.instruction}</Text>
      )}
      {trip.actionLabel && (
        <TripActionButton
          title={trip.busy ? "Checking location…" : trip.actionLabel}
          style={navigationStyles.tripMessage}
          disabled={trip.busy}
          onPress={trip.confirmStage}
        />
      )}
      {!!trip.message && (
        <Text
          style={[styles.searchHint, navigationStyles.tripMessage]}
          accessibilityLiveRegion="polite"
        >
          {trip.message}
        </Text>
      )}
      {trip.state === "rerouting" && <ActivityIndicator color="#C76C9B" />}

      {["idle", "paused"].includes(trip.state) && (
        <TripActionButton
          title={trip.state === "paused" ? "Resume trip" : "Start trip"}
          style={[navigationStyles.tripControlButton, trip.busy && styles.disabledButton]}
          disabled={trip.busy}
          loading={trip.busy}
          onPress={onStart}
        />
      )}
      {trip.state === "paused" && mode === "walk" && (
        <TripActionButton
          title="Update route from my location"
          style={[navigationStyles.tripControlButton, navigationStyles.tripControlButtonSpacing]}
          disabled={trip.busy}
          onPress={() => trip.reroute()}
        />
      )}
      {trip.open && (
        <TripActionButton
          title="End trip"
          style={[
            navigationStyles.tripControlButton,
            navigationStyles.endTripButton,
            trip.state === "paused" && navigationStyles.tripControlButtonSpacing,
          ]}
          textStyle={navigationStyles.endTripText}
          onPress={onEnd}
        />
      )}
      {trip.state === "arrived" && (
        <TripActionButton
          title="Plan another trip"
          style={navigationStyles.tripControlButton}
          onPress={onPlanAnother}
        />
      )}
    </TripControlCard>
  );
}

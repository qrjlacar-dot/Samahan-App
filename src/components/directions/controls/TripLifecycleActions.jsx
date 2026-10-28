import { ActivityIndicator } from "react-native";
import { styles } from "../../../styles/directions.styles";
import { styles as navigationStyles } from "../../../styles/walking-navigation.styles";
import TripActionButton from "./TripActionButton";

export function TripStageAction({ trip }) {
  if (!trip.actionLabel) return null;
  return (
    <TripActionButton
      title={trip.busy ? "Checking location…" : trip.actionLabel}
      style={navigationStyles.tripMessage}
      disabled={trip.busy}
      onPress={trip.confirmStage}
    />
  );
}

export default function TripLifecycleActions({
  trip,
  onStart,
  onEnd,
  onPlanAnother,
  onReroute,
  rerouteTitle = "Update route from my location",
}) {
  return (
    <>
      {trip.state === "rerouting" && <ActivityIndicator color="#C76C9B" />}
      {["idle", "paused"].includes(trip.state) && (
        <TripActionButton
          title={trip.state === "paused" ? "Resume trip" : "Start trip"}
          style={[
            navigationStyles.tripControlButton,
            trip.busy && styles.disabledButton,
          ]}
          disabled={trip.busy}
          loading={trip.busy}
          onPress={onStart}
        />
      )}
      {onReroute && ["paused", "off-route"].includes(trip.state) && (
        <TripActionButton
          title={rerouteTitle}
          style={[
            navigationStyles.tripControlButton,
            navigationStyles.tripControlButtonSpacing,
          ]}
          disabled={trip.busy}
          onPress={onReroute}
        />
      )}
      {trip.manualAvailable && (
        <TripActionButton
          title="Next step (GPS unavailable)"
          style={[
            navigationStyles.tripControlButton,
            navigationStyles.tripControlButtonSpacing,
          ]}
          disabled={trip.busy}
          onPress={trip.advance}
        />
      )}
      {trip.open && (
        <TripActionButton
          title="End trip"
          style={[
            navigationStyles.tripControlButton,
            navigationStyles.endTripButton,
            navigationStyles.tripControlButtonSpacing,
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
    </>
  );
}

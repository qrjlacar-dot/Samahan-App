import { ActivityIndicator } from "react-native";
import { styles as navigationStyles } from "../../../styles/walking-navigation.styles";
import TripActionButton from "./TripActionButton";
import TripControlCard from "./TripControlCard";

// Train and jeepney guidance share manual progression and end-trip controls.
export default function GuidedTripControls({ trip, onStart, onEnd, mode = "train" }) {
  const button = (title, action, extraStyle) => (
    <TripActionButton
      key={title}
      title={title}
      style={[navigationStyles.tripControlButton, extraStyle]}
      onPress={action}
    />
  );

  const title =
    trip.state === "active"
      ? mode === "jeep"
        ? "Jeepney trip active"
        : "Train trip active"
      : trip.state === "off-route"
        ? "Check your route"
        : trip.state === "arrived"
          ? "You have arrived"
          : "Ready to travel?";
  const description =
    trip.message ||
    (mode === "jeep"
      ? "Confirm the jeepney placard and stopping point before travelling. Start near your selected origin."
      : "The station guide works offline. Start navigation only when near your origin.");

  return (
    <TripControlCard title={title} description={description} announceDescription>
      {trip.state === "idle" &&
        (trip.busy ? <ActivityIndicator color="#C76C9B" /> : button("Start trip", onStart))}
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
    </TripControlCard>
  );
}

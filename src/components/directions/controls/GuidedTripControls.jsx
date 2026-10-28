import TripControlCard from "./TripControlCard";
import TripLifecycleActions, { TripStageAction } from "./TripLifecycleActions";

export default function GuidedTripControls({
  trip,
  onStart,
  onEnd,
  onPlanAnother,
  mode = "train",
}) {
  const title =
    trip.state === "active"
      ? mode === "jeep"
        ? "Jeepney trip active"
        : "Train trip active"
      : trip.state === "paused"
        ? "Trip paused"
        : trip.state === "off-route"
          ? "Check your route"
          : trip.state === "rerouting"
            ? "Updating route"
            : trip.state === "arrived"
              ? "You have arrived"
              : "Ready to travel?";
  const description =
    trip.message ||
    (trip.state === "arrived"
      ? "Your trip is complete."
      : trip.state === "active"
        ? trip.following
          ? "The map is following your location and phone direction."
          : "Open Map controls, then tap Recenter to follow your location again."
        : mode === "jeep"
          ? "Confirm the jeepney placard and stopping point before travelling. Start near your selected origin."
          : "The station guide works offline. Start navigation only when near your origin.");
  return (
    <TripControlCard
      title={title}
      description={description}
      announceDescription
    >
      <TripStageAction trip={trip} />
      <TripLifecycleActions
        trip={trip}
        onStart={onStart}
        onEnd={onEnd}
        onPlanAnother={onPlanAnother}
        onReroute={trip.canReroute ? () => trip.reroute() : undefined}
        rerouteTitle="Recalculate from current location"
      />
    </TripControlCard>
  );
}

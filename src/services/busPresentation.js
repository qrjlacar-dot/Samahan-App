export function cleanStopName(name = "") {
  return name.replace(/^(?:Boarding area|Drop-off area) near\s+/i, "");
}

// Every provider walking request ends at its own destination. In a bus
// journey that can be only the boarding area, not the rider's destination.
export function prepareBusWalkSteps(steps, target, phase) {
  return steps.map(step => ({
    ...step,
    instruction: /^(?:you (?:have )?(?:arrived|reached)\b|arriv|your destination|you are at)/i.test(step.instruction?.trim() ?? "")
      ? phase === "access" ? "Continue to the boarding area." : `Continue to ${target}.`
      : step.instruction,
  }));
}

export function busLegs(route) {
  const index = route.steps.findIndex(step => step.mode === "bus");
  if (index < 0) return [];
  const ride = route.steps[index];
  const parts = [
    { id: "access", title: "Walk to boarding", subtitle: cleanStopName(ride.boardingStop), from: 0, to: index },
    { id: "ride", title: `Bus · ${ride.lineName}`, subtitle: `Get off at ${cleanStopName(ride.alightingStop)}`, from: index, to: index + 1 },
    { id: "egress", title: `Walk to ${route.destination.name}`, subtitle: "", from: index + 1, to: route.steps.length },
  ];
  return parts.filter(part => part.from < part.to).map(part => {
    const steps = route.steps.slice(part.from, part.to);
    return { ...part, steps, distanceMeters: steps.reduce((sum, step) => sum + (step.distanceMeters ?? 0), 0) };
  });
}

// Display-only milestone. Keep navigation steps and GPS completion unchanged.
export function busTimelineSteps(route) {
  const steps = route?.steps ?? [];
  if (!steps.length) return [];
  const arrival = {
    id: `${route.id}:arrival`, mode: "walk", instruction: "You have arrived at your destination.",
    distanceMeters: 0, durationSeconds: 0, displayArrival: true,
  };
  const last = steps.at(-1);
  const replaceLast = last.mode === "walk" && last.distanceMeters === 0;
  return [...(replaceLast ? steps.slice(0, -1) : steps), arrival];
}

// These are team-defined road corridors. No operator has confirmed the
// return service, boarding areas, or Ali Mall/Gateway loop relationship.
export function busReturnNotice(route) {
  if (route?.preferredMode !== "bus" ||
      !route.steps?.some(step => step.mode === "bus" && step.direction === "anonas-bound")) return "";
  const destination = route.destination?.name?.trim() || "your destination";
  return `Return route not verified. Confirm that this bus serves ${destination}, and where to board and get off, with the conductor before boarding.`;
}

// Plain-language walking instructions. Match only the maneuver at the start
// so road/place names inside the instruction are preserved.
export function simplifyWalkingInstruction(instruction = "") {
  const text = typeof instruction === "string" ? instruction.trim() : "";
  return text
    .replace(/^bear\s+(left|right)\b/i, (_, side) => `Turn slightly ${side.toLowerCase()}`)
    .replace(/^(?:turn\s+slight|slight)\s+(left|right)\b/i, (_, side) => `Turn slightly ${side.toLowerCase()}`)
    .replace(/^keep\s+(left|right)\b/i, (_, side) => `Keep to the ${side.toLowerCase()}`)
    .replace(/^head\s+/i, "Walk ");
}

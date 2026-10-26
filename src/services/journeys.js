import { TICKET_TYPES, TRAVEL_MODES } from "../constants/commute";

export function isValidJourney(value) {
  const place = (item) =>
    Boolean(
      item &&
        typeof item.id === "string" &&
        item.id.trim() &&
        typeof item.name === "string" &&
        typeof item.address === "string" &&
        ["google", "geoapify", "verified-local", "local-reference", "device"].includes(
          item.source,
        ) &&
        Number.isFinite(item.coordinate?.latitude) &&
        Number.isFinite(item.coordinate?.longitude) &&
        Math.abs(item.coordinate.latitude) <= 90 &&
        Math.abs(item.coordinate.longitude) <= 180,
    );
  return Boolean(
    value &&
      place(value.origin) &&
      place(value.destination) &&
      TRAVEL_MODES.includes(value.preferredMode) &&
      TICKET_TYPES.includes(value.ticketType) &&
      (value.operatorId == null ||
        (value.preferredMode === "jeep" &&
          ["jeep-traditional", "jeep-modern"].includes(value.operatorId))),
  );
}

export function parseJourneyParam(raw) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || value.length > 20000) return null;
  try {
    const journey = JSON.parse(value);
    if (!isValidJourney(journey)) return null;
    const copy = (item) => ({
      id: item.id,
      name: item.name,
      address: item.address,
      coordinate: { latitude: item.coordinate.latitude, longitude: item.coordinate.longitude },
      source: item.source,
    });
    return {
      origin: copy(journey.origin),
      destination: copy(journey.destination),
      preferredMode: journey.preferredMode,
      ticketType: journey.ticketType,
      ...(journey.preferredMode === "jeep"
        ? { operatorId: journey.operatorId || "jeep-traditional" }
        : {}),
    };
  } catch {
    return null;
  }
}

import { TICKET_TYPES } from "../constants/commute";
import { FARE_RULES } from "../data/fareRules";

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function normalizeName(name) {
  if (typeof name !== "string") return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word && !["lrt", "2", "line", "station"].includes(word))
    .join(" ");
}

function stationId(rule, name) {
  const normalized = normalizeName(name);
  if (!normalized || !rule.stationAliases) return null;
  for (const [id, aliases] of Object.entries(rule.stationAliases)) {
    if (aliases.some((alias) => normalized.includes(alias))) return id;
  }
  return null;
}

function stationPairKey(rule, step) {
  const from = stationId(rule, step.boardingStop);
  const to = stationId(rule, step.alightingStop);
  if (!from || !to || from === to) return null;
  return [from, to].sort().join("|");
}

function quoteStep(step, index) {
  const item = {
    stepId: typeof step?.id === "string" ? step.id : `step-${index}`,
    regular: null,
    discounted: null,
    sourceUrl: null,
    verifiedAt: null,
    note: "",
  };

  if (step?.mode === "walk") {
    return { ...item, regular: 0, discounted: 0, note: "Walking has no fare." };
  }

  const rule = FARE_RULES[step?.operatorId];
  if (!rule || rule.mode !== step.mode) {
    return {
      ...item,
      note: `Fare is not verified for this ${step?.mode ?? "transport"} service.`,
    };
  }

  const base = {
    ...item,
    sourceUrl: rule.sourceUrl,
    verifiedAt: rule.verifiedAt,
  };

  // Station-to-station fares (trains).
  if (rule.stationFares) {
    const key = stationPairKey(rule, step);
    const fare = key ? rule.stationFares[key] : undefined;
    if (!fare) {
      return {
        ...base,
        note: `${rule.label}: the fare for this station pair is not verified.`,
      };
    }
    return {
      ...base,
      regular: fare.regular,
      discounted: fare.discounted,
      note: fare.note,
    };
  }

  if (rule.regular === null && rule.discounted === null) {
    return { ...base, note: rule.note };
  }

  if (rule.firstKmMeters != null && step.withinMinimumFare !== true) {
    const distance = step.distanceMeters;
    if (!Number.isFinite(distance)) {
      return { ...base, note: `${rule.label}: distance unknown, so the fare is unknown.` };
    }
    if (distance > rule.firstKmMeters) {
      return {
        ...base,
        note: `${rule.label}: this ride is beyond the minimum-fare distance, so the fare is not calculated yet.`,
      };
    }
  }

  const notes = [rule.note];
  if (rule.discounted === null) notes.push("Discounted fare is not verified yet.");
  return {
    ...base,
    regular: rule.regular,
    discounted: rule.discounted,
    note: notes.join(" "),
  };
}

function total(items, field) {
  if (items.length === 0) return null;
  if (items.some((item) => item[field] === null)) return null; // partial is not a total
  return roundMoney(items.reduce((sum, item) => sum + item[field], 0));
}

/**
 * `complete` describes the selected ticket type: true only when every step
 * has a known fare for it.
 *
 * @param {import('../types/commute').CommuteRoute} route
 * @param {import('../types/commute').TicketType} ticketType
 * @returns {Promise<import('../types/commute').FareQuote>}
 */
export async function quoteFare(route, ticketType) {
  if (!TICKET_TYPES.includes(ticketType)) {
    throw new Error("Unsupported ticket type.");
  }
  if (!route || !Array.isArray(route.steps)) {
    throw new Error("A route with steps is required to quote a fare.");
  }

  const items = route.steps.map(quoteStep);
  const regularTotal = total(items, "regular");
  const discountedTotal = total(items, "discounted");
  const selectedTotal = ticketType === "discounted" ? discountedTotal : regularTotal;
  const complete = selectedTotal !== null;

  let note;
  if (items.length === 0) {
    note = "This route has no steps, so no fare can be shown.";
  } else if (complete) {
    note = "Fare is based on verified rules.";
  } else {
    note = "Fare is incomplete or not verified. No total is shown.";
  }

  return {
    currency: "PHP",
    ticketType,
    regularTotal,
    discountedTotal,
    selectedTotal,
    complete,
    items,
    note,
  };
}

import { TRAIN_PLACES } from "./trainNetwork";
import { FARE_RULES } from "./fareRules";

// Official LRTA 2026 fare matrix, Annex A (single-journey ticket).
// IMPORTANT: The March 23, 2026 across-the-board 50% discount already
// applies to regular passengers. Annex B shows the same PHP 8 fare for
// eligible students, seniors and PWDs: do NOT deduct an extra 20% or 50%.
// Stored-value (beep) fare for this pair is PHP 7.50, not the SJT fare.
export const TRAIN_FARE_SOURCES = Object.freeze({
  lrt2: {
    url: FARE_RULES["train-lrt2"].sourceUrl,
    effectiveDate: "2026-03-23",
    checkedAt: FARE_RULES["train-lrt2"].verifiedAt,
    ticket: "Single Journey Ticket",
    note: "Annex A and B, Anonas to Cubao. Regular and concessionary SJT are both PHP 8 under the 2026 blanket discount. Beep SVC: PHP 7.50.",
  },
  mrt3: {
    url: "https://www.dotrmrt3.gov.ph/dotrmrt3-citizen-charter-handbook-2026-1st-edition.pdf",
    checkedAt: "2026-10-24",
    note: "MRT-3 has only one station within this boundary. No paid MRT-3 ride is possible without leaving it; MRT-3 fares are therefore not charged here.",
  },
});

// Single source of truth for actual paid journeys within this boundary.
export const TRAIN_RIDE_FARES = Object.freeze({
  "lrt2-anonas|lrt2-cubao": Object.freeze({
    ...FARE_RULES["train-lrt2"].stationFares["anonas|araneta-center-cubao"],
    storedValue: 7.5,
    operatorId: "train-lrt2",
    sourceUrl: TRAIN_FARE_SOURCES.lrt2.url,
    effectiveDate: TRAIN_FARE_SOURCES.lrt2.effectiveDate,
    note: TRAIN_FARE_SOURCES.lrt2.note,
  }),
});

export const farePairKey = (a, b) => [a, b].sort().join("|");

// All four origins and destinations, including the three railway stations.
// Walking-only journeys have no fare; reaching/leaving Anonas uses LRT-2.
export const TRAIN_FARE_TABLE = Object.freeze(
  Object.fromEntries(TRAIN_PLACES.map((from) => [
    from.id,
    Object.freeze(Object.fromEntries(TRAIN_PLACES.map((to) => {
      const takesLrt = from.id !== to.id &&
        (from.id === "lrt2-anonas" || to.id === "lrt2-anonas");
      return [to.id, takesLrt
        ? Object.freeze({ ...TRAIN_RIDE_FARES["lrt2-anonas|lrt2-cubao"] })
        : Object.freeze({ regular: 0, discounted: 0, operatorId: null,
          note: from.id === to.id ? "Same place" : "Walking transfer; no train fare" })];
    }))),
  ])),
);

export function trainTripFare(originId, destinationId) {
  return TRAIN_FARE_TABLE[originId]?.[destinationId] ?? null;
}

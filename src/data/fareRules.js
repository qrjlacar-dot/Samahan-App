// Verified fare rules. Amounts are PHP. null means "not verified yet".
// Never fill a null with a guess: add the amount only with a source and date.
//
// firstKmMeters: distance covered by the minimum fare. Beyond it, the
// per-km charge applies and the app does not yet compute it (rounding rule
// not verified), so the fare stays unknown.
//
// Sources below are news reports of the LTFRB fare matrices effective
// Sept 28, 2026. Confirm against the official LTFRB matrix when possible.

export const FARE_RULES = Object.freeze({
  "jeep-traditional": {
    mode: "jeep",
    label: "Traditional jeepney",
    regular: 14,
    discounted: 12, // commonly charged; official 20% fare is 11.25 (11.20 rounded to 0.25)
    firstKmMeters: 4000,
    perKmAfter: 2,
    sourceUrl:
      "https://baguiocityguide.com/new-jeepney-taxi-bus-and-tnvs-fares-start-september-28/",
    verifiedAt: "2026-10-23",
    note: "Minimum fare for the first 4 km. Discounted fare is the whole-peso amount commonly charged; the official 20% fare is 11.25.",
  },
  "jeep-modern": {
    mode: "jeep",
    label: "Modern jeepney",
    regular: 17,
    discounted: 14, // commonly charged; official 20% fare is 13.50 (13.60 rounded to 0.25)
    firstKmMeters: 4000,
    perKmAfter: 2.4,
    sourceUrl:
      "https://baguiocityguide.com/new-jeepney-taxi-bus-and-tnvs-fares-start-september-28/",
    verifiedAt: "2026-10-23",
    note: "Minimum fare for the first 4 km. Discounted fare is the whole-peso amount commonly charged; the official 20% fare is 13.50.",
  },
  "bus-city-ordinary": {
    mode: "bus",
    label: "Ordinary city bus",
    regular: 15,
    discounted: null,
    firstKmMeters: 5000,
    perKmAfter: 2.49,
    sourceUrl:
      "https://newsinfo.inquirer.net/2311834/list-ltfrb-releases-approved-fare-hikes-for-buses-tnvs",
    verifiedAt: "2026-10-18",
    note: "Minimum fare for the first 5 km.",
  },
  "bus-city-aircon": {
    mode: "bus",
    label: "Air-conditioned city bus",
    regular: 18,
    discounted: null,
    firstKmMeters: 5000,
    perKmAfter: 2.98,
    sourceUrl:
      "https://newsinfo.inquirer.net/2311834/list-ltfrb-releases-approved-fare-hikes-for-buses-tnvs",
    verifiedAt: "2026-10-18",
    note: "Minimum fare for the first 5 km.",
  },
  "train-lrt2": {
    mode: "train",
    label: "LRT-2",
    regular: null,
    discounted: null,
    firstKmMeters: null,
    perKmAfter: null,
    // Station names a route step may use. Only names that clearly mean the
    // LRT-2 station are listed, so MRT-3 Cubao is not matched by mistake.
    stationAliases: {
      anonas: ["anonas"],
      "araneta-center-cubao": ["araneta center cubao", "araneta cubao"],
    },
    // Keys are the two station ids, sorted and joined with "|". Fares are
    // the same in both directions.
    stationFares: {
      "anonas|araneta-center-cubao": {
        regular: 8,
        discounted: 8,
        note: "LRTA 2026 Annex A/B single-journey fare, effective March 23, 2026. The 50% blanket discount already applies to everyone; no additional 20% discount. Beep stored-value fare: PHP 7.50.",
      },
    },
    sourceUrl: "https://www.lrta.gov.ph/wp-content/uploads/2026/03/Citizens-Charter-Handbook-2026-2nd-Edition.pdf",
    verifiedAt: "2026-10-24",
    note: "Only listed station pairs have a fare. Others are not verified.",
  },
});

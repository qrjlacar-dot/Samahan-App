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
    discounted: null, // 20% discount confirmed; exact amount/rounding not verified
    firstKmMeters: 4000,
    perKmAfter: 2,
    sourceUrl:
      "https://www.sunstar.com.ph/manila/ltfrb-sets-new-puv-rates-effective-sept-28",
    verifiedAt: "2026-10-18",
    note: "Minimum fare for the first 4 km.",
  },
  "jeep-modern": {
    mode: "jeep",
    label: "Modern jeepney",
    regular: 17,
    discounted: null,
    firstKmMeters: 4000,
    perKmAfter: 2.4,
    sourceUrl:
      "https://www.sunstar.com.ph/manila/ltfrb-sets-new-puv-rates-effective-sept-28",
    verifiedAt: "2026-10-18",
    note: "Minimum fare for the first 4 km.",
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
        discounted: 8, // riders already entitled to 50% get no extra cut
        note: "Single journey ticket with the 50% LRT-2 discount in effect since March 23, 2026 (Beep card: about 7.50). The standard fare is 15 if the discount ends. Seen at the station on 2026-10-19.",
      },
    },
    sourceUrl: "https://www.lrta.gov.ph/tickets-and-fares/",
    verifiedAt: "2026-10-19",
    note: "Only listed station pairs have a fare. Others are not verified.",
  },
});
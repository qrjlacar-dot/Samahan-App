const STOP_SOURCE = "https://wikiroutes.info/en/manila?routes=94008";

const stop = (id, name, latitude, longitude, listingId) => ({
  id, name, coordinate: { latitude, longitude },
  address: "Aurora Boulevard, Quezon City",
  source: "verified-local",
  verified: false,
  sourceUrl: `https://wikiroutes.info/en/stops/${listingId}`,
});

// Published westbound listings, not surveyed loading bays. Do not reverse these
// pins: the opposite direction has different stops. See docs/bus-route-research.md.
export const BUS_LINES = Object.freeze([
  {
    id: "bus-3-aurora-cubao-preview",
    name: "Route 3: Antipolo–Quiapo via Cubao",
    mode: "bus",
    operatorId: "bus-city-aircon",
    headsign: "Cubao / Quiapo",
    bidirectional: false,
    verified: false,
    checkedAt: "2026-10-24",
    sourceUrl: STOP_SOURCE,
    sourceUrls: [
      "https://www.glinerbuses.com/",
      STOP_SOURCE,
      "https://explore.sakay.ph/routes/DOTR%3AR_SAKAY_PUB_2154",
    ],
    maxAccessMeters: 500,
    maxEgressMeters: 900,
    stops: [
      stop("bus3-anonas-wb", "Anonas bus stop (toward Cubao)", 14.6280333, 121.0639384, 1730353),
      stop("bus3-20th-wb", "Aurora / 20th Avenue bus stop", 14.6262522, 121.0596598, 1730355),
      stop("bus3-miami-wb", "Aurora / Miami Street bus stop", 14.625349, 121.0578814, 1730357),
      stop("bus3-cubao-wb", "Araneta Center–Cubao bus stop (Aurora)", 14.6226962, 121.0523654, 1730359),
    ],
    // Clipped from Sakay trip T_SAKAY_4417. Road shape is indicative;
    // stop pins above come from separate, older crowdsourced listings.
    path: [
      [14.62795, 121.06399],
      [14.62792, 121.06383],
      [14.62783, 121.06326],
      [14.62782, 121.06322],
      [14.62776, 121.06297],
      [14.62768, 121.06273],
      [14.62763, 121.06259],
      [14.62761, 121.06252],
      [14.62759, 121.06249],
      [14.62752, 121.06235],
      [14.62738, 121.06206],
      [14.62734, 121.06199],
      [14.62705, 121.06141],
      [14.62701, 121.06132],
      [14.62695, 121.0612],
      [14.62672, 121.06071],
      [14.62658, 121.06043],
      [14.62655, 121.06036],
      [14.62641, 121.0601],
      [14.62611, 121.05948],
      [14.6258, 121.0589],
      [14.62551, 121.05832],
      [14.6253, 121.05788],
      [14.62523, 121.05774],
      [14.62493, 121.05713],
      [14.62465, 121.05655],
      [14.62435, 121.05596],
      [14.62407, 121.05536],
      [14.62381, 121.05483],
      [14.62336, 121.05386],
      [14.62309, 121.0533],
      [14.62307, 121.05326],
      [14.62305, 121.05322],
      [14.62296, 121.05302],
      [14.62279, 121.05267],
      [14.62272, 121.05253],
    ].map(([latitude, longitude]) => ({ latitude, longitude })),
  },
]);

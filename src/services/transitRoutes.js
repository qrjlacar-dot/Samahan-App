import { TRANSIT_LINES } from "../data/transitCatalog";
import { distanceMeters, isWithinServiceArea } from "./location";

function failure(code, message) {
  return Object.assign(new Error(message), {
    code: `commute/${code}`,
  });
}

export async function getTransitRoutes(
  request,
  { signal, getWalkingRoutes, lines = TRANSIT_LINES } = {},
) {
  const {
    origin,
    destination,
    preferredMode,
    operatorId,
  } = request ?? {};

  const available = lines.filter(
    (line) =>
      line.mode === preferredMode &&
      (preferredMode !== "jeep" || Boolean(operatorId)) &&
      (!operatorId || line.operatorId === operatorId),
  );

  if (!available.length) {
    throw failure(
      "unsupported-mode",
      "No confirmed route for this transport mode is included yet. Choose Walk or Train Lines.",
    );
  }

  if (
    !origin?.coordinate ||
    !destination?.coordinate ||
    !isWithinServiceArea(origin.coordinate) ||
    !isWithinServiceArea(destination.coordinate)
  ) {
    throw failure(
      "invalid-places",
      "Select two places inside the Cubao area.",
    );
  }

  if (
    origin.coordinate.latitude === destination.coordinate.latitude &&
    origin.coordinate.longitude === destination.coordinate.longitude
  ) {
    throw failure("same-place", "Choose a different destination.");
  }

  const direct = distanceMeters(
    origin.coordinate,
    destination.coordinate,
  );

  const candidates = [];

  for (const line of available) {
    const directions = [
      {
        stops: line.stops,
        headsign: line.headsign,
      },
    ];

    if (line.bidirectional) {
      directions.push({
        stops: [...line.stops].reverse(),
        headsign: line.reverseHeadsign,
      });
    }

    for (const direction of directions) {
      for (
        let from = 0;
        from < direction.stops.length - 1;
        from += 1
      ) {
        for (
          let to = from + 1;
          to < direction.stops.length;
          to += 1
        ) {
          const boarding = direction.stops[from];
          const alighting = direction.stops[to];

          const access = distanceMeters(
            origin.coordinate,
            boarding.coordinate,
          );

          const egress = distanceMeters(
            alighting.coordinate,
            destination.coordinate,
          );

          if (
            access <= 1500 &&
            egress <= 1500 &&
            access + egress <= direct * 1.5 + 200
          ) {
            candidates.push({
              line,
              direction,
              from,
              to,
              boarding,
              alighting,
              score: access + egress,
            });
          }
        }
      }
    }
  }

  candidates.sort((a, b) => a.score - b.score);

  if (!candidates.length) {
    throw failure(
      "no-route",
      "The included transport routes do not serve this journey. Try Walk or different places near the listed stops.",
    );
  }

  const candidate = candidates[0];

  const {
    line,
    direction,
    boarding,
    alighting,
  } = candidate;

  const walking = async (fromPlace, toPlace) => {
    if (
      distanceMeters(
        fromPlace.coordinate,
        toPlace.coordinate,
      ) < 5
    ) {
      return null;
    }

    return (
      await getWalkingRoutes(
        {
          origin: fromPlace,
          destination: toPlace,
          preferredMode: "walk",
        },
        { signal },
      )
    )[0];
  };

  const [access, egress] = await Promise.all([
    walking(origin, boarding),
    walking(alighting, destination),
  ]);

  if (signal?.aborted) {
    throw Object.assign(
      new Error("Request cancelled."),
      { name: "AbortError" },
    );
  }

  const id = [
    "local",
    line.id,
    boarding.id,
    alighting.id,
    origin.id,
    destination.id,
  ].join(":");

  const ridePreview = await getWalkingRoutes(
  {
    origin: boarding,
    destination: alighting,
    preferredMode: "walk",
  },
  { signal },
);

  const ride = {
  id: `${id}:ride`,
  mode: line.mode,
  operatorId: line.operatorId,
  lineId: line.id,
  boardingStop: boarding.name,
  alightingStop: alighting.name,
  instruction: `Ride ${line.name} toward ${direction.headsign}.`,
  withinMinimumFare: line.withinMinimumFare === true,
  schematic: true,

  polyline:
    ridePreview?.polyline?.length > 1
      ? ridePreview.polyline
      : [
          { ...boarding.coordinate },
          { ...alighting.coordinate },
        ],

  distanceMeters: null,
  durationSeconds: null,
};

  const steps = [
    ...(access?.steps ?? []).map((step, index) => ({
      ...step,
      id: `${id}:access:${index}`,
    })),

    ride,

    ...(egress?.steps ?? []).map((step, index) => ({
      ...step,
      id: `${id}:egress:${index}`,
    })),
  ];

  return [
    {
      id,
      origin,
      destination,
      preferredMode,
      actualModes: [
        ...new Set(steps.map((step) => step.mode)),
      ],
      distanceMeters: null,
      durationSeconds: null,
      polyline: steps.flatMap(
        (step) => step.polyline ?? [],
      ),
      steps,
      source: "verified-local",
      sources: ["geoapify", "verified-local"],
      calculatedAt: new Date().toISOString(),
      warnings: [
        "Confirm service, stop locations, and the current fare locally.",
      ],
    },
  ];
}
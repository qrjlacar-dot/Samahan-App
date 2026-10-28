import { TRANSIT_LINES } from "../../data/transitCatalog";
import { getRoadTransitRoutes } from "./roadTransitRoutes";

// Keep the team's jeepney corridors and class choices. Each direction is
// planned independently, then clipped to the actual boarding/drop-off points.
export function getJeepRoutes(request, options = {}) {
  const operatorId = request?.operatorId || "jeep-traditional";
  if (!["jeep-traditional", "jeep-modern"].includes(operatorId)) {
    throw Object.assign(new Error("Choose Traditional or Modern jeepney."), {
      code: "commute/unsupported-mode",
    });
  }
  const lines = (options.lines ?? TRANSIT_LINES)
    .filter((line) => line.mode === "jeep" && line.operatorId === operatorId)
    .flatMap((line) => {
      const common = {
        ...line,
        maxAccessMeters: 500,
        maxEgressMeters: 350,
        terminalWalkMeters: 600,
      };
      return [
        { ...common, direction: "cubao-bound", placards: [line.headsign] },
        ...(line.bidirectional && line.reversePath?.length > 1
          ? [
              {
                ...common,
                id: `${line.id}:return`,
                direction: "anonas-bound",
                stops: [...line.stops].reverse(),
                path: line.reversePath,
                placards: [line.reverseHeadsign],
                headsign: line.reverseHeadsign,
              },
            ]
          : []),
      ];
    });
  return getRoadTransitRoutes(request, { ...options, lines, mode: "jeep" });
}

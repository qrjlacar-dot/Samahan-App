/**
 * Service area and landmark data for location features (Member 2).
 *
 * Landmark coordinates are the spots the group picked on Google Maps
 * (October 18, 2026). The service boundary is still a DRAFT rectangle: the
 * group must confirm it, then set `verified: true` on SERVICE_AREA.
 *
 * The boundary is deliberately NOT the initial map viewport; it only needs
 * to cover Cubao and the nearby places in the demo with some margin.
 */

export const SERVICE_AREA = Object.freeze({
  name: "Cubao, Quezon City",
  verified: false,
  bounds: Object.freeze({
    minLatitude: 14.6,
    maxLatitude: 14.645,
    minLongitude: 121.03,
    maxLongitude: 121.08,
  }),
});

// A position within this distance of a landmark is labelled "Near <name>".
export const LANDMARK_RADIUS_METERS = 150;

function landmark(id, name, latitude, longitude) {
  return Object.freeze({
    id,
    name,
    coordinate: Object.freeze({ latitude, longitude }),
    radiusMeters: LANDMARK_RADIUS_METERS,
    verified: true,
  });
}

export const LANDMARKS = Object.freeze([
  landmark("tip-qc", "TIP QC", 14.625844790581557, 121.06225382448554),
  landmark(
    "gateway-mall",
    "Gateway Mall",
    14.622043638446652,
    121.05282263797659,
  ),
  landmark("ali-mall", "Ali Mall", 14.619764515153642, 121.056748980304),
  landmark(
    "farmers-plaza",
    "Farmers Plaza",
    14.620702551417443,
    121.05172185332158,
  ),
  landmark(
    "lrt2-cubao",
    "LRT 2 Araneta Center-Cubao",
    14.62322724862286,
    121.05296361719164,
  ),
  landmark(
    "lrt2-anonas",
    "LRT 2 Anonas",
    14.628168930096757,
    121.06384272314689,
  ),
]);

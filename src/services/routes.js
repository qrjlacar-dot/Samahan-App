import { featureNotReady } from "./commuteErrors";

/**
 * @returns {Promise<import('../types/commute').Place[]>}
 */
export async function searchPlaces(query, { signal } = {}) {
  throw featureNotReady("Place search");
}

/**
 * @param {import('../types/commute').RouteRequest} request
 * @returns {Promise<import('../types/commute').CommuteRoute[]>}
 */
export async function getRoutes(request, { signal } = {}) {
  throw featureNotReady("Route search");
}
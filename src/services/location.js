import { featureNotReady } from "./commuteErrors";

/**
 * @returns {Promise<import('../types/commute').LocationSnapshot>}
 */
export async function requestForegroundLocation() {
  throw featureNotReady("Foreground location");
}

/**
 * @param {(snapshot: import('../types/commute').LocationSnapshot) => void} onUpdate
 * @param {(error: Error) => void} onError
 * @returns {Promise<import('../types/commute').LocationHandle>}
 */
export async function watchForegroundLocation(
  onUpdate,
  onError,
) {
  throw featureNotReady("Location tracking");
}

/**
 * @param {import('../types/commute').Coordinate} coordinate
 * @returns {Promise<string>}
 */
export async function resolveLocationLabel(coordinate) {
  throw featureNotReady("Location label");
}

/**
 * @param {import('../types/commute').Coordinate} coordinate
 * @returns {boolean}
 */
export function isWithinServiceArea(coordinate) {
  throw featureNotReady("Service area check");
}
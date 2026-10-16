import { featureNotReady } from "./commuteErrors";

/**
 * @returns {Promise<import('../types/commute').SavedFavorite[]>}
 */
export async function loadFavorites(uid) {
  throw featureNotReady("Loading favorites");
}

/**
 * @param {string} uid
 * @param {import('../types/commute').FavoriteInput} journey
 * @returns {Promise<import('../types/commute').SavedFavorite>}
 */
export async function saveFavorite(uid, journey) {
  throw featureNotReady("Saving favorites");
}

/**
 * @returns {Promise<void>}
 */
export async function removeFavorite(uid, favoriteId) {
  throw featureNotReady("Removing favorites");
}
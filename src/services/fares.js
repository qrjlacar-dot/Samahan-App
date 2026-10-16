import { featureNotReady } from "./commuteErrors";

/**
 * @param {import('../types/commute').CommuteRoute} route
 * @param {import('../types/commute').TicketType} ticketType
 * @returns {Promise<import('../types/commute').FareQuote>}
 */
export async function quoteFare(route, ticketType) {
  throw featureNotReady("Fare calculation");
}
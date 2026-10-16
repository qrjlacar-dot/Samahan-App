import { featureNotReady } from "./commuteErrors";

/**
 * @returns {Promise<import('../types/commute').AppNotification[]>}
 */
export async function loadNotifications(uid) {
  throw featureNotReady("Loading notifications");
}

/**
 * @param {string} uid
 * @param {import('../types/commute').NotificationInput} notification
 * @returns {Promise<import('../types/commute').AppNotification | null>}
 */
export async function addNotification(uid, notification) {
  throw featureNotReady("Adding notifications");
}

/**
 * @returns {Promise<void>}
 */
export async function markNotificationRead(
  uid,
  notificationId,
) {
  throw featureNotReady("Marking notifications read");
}

/**
 * @returns {Promise<void>}
 */
export async function removeNotification(
  uid,
  notificationId,
) {
  throw featureNotReady("Removing notifications");
}

/**
 * @returns {Promise<import('../types/commute').NotificationPreferences>}
 */
export async function getNotificationPreferences(uid) {
  throw featureNotReady("Loading notification preferences");
}

/**
 * @param {string} uid
 * @param {import('../types/commute').NotificationPreferences} preferences
 * @returns {Promise<import('../types/commute').NotificationPreferences>}
 */
export async function setNotificationPreferences(
  uid,
  preferences,
) {
  throw featureNotReady("Saving notification preferences");
}
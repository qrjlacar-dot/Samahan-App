import { LegalDocument } from "../../components/LegalDocument";

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocument title="Privacy Policy">
      Last updated: October 26, 2026
      {"\n\n"}
      1. About this policy
      {"\n"}
      SAMAHAN is a student-developed commuting prototype for supported routes around Cubao. This
      policy explains how the SAMAHAN development team uses information in the current testing
      version. For privacy questions or requests about your data, contact the SAMAHAN team member
      who invited you to test the app.
      {"\n\n"}
      2. Account information
      {"\n"}
      Firebase Authentication processes sign-in credentials. SAMAHAN uses your account ID, name,
      email address, and sign-in provider to identify your account and display your profile. Google
      sign-in also provides your Google profile photo when available. Account information is stored
      through Firebase Authentication and Cloud Firestore. Passwords are not saved in profile
      documents or local app preferences, and SAMAHAN does not receive your Google password.
      {"\n\n"}
      3. Location, searches, and maps
      {"\n"}
      With your permission, SAMAHAN uses your location, GPS accuracy, location timestamps, and
      device heading to show your position, check route coverage, and guide an active trip. Location
      tracking pauses when the app enters the background. The app does not upload a continuous GPS
      trail to Firebase.
      {"\n\n"}
      Search text and coordinates needed for place searches and routing are sent to Geoapify. This
      includes your current coordinates when you choose Current location as a route endpoint. Google
      Maps on Android and Apple Maps on iOS provide the map display. These providers process map and
      routing requests under their own privacy policies. Saved routes and trip updates may retain
      origin and destination coordinates on your device.
      {"\n\n"}
      4. Information saved on your device
      {"\n"}
      Favorites store selected places, coordinates, transport choices, ticket or discount
      categories, and a saved date. Trip notifications store completed or cancelled trip details,
      timestamps, and read status. Emergency contacts store the names and phone numbers you enter.
      Notification preferences and sign-in session information are also stored locally. Favorites,
      contacts, and notification history are separated by account on the same device and are not
      automatically synced to other devices.
      {"\n\n"}
      5. Contacts and phone notifications
      {"\n"}
      Emergency contacts are entered manually. SAMAHAN does not read your phone's address book. Only
      save another person's contact details with their permission. Tapping Call passes the selected
      number to your phone's calling app; SAMAHAN does not automatically send your location or an
      emergency message.
      {"\n\n"}
      With notification permission and the Profile notification switch enabled, the app schedules
      local phone alerts for completed or cancelled trips. Alerts wait until you leave the route
      screen or put the app in the background. Trip records are still saved inside SAMAHAN when
      phone alerts are off. Phone alerts may show trip information on the lock screen, depending on
      your device settings. The current app does not send these alerts through a remote push
      notification server.
      {"\n\n"}
      6. Storage and retention
      {"\n"}
      Favorites and emergency contacts remain on the device until removed or the app's local data is
      cleared. Notification history keeps the newest 100 records, and you can delete records from
      the Notifications page. Signing out does not erase saved local data. Clearing local data does
      not delete your Firebase account. Account records remain in Firebase until removed by the
      development team; this testing version has no automatic account-expiry schedule or in-app
      account-deletion button.
      {"\n\n"}
      7. Your choices and data requests
      {"\n"}
      You can change location and notification permissions in your device settings. Denying location
      limits current-location and live-guidance features. You can remove favorites, contacts, and
      notifications from their pages. Email/password users can edit supported profile fields;
      Google-managed details must be changed through Google. Contact the SAMAHAN team member who
      invited you to request access, correction, or deletion of account data, or to raise a privacy
      concern. You may also raise a complaint with the National Privacy Commission.
      {"\n\n"}
      8. Security and policy changes
      {"\n"}
      Firebase handles account authentication. Device-local records are not encrypted by SAMAHAN, so
      protect access to your device and avoid saving unnecessary personal information. This policy
      will be updated when the app's data practices change. Review the updated date and wording
      during testing.
    </LegalDocument>
  );
}

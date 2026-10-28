// Shared policy content and team contact details.
export const LEGAL_CONTACT_EMAILS = Object.freeze([
  "qrjlacar@tip.edu.ph",
  "qjssanpablo@tip.edu.ph",
  "qhllancin@tip.edu.ph",
  "qrrmorano26@tip.edu.ph",
]);

export const LEGAL_DOCUMENTS = {
  privacy: {
    title: "Privacy Policy",
    updatedAt: "October 27, 2026",
    sections: [
      {
        title: "About This Policy",
        paragraphs: [
          "SAMAHAN is a student-developed commuting prototype for supported routes around Cubao. This policy explains how the SAMAHAN development team uses information in the current testing version. For privacy questions or requests about your data, use the SAMAHAN team contact details below.",
        ],
      },
      {
        title: "Account Information",
        paragraphs: [
          "Firebase Authentication processes sign-in credentials. SAMAHAN uses your account ID, name, email address, and sign-in provider to identify your account and display your profile. Google sign-in also provides your Google profile photo when available. Account information is stored through Firebase Authentication and Cloud Firestore. Passwords are not saved in profile documents or local app preferences, and SAMAHAN does not receive your Google password.",
        ],
      },
      {
        title: "Location, Searches, And Maps",
        paragraphs: [
          "With your permission, SAMAHAN uses your location, GPS accuracy, location timestamps, and device heading to show your position, check route coverage, and guide an active trip. Location tracking pauses when the app enters the background. The app does not upload a continuous GPS trail to Firebase.",
          "Search text and coordinates needed for place searches and routing are sent to Geoapify. This includes your current coordinates when you choose Current location as a route endpoint. Google Maps on Android and Apple Maps on iOS provide the map display. These providers process map and routing requests under their own privacy policies. Saved routes and trip updates may retain origin and destination coordinates on your device.",
        ],
      },
      {
        title: "Information Saved On Your Device",
        paragraphs: [
          "Favorites store selected places, coordinates, transport choices, ticket or discount categories, and a saved date. Trip notifications store completed or cancelled trip details, timestamps, and read status. Emergency contacts store the names and phone numbers you enter. Notification preferences and sign-in session information are also stored locally. Favorites, contacts, and notification history are separated by account on the same device and are not automatically synced to other devices.",
        ],
      },
      {
        title: "Contacts And Phone Notifications",
        paragraphs: [
          "Emergency contacts are entered manually. SAMAHAN does not read your phone's address book. Only save another person's contact details with their permission. On Android, tapping Call for a saved personal contact starts a call after phone-call permission is granted. On iPhone, the phone's call confirmation applies. Emergency hotline buttons open the phone's dialer. SAMAHAN does not automatically send your location or an emergency message.",
          "With notification permission and the Profile notification switch enabled, the app schedules local phone alerts for completed or cancelled trips. Alerts wait until you leave the route screen or put the app in the background. Trip records are still saved inside SAMAHAN when phone alerts are off. Phone alerts may show trip information on the lock screen, depending on your device settings. The current app does not send these alerts through a remote push notification server. Tapping a phone alert opens Notifications for its matching signed-in account.",
        ],
      },
      {
        title: "Storage And Retention",
        paragraphs: [
          "Favorites and emergency contacts remain on the device until removed or the app's local data is cleared. Notification history keeps the newest 100 records, and you can delete records from the Notifications page. Signing out does not erase saved local data. Clearing local data does not delete your Firebase account. Account records remain in Firebase until removed by the development team; this testing version has no automatic account-expiry schedule or in-app account-deletion button.",
        ],
      },
      {
        title: "Your Choices And Data Requests",
        paragraphs: [
          "You can change location and notification permissions in your device settings. Denying location limits current-location and live-guidance features. You can remove favorites, contacts, and notifications from their pages. Email/password users can edit supported profile fields; Google-managed details must be changed through Google. Contact the SAMAHAN team using any email address listed below to request access, correction, or deletion of account data, or to raise a privacy concern. You may also raise a complaint with the National Privacy Commission.",
        ],
      },
      {
        title: "Security And Policy Changes",
        paragraphs: [
          "Firebase handles account authentication. Device-local records are not encrypted by SAMAHAN, so protect access to your device and avoid saving unnecessary personal information. This policy will be updated when the app's data practices change. Review the updated date and wording during testing.",
        ],
      },
      {
        title: "Contact The SAMAHAN Team",
        paragraphs: [
          "For questions about this policy or requests about your personal data, contact the SAMAHAN team:",
        ],
        showContacts: true,
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    updatedAt: "October 27, 2026",
    sections: [
      {
        title: "About SAMAHAN",
        paragraphs: [
          "SAMAHAN is a student-developed commuting prototype for supported routes around Cubao. The current testing version includes accounts, place searches, maps, walking and selected public-transport guidance, favorites, trip updates, and manually saved emergency contacts. These terms describe the current version, which is still being tested.",
        ],
      },
      {
        title: "Accounts And Responsible Use",
        paragraphs: [
          "Use an account you are authorized to access and keep your sign-in details private. Do not access another person's data, bypass access controls, disrupt the app, or misuse its calling feature. Only enter another person's contact details with their permission. Google sign-in is currently supported in the Android app; iPhone testers should use email and password. Feature availability may vary by device and app build.",
        ],
      },
      {
        title: "Route Coverage And Travel Information",
        paragraphs: [
          "Guidance is limited to the supported service area and transport routes shown in the app. Search results do not mean that every journey between those places is supported. Routes, walking times, distances, fares, and trip-completion detection may be inaccurate or affected by GPS quality, traffic, closures, provider data, and device conditions. Confirm the actual route, vehicle placard, stop, fare, discount eligibility, and service availability with the operator or station before travelling.",
          "SAMAHAN guides using your device's location. It does not provide live public-vehicle tracking, transport booking, ticket purchases, or fare payments. Follow road signs and staff instructions, use safe crossings, and check your surroundings before following a suggested route or looking at your phone.",
        ],
      },
      {
        title: "Permissions And Trip Notifications",
        paragraphs: [
          "Location permission is needed for current-location and live-guidance features. Tracking pauses when the app enters the background, so keep the app open for active guidance. Phone-call permission is requested only when you tap Call for a saved personal contact on Android. Phone alerts require notification permission and the notification switch in Profile. Completed or cancelled trip records remain inside the app even when phone alerts are off. Alerts are scheduled after leaving the route screen or backgrounding the app; delivery and banners depend on your device settings and are not guaranteed at an exact time.",
        ],
      },
      {
        title: "Emergency Contacts",
        paragraphs: [
          "For saved personal contacts on Android, the calling feature starts a call after phone-call permission is granted. On iPhone, the phone's call confirmation applies. Emergency hotline buttons open your phone's dialer. SAMAHAN is not an emergency dispatch, rescue, monitoring, or automatic location-sharing service. Verify saved numbers and contact appropriate emergency services directly when needed. Calls depend on your phone, mobile service, and any applicable call charges.",
        ],
      },
      {
        title: "Data And Third-party Services",
        paragraphs: [
          "Read the Privacy Policy for how account data, location, searches, saved routes, contacts, and trip updates are used. Firebase, Geoapify, Google Maps, and Apple Maps support parts of the app and have their own terms and privacy policies. Account access, search, and routing require a working internet connection; provider outages or usage limits may affect them. Device-local favorites, contacts, and notifications do not automatically transfer to another device.",
        ],
      },
      {
        title: "Testing, Changes, And Contact",
        paragraphs: [
          "Features and route coverage may change as testing continues. SAMAHAN does not guarantee uninterrupted operation, complete route coverage, or the accuracy of every estimate. For questions, unexpected behavior, or requests about account data, contact the SAMAHAN team using any email address listed below. These terms will be updated when the app's features or conditions change.",
        ],
        showContacts: true,
      },
    ],
  },
};

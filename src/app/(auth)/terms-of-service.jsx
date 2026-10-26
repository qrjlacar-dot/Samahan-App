import { LegalDocument } from "../../components/LegalDocument";

export default function TermsOfServiceScreen() {
  return (
    <LegalDocument title="Terms of Service">
      Last updated: October 26, 2026
      {"\n\n"}
      1. About SAMAHAN
      {"\n"}
      SAMAHAN is a student-developed commuting prototype for supported routes around Cubao. The
      current testing version includes accounts, place searches, maps, walking and selected
      public-transport guidance, favorites, trip updates, and manually saved emergency contacts.
      These terms describe the current version, which is still being tested.
      {"\n\n"}
      2. Accounts and responsible use
      {"\n"}
      Use an account you are authorized to access and keep your sign-in details private. Do not
      access another person's data, bypass access controls, disrupt the app, or misuse its calling
      feature. Only enter another person's contact details with their permission. Google sign-in is
      currently supported in the Android app; iPhone testers should use email and password. Feature
      availability may vary by device and app build.
      {"\n\n"}
      3. Route coverage and travel information
      {"\n"}
      Guidance is limited to the supported service area and transport routes shown in the app.
      Search results do not mean that every journey between those places is supported. Routes,
      walking times, distances, fares, and trip-completion detection may be inaccurate or affected
      by GPS quality, traffic, closures, provider data, and device conditions. Confirm the actual
      route, vehicle placard, stop, fare, discount eligibility, and service availability with the
      operator or station before travelling.
      {"\n\n"}
      SAMAHAN guides using your device's location. It does not provide live public-vehicle tracking,
      transport booking, ticket purchases, or fare payments. Follow road signs and staff
      instructions, use safe crossings, and check your surroundings before following a suggested
      route or looking at your phone.
      {"\n\n"}
      4. Permissions and trip notifications
      {"\n"}
      Location permission is needed for current-location and live-guidance features. Tracking pauses
      when the app enters the background, so keep the app open for active guidance. Phone alerts
      require notification permission and the notification switch in Profile. Completed or cancelled
      trip records remain inside the app even when phone alerts are off. Alerts are scheduled after
      leaving the route screen or backgrounding the app; delivery and banners depend on your device
      settings and are not guaranteed at an exact time.
      {"\n\n"}
      5. Emergency contacts
      {"\n"}
      The calling feature passes a selected number to your phone's calling app. It is not an
      emergency dispatch, rescue, monitoring, or automatic location-sharing service. Verify saved
      numbers and contact appropriate emergency services directly when needed. Calls depend on your
      phone, mobile service, and any applicable call charges.
      {"\n\n"}
      6. Data and third-party services
      {"\n"}
      Read the Privacy Policy for how account data, location, searches, saved routes, contacts, and
      trip updates are used. Firebase, Geoapify, Google Maps, and Apple Maps support parts of the
      app and have their own terms and privacy policies. Account access, search, and routing require
      a working internet connection; provider outages or usage limits may affect them. Device-local
      favorites, contacts, and notifications do not automatically transfer to another device.
      {"\n\n"}
      7. Testing, changes, and contact
      {"\n"}
      Features and route coverage may change as testing continues. SAMAHAN does not guarantee
      uninterrupted operation, complete route coverage, or the accuracy of every estimate. For
      questions, unexpected behavior, or requests about account data, contact the SAMAHAN team
      member who invited you to test the app. These terms will be updated when the app's features or
      conditions change.
    </LegalDocument>
  );
}

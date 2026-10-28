import Constants, { ExecutionEnvironment } from "expo-constants";

// Do not evaluate expo-notifications in Expo Go: the installed host may lack
// native modules required by this project's version. In-app records work
// independently; native phone alerts stay available in supported builds.
let Notifications = null;
if (
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
  Constants.appOwnership !== "expo"
) {
  try {
    Notifications = require("expo-notifications");
  } catch (error) {
    console.warn(
      "SAMAHAN: phone alerts are unavailable in this build; in-app notifications remain available.",
      error?.message,
    );
  }
}

export default Notifications;

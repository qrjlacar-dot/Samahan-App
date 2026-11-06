module.exports = {
  expo: {
    name: "Samahan",
    slug: "Samahan",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "samahan",
    userInterfaceStyle: "automatic",
    ios: {
      icon: "./assets/images/icon.png",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#ca74a6",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      softwareKeyboardLayoutMode: "resize",
      package: "com.samahan.app",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      permissions: ["android.permission.CALL_PHONE"],
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#FAF0F5",
          image: "./assets/images/splash-icon.png",
          imageWidth: 144,
        },
      ],
      "react-native-nitro-google-signin",
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "SAMAHAN uses your location to show where you are and to guide your commute.",
        },
      ],
      [
        "expo-notifications",
        {
          defaultChannel: "trip-updates",
        },
      ],
      "./plugins/withAndroidStartupFix.cjs",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "f4519ea7-cbc1-405e-91d5-1c7bbef6cb46",
      },
    },
  },
};
import { useTripNotificationRouting } from "../hooks/useTripNotificationRouting";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "../context/AuthContext";
import { AuthenticatedLocationProvider } from "../context/LocationContext";

SplashScreen.preventAutoHideAsync().catch(console.warn);

function AppNavigator() {
  const { user, initializing } = useAuth();
  const pathname = usePathname();
  useTripNotificationRouting(user?.uid);

  useEffect(() => {
    if (pathname !== "/") {
      SplashScreen.hideAsync().catch(console.warn);
    }
  }, [pathname]);

  if (initializing) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/login" options={{ animation: "fade" }} />
      <Stack.Screen name="index" options={{ animation: "none" }} />
      <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
      <Stack.Screen name="onboarding2" />
      <Stack.Screen name="onboarding3" />
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="directions" options={{ animation: "none" }} />
        <Stack.Screen name="emergency-contacts" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="profile/reset" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthenticatedLocationProvider>
        <AppNavigator />
      </AuthenticatedLocationProvider>
    </AuthProvider>
  );
}

import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync().catch(console.warn);

export default function RootLayout() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") {
      SplashScreen.hideAsync().catch(console.warn);
    }
  }, [pathname]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ animation: "none" }} />
      <Stack.Screen name="(auth)/login" options={{ animation: "fade" }} />
    </Stack>
  );
}

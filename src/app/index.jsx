import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, View } from "react-native";
import { IMAGES } from "../constants/images";
import { LOGO_SIZE, styles } from "../styles/splash.styles";

export default function Index() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const [screenHeight, setScreenHeight] = useState(0);
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [logoReady, setLogoReady] = useState(false);

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const logoPosition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!screenHeight || !backgroundReady || !logoReady) return;

    let cancelled = false;
    let frameId;

    const startingPosition = Math.max(0, screenHeight * 0.64 - LOGO_SIZE / 2);

    logoOpacity.setValue(0);
    logoScale.setValue(1);
    logoPosition.setValue(startingPosition);

    const animation = Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoPosition, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(800),
    ]);

    const startAnimation = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.warn(error);
      }

      if (cancelled) return;

      frameId = requestAnimationFrame(() => {
        if (cancelled) return;

        animation.start(({ finished }) => {
          if (finished && !cancelled) {
            routerRef.current.replace("/onboarding");
          }
        });
      });
    };

    startAnimation();

    return () => {
      cancelled = true;

      if (frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }

      animation.stop();
    };
  }, [
    screenHeight,
    backgroundReady,
    logoReady,
    logoOpacity,
    logoScale,
    logoPosition,
  ]);

  return (
    <View
      style={styles.screen}
      onLayout={(event) => {
        setScreenHeight(event.nativeEvent.layout.height);
      }}
    >
      <Image
        source={IMAGES.splashBackground}
        style={styles.background}
        resizeMode="stretch"
        onLoadEnd={() => setBackgroundReady(true)}
        onError={(event) => {
          console.warn(
            "Splash background failed to load:",
            event.nativeEvent.error,
          );
        }}
      />

      <View style={styles.logoPosition}>
        <Animated.View
          style={[
            styles.logoShadow,
            {
              opacity: logoOpacity,
              transform: [{ translateY: logoPosition }, { scale: logoScale }],
            },
          ]}
        >
          <Image
            source={IMAGES.logo}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Samahan"
            onLoadEnd={() => setLogoReady(true)}
            onError={(event) => {
              console.warn(
                "Splash logo failed to load:",
                event.nativeEvent.error,
              );
            }}
          />
        </Animated.View>
      </View>
    </View>
  );
}

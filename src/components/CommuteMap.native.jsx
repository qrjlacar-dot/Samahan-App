import { Platform, StyleSheet } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";

const CUBAO_REGION = {
  latitude: 14.6255,
  longitude: 121.0603,
  latitudeDelta: 0.0422,
  longitudeDelta: 0.0421,
};

export function CommuteMap({ style, interactive = true }) {
  return (
    <MapView
      style={[StyleSheet.absoluteFillObject, style]}
      provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
      initialRegion={CUBAO_REGION}
      pointerEvents={interactive ? "auto" : "none"}
      zoomEnabled={interactive}
      scrollEnabled={interactive}
      rotateEnabled={interactive}
      pitchEnabled={interactive}
      toolbarEnabled={false}
    />
  );
}

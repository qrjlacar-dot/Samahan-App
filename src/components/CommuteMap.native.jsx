import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import ProviderAttribution from "./directions/ProviderAttribution";

const CUBAO_REGION = {
  latitude: 14.6255,
  longitude: 121.0603,
  latitudeDelta: 0.0422,
  longitudeDelta: 0.0421,
};

export function CommuteMap({
  style,
  interactive = true,
  userPosition = null,
  origin = null,
  destination = null,
  route = null,
  fitRequest = 0,
  contentBottomInset = 0,
}) {
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const centeredOnUser = useRef(false);
  const latitude = userPosition?.latitude;
  const longitude = userPosition?.longitude;
  const hasUserPosition =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;
  const hasRouteSelection = Boolean(origin || destination || route);

  useEffect(() => {
    if (
      !ready ||
      !laidOut ||
      !hasUserPosition ||
      hasRouteSelection ||
      centeredOnUser.current
    ) return;

    centeredOnUser.current = true;
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      400,
    );
  }, [ready, laidOut, hasUserPosition, hasRouteSelection, latitude, longitude]);

  useEffect(() => {
    if (!ready || !laidOut) return;

    const coordinates = [
      ...(route?.polyline ?? []),
      origin?.coordinate,
      destination?.coordinate,
    ].filter(Boolean);

    if (coordinates.length > 1) {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: {
          top: 110,
          right: 45,
          bottom: contentBottomInset + 45,
          left: 45,
        },
        animated: true,
      });
    } else if (coordinates.length === 1) {
      mapRef.current?.animateToRegion(
        {
          ...coordinates[0],
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        400,
      );
    }
  }, [
    ready,
    laidOut,
    origin,
    destination,
    route,
    fitRequest,
    contentBottomInset,
  ]);

  const showAttribution =
    route?.source === "geoapify" ||
    origin?.source === "geoapify" ||
    destination?.source === "geoapify";

  return (
    <>
      <MapView
        ref={mapRef}
        style={[StyleSheet.absoluteFillObject, style]}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={CUBAO_REGION}
        onMapReady={() => setReady(true)}
        onLayout={({ nativeEvent }) => {
          const { width, height } = nativeEvent.layout;
          setLaidOut(width > 0 && height > 0);
        }}
        pointerEvents={interactive ? "auto" : "none"}
        zoomEnabled={interactive}
        scrollEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
        toolbarEnabled={false}
      >
        {hasUserPosition && (
          <Marker
            coordinate={{ latitude, longitude }}
            title="Your location"
            description="Latest reported phone location"
            pinColor="#C76C9B"
            zIndex={10}
          />
        )}

        {origin && (
          <Marker
            coordinate={origin.coordinate}
            title={origin.name}
            description="Starting point"
            pinColor="#654255"
          />
        )}

        {destination && (
          <Marker
            coordinate={destination.coordinate}
            title={destination.name}
            description="Destination"
            pinColor="#C76C9B"
          />
        )}

        {route?.polyline?.length > 1 && (
          <Polyline
            coordinates={route.polyline}
            strokeColor="#C76C9B"
            strokeWidth={5}
          />
        )}
      </MapView>

      {showAttribution && (
        <ProviderAttribution
          style={{
            position: "absolute",
            top: 44,
            right: 12,
            paddingHorizontal: 8,
            borderRadius: 8,
            backgroundColor: "#FFFFFF",
          }}
        />
      )}
    </>
  );
}

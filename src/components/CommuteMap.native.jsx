import { useFocusEffect } from "expo-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform, StyleSheet } from "react-native";
import MapView, {
  Circle,
  Marker,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import ProviderAttribution from "./directions/ProviderAttribution";
import { useDeviceHeading } from "../hooks/useDeviceHeading";
import { headingBeam } from "../services/deviceLocation";

const CUBAO_REGION = {
  latitude: 14.6255,
  longitude: 121.0603,
  latitudeDelta: 0.0422,
  longitudeDelta: 0.0421,
};

export function CommuteMap(props) {
  const [session, setSession] = useState({
    version: 0,
    visible: false,
  });

  useFocusEffect(
    useCallback(() => {
      setSession((previous) => ({
        version: previous.version + 1,
        visible: true,
      }));

      return () => {
        setSession((previous) => ({
          ...previous,
          visible: false,
        }));
      };
    }, []),
  );

  if (!session.visible) return null;

  return (
    <CommuteMapContent
      key={session.version}
      {...props}
    />
  );
}

function CommuteMapContent({
  style,
  interactive = true,
  userPosition = null,
  origin = null,
  destination = null,
  route = null,
  fitRequest = 0,
  contentBottomInset = 0,
  followUser = false,
  followZoom = 17,
  followHeading = false,
  recenterRequest = 0,
  onUserPan,
  onMapPress,
}) {
  const mapRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const [mapHeight, setMapHeight] = useState(0);

  const [latitudeDelta, setLatitudeDelta] = useState(
    CUBAO_REGION.latitudeDelta,
  );

  const centeredOnUser = useRef(false);
  const followingRef = useRef(followUser);
  const lastRecenter = useRef(recenterRequest);
  const lastCamera = useRef(null);
  const lastCameraTime = useRef(0);
  const wasFollowing = useRef(false);

  followingRef.current = followUser;

  const latitude = userPosition?.latitude;
  const longitude = userPosition?.longitude;

  const hasUserPosition =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  const heading = useDeviceHeading(hasUserPosition);

  const beamRadius =
    mapHeight > 0
      ? Math.max(
          2,
          Math.min(
            10000,
            ((latitudeDelta * 111195) / mapHeight) * 42,
          ),
        )
      : 140;

  const beam = headingBeam(
    userPosition,
    heading,
    beamRadius,
  );

  const hasRouteSelection = Boolean(
    origin || destination || route,
  );

  useEffect(() => {
    if (
      !ready ||
      !laidOut ||
      !hasUserPosition ||
      followUser ||
      hasRouteSelection ||
      centeredOnUser.current
    ) {
      return;
    }

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
  }, [
    ready,
    laidOut,
    hasUserPosition,
    hasRouteSelection,
    latitude,
    longitude,
    followUser,
  ]);

  useEffect(() => {
    if (!ready || !laidOut || followingRef.current) {
      return;
    }

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

  useEffect(() => {
    if (!ready || !laidOut || !hasUserPosition) return;

    const requested =
      recenterRequest !== lastRecenter.current;

    if (!followUser && !requested) {
      wasFollowing.current = false;
      return;
    }

    const previous = lastCamera.current;

    const cameraHeading =
      followUser && followHeading
        ? Number.isFinite(heading)
          ? heading
          : previous?.heading ?? 0
        : 0;

    const headingDifference = previous
      ? Math.abs(
          ((cameraHeading - previous.heading + 540) % 360) - 180,
        )
      : 360;

    const enteringFollow =
      followUser && !wasFollowing.current;

    const positionChanged =
      !previous ||
      previous.center.latitude !== latitude ||
      previous.center.longitude !== longitude;

    if (
      !requested &&
      !enteringFollow &&
      !positionChanged &&
      previous?.zoom === followZoom &&
      headingDifference < 2
    ) {
      return;
    }

    const delay =
      requested || enteringFollow
        ? 0
        : Math.max(
            0,
            120 - (Date.now() - lastCameraTime.current),
          );

    const moveCamera = () => {
      if (!followingRef.current && !requested) return;

      const camera = {
        center: {
          latitude,
          longitude,
        },
        zoom: followZoom,
        pitch: 0,
        heading: cameraHeading,
      };

      mapRef.current?.animateCamera(camera, {
        duration: requested || enteringFollow ? 350 : 120,
      });

      lastCamera.current = camera;
      lastCameraTime.current = Date.now();
      lastRecenter.current = recenterRequest;
      wasFollowing.current = followUser;
      centeredOnUser.current = true;
    };

    if (delay === 0) {
      moveCamera();
      return;
    }

    const timer = setTimeout(moveCamera, delay);
    return () => clearTimeout(timer);
  }, [
    ready,
    laidOut,
    hasUserPosition,
    latitude,
    longitude,
    heading,
    followUser,
    followHeading,
    followZoom,
    recenterRequest,
  ]);

  const showAttribution =
    route?.source === "geoapify" ||
    origin?.source === "geoapify" ||
    destination?.source === "geoapify";

  return (
    <>
      <MapView
        ref={mapRef}
        style={[
          StyleSheet.absoluteFillObject,
          style,
        ]}
        provider={
          Platform.OS === "android"
            ? PROVIDER_GOOGLE
            : undefined
        }
        initialRegion={CUBAO_REGION}
        onMapReady={() => setReady(true)}
        onLayout={({ nativeEvent }) => {
          const { width, height } = nativeEvent.layout;

          setLaidOut(width > 0 && height > 0);
          setMapHeight(height > 0 ? height : 0);
        }}
        pointerEvents={interactive ? "auto" : "none"}
        zoomEnabled={interactive}
        scrollEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
        toolbarEnabled={false}
        showsCompass={!followHeading}
        onPress={() => onMapPress?.()}
        onPanDrag={() => {
          followingRef.current = false;
          onUserPan?.();
        }}
        onRegionChangeComplete={(region, details) => {
          if (
            Number.isFinite(region?.latitudeDelta) &&
            region.latitudeDelta > 0
          ) {
            setLatitudeDelta(region.latitudeDelta);
          }

          if (details?.isGesture) {
            followingRef.current = false;
            onUserPan?.();
          }
        }}
      >
        {beam.length > 2 && (
          <Polygon
            coordinates={beam}
            fillColor="rgba(199, 108, 155, 0.25)"
            strokeColor="rgba(199, 108, 155, 0.08)"
            strokeWidth={1}
            zIndex={5}
          />
        )}

        {hasUserPosition && (
          <Circle
            center={{
              latitude,
              longitude,
            }}
            radius={beamRadius * (9.5 / 42)}
            fillColor="#C76C9B"
            strokeColor="#FFFFFF"
            strokeWidth={3}
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
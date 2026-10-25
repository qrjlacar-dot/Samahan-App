import { useFocusEffect } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, {
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
  const [active, setActive] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setActive(true);

      return () => setActive(false);
    }, []),
  );

  return (
    <CommuteMapContent
      {...props}
      active={active}
    />
  );
}

function CommuteMapContent({
  active,
  style,
  interactive = true,
  userPosition = null,
  origin = null,
  destination = null,
  route: selectedRoute = null,
  fitRequest = 0,
  contentBottomInset = 0,
  followUser = false,
  followZoom = 17,
  followHeading = false,
  recenterRequest = 0,
  onUserPan,
  onMapPress,
}) {
  // A late/old result must not draw a route for a different input selection.
  const matches = (a, b) => !a || !b ||
    a.coordinate?.latitude === b.coordinate?.latitude && a.coordinate?.longitude === b.coordinate?.longitude;
  const route = matches(origin, selectedRoute?.origin) && matches(destination, selectedRoute?.destination)
    ? selectedRoute : null;
  const routeKey = `${route?.id ?? "none"}:${route?.calculatedAt ?? ""}`;
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

  followingRef.current = active && followUser;

  const latitude = userPosition?.latitude;
  const longitude = userPosition?.longitude;

  const hasUserPosition =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  const previewRegion = useMemo(() => {
    if (
      interactive ||
      !followUser ||
      !hasUserPosition
    ) {
      return undefined;
    }

    return {
      latitude,
      longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    };
  }, [
    interactive,
    followUser,
    hasUserPosition,
    latitude,
    longitude,
  ]);

  const heading = useDeviceHeading(
    active && hasUserPosition,
  );

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
    Number.isFinite(heading) ? heading : 0,
    beamRadius,
  );

  const hasRouteSelection = Boolean(
    origin || destination || route,
  );

  useEffect(() => {
    if (
      !active ||
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
    active,
    ready,
    laidOut,
    hasUserPosition,
    hasRouteSelection,
    latitude,
    longitude,
    followUser,
  ]);

  useEffect(() => {
    if (
      !active ||
      !ready ||
      !laidOut ||
      followingRef.current
    ) {
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
    active,
    ready,
    laidOut,
    origin,
    destination,
    route,
    fitRequest,
    contentBottomInset,
  ]);

  useEffect(() => {
    if (previewRegion) {
      wasFollowing.current = false;
      return;
    }

    if (!active) {
      wasFollowing.current = false;
      return;
    }

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

    const difference = previous
      ? Math.abs(
          ((cameraHeading - previous.heading + 540) % 360) -
            180,
        )
      : 360;

    const entering =
      followUser && !wasFollowing.current;

    const moved =
      !previous ||
      previous.center.latitude !== latitude ||
      previous.center.longitude !== longitude;

    if (
      !requested &&
      !entering &&
      !moved &&
      previous?.zoom === followZoom &&
      difference < 2
    ) {
      return;
    }

    const delay =
      requested || entering
        ? 0
        : Math.max(
            0,
            120 - (Date.now() - lastCameraTime.current),
          );

    const move = () => {
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

      const map = mapRef.current;

      if (!map) return;

      if (Platform.OS === "android") {
        map.setCamera(camera);
      } else {
        map.animateCamera(camera, {
          duration: requested || entering ? 350 : 120,
        });
      }

      lastCamera.current = camera;
      lastCameraTime.current = Date.now();
      lastRecenter.current = recenterRequest;
      wasFollowing.current = followUser;
      centeredOnUser.current = true;
    };

    if (!delay) {
      move();
      return;
    }

    const timer = setTimeout(move, delay);

    return () => clearTimeout(timer);
  }, [
    active,
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
    previewRegion,
  ]);

  const showAttribution =
    route?.source === "geoapify" ||
    route?.sources?.includes("geoapify") ||
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
        initialRegion={
          previewRegion ?? CUBAO_REGION
        }
        region={previewRegion}
        onMapReady={() => setReady(true)}
        onLayout={({ nativeEvent }) => {
          const { width, height } =
            nativeEvent.layout;

          setLaidOut(width > 0 && height > 0);
          setMapHeight(height > 0 ? height : 0);
        }}
        pointerEvents={
          interactive ? "auto" : "none"
        }
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
            key="user-heading"
            coordinates={beam}
            fillColor={
              Number.isFinite(heading)
                ? "rgba(199, 108, 155, 0.25)"
                : "transparent"
            }
            strokeColor={
              Number.isFinite(heading)
                ? "rgba(199, 108, 155, 0.08)"
                : "transparent"
            }
            strokeWidth={1}
            zIndex={5}
          />
        )}

        {hasUserPosition && (
          <Marker
            key="user-position"
            coordinate={{
              latitude,
              longitude,
            }}
            anchor={{
              x: 0.5,
              y: 0.5,
            }}
            tracksViewChanges={true}
            flat
            zIndex={10}
          >
            <View
              collapsable={false}
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: "#C76C9B",
                borderColor: "#FFFFFF",
                borderWidth: 3,
              }}
            />
          </Marker>
        )}

        {origin && (
          <Marker
            key="origin"
            coordinate={origin.coordinate}
            title={origin.name}
            description="Starting point"
            pinColor="#654255"
          />
        )}

        {destination && (
          <Marker
            key="destination"
            coordinate={destination.coordinate}
            title={destination.name}
            description="Destination"
            pinColor="#C76C9B"
          />
        )}

        {route?.steps?.filter(step => step.mode === "bus").flatMap(step => [
          <Marker key={`${routeKey}:${step.id}:boarding`} coordinate={step.start}
            title={step.boardingStop} description="Suggested boarding area. Use a permitted stop and check the signboard."
            pinColor="#654255" />,
          <Marker key={`${routeKey}:${step.id}:alighting`} coordinate={step.end}
            title={step.alightingStop} description="Suggested drop-off area. Confirm the permitted stop with the conductor."
            pinColor="#D78A38" />,
        ])}

        {route?.stationMarkers?.filter(station => station.id !== origin?.id && station.id !== destination?.id).map(station => (
          <Marker key={`${routeKey}:station:${station.id}`} coordinate={station.coordinate}
            title={station.name} description={`${station.line} station · location approximate`} pinColor="#654255" />
        ))}

        {route?.preferredMode !== "walk" &&
        route?.steps?.length
          ? route.steps
              .filter(
                (step) =>
                  step.polyline?.length > 1,
              )
              .map((step) => (
                <Polyline
                  key={`${routeKey}:${step.id}`}
                  coordinates={step.polyline}
                  strokeColor="#C76C9B"
                  strokeWidth={5}
                  lineDashPattern={
                    step.schematic
                      ? [12, 8]
                      : ["bus", "train"].includes(route.preferredMode) && step.mode === "walk"
                        ? [4, 6]
                        : undefined
                  }
                />
              ))
          : route?.polyline?.length > 1 && (
              <Polyline
                key={`${routeKey}:walking-route`}
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

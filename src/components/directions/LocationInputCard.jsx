import {
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { searchPlaces } from "../../services/routes";
import { useLocation } from "../../context/LocationContext";
import { currentLocationPlace } from "../../services/deviceLocation";
import { styles } from "../../styles/directions.styles";
import ProviderAttribution from "./ProviderAttribution";

export default function LocationInputCard({
  locationText,
  setLocationText,
  destinationText,
  setDestinationText,
  onSwapLocations,
  onSelectPlace,
  searchPlacesFn = searchPlaces,
  minQueryLength = 2,
  mapCurrentLocation = currentLocationPlace,
}) {
  const { refreshLocation } = useLocation();

  const [gettingCurrent, setGettingCurrent] =
    useState(false);

  const [currentError, setCurrentError] =
    useState("");

  const currentToken = useRef(0);
  const currentPending = useRef(false);
  const searchToken = useRef(0);

  const [activeField, setActiveField] =
    useState(null);

  const [suggestions, setSuggestions] =
    useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [retry, setRetry] = useState(0);

  const requestRef = useRef(null);

  const query =
    activeField === "origin"
      ? locationText
      : destinationText;

  useEffect(() => {
    setSuggestions([]);
    setError("");
    setSearched(false);
    setLoading(false);

    if (
      !activeField ||
      gettingCurrent ||
      query.trim().length < minQueryLength ||
      query === "Current location"
    ) {
      return;
    }

    setLoading(true);

    const token = ++searchToken.current;
    const controller = new AbortController();

    requestRef.current = controller;

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const results = await searchPlacesFn(query, {
          signal: controller.signal,
        });

        if (
          !cancelled &&
          token === searchToken.current
        ) {
          setSuggestions(results);
          setSearched(true);
        }
      } catch (e) {
        if (
          !cancelled &&
          token === searchToken.current &&
          e.name !== "AbortError"
        ) {
          setError(e.message);
        }
      } finally {
        if (
          !cancelled &&
          token === searchToken.current
        ) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    activeField,
    query,
    retry,
    gettingCurrent,
    searchPlacesFn,
    minQueryLength,
  ]);

  useEffect(
    () => () => {
      currentToken.current += 1;
      searchToken.current += 1;
      requestRef.current?.abort();
    },
    [],
  );

  const cancelRequests = () => {
    currentToken.current += 1;
    currentPending.current = false;
    searchToken.current += 1;
    requestRef.current?.abort();

    setGettingCurrent(false);
    setCurrentError("");
  };

  const focusField = (field) => {
    cancelRequests();
    setActiveField(field);
    setRetry((value) => value + 1);
  };

  const edit = (field, value) => {
    cancelRequests();
    setActiveField(field);

    (
      field === "origin"
        ? setLocationText
        : setDestinationText
    )(value);
  };

  const select = (place) => {
    cancelRequests();
    onSelectPlace(activeField, place);
    setActiveField(null);
    Keyboard.dismiss();
  };

  const selectCurrentLocation = async () => {
    const field = activeField;

    if (!field || currentPending.current) return;

    cancelRequests();
    currentPending.current = true;

    const token = ++currentToken.current;

    setGettingCurrent(true);
    setSuggestions([]);
    setError("");

    (
      field === "origin"
        ? setLocationText
        : setDestinationText
    )("");

    Keyboard.dismiss();

    try {
      const snapshot = await refreshLocation();

      if (token !== currentToken.current) return;

      const place = mapCurrentLocation(snapshot);

      onSelectPlace(field, place);
      setActiveField(null);
    } catch (error) {
      if (token === currentToken.current) {
        setCurrentError(
          error.message ||
            "Could not read your location. Please try again.",
        );
      }
    } finally {
      if (token === currentToken.current) {
        currentPending.current = false;
        setGettingCurrent(false);
      }
    }
  };

  return (
    <View>
      <View style={styles.locationCard}>
        <View style={styles.inputsContainer}>
          <View style={styles.locationRow}>
            <View style={styles.iconColumn}>
              <View style={styles.originDot} />
            </View>

            <TextInput
              style={styles.textInput}
              value={locationText}
              onChangeText={(value) =>
                edit("origin", value)
              }
              onFocus={() =>
                focusField("origin")
              }
              placeholder="Starting point"
              placeholderTextColor="#777777"
              accessibilityLabel="Starting point"
              autoCorrect={false}
            />
          </View>

          <View style={styles.locationDividerRow}>
            <View style={styles.dottedConnector} />
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.locationRow}>
            <View style={styles.iconColumn}>
              <Ionicons
                name="location"
                size={18}
                color="#C76C9B"
              />
            </View>

            <TextInput
              style={styles.textInput}
              value={destinationText}
              onChangeText={(value) =>
                edit("destination", value)
              }
              onFocus={() =>
                focusField("destination")
              }
              placeholder="Destination"
              placeholderTextColor="#777777"
              accessibilityLabel="Destination"
              autoCorrect={false}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.swapButton}
          accessibilityLabel="Swap starting point and destination"
          onPress={() => {
            cancelRequests();
            setActiveField(null);
            Keyboard.dismiss();
            onSwapLocations();
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="swap-vert"
            size={24}
            color="#555555"
          />
        </TouchableOpacity>
      </View>

      {activeField && (
        <View style={styles.searchResults}>
          <View style={styles.searchResultHeader}>
            <Text style={styles.searchHint}>
              Select a{" "}
              {activeField === "origin"
                ? "starting point"
                : "destination"} in the Cubao area
            </Text>

            <TouchableOpacity
              onPress={() => {
                cancelRequests();
                setActiveField(null);
                Keyboard.dismiss();
              }}
              accessibilityLabel="Close search suggestions"
            >
              <Ionicons
                name="close"
                size={20}
                color="#654255"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.searchResult,
              {
                borderBottomWidth:
                  suggestions.length > 0 ? 1 : 0,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Use current location"
            disabled={gettingCurrent}
            onPress={selectCurrentLocation}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="locate"
                size={20}
                color="#C76C9B"
              />

              <View
                style={{
                  flex: 1,
                  marginLeft: 10,
                }}
              >
                <Text style={styles.stopTitle}>
                  Current location
                </Text>

                <Text style={styles.stopSubtitle}>
                  {gettingCurrent
                    ? "Getting your location..."
                    : "Use your phone's latest location"}
                </Text>
              </View>

              {gettingCurrent && (
                <ActivityIndicator color="#C76C9B" />
              )}
            </View>
          </TouchableOpacity>

          {!!currentError && (
            <Text
              style={styles.routeError}
              accessibilityLiveRegion="polite"
            >
              {currentError}
            </Text>
          )}

          {loading && (
            <ActivityIndicator color="#C76C9B" />
          )}

          {!!error && (
            <TouchableOpacity
              onPress={() =>
                setRetry((value) => value + 1)
              }
            >
              <Text style={styles.routeError}>
                {error} Tap to retry.
              </Text>
            </TouchableOpacity>
          )}

          {searched &&
            !loading &&
            !error &&
            !suggestions.length && (
              <Text style={styles.searchHint}>
                No matching places in the Cubao area. Try another nearby place or street.
              </Text>
            )}

          {suggestions.map((place) => (
            <TouchableOpacity
              key={place.id}
              style={styles.searchResult}
              onPress={() => select(place)}
              accessibilityRole="button"
            >
              <Text style={styles.stopTitle}>
                {place.name}
              </Text>

              <Text style={styles.stopSubtitle}>
                {place.address}
              </Text>
            </TouchableOpacity>
          ))}

          {!!suggestions.length && searchPlacesFn === searchPlaces && (
            <ProviderAttribution />
          )}
        </View>
      )}
    </View>
  );
}

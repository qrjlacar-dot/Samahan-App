import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { searchPlaces } from "../../services/routes";
import { styles } from "../../styles/directions.styles";
import ProviderAttribution from "./ProviderAttribution";

export default function LocationInputCard({
  locationText,
  setLocationText,
  destinationText,
  setDestinationText,
  onSwapLocations,
  onSelectPlace,
}) {
  const [activeField, setActiveField] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [retry, setRetry] = useState(0);
  const requestRef = useRef(null);
  const query = activeField === "origin" ? locationText : destinationText;

  useEffect(() => {
    setSuggestions([]);
    setError("");
    setSearched(false);
    setLoading(false);
    if (!activeField || query.trim().length < 3) return;
    const controller = new AbortController();
    requestRef.current = controller;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchPlaces(query, {
          signal: controller.signal,
        });
        if (!cancelled) {
          setSuggestions(results);
          setSearched(true);
        }
      } catch (e) {
        if (!cancelled && e.name !== "AbortError") setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [activeField, query, retry]);

  const edit = (field, value) => {
    requestRef.current?.abort();
    setActiveField(field);
    (field === "origin" ? setLocationText : setDestinationText)(value);
  };
  const select = (place) => {
    requestRef.current?.abort();
    onSelectPlace(activeField, place);
    setActiveField(null);
    Keyboard.dismiss();
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
              onChangeText={(v) => edit("origin", v)}
              onFocus={() => setActiveField("origin")}
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
              <Ionicons name="location" size={18} color="#C76C9B" />
            </View>
            <TextInput
              style={styles.textInput}
              value={destinationText}
              onChangeText={(v) => edit("destination", v)}
              onFocus={() => setActiveField("destination")}
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
            requestRef.current?.abort();
            setActiveField(null);
            Keyboard.dismiss();
            onSwapLocations();
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="swap-vert" size={24} color="#555555" />
        </TouchableOpacity>
      </View>
      {activeField && (
        <View style={styles.searchResults}>
          <View style={styles.searchResultHeader}>
            <Text style={styles.searchHint}>
              Select a{" "}
              {activeField === "origin" ? "starting point" : "destination"}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setActiveField(null);
                Keyboard.dismiss();
              }}
              accessibilityLabel="Close search suggestions"
            >
              <Ionicons name="close" size={20} color="#654255" />
            </TouchableOpacity>
          </View>
          {query.trim().length < 3 && (
            <Text style={styles.searchHint}>Type at least 3 characters.</Text>
          )}
          {loading && <ActivityIndicator color="#C76C9B" />}
          {!!error && (
            <TouchableOpacity onPress={() => setRetry((v) => v + 1)}>
              <Text style={styles.routeError}>{error} Tap to retry.</Text>
            </TouchableOpacity>
          )}
          {searched && !loading && !error && !suggestions.length && (
            <Text style={styles.searchHint}>
              No places found. Try the full name and city, or a nearby street.
            </Text>
          )}
          {suggestions.map((place) => (
            <TouchableOpacity
              key={place.id}
              style={styles.searchResult}
              onPress={() => select(place)}
              accessibilityRole="button"
            >
              <Text style={styles.stopTitle}>{place.name}</Text>
              <Text style={styles.stopSubtitle}>{place.address}</Text>
            </TouchableOpacity>
          ))}
          {!!suggestions.length && <ProviderAttribution />}
        </View>
      )}
    </View>
  );
}

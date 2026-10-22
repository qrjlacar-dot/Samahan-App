import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { scale } from "../../constants/scale";
import { COLORS } from "../../constants/theme";
import { loadFavorites, removeFavorite } from "../../services/favorites";
import { useAuth } from "../../context/AuthContext";
import { styles } from "../../styles/favorites.styles";

const MODE_LABELS = { bus: "Bus", jeep: "Jeep", train: "Train", walk: "Walk" };
const TICKET_LABELS = { regular: "Regular fare", discounted: "Discounted fare" };

export default function FavoritesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.uid;
  const [favorites, setFavorites] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [removingId, setRemovingId] = useState(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    if (!uid) {
      setFavorites([]);
      setStatus("ready");
      return;
    }
    setStatus("loading");
    try {
      const items = await loadFavorites(uid);
      if (id !== requestId.current) return; // ignore stale result
      setFavorites(items);
      setStatus("ready");
    } catch {
      if (id !== requestId.current) return;
      setStatus("error");
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        requestId.current += 1;
      };
    }, [load]),
  );

  const showDirections = (favorite) => {
    // Send only the choices; Directions requests a fresh route.
    const journey = {
      origin: favorite.origin,
      destination: favorite.destination,
      preferredMode: favorite.preferredMode,
      ticketType: favorite.ticketType,
    };
    router.push({
      pathname: "/directions",
      params: { journey: JSON.stringify(journey) },
    });
  };

  const confirmRemove = (favorite) => {
    Alert.alert(
      "Remove favorite",
      `Remove ${favorite.origin.name} to ${favorite.destination.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
                    if (!uid || removingId) return;
            setRemovingId(favorite.id);
            try {
              await removeFavorite(uid, favorite.id);
              setFavorites((current) =>
                current.filter((item) => item.id !== favorite.id),
              );
            } catch {
              Alert.alert("Could not remove", "Please try again.");
            } finally {
              setRemovingId(null);
            }
          },
        },
      ],
    );
  };

  const addFavorite = () => {
    router.push("/directions");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your Favorite Routes!</Text>
        <Text style={styles.subtitle}>Commute tayo, ano tara?!</Text>

        {status === "loading" && (
          <View style={styles.routeList}>
            <ActivityIndicator color={COLORS.pink} />
          </View>
        )}

        {status === "error" && (
          <View style={styles.routeList}>
            <Text style={styles.subtitle}>
              We could not load your favorites.
            </Text>
            <Pressable style={styles.directionsButton} onPress={load}>
              <Text style={styles.directionsButtonText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {status === "ready" && favorites.length === 0 && (
          <View style={styles.routeList}>
            <Text style={styles.subtitle}>
              No favorites yet. Save a journey from Directions and it will
              show up here.
            </Text>
          </View>
        )}

        {status === "ready" && favorites.length > 0 && (
          <View style={styles.routeList}>
            {favorites.map((favorite) => (
              <View key={favorite.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.routeIcon}>
                    <Ionicons
                      name="location-outline"
                      size={scale(23)}
                      color={COLORS.pink}
                    />
                  </View>
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeName} numberOfLines={2}>
                      {favorite.origin.name} to {favorite.destination.name}
                    </Text>
                    <Text style={styles.distance} numberOfLines={2}>
                      {favorite.destination.address}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => confirmRemove(favorite)}
                    disabled={removingId === favorite.id}
                    accessibilityLabel="Remove favorite"
                  >
                    <Ionicons
                      name="heart"
                      size={scale(22)}
                      color={COLORS.pink}
                    />
                  </Pressable>
                </View>
                <View style={styles.detailsRow}>
                  <View style={styles.scheduleRow}>
                    <Ionicons
                      name="bus-outline"
                      size={scale(13)}
                      color={COLORS.textLight}
                    />
                    <Text style={styles.detailsText}>
                      {MODE_LABELS[favorite.preferredMode]}
                    </Text>
                  </View>
                  <View style={styles.statusRow}>
                    <Text style={styles.detailsText}>
                      {TICKET_LABELS[favorite.ticketType]}
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={styles.directionsButton}
                  onPress={() => showDirections(favorite)}
                >
                  <Text style={styles.directionsButtonText}>
                    Get Directions
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <Pressable style={styles.addButton} onPress={addFavorite}>
        <Text style={styles.addButtonText}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}
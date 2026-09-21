import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { scale, scaleFont } from "../../constants/scale";
import { COLORS, FONT_SIZES, RADIUS, SPACING } from "../../constants/theme";

// Colors with no match in theme.js yet. Candidates to move into COLORS.
const LOCAL_COLORS = {
  pinkSoft: "#F7DCEB", // icon badge background
  success: "#4F9B6D", // "Open" status
};

const favoriteRoutes = [
  {
    name: "TIP QC",
    distance: "350m away",
    schedule: "7:30 AM - 5:00 PM",
    status: "Open",
  },
  {
    name: "Gateway Cubao",
    distance: "350m away",
    schedule: "7:30 AM - 9:00 PM",
    status: "Open",
  },
];

export default function FavoritesScreen() {
  const showDirections = (routeName) => {
    Alert.alert("Directions", `Opening directions for ${routeName}.`);
  };

  const addFavorite = () => {
    Alert.alert("Add Favorite", "You can add a new favorite route here.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your Favorite Routes!</Text>
        <Text style={styles.subtitle}>Commute tayo, ano tara?!</Text>

        <View style={styles.routeList}>
          {favoriteRoutes.map((route) => (
            <View key={route.name} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.routeIcon}>
                  <Ionicons
                    name="location-outline"
                    size={scale(23)}
                    color={COLORS.pink}
                  />
                </View>

                <View style={styles.routeInfo}>
                  <Text style={styles.routeName}>{route.name}</Text>
                  <Text style={styles.distance}>{route.distance}</Text>
                </View>

                <Ionicons
                  name="heart-outline"
                  size={scale(22)}
                  color={COLORS.pink}
                />
              </View>

              <View style={styles.detailsRow}>
                <View style={styles.scheduleRow}>
                  <Ionicons
                    name="time-outline"
                    size={scale(13)}
                    color={COLORS.textLight}
                  />
                  <Text style={styles.detailsText}>{route.schedule}</Text>
                </View>

                <View style={styles.statusRow}>
                  <View style={styles.statusDot} />
                  <Text style={styles.openText}>{route.status}</Text>
                </View>
              </View>

              <Pressable
                style={styles.directionsButton}
                onPress={() => showDirections(route.name)}
              >
                <Text style={styles.directionsButtonText}>Get Directions</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>

      <Pressable style={styles.addButton} onPress={addFavorite}>
        <Text style={styles.addButtonText}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: scale(130),
  },
  title: {
    color: COLORS.pink,
    fontSize: scaleFont(28),
    fontWeight: "bold",
    marginTop: SPACING.md,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: scaleFont(15),
    marginTop: scale(2),
    marginBottom: SPACING.lg,
  },
  routeList: {
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeIcon: {
    width: scale(42),
    height: scale(42),
    borderRadius: RADIUS.input,
    backgroundColor: LOCAL_COLORS.pinkSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  routeInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  routeName: {
    color: COLORS.pink,
    fontSize: scaleFont(FONT_SIZES.subtitle),
    fontWeight: "700",
  },
  distance: {
    color: COLORS.textLight,
    fontSize: scaleFont(FONT_SIZES.small),
    marginTop: scale(3),
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.md,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailsText: {
    color: COLORS.textLight,
    fontSize: scaleFont(FONT_SIZES.small),
    marginLeft: scale(4),
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: scale(5),
    height: scale(5),
    borderRadius: scale(5) / 2,
    backgroundColor: LOCAL_COLORS.success,
    marginRight: scale(5),
  },
  openText: {
    color: LOCAL_COLORS.success,
    fontSize: scaleFont(FONT_SIZES.small),
    fontWeight: "700",
  },
  directionsButton: {
    backgroundColor: COLORS.pink,
    borderRadius: RADIUS.input,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  directionsButtonText: {
    color: COLORS.cardBg,
    fontSize: scaleFont(FONT_SIZES.body),
    fontWeight: "700",
  },
  addButton: {
    position: "absolute",
    right: SPACING.lg,
    bottom: SPACING.lg,
    width: scale(54),
    height: scale(54),
    borderRadius: scale(54) / 2,
    backgroundColor: COLORS.pink,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  addButtonText: {
    color: COLORS.cardBg,
    fontSize: scaleFont(FONT_SIZES.titleLarge),
    fontWeight: "300",
    marginTop: -scale(3),
  },
});
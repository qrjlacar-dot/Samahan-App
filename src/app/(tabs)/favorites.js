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
                  <Ionicons name="location-outline" size={23} color="#CF6FA7" />
                </View>

                <View style={styles.routeInfo}>
                  <Text style={styles.routeName}>{route.name}</Text>
                  <Text style={styles.distance}>{route.distance}</Text>
                </View>

                <Ionicons name="heart-outline" size={22} color="#CF6FA7" />
              </View>

              <View style={styles.detailsRow}>
                <View style={styles.scheduleRow}>
                  <Ionicons name="time-outline" size={13} color="#9B7A8D" />
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
    backgroundColor: "#FFF9FC",
  },
  content: {
    padding: 22,
    paddingBottom: 130,
  },
  title: {
    color: "#CF6FA7",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 16,
  },
  subtitle: {
    color: "#7A5C6D",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 24,
  },
  routeList: {
    gap: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
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
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#F7DCEB",
    alignItems: "center",
    justifyContent: "center",
  },
  routeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  routeName: {
    color: "#C7649B",
    fontSize: 16,
    fontWeight: "700",
  },
  distance: {
    color: "#9B7A8D",
    fontSize: 12,
    marginTop: 3,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailsText: {
    color: "#8B6B7E",
    fontSize: 11,
    marginLeft: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#4F9B6D",
    marginRight: 5,
  },
  openText: {
    color: "#4F9B6D",
    fontSize: 11,
    fontWeight: "700",
  },
  directionsButton: {
    backgroundColor: "#BE6398",
    borderRadius: 7,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 15,
  },
  directionsButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  addButton: {
    position: "absolute",
    right: 24,
    bottom: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#CF6FA7",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "300",
    marginTop: -3,
  },
});
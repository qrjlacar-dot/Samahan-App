import { styles } from "../../styles/favorites.styles";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { scale } from "../../constants/scale";
import { COLORS } from "../../constants/theme";

const favoriteRoutes = [{
  name: "TIP QC",
  distance: "350m away",
  schedule: "7:30 AM - 5:00 PM",
  status: "Open"
}, {
  name: "Gateway Cubao",
  distance: "350m away",
  schedule: "7:30 AM - 9:00 PM",
  status: "Open"
}];
export default function FavoritesScreen() {
  const showDirections = routeName => {
    Alert.alert("Directions", `Opening directions for ${routeName}.`);
  };
  const addFavorite = () => {
    Alert.alert("Add Favorite", "You can add a new favorite route here.");
  };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          Your Favorite Routes!
        </Text>
        <Text style={styles.subtitle}>
          Commute tayo, ano tara?!
        </Text>
        <View style={styles.routeList}>
          {favoriteRoutes.map(route => <View
            key={route.name}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <View style={styles.routeIcon}>
                <Ionicons
                  name="location-outline"
                  size={scale(23)}
                  color={COLORS.pink}
                />
              </View>
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>
                  {route.name}
                </Text>
                <Text style={styles.distance}>
                  {route.distance}
                </Text>
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
                <Text style={styles.detailsText}>
                  {route.schedule}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.openText}>
                  {route.status}
                </Text>
              </View>
            </View>
            <Pressable
              style={styles.directionsButton}
              onPress={() => showDirections(route.name)}
            >
              <Text style={styles.directionsButtonText}>
                Get Directions
              </Text>
            </Pressable>
          </View>)}
        </View>
      </ScrollView>
      <Pressable
        style={styles.addButton}
        onPress={addFavorite}
      >
        <Text style={styles.addButtonText}>
          +
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

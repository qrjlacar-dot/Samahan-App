import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../styles/notifications.styles";

const FILTERS = ["All", "Trips", "Safety", "Favorites"];
const SECTIONS = [{
  key: "today",
  label: "TODAY",
  count: 2
}, {
  key: "safety",
  label: "SAFETY ALERTS",
  count: 2
}, {
  key: "trips",
  label: "TRIP REMINDERS",
  count: 3
}];
function PlaceholderRow() {
  return (
    <View style={styles.placeholderRow}>
      <View style={styles.placeholderIcon} />
    </View>
  );
}
export default function NotificationsScreen() {
  return (
    <SafeAreaView
      style={styles.page}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          Notifications
        </Text>
        <Text style={styles.subtitle}>
          Stay updated on routes, trips, and alerts!
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
      >
        {FILTERS.map(filter => <TouchableOpacity
          key={filter}
          style={styles.pill}
        >
          <Text style={styles.pillText}>
            {filter}
          </Text>
        </TouchableOpacity>)}
      </ScrollView>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map(section => <View
          key={section.key}
          style={styles.section}
        >
          <Text style={styles.sectionHeader}>
            {section.label}
          </Text>
          {Array.from({
  length: section.count
}).map((_, i) => <PlaceholderRow key={`${section.key}-${i}`} />)}
        </View>)}
      </ScrollView>
    </SafeAreaView>
  );
}

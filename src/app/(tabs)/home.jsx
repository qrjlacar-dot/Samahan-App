import { useRouter } from "expo-router";
import { IMAGES } from "../../constants/images";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Image, Linking, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../styles/home.styles";

export default function Home() {
  const router = useRouter();
  const handleEmergencyCall = async (title, number) => {
    try {
      await Linking.openURL(`tel:${number}`);
    } catch {
      Alert.alert(
        "Unable to call",
        `Your device could not open the phone app for ${title}.`
      );
    }
  };
  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
    >
      <View style={styles.scrollContent}>
        {/* Header Greeting */}
        <View style={styles.headerContainer}>
          <Text style={styles.greetingTitle}>
            Magandang Umaga!
          </Text>
          <Text style={styles.subTitle}>
            Commute tayo, ano tara?!
          </Text>
        </View>
        {/* Map Placeholder Card */}
        <View style={styles.mapContainer}>
          <Image
            source={IMAGES.mapPlaceholder}
            style={styles.mapImage}
            resizeMode="cover"
          />
          {/* Location Pill Overlay */}
          <View style={styles.locationPill}>
            <View style={styles.locationDot} />
            <Text style={styles.locationText}>
              Cubao, Quezon City
            </Text>
          </View>
        </View>
        {/* Emergency Contacts Card */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyHeader}>
            <View style={styles.sirenBadge}>
              <Image
                source={IMAGES.emergency}
                style={styles.sirenIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.emergencyTitle}>
              Emergency Contacts
            </Text>
          </View>
          {/* 3 Circular Actions Container */}
          <View style={styles.emergencyActionsContainer}>
            <TouchableOpacity
              style={styles.contactButton}
              activeOpacity={0.7}
              onPress={() => router.push("/emergency-contacts")}
            >
              <View style={styles.blueCircle}>
                <Ionicons
                  name="person"
                  size={22}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.buttonLabel}>
                Personal Emergency
                {"\n"}
                Contact
              </Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.contactButton}
              activeOpacity={0.7}
              onPress={() => handleEmergencyCall("National Hotline", "911")}
            >
              <View style={styles.redCircle}>
                <Text style={styles.hotlineText}>
                  911
                </Text>
              </View>
              <Text style={styles.buttonLabel}>
                National Hotline
              </Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.contactButton}
              activeOpacity={0.7}
              onPress={() => handleEmergencyCall("QC Emergency Hotline", "122")}
            >
              <View style={styles.redCircle}>
                <Text style={styles.hotlineText}>
                  122
                </Text>
              </View>
              <Text style={styles.buttonLabel}>
                QC Emergency
                {"\n"}
                Hotline
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../styles/home.styles";

export default function Home() {
  const router = useRouter();
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });

  const initialRegion = {
    latitude: 14.6255,
    longitude: 121.0603,
    latitudeDelta: 0.0422,
    longitudeDelta: 0.0421,
  };

  const goToDirections = () => {
    router.push({
      pathname: "/directions",
      params: { collapsed: "true" },
    });
  };

  const handleEmergencyCall = async (title, number) => {
    try {
      await Linking.openURL(`tel:${number}`);
    } catch {
      Alert.alert(
        "Unable to call",
        `Could not open the dialer for ${title}.`
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.scrollContent ?? styles.content}>
        {/* Header Greeting */}
        <View style={styles.headerContainer}>
          <Text style={styles.greetingTitle}>Magandang Umaga!</Text>
          <Text style={styles.subTitle}>Commute tayo, ano tara?!</Text>
        </View>

        {/* Map Preview Card */}
        <Pressable
          onPress={goToDirections}
          style={[
            styles.mapCardContainer,
            {
              overflow: "visible",
              borderWidth: 0,
              borderRadius: 32,
              backgroundColor: "#FFFFFF",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 5,
            },
          ]}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setMapSize({ width, height });
          }}
        >
          {mapSize.width > 0 && mapSize.height > 0 && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: mapSize.width,
                height: mapSize.height,
                borderRadius: 32,
                overflow: "hidden",
                pointerEvents: "none",
              }}
            >
              <MapView
                provider={
                  Platform.OS === "android" ? PROVIDER_GOOGLE : undefined
                }
                style={{
                  width: mapSize.width,
                  height: mapSize.height,
                  borderRadius: 32,
                }}
                initialRegion={initialRegion}
                zoomEnabled={false}
                scrollEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                toolbarEnabled={false}
              />
            </View>
          )}

          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                borderRadius: 32,
                borderWidth: 1,
                borderColor: "#E8D8E0",
                pointerEvents: "none",
              },
            ]}
          />

          <View style={[styles.locationPill, { pointerEvents: "none" }]}>
            <View style={styles.locationDot} />
            <Text style={styles.locationText}>Cubao, Quezon City</Text>
          </View>
        </Pressable>

        {/* Emergency Contacts Card */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyHeader}>
            <View style={styles.sirenBadge}>
              <Image
                source={require("../../../assets/images/emergency 1.png")}
                style={styles.sirenIcon}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.emergencyTitle}>Emergency Contacts</Text>
          </View>

          <View style={styles.emergencyActionsContainer}>
            <TouchableOpacity
              style={styles.contactButton}
              activeOpacity={0.7}
              onPress={() => router.push("/emergency-contacts")}
            >
              <View style={styles.blueCircle}>
                <Ionicons name="person" size={22} color="#FFFFFF" />
              </View>

              <Text style={styles.buttonLabel}>
                Personal Emergency{"\n"}Contact
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.contactButton}
              activeOpacity={0.7}
              onPress={() =>
                handleEmergencyCall("National Hotline", "911")
              }
            >
              <View style={styles.redCircle}>
                <Text style={styles.hotlineText}>911</Text>
              </View>

              <Text style={styles.buttonLabel}>National Hotline</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.contactButton}
              activeOpacity={0.7}
              onPress={() =>
                handleEmergencyCall("QC Emergency Hotline", "122")
              }
            >
              <View style={styles.redCircle}>
                <Text style={styles.hotlineText}>122</Text>
              </View>

              <Text style={styles.buttonLabel}>
                QC Emergency{"\n"}Hotline
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Alert,
  Image,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CommuteMap } from "../../components/CommuteMap";
import { LOCATION_STATUS } from "../../constants/commute";
import { IMAGES } from "../../constants/images";
import { useMapLocation } from "../../hooks/useMapLocation";
import { LOCATION_LABELS } from "../../services/location";
import { styles } from "../../styles/home.styles";

export default function Home() {
  const router = useRouter();

  const {
    snapshot,
    refreshLocation,
    requestEnableLocation,
  } = useMapLocation();

  const hasFix =
    snapshot.status === LOCATION_STATUS.READY ||
    snapshot.status === LOCATION_STATUS.OUTSIDE_AREA;

  const canRetryLocation =
    snapshot.status === LOCATION_STATUS.DENIED ||
    snapshot.status === LOCATION_STATUS.UNAVAILABLE;

  const LocationPill = canRetryLocation
    ? TouchableOpacity
    : View;

  const handleLocationPress = () => {
    if (
      snapshot.status === LOCATION_STATUS.UNAVAILABLE &&
      snapshot.label === LOCATION_LABELS.servicesOff
    ) {
      requestEnableLocation();
      return;
    }

    if (snapshot.status === LOCATION_STATUS.DENIED) {
      Alert.alert(
        "Location access is off",
        "Turn on location for SAMAHAN in your phone settings, or try again.",
        [
          {
            text: "Open settings",
            onPress: () => {
              Linking.openSettings().catch(() => {});
            },
          },
          {
            text: "Try again",
            onPress: () => refreshLocation(),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ],
      );

      return;
    }

    refreshLocation();
  };

  const handleEmergencyCall = async (title, number) => {
    try {
      await Linking.openURL(`tel:${number}`);
    } catch {
      Alert.alert(
        "Unable to call",
        `Your device could not open the phone app for ${title}.`,
      );
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
    >
      <View style={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.greetingTitle}>
            Magandang Umaga!
          </Text>

          <Text style={styles.subTitle}>
            Commute tayo, ano tara?!
          </Text>
        </View>

        <TouchableOpacity
          style={styles.mapContainer}
          onPress={() =>
            router.push({
              pathname: "/directions",
              params: { collapsed: "true" },
            })
          }
          activeOpacity={0.9}
        >
          <CommuteMap
            style={styles.mapImage}
            interactive={false}
            userPosition={snapshot.position}
            followUser={
              hasFix && snapshot.position != null
            }
            followZoom={15}
          />

          <LocationPill
            style={styles.locationPill}
            {...(
              canRetryLocation
                ? {
                    onPress: handleLocationPress,
                    activeOpacity: 0.8,
                  }
                : {}
            )}
          >
            <View
              style={[
                styles.locationDot,
                !hasFix && styles.locationDotMuted,
              ]}
            />

            <Text style={styles.locationText}>
              {snapshot.label}
            </Text>
          </LocationPill>
        </TouchableOpacity>

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

          <View style={styles.emergencyActionsContainer}>
            <TouchableOpacity
              style={styles.contactButton}
              activeOpacity={0.7}
              onPress={() =>
                router.push("/emergency-contacts")
              }
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
              onPress={() =>
                handleEmergencyCall(
                  "National Hotline",
                  "911",
                )
              }
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
              onPress={() =>
                handleEmergencyCall(
                  "QC Emergency Hotline",
                  "122",
                )
              }
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
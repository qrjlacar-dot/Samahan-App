import TripSummaryBadge from "./TripSummaryBadge";
import { Ionicons } from "@expo/vector-icons";

import { Text, TouchableOpacity, View } from "react-native";

import { styles } from "../../styles/directions.styles";

export default function TripDetailsCard({
  selectedMode,
  ticketType,
  isFavorite,
  onToggleFavorite,
}) {
  const renderTimelineSteps = () => {
    if (selectedMode === "walk") {
      return (
        <View style={styles.timelineContainer}>
          <View style={styles.timelineItem}>
            <View style={styles.verticalDottedConnector} />

            <View style={styles.timelineIconColumn}>
              <View style={styles.solidDot} />
            </View>

            <View style={styles.timelineContent}>
              <Text style={styles.stopTitle}>TIP QC</Text>

              <Text style={styles.stopSubtitle}>Walk (20m)</Text>
            </View>
          </View>

          <View style={styles.timelineItem}>
            <View style={styles.verticalDottedConnector} />

            <View style={styles.timelineIconColumn}>
              <View style={styles.hollowCircle} />
            </View>

            <View style={styles.timelineContent}>
              <Text style={styles.stopTitle}>Walk along Aurora Blvd</Text>

              <Text style={styles.stopSubtitle}>Walk (950 m)</Text>
            </View>
          </View>

          <View style={styles.timelineItem}>
            <View style={styles.timelineIconColumn}>
              <Ionicons name="location" size={22} color="#D180AA" />
            </View>

            <View style={styles.timelineContent}>
              <Text style={styles.stopTitle}>Arrive at Gateway Mall</Text>

              <Text style={styles.stopSubtitle}>
                You have reached your destination
              </Text>
            </View>
          </View>
        </View>
      );
    }

    const modeData = {
      bus: {
        title: "Ride Cubao/Stopshop",
        fare: ticketType === "discounted" ? "₱ 10.50" : "₱ 13.00",
      },

      jeep: {
        title: "Ride Cubao Jeepney",
        fare: ticketType === "discounted" ? "₱ 11.00" : "₱ 13.00",
      },

      train: {
        title: "Take LRT-2 Anonas to Cubao",
        fare: ticketType === "discounted" ? "₱ 12.00" : "₱ 15.00",
      },
    };

    const currentMode = modeData[selectedMode] || modeData.bus;

    return (
      <View style={styles.timelineContainer}>
        <View style={styles.timelineItem}>
          <View style={styles.verticalDottedConnector} />

          <View style={styles.timelineIconColumn}>
            <View style={styles.solidDot} />
          </View>

          <View style={styles.timelineContent}>
            <Text style={styles.stopTitle}>TIP QC</Text>

            <Text style={styles.stopSubtitle}>Walk (20m)</Text>
          </View>
        </View>

        <View style={styles.timelineItem}>
          <View style={styles.verticalDottedConnector} />

          <View style={styles.timelineIconColumn}>
            <View style={styles.hollowCircle} />
          </View>

          <View style={styles.timelineContent}>
            <View style={styles.stopTitleRow}>
              <Text style={styles.stopTitle}>{currentMode.title}</Text>

              <View style={styles.farePill}>
                <Text style={styles.fareText}>{currentMode.fare}</Text>
              </View>
            </View>

            <Text style={styles.stopSubtitle}>Ride (1.5 km)</Text>
          </View>
        </View>

        <View style={styles.timelineItem}>
          <View style={styles.verticalDottedConnector} />

          <View style={styles.timelineIconColumn}>
            <View style={styles.hollowCircle} />
          </View>

          <View style={styles.timelineContent}>
            <Text style={styles.stopTitle}>Cross to Araneta City</Text>

            <Text style={styles.stopSubtitle}>Walk (150 m)</Text>
          </View>
        </View>

        <View style={styles.timelineItem}>
          <View style={styles.timelineIconColumn}>
            <Ionicons name="location" size={22} color="#D180AA" />
          </View>

          <View style={styles.timelineContent}>
            <Text style={styles.stopTitle}>Arrive at Gateway Mall</Text>

            <Text style={styles.stopSubtitle}>
              You have reached your destination
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <Text style={styles.tripTitle}>Trip Details</Text>

        <TouchableOpacity onPress={onToggleFavorite}>
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={22}
            color={isFavorite ? "#C76C9B" : "#333333"}
          />
        </TouchableOpacity>
      </View>

      <TripSummaryBadge selectedMode={selectedMode} />
      {renderTimelineSteps()}
    </View>
  );
}

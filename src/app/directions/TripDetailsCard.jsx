import { FontAwesome5, Ionicons } from "@expo/vector-icons";

import { Image, Text, TouchableOpacity, View } from "react-native";

import { styles } from "../../styles/directions.styles";

export default function TripDetailsCard({
  selectedMode,
  ticketType,
  isFavorite,
  onToggleFavorite,
}) {
  const renderSummaryBadge = () => {
    switch (selectedMode) {
      case "jeep":
        return (
          <View style={styles.summaryBadgePill}>
            <Image
              source={require("../../../assets/images/jeep.png")}
              style={{
                width: 16,
                height: 16,
                tintColor: "#C76C9B",
                resizeMode: "contain",
              }}
            />

            <Text style={styles.badgeText}>Jeep</Text>

            <Text style={styles.badgeDivider}>|</Text>

            <Text style={styles.badgeDetailText}>1.2 km</Text>

            <Text style={styles.badgeDivider}>|</Text>

            <Text style={styles.badgeDetailText}>12 mins</Text>
          </View>
        );

      case "train":
        return (
          <View style={styles.summaryBadgePill}>
            <Image
              source={require("../../../assets/images/train.png")}
              style={{
                width: 16,
                height: 16,
                tintColor: "#C76C9B",
                resizeMode: "contain",
              }}
            />

            <Text style={styles.badgeText}>Train</Text>

            <Text style={styles.badgeDivider}>|</Text>

            <Text style={styles.badgeDetailText}>1.2 km</Text>

            <Text style={styles.badgeDivider}>|</Text>

            <Text style={styles.badgeDetailText}>1 min</Text>
          </View>
        );

      case "walk":
        return (
          <View style={styles.summaryBadgePill}>
            <FontAwesome5 name="walking" size={14} color="#C76C9B" />

            <Text style={styles.badgeText}>Walk</Text>

            <Text style={styles.badgeDivider}>|</Text>

            <Text style={styles.badgeDetailText}>1.1 km</Text>

            <Text style={styles.badgeDivider}>|</Text>

            <Text style={styles.badgeDetailText}>15 mins</Text>
          </View>
        );

      case "bus":
      default:
        return (
          <View style={styles.summaryBadgePill}>
            <FontAwesome5 name="bus" size={14} color="#C76C9B" />

            <Text style={styles.badgeText}>Bus</Text>

            <Text style={styles.badgeDivider}>|</Text>

            <Text style={styles.badgeDetailText}>1.2 km</Text>

            <Text style={styles.badgeDivider}>|</Text>

            <Text style={styles.badgeDetailText}>10 mins</Text>
          </View>
        );
    }
  };

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

      {renderSummaryBadge()}
      {renderTimelineSteps()}
    </View>
  );
}

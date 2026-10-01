import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../styles/directions.styles";

export default function LocationInputCard({
  locationText,
  setLocationText,
  destinationText,
  setDestinationText,
  onSwapLocations,
}) {
  return (
    <View style={styles.locationCard}>
      <View style={styles.inputsContainer}>
        {/* Origin Row */}
        <View style={styles.locationRow}>
          <View style={styles.iconColumn}>
            <View style={styles.originDot} />
          </View>
          <TextInput
            style={styles.textInput}
            value={locationText}
            onChangeText={setLocationText}
            placeholder="My Location"
            placeholderTextColor="#777777"
          />
        </View>

        {/* Dotted Connector & Line Divider */}
        <View style={styles.locationDividerRow}>
          <View style={styles.dottedConnector} />
          <View style={styles.dividerLine} />
        </View>

        {/* Destination Row */}
        <View style={styles.locationRow}>
          <View style={styles.iconColumn}>
            <Ionicons name="location" size={18} color="#C76C9B" />
          </View>
          <TextInput
            style={styles.textInput}
            value={destinationText}
            onChangeText={setDestinationText}
            placeholder="Destination"
            placeholderTextColor="#777777"
          />
        </View>
      </View>

      {/* Swap Button */}
      <TouchableOpacity
        style={styles.swapButton}
        onPress={onSwapLocations}
        activeOpacity={0.7}
      >
        <MaterialIcons name="swap-vert" size={24} color="#555555" />
      </TouchableOpacity>
    </View>
  );
}

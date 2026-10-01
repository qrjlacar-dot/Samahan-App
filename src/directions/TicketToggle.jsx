import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../styles/directions.styles";

export default function TicketToggle({ ticketType, onSelectTicketType }) {
  return (
    <View style={styles.toggleContainer}>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          ticketType === "regular" && styles.activeToggleButton,
        ]}
        onPress={() => onSelectTicketType("regular")}
      >
        <Text
          style={[
            styles.toggleText,
            ticketType === "regular" && styles.activeToggleText,
          ]}
        >
          Regular
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.toggleButton,
          ticketType === "discounted" && styles.activeToggleButton,
        ]}
        onPress={() => onSelectTicketType("discounted")}
      >
        <Text
          style={[
            styles.toggleText,
            ticketType === "discounted" && styles.activeToggleText,
          ]}
        >
          Discounted
        </Text>
      </TouchableOpacity>
    </View>
  );
}

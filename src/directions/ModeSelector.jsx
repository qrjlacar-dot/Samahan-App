import { FontAwesome5 } from "@expo/vector-icons";
import { Image, TouchableOpacity, View } from "react-native";
import { styles } from "../styles/directions.styles";

export default function ModeSelector({ selectedMode, onSelectMode }) {
  return (
    <View style={styles.modeRow}>
      {/* Bus Tab */}
      <TouchableOpacity
        style={[styles.modeTab, selectedMode === "bus" && styles.activeModeTab]}
        onPress={() => onSelectMode("bus")}
      >
        <FontAwesome5
          name="bus"
          size={20}
          color={selectedMode === "bus" ? "#FFFFFF" : "#A28F9E"}
        />
      </TouchableOpacity>

      {/* Jeep Tab */}
      <TouchableOpacity
        style={[
          styles.modeTab,
          selectedMode === "jeep" && styles.activeModeTab,
        ]}
        onPress={() => onSelectMode("jeep")}
      >
        <Image
          source={require("../../assets/images/jeep.png")}
          style={[
            styles.customModeIcon,
            {
              tintColor: selectedMode === "jeep" ? "#FFFFFF" : "#A28F9E",
            },
          ]}
        />
      </TouchableOpacity>

      {/* Train Tab */}
      <TouchableOpacity
        style={[
          styles.modeTab,
          selectedMode === "train" && styles.activeModeTab,
        ]}
        onPress={() => onSelectMode("train")}
      >
        <Image
          source={require("../../assets/images/train.png")}
          style={[
            styles.customModeIcon,
            {
              tintColor: selectedMode === "train" ? "#FFFFFF" : "#A28F9E",
            },
          ]}
        />
      </TouchableOpacity>

      {/* Walk Tab */}
      <TouchableOpacity
        style={[
          styles.modeTab,
          selectedMode === "walk" && styles.activeModeTab,
        ]}
        onPress={() => onSelectMode("walk")}
      >
        <FontAwesome5
          name="walking"
          size={20}
          color={selectedMode === "walk" ? "#FFFFFF" : "#A28F9E"}
        />
      </TouchableOpacity>
    </View>
  );
}

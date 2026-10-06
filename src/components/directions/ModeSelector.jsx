import TransportIcon from "./TransportIcon";

import { TouchableOpacity, View } from "react-native";

import { styles } from "../../styles/directions.styles";

export default function ModeSelector({ selectedMode, onSelectMode }) {
  return (
    <View style={styles.modeRow}>
      {/* Bus */}
      <TouchableOpacity
        style={[styles.modeTab, selectedMode === "bus" && styles.activeModeTab]}
        onPress={() => onSelectMode("bus")}
      >
        <TransportIcon
          mode="bus"
          size={20}
          color={selectedMode === "bus" ? "#FFFFFF" : "#A28F9E"}
        />
      </TouchableOpacity>

      {/* Jeep */}
      <TouchableOpacity
        style={[
          styles.modeTab,
          selectedMode === "jeep" && styles.activeModeTab,
        ]}
        onPress={() => onSelectMode("jeep")}
      >
        <TransportIcon
          mode="jeep"
          imageStyle={[
            styles.customModeIcon,
            {
              tintColor: selectedMode === "jeep" ? "#FFFFFF" : "#A28F9E",
            },
          ]}
        />
      </TouchableOpacity>

      {/* Train */}
      <TouchableOpacity
        style={[
          styles.modeTab,
          selectedMode === "train" && styles.activeModeTab,
        ]}
        onPress={() => onSelectMode("train")}
      >
        <TransportIcon
          mode="train"
          imageStyle={[
            styles.customModeIcon,
            {
              tintColor: selectedMode === "train" ? "#FFFFFF" : "#A28F9E",
            },
          ]}
        />
      </TouchableOpacity>

      {/* Walk */}
      <TouchableOpacity
        style={[
          styles.modeTab,
          selectedMode === "walk" && styles.activeModeTab,
        ]}
        onPress={() => onSelectMode("walk")}
      >
        <TransportIcon
          mode="walk"
          size={20}
          color={selectedMode === "walk" ? "#FFFFFF" : "#A28F9E"}
        />
      </TouchableOpacity>
    </View>
  );
}

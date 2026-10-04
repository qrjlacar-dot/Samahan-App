import { FontAwesome5 } from "@expo/vector-icons";
import { Image } from "react-native";
import { IMAGES } from "../../constants/images";

// Keeps the existing icon type, dimensions, tint, and resize mode.
export default function TransportIcon({ mode, size, color, imageStyle }) {
  if (mode === "jeep" || mode === "train") {
    return <Image source={IMAGES[mode]} style={imageStyle} />;
  }

  return (
    <FontAwesome5
      name={mode === "walk" ? "walking" : "bus"}
      size={size}
      color={color}
    />
  );
}

import { Image } from "react-native";
import { IMAGES } from "../constants/images";

export function CommuteMap({ style }) {
  return (
    <Image source={IMAGES.mapPlaceholder} style={style} resizeMode="cover" />
  );
}

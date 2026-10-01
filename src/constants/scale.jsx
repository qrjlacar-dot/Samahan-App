import { Dimensions, PixelRatio } from "react-native";

const REFERENCE_WIDTH = 390;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function scale(size) {
  const newSize = size * (SCREEN_WIDTH / REFERENCE_WIDTH);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

export function scaleFont(size) {
  const newSize = size + (scale(size) - size) * 0.5;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}
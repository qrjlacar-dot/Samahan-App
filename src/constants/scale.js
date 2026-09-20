import { Dimensions, PixelRatio } from "react-native";

// Reference size: the screen width used when originally designing/testing the app
const REFERENCE_WIDTH = 390; // roughly an iPhone 13/14 width, a common baseline

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Scales a number (font size, height, icon size, etc.) based on how the
// current device's width compares to the reference width.
export function scale(size) {
  const newSize = size * (SCREEN_WIDTH / REFERENCE_WIDTH);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

// A gentler version for font sizes specifically — fonts scaling 1:1 with
// width can get too large on big phones/tablets, so this dampens the effect.
export function scaleFont(size) {
  const newSize = size + (scale(size) - size) * 0.5;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}
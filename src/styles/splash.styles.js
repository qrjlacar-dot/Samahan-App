import { StyleSheet } from "react-native";
import { scale } from "../constants/scale";

export const LOGO_SIZE = scale(144);

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FAF0F5",
    overflow: "hidden",
  },
  background: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    height: "70%",
  },
  logoPosition: {
    position: "absolute",
    top: "36%",
    left: "50%",
    marginTop: -LOGO_SIZE / 2,
    marginLeft: -LOGO_SIZE / 2,
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    zIndex: 1,
  },
  logoShadow: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
});

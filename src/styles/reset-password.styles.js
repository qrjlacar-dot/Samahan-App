import { StyleSheet } from "react-native";
import { scale, scaleFont } from "../constants/scale";
import { COLORS, RADIUS } from "../constants/theme";

export const PINK = COLORS.pink;
export const PAGE_BG = COLORS.pageBg;

export const styles = StyleSheet.create({
  content: {
    alignItems: "center",
  },

  mailIconCircle: {
    width: scale(88),
    height: scale(88),
    borderRadius: scale(44),
    backgroundColor: "#F3D9E6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scale(24),
  },

  title: {
    fontSize: scaleFont(32),
    fontWeight: "bold",
    color: COLORS.pink,
    textAlign: "center"
  },

  subtitle: {
    fontSize: scaleFont(15),
    color: COLORS.textMuted,
    marginTop: scale(6),
    marginBottom: scale(20),
    textAlign: "center"
  },

  formContainer: {
    width: "100%",
  },

  errorText: {
    color: COLORS.error,
    fontSize: scaleFont(14),
    marginBottom: scale(12),
  },

  resetButton: {
    width: "100%",
    height: scale(48),
    marginTop: scale(10),
    backgroundColor: COLORS.pink,
    borderRadius: RADIUS.input,
  },

  resetButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: scaleFont(15),
  },

  helperText: {
    color: COLORS.textMuted,
    fontSize: scaleFont(13),
    textAlign: "center",
    marginTop: scale(20),
    lineHeight: scaleFont(19),
  },
});
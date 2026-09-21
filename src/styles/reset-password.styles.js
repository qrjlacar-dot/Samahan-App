import { StyleSheet } from "react-native";
import { COLORS, RADIUS } from "../constants/theme";
import { scale, scaleFont } from "../constants/scale";

export const PINK = COLORS.pink;
export const PAGE_BG = COLORS.pageBg;

export const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
  },

  navbar: {
    height: scale(76),
    backgroundColor: COLORS.cardBg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: "#F0E8EC",
  },

  backButton: {
    width: scale(36),
    height: scale(36),
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    paddingHorizontal: scale(24),
    paddingTop: scale(28),
    paddingBottom: scale(40),
    alignItems: "center",
  },

  title: {
    fontSize: scaleFont(32),
    fontWeight: "bold",
    color: COLORS.pink,
    textAlign: "center",
  },

  subtitle: {
    fontSize: scaleFont(15),
    color: COLORS.textMuted,
    marginTop: scale(6),
    marginBottom: scale(36),
    textAlign: "center",
  },

  formContainer: {
    width: "100%",
  },

  inputWrapper: {
    height: scale(50),
    marginBottom: scale(15),
    justifyContent: "center",
    position: "relative",
  },

  inputField: {
    height: scale(50),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.input,
    paddingHorizontal: scale(15),
    paddingVertical: 0,
    fontSize: scaleFont(16),
    color: COLORS.textDark,
    backgroundColor: COLORS.cardBg,
    textAlignVertical: "center",
  },

  // Password fields: leave room for the eye icon
  inputFieldPassword: {
    paddingRight: scale(44),
  },

  inputFieldFocused: {
    borderColor: COLORS.pink,
  },

  floatingLabel: {
    position: "absolute",
    left: scale(12),
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: scale(4),
    zIndex: 1,
  },

  eyeIcon: {
    position: "absolute",
    right: scale(11),
    top: 0,
    bottom: 0,
    width: scale(30),
    justifyContent: "center",
    alignItems: "center",
  },

  resetButton: {
    width: "100%",
    backgroundColor: COLORS.pink,
    borderRadius: RADIUS.input,
    height: scale(48),
    alignItems: "center",
    justifyContent: "center",
    marginTop: scale(10),
  },

  resetButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: scaleFont(15),
  },
});
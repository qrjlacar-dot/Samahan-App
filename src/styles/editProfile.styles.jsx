import { StyleSheet } from "react-native";
import { scale, scaleFont } from "../constants/scale";
import { COLORS, RADIUS } from "../constants/theme";

export const editStyles = StyleSheet.create({
  container: {
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

  editTitle: {
    width: "100%",
    fontSize: scaleFont(24),
    fontWeight: "bold",
    marginBottom: scale(24),
    color: COLORS.pink,
    textAlign: "center",
  },

  formContainer: {
    width: "100%",
    marginTop: scale(10),
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

  inputFieldFocused: {
    borderColor: COLORS.pink,
  },

  inputFieldDisabled: {
    backgroundColor: "#F5F0F2",
    color: COLORS.textLight,
  },

  floatingLabel: {
    position: "absolute",
    left: scale(12),
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: scale(4),
    zIndex: 1,
  },

  inputFieldPassword: {
    paddingRight: scale(44),
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

  confirmButton: {
    width: "100%",
    backgroundColor: COLORS.pink,
    borderRadius: RADIUS.input,
    height: scale(48),
    alignItems: "center",
    justifyContent: "center",
    marginTop: scale(10),
  },

  confirmButtonText: {
    fontSize: scaleFont(15),
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  confirmButtonDisabled: {
    opacity: 0.6,
  },

  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  infoText: {
    fontSize: scaleFont(15),
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: scaleFont(22),
    paddingHorizontal: scale(12),
  },
});
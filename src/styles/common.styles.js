import { StyleSheet } from "react-native";
import { scale, scaleFont } from "../constants/scale";
import { COLORS, RADIUS } from "../constants/theme";

const backButtonSize = Math.max(44, scale(44));
export const styles = StyleSheet.create({
  backButton: {
    width: backButtonSize,
    height: backButtonSize,
    borderRadius: backButtonSize / 2,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2
  },
  inputWrapper: {
    height: scale(50),
    marginBottom: scale(15),
    justifyContent: "center",
    position: "relative"
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
    textAlignVertical: "center"
  },
  inputFieldPassword: {
    paddingRight: scale(48)
  },
  inputFieldFocused: {
    borderColor: COLORS.pink
  },
  inputFieldError: {
    borderColor: COLORS.error
  },
  floatingLabel: {
    position: "absolute",
    left: scale(12),
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: scale(4),
    zIndex: 1
  },
  requiredAsterisk: {
    color: COLORS.error,
    fontWeight: "bold"
  },
  eyeIcon: {
    position: "absolute",
    right: scale(4),
    top: 0,
    bottom: 0,
    width: scale(44),
    justifyContent: "center",
    alignItems: "center"
  },
  primaryButtonIcon: {
    marginRight: scale(7),
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: COLORS.pink,
    borderRadius: RADIUS.input,
    minHeight: scale(48),
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: COLORS.cardBg,
    fontSize: scaleFont(15),
    fontWeight: "bold"
  },
  disabledButton: {
    opacity: 0.5
  }
});

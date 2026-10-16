import { StyleSheet } from "react-native";
import { COLORS, RADIUS } from "../constants/theme";
import { scale, scaleFont } from "../constants/scale";

export const editStyles = StyleSheet.create({
  content: {
    alignItems: "center",
  },
  editTitle: {
    fontSize: scaleFont(27),
    fontWeight: "bold",
    color: COLORS.pink,
    textAlign: "center",
    marginBottom: scale(20),
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: scale(24),
    alignSelf: "center",
  },
  avatarCircle: {
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    backgroundColor: "#F3E4ED",
    justifyContent: "center",
    alignItems: "center",
  },
  formContainer: {
    width: "100%",
    marginTop: scale(10),
  },
  readOnlyField: {
    minHeight: scale(50),
    paddingVertical: scale(12),
    paddingLeft: scale(15),
    paddingRight: scale(42),
    marginBottom: scale(15),
    borderWidth: 1,
    borderColor: "#DDD4DA",
    borderRadius: RADIUS.input,
    backgroundColor: "#F0EDF0",
    justifyContent: "center",
  },
  readOnlyLabel: {
    position: "absolute",
    top: scale(-8),
    left: scale(12),
    paddingHorizontal: scale(4),
    backgroundColor: COLORS.pageBg,
    color: "#94828D",
    fontSize: scaleFont(12),
  },
  readOnlyValue: {
    color: "#897582",
    fontSize: scaleFont(16),
  },
  lockIcon: {
    position: "absolute",
    right: scale(15),
    top: scale(16),
  },
  googleAccountNote: {
    color: COLORS.textMuted,
    fontSize: scaleFont(12),
    lineHeight: scale(18),
    textAlign: "center",
    marginBottom: scale(15),
  },
  confirmButton: {
    width: "100%",
    marginTop: scale(10),
  },
});
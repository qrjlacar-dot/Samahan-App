import { StyleSheet } from "react-native";
import { COLORS } from "../constants/theme";
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
    marginBottom: scale(20)
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: scale(24),
    alignSelf: "center"
  },
  avatarCircle: {
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    backgroundColor: "#F3E4ED",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.cardBg,
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.pink
  },
  formContainer: {
    width: "100%",
    marginTop: scale(10)
  },
  confirmButton: {
    width: "100%",
    marginTop: scale(10)
  }
});
